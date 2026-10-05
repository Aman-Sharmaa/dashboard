import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { AutoDMEvent } from "@/models/AutoDMEvent";
import { AutoDMRun } from "@/models/AutoDMRun";
import { AutoDMAutomation } from "@/models/AutoDMAutomation";
import { InstagramAccount } from "@/models/InstagramAccount";
import { AutoDMSettings } from "@/models/AutoDMSettings";
import { decrypt, matchesKeywords, getAutomationPriority, executeAutomation } from "@/lib/autodm/engine";

// ─── Webhook Verification (GET) ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe") {
    return new NextResponse("Invalid mode", { status: 400 });
  }

  try {
    await connectDB();
    // Find any admin's settings with this verify token
    const allSettings = await AutoDMSettings.find({ metaWebhookVerifyTokenEncrypted: { $exists: true, $ne: "" } }).lean() as any[];

    for (const s of allSettings) {
      try {
        const verifyToken = decrypt(s.metaWebhookVerifyTokenEncrypted);
        if (verifyToken === token) {
          return new NextResponse(challenge, { status: 200 });
        }
      } catch {
        // continue
      }
    }
  } catch {
    // fallback
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// ─── Webhook Event Handler (POST) ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") || "";

  // Validate signature
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    if (signature !== expected) {
      return new NextResponse("Signature mismatch", { status: 403 });
    }
  }

  // Always respond quickly
  processWebhookAsync(rawBody).catch((err) => {
    console.error("[AutoDM Webhook] Processing error:", err);
  });

  return NextResponse.json({ ok: true });
}

async function processWebhookAsync(rawBody: string) {
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return;
  }

  await connectDB();

  const entries = payload?.entry || [];
  for (const entry of entries) {
    const igAccountId = entry.id; // Instagram IGSID
    const changes = entry.changes || [];

    for (const change of changes) {
      if (change.field !== "comments") continue;

      const value = change.value;
      const commentId = value?.id;
      const commentText = value?.text || "";
      const commenterUserId = value?.from?.id;
      const commenterUsername = value?.from?.username || "";
      const mediaId = value?.media?.id;

      if (!commentId || !commenterUserId || !mediaId) continue;

      // ── Deduplication ──────────────────────────────────────────────
      const eventKey = `comment_${commentId}`;
      const existing = await AutoDMEvent.findOne({ eventId: eventKey });
      if (existing?.processed) {
        console.log(`[AutoDM] Duplicate event, skipping: ${eventKey}`);
        continue;
      }

      // Mark as received
      const event = await AutoDMEvent.findOneAndUpdate(
        { eventId: eventKey },
        { $set: { eventId: eventKey, eventType: "comments", payload: value, processed: false } },
        { upsert: true, new: true }
      );

      // ── Find Instagram Account ─────────────────────────────────────
      const account = await InstagramAccount.findOne({ instagramUserId: igAccountId, status: "connected" }).lean() as any;
      if (!account) {
        console.log(`[AutoDM] No connected account for IG ID: ${igAccountId}`);
        continue;
      }

      // ── Find Matching Automations ──────────────────────────────────
      const automations = await AutoDMAutomation.find({
        instagramAccountId: account._id,
        status: "active",
        triggerType: "post",
        $or: [
          { mediaType: "any" },
          { mediaType: "specific", mediaId: mediaId },
        ],
      }).lean() as any[];

      if (automations.length === 0) continue;

      // ── Conflict Resolution: Pick highest priority ─────────────────
      const eligible = automations.filter((a) => {
        if (a.commentMode === "keyword") {
          return matchesKeywords(commentText, a.includedKeywords || [], a.excludedKeywords || []);
        }
        return true; // "any" comment mode
      });

      if (eligible.length === 0) continue;

      eligible.sort((a, b) => getAutomationPriority(b) - getAutomationPriority(a));
      const automation = eligible[0];

      // ── Comment-Level Deduplication ──────────────────────────────
      const runKey = `${String(automation._id)}_${commentId}`;
      const existingRun = await AutoDMRun.findOne({ automationId: automation._id, commentId });
      if (existingRun) {
        console.log(`[AutoDM] Already ran for comment ${commentId}, skipping`);
        continue;
      }

      // ── Create Run Record ─────────────────────────────────────────
      let accessToken: string;
      try {
        accessToken = decrypt(account.accessTokenEncrypted);
      } catch {
        console.error(`[AutoDM] Failed to decrypt token for account ${account.username}`);
        continue;
      }

      const run = await AutoDMRun.create({
        owner: account.owner,
        automationId: automation._id,
        instagramAccountId: account._id,
        commentId,
        instagramUserId: commenterUserId,
        username: commenterUsername,
        triggerText: commentText,
        followRequired: automation.followGateEnabled,
        followVerified: false,
        publicReplyStatus: "pending",
        dmStatus: "pending",
      });

      // Mark event as processed
      await AutoDMEvent.findByIdAndUpdate(event._id, { $set: { processed: true, processedAt: new Date(), instagramAccountId: account._id } });

      // ── Execute Automation Engine ─────────────────────────────────
      await executeAutomation({
        automation,
        instagramAccount: account,
        commentId,
        commentText,
        commenterUserId,
        commenterUsername,
        mediaId,
        accessToken,
        runId: String(run._id),
      });
    }
  }
}
