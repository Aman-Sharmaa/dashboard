import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { InstagramAccount } from "@/models/InstagramAccount";
import { AutoDMAutomation } from "@/models/AutoDMAutomation";
import { AutoDMRun } from "@/models/AutoDMRun";
import { decrypt, matchesKeywords, getAutomationPriority, executeAutomation } from "@/lib/autodm/engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Accept token from env — set META_WEBHOOK_VERIFY_TOKEN in your environment
    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (mode === "subscribe" && token === expectedToken) {
      console.log("[AutoDM Webhook] Verification successful. Challenge:", challenge);
      return new Response(challenge ?? "", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Also accept if token matches anything saved in DB
    try {
      await connectDB();
      const { AutoDMSettings } = await import("@/models/AutoDMSettings");
      const { decrypt: dec } = await import("@/lib/deploy/encryption");
      const settings = await AutoDMSettings.findOne({}).lean() as any;
      if (settings?.metaWebhookVerifyTokenEncrypted) {
        const dbToken = dec(settings.metaWebhookVerifyTokenEncrypted);
        if (mode === "subscribe" && token === dbToken) {
          console.log("[AutoDM Webhook] DB token verification successful.");
          return new Response(challenge ?? "", {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }
      }
    } catch { /* ignore db errors during verify */ }

    console.warn("[AutoDM Webhook] Verification failed. Mode:", mode, "Token received:", token);
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  } catch (err) {
    console.error("[AutoDM Webhook] Verification error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Always ack immediately — Meta requires 200 within 5s
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ received: true });
  }

  // Process in background so we don't timeout
  processWebhookEvent(body).catch((err) =>
    console.error("[AutoDM Webhook] Background processing error:", err)
  );

  return NextResponse.json({ received: true });
}

async function processWebhookEvent(body: any) {
  try {
    await connectDB();

    const obj = body?.object;
    console.log("[AutoDM Webhook] Processing event object type:", obj);
    console.log("[AutoDM Webhook] Full payload:", JSON.stringify(body, null, 2));

    // Meta sends 'instagram' for IG Graph API webhooks and 'page' for Page webhooks
    if (obj !== "instagram" && obj !== "page") {
      console.log("[AutoDM Webhook] Ignoring non-instagram/page event:", obj);
      return;
    }

    const entries = body.entry || [];

    for (const entry of entries) {
      const entryId = entry.id;

      // Look up the connected Instagram account
      // The entry.id for 'instagram' events is the IG User ID
      // The entry.id for 'page' events is the Facebook Page ID
      let account = await InstagramAccount.findOne({
        instagramUserId: entryId,
        status: "connected",
      }).lean() as any;

      // Fallback: find by page ID or use any connected account (single-account setup)
      if (!account) {
        account = await InstagramAccount.findOne({ status: "connected" }).lean() as any;
      }

      if (!account) {
        console.warn("[AutoDM Webhook] No connected Instagram account found for entry ID:", entryId);
        continue;
      }

      // Resolve access token
      let accessToken: string = "";
      try {
        accessToken = decrypt(account.accessTokenEncrypted);
      } catch {
        accessToken = process.env.META_SYSTEM_USER_ACCESS_TOKEN?.trim() || "";
      }
      if (!accessToken) {
        console.error("[AutoDM Webhook] No access token available for account:", account.username);
        continue;
      }

      console.log(`[AutoDM Webhook] Processing entry ${entryId} for @${account.username}`);

      // ── Handle Comment Changes ──────────────────────────────────────────────
      const changes = entry.changes || [];
      for (const change of changes) {
        console.log("[AutoDM Webhook] Change field:", change.field);

        // Instagram comments (both 'comments' and 'instagram_comments' field names)
        if (change.field === "comments" || change.field === "instagram_comments") {
          await handleComment(change.value, account, accessToken);
        }

        // Instagram live comments
        if (change.field === "live_comments" || change.field === "instagram_live_comments") {
          await handleComment(change.value, account, accessToken, "live");
        }

        // Mentions
        if (change.field === "mentions" || change.field === "instagram_mentions") {
          await handleComment(change.value, account, accessToken, "post");
        }
      }

      // ── Handle Messaging (DMs, Story Replies) ──────────────────────────────
      const messagingList = entry.messaging || [];
      for (const msg of messagingList) {
        await handleMessage(msg, account, accessToken);
      }
    }
  } catch (err) {
    console.error("[AutoDM Webhook] processWebhookEvent error:", err);
  }
}

async function handleComment(
  val: any,
  account: any,
  accessToken: string,
  forcedTrigger?: string
) {
  const commentId = val?.id;
  const commentText = val?.text || val?.message || "";
  const commenterId = val?.from?.id;
  const commenterUsername = val?.from?.username || "";
  const mediaId = val?.media?.id || val?.post_id || val?.media_id;

  if (!commentId) {
    console.warn("[AutoDM Webhook] handleComment: missing commentId", val);
    return;
  }
  if (!commenterId) {
    console.warn("[AutoDM Webhook] handleComment: missing commenterId", val);
    return;
  }

  // Don't respond to our own comments
  if (
    commenterId === account.instagramUserId ||
    (commenterUsername && commenterUsername === account.username)
  ) {
    console.log("[AutoDM Webhook] Skipping own comment.");
    return;
  }

  // Deduplication
  const existingRun = await AutoDMRun.findOne({ commentId });
  if (existingRun) {
    console.log("[AutoDM Webhook] Comment already processed:", commentId);
    return;
  }

  // Find active automations
  const triggerTypes = forcedTrigger ? [forcedTrigger] : ["post", "live"];
  const automations = await AutoDMAutomation.find({
    instagramAccountId: account._id,
    status: "active",
    triggerType: { $in: triggerTypes },
  }).lean() as any[];

  console.log(`[AutoDM Webhook] Found ${automations.length} candidate automations for comment "${commentText}"`);

  const matched = automations.filter((auto) => {
    if (auto.mediaType === "specific" && auto.mediaId && auto.mediaId !== mediaId) {
      return false;
    }
    if (auto.commentMode === "keyword") {
      return matchesKeywords(commentText, auto.includedKeywords || [], auto.excludedKeywords || []);
    }
    return true; // commentMode === "any"
  });

  if (matched.length === 0) {
    console.log("[AutoDM Webhook] No matching automation for comment:", commentText);
    return;
  }

  matched.sort((a, b) => getAutomationPriority(b) - getAutomationPriority(a));
  const chosen = matched[0];
  console.log("[AutoDM Webhook] Matched automation:", chosen.name);

  const run = await AutoDMRun.create({
    owner: account.owner,
    automationId: chosen._id,
    instagramAccountId: account._id,
    commentId,
    instagramUserId: commenterId,
    username: commenterUsername,
    triggerText: commentText,
    publicReplyStatus: chosen.publicReplyEnabled ? "pending" : "skipped",
    dmStatus: "pending",
    followRequired: chosen.followGateEnabled || false,
    followVerified: false,
  });

  const delayMs = (chosen.delayMinutes || 0) * 60 * 1000;
  const execFn = () =>
    executeAutomation({
      automation: chosen,
      instagramAccount: account,
      commentId,
      commentText,
      commenterUserId: commenterId,
      commenterUsername,
      mediaId: mediaId || "",
      accessToken,
      runId: String(run._id),
    });

  if (delayMs > 0) {
    setTimeout(execFn, delayMs);
  } else {
    await execFn();
  }
}

async function handleMessage(msg: any, account: any, accessToken: string) {
  const senderId = msg.sender?.id;
  const text = msg.message?.text || "";
  const mid = msg.message?.mid;

  if (!senderId || !mid) return;

  // Skip our own messages
  if (senderId === account.instagramUserId) return;

  // Determine trigger type
  let triggerType: "dm" | "story" | "share_post" = "dm";
  if (msg.message?.reply_to?.story) {
    triggerType = "story";
  } else if (msg.message?.attachments?.length > 0) {
    const attachType = msg.message.attachments[0]?.type;
    if (attachType === "share" || attachType === "ig_reel") {
      triggerType = "share_post";
    } else {
      triggerType = "dm";
    }
  }

  // Deduplication
  const existingRun = await AutoDMRun.findOne({ commentId: mid });
  if (existingRun) return;

  const automations = await AutoDMAutomation.find({
    instagramAccountId: account._id,
    status: "active",
    triggerType,
  }).lean() as any[];

  console.log(`[AutoDM Webhook] Found ${automations.length} ${triggerType} automations for message "${text}"`);

  const matched = automations.filter((auto) => {
    if (auto.commentMode === "keyword") {
      return matchesKeywords(text, auto.includedKeywords || [], auto.excludedKeywords || []);
    }
    return true;
  });

  if (matched.length === 0) return;

  matched.sort((a, b) => getAutomationPriority(b) - getAutomationPriority(a));
  const chosen = matched[0];

  const run = await AutoDMRun.create({
    owner: account.owner,
    automationId: chosen._id,
    instagramAccountId: account._id,
    commentId: mid,
    instagramUserId: senderId,
    username: msg.sender?.username || "user",
    triggerText: text,
    publicReplyStatus: "skipped",
    dmStatus: "pending",
    followRequired: chosen.followGateEnabled || false,
    followVerified: false,
  });

  const delayMs = (chosen.delayMinutes || 0) * 60 * 1000;
  const execFn = () =>
    executeAutomation({
      automation: chosen,
      instagramAccount: account,
      commentId: "",
      commentText: text,
      commenterUserId: senderId,
      commenterUsername: msg.sender?.username || "user",
      mediaId: "",
      accessToken,
      runId: String(run._id),
    });

  if (delayMs > 0) {
    setTimeout(execFn, delayMs);
  } else {
    await execFn();
  }
}
