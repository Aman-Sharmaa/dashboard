/**
 * AutoDM Automation Engine
 * Handles the full execution flow: trigger evaluation → public reply → follow gate → main DM
 */
import { encrypt, decrypt as _decrypt } from "@/lib/deploy/encryption";

// Re-export for convenience so other API routes can use the same import path
export { _decrypt as decrypt };

// ─── Meta Graph API Helpers ──────────────────────────────────────────────────

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export async function getAccessToken(encryptedToken: string): Promise<string> {
  return _decrypt(encryptedToken);
}

export async function sendInstagramComment(
  commentId: string,
  message: string,
  accessToken: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch(`${GRAPH_BASE}/${commentId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: accessToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn("[AutoDM Engine] sendInstagramComment error:", data);
      return { success: false, error: data?.error?.message || "Meta comment reply failed" };
    }
    return { success: true, id: data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function sendInstagramDM(
  recipient: { id?: string; comment_id?: string },
  message: string,
  buttons: Array<{ text: string; url: string }>,
  accessToken: string,
  igUserId?: string,    // IG Professional Account ID — for /{igUserId}/messages endpoint
  pageAccessToken?: string  // Page Access Token — for /me/messages endpoint (preferred for DMs)
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    let recipientPayload: any = {};
    if (recipient.comment_id) {
      recipientPayload = { comment_id: recipient.comment_id };
    } else if (recipient.id) {
      recipientPayload = { id: recipient.id };
    } else {
      return { success: false, error: "No recipient ID or comment ID provided" };
    }

    // Append button links to message text
    let fullText = message;
    if (buttons && buttons.length > 0) {
      const buttonLinks = buttons
        .filter((b) => b.text && b.url)
        .map((b) => `👉 ${b.text}: ${b.url}`)
        .join("\n");
      if (buttonLinks) fullText = `${message}\n\n${buttonLinks}`;
    }

    const body = JSON.stringify({
      recipient: recipientPayload,
      message: { text: fullText },
    });
    const headers = { "Content-Type": "application/json" };

    // Strategy 1: Use Page Access Token with /me/messages (correct for FB-linked IG accounts)
    // This is the standard path for private replies and Instagram DMs via the Messenger Platform.
    if (pageAccessToken) {
      const res = await fetch(`${GRAPH_BASE}/me/messages?access_token=${pageAccessToken}`, {
        method: "POST", headers, body,
      });
      const data = await res.json();
      if (res.ok) {
        console.log("[AutoDM Engine] DM sent via Page Token /me/messages");
        return { success: true, id: data.message_id || data.recipient_id };
      }
      console.warn("[AutoDM Engine] Page token /me/messages failed:", data?.error?.message);
      // Fall through to next strategy
    }

    // Strategy 2: Use /{igUserId}/messages with system user token
    // Works when app has instagram_manage_messages + Advanced Access (Live mode)
    if (igUserId) {
      const endpoint = `${GRAPH_BASE}/${igUserId}/messages?access_token=${accessToken}`;
      const res = await fetch(endpoint, { method: "POST", headers, body });
      const data = await res.json();
      if (res.ok) {
        console.log("[AutoDM Engine] DM sent via SysToken /{igUserId}/messages");
        return { success: true, id: data.message_id || data.recipient_id };
      }
      console.warn("[AutoDM Engine] SysToken /{igUserId}/messages failed:", data?.error?.message);

      // If comment_id failed, retry with user ID
      if (recipient.comment_id && recipient.id) {
        const retryBody = JSON.stringify({ recipient: { id: recipient.id }, message: { text: fullText } });
        const retryRes = await fetch(endpoint, { method: "POST", headers, body: retryBody });
        const retryData = await retryRes.json();
        if (retryRes.ok) {
          return { success: true, id: retryData.message_id || retryData.recipient_id };
        }
        console.warn("[AutoDM Engine] Retry with user ID also failed:", retryData?.error?.message);
        return { success: false, error: retryData?.error?.message || "DM retry failed" };
      }
      return { success: false, error: data?.error?.message || "Meta DM dispatch failed" };
    }

    // Strategy 3: Fallback — /me/messages with system token (usually fails for system users)
    const res = await fetch(`${GRAPH_BASE}/me/messages?access_token=${accessToken}`, {
      method: "POST", headers, body,
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, id: data.message_id || data.recipient_id };
    }
    console.warn("[AutoDM Engine] All DM strategies failed. Last error:", data?.error?.message);
    return { success: false, error: data?.error?.message || "Meta DM dispatch failed" };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function checkFollowStatus(
  instagramUserId: string,
  followerIgId: string,
  accessToken: string
): Promise<"following" | "not_following" | "unavailable"> {
  try {
    // Meta Graph API: check if a user follows an IG Professional account
    const res = await fetch(
      `${GRAPH_BASE}/${instagramUserId}/followers?user_id=${followerIgId}&access_token=${accessToken}`
    );
    const data = await res.json();
    if (!res.ok) return "unavailable";
    // If data array contains the follower user id, they follow
    const follows = data?.data?.some((u: any) => u.id === followerIgId);
    return follows ? "following" : "not_following";
  } catch {
    return "unavailable";
  }
}

export async function fetchInstagramMedia(
  instagramUserId: string,
  accessToken: string,
  limit = 20
): Promise<any[]> {
  try {
    const fields = "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,comments_count,like_count";
    const res = await fetch(
      `${GRAPH_BASE}/${instagramUserId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
    );
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function getInstagramAccountInfo(accessToken: string): Promise<any> {
  try {
    if (accessToken.startsWith("EAA")) {
      // It's a Facebook User/System User Token
      const res = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${accessToken}`
      );
      const data = await res.json();
      if (!res.ok) return { error: data.error };
      
      const pages = data.data || [];
      const igAccounts = pages.filter((p: any) => p.instagram_business_account).map((p: any) => p.instagram_business_account);
      
      if (igAccounts.length === 0) {
        return { error: { message: "No Instagram Professional accounts found. Ensure your Instagram is linked to a Facebook Page, and this token has access to that Page." } };
      }
      
      // Return the first linked Instagram account
      const ig = igAccounts[0];
      return {
        id: ig.id,
        username: ig.username,
        account_type: "professional", // Assumed for FB linked accounts
        profile_picture_url: ig.profile_picture_url,
      };
    } else {
      // It's a direct Instagram Token
      const res = await fetch(
        `${GRAPH_BASE}/me?fields=id,username,account_type,profile_picture_url&access_token=${accessToken}`
      );
      return await res.json();
    }
  } catch {
    return null;
  }
}

// ─── Template Variable Parser ────────────────────────────────────────────────

export function parseTemplate(
  template: string,
  vars: {
    name?: string;
    username?: string;
    mediaTitle?: string;
    mediaUrl?: string;
    accountUsername?: string;
    commentText?: string;
  }
): string {
  return template
    .replace(/\{\{name\}\}/gi, vars.name || "")
    .replace(/\{\{username\}\}/gi, vars.username || "")
    .replace(/\{\{media_name\}\}/gi, vars.mediaTitle || "")
    .replace(/\{\{media_url\}\}/gi, vars.mediaUrl || "")
    .replace(/\{\{account_username\}\}/gi, vars.accountUsername || "")
    .replace(/\{\{comment_text\}\}/gi, vars.commentText || "");
}

// ─── Keyword Matching ────────────────────────────────────────────────────────

export function matchesKeywords(
  commentText: string,
  includedKeywords: string[],
  excludedKeywords: string[]
): boolean {
  const lc = commentText.toLowerCase();
  // Check excluded first
  for (const kw of excludedKeywords || []) {
    if (lc.includes(kw.toLowerCase())) return false;
  }
  // Must match at least one included keyword
  if (!includedKeywords || includedKeywords.length === 0) return true;
  return includedKeywords.some((kw) => lc.includes(kw.toLowerCase()));
}

// ─── Automation Priority Scoring ─────────────────────────────────────────────

export function getAutomationPriority(automation: {
  mediaType: "specific" | "any" | "next";
  commentMode: "keyword" | "any";
}): number {
  if (automation.mediaType === "specific" && automation.commentMode === "keyword") return 4;
  if (automation.mediaType === "specific" && automation.commentMode === "any") return 3;
  if (automation.mediaType === "any" && automation.commentMode === "keyword") return 2;
  return 1; // any + any
}

// ─── Main Execution Engine ───────────────────────────────────────────────────

export interface EngineContext {
  automation: any;
  instagramAccount: any;  // Must have .instagramUserId field
  commentId: string;
  commentText: string;
  commenterUserId: string;
  commenterUsername: string;
  mediaId: string;
  mediaTitle?: string;
  mediaUrl?: string;
  accessToken: string;
  runId: string; // AutoDMRun document ID for updating status
}

export async function executeAutomation(ctx: EngineContext) {
  const { AutoDMRun } = await import("@/models/AutoDMRun");
  await import("@/lib/db").then((m) => m.connectDB());

  const updateRun = async (patch: Record<string, any>) => {
    await AutoDMRun.findByIdAndUpdate(ctx.runId, { $set: patch });
  };

  // The Instagram account's IG User ID — required for /{ig-user-id}/messages endpoint
  const igUserId: string = ctx.instagramAccount.instagramUserId;

  // Decrypt the Page Access Token if available (preferred for DM sending)
  let pageAccessToken: string | undefined;
  try {
    if (ctx.instagramAccount.pageAccessTokenEncrypted) {
      pageAccessToken = _decrypt(ctx.instagramAccount.pageAccessTokenEncrypted);
    }
  } catch {
    // No page token, will fall back to system token strategies
  }

  try {
    // ── Step 1: Public Comment Reply ──────────────────────────────────
    if (ctx.automation.publicReplyEnabled && ctx.automation.publicReplies?.length > 0) {
      const replies: string[] = ctx.automation.publicReplies;
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const replyResult = await sendInstagramComment(ctx.commentId, randomReply, ctx.accessToken);
      await updateRun({
        publicReplyStatus: replyResult.success ? "sent" : "failed",
        ...(replyResult.error ? { errorMessage: replyResult.error } : {}),
      });
    } else {
      await updateRun({ publicReplyStatus: "skipped" });
    }

    // ── Step 2: Follow Gate ──────────────────────────────────────────
    if (ctx.automation.followGateEnabled) {
      const followMessage = parseTemplate(
        ctx.automation.followOpeningMessage || "Hey {{name}}! Follow us first and I'll send you the link 👇",
        {
          name: ctx.commenterUsername,
          username: ctx.commenterUsername,
          accountUsername: ctx.instagramAccount.username,
          mediaTitle: ctx.mediaTitle,
          mediaUrl: ctx.mediaUrl,
          commentText: ctx.commentText,
        }
      );

      const followButtons = [
        { text: "Visit Profile", url: `https://instagram.com/${ctx.instagramAccount.username}` },
        { text: "I'm Following ✅", url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/autodm/follow-confirm?runId=${ctx.runId}` },
      ];

      const dmResult = await sendInstagramDM(
        { id: ctx.commenterUserId, comment_id: ctx.commentId || undefined },
        followMessage,
        followButtons,
        ctx.accessToken,
        igUserId,
        pageAccessToken
      );

      await updateRun({
        followRequired: true,
        dmStatus: dmResult.success ? "sent" : "failed",
        ...(dmResult.error ? { errorMessage: dmResult.error } : {}),
      });
      // The main DM is sent after follow confirmation (handled by /api/autodm/follow-confirm)
      return;
    }

    // ── Step 3: Main DM (no follow gate) ─────────────────────────────
    const mainMessage = parseTemplate(ctx.automation.mainMessage, {
      name: ctx.commenterUsername,
      username: ctx.commenterUsername,
      accountUsername: ctx.instagramAccount.username,
      mediaTitle: ctx.mediaTitle,
      mediaUrl: ctx.mediaUrl,
      commentText: ctx.commentText,
    });

    const dmResult = await sendInstagramDM(
      { id: ctx.commenterUserId, comment_id: ctx.commentId || undefined },
      mainMessage,
      ctx.automation.buttons || [],
      ctx.accessToken,
      igUserId,
      pageAccessToken
    );

    await updateRun({
      dmStatus: dmResult.success ? "sent" : "failed",
      completedAt: new Date(),
      ...(dmResult.error ? { errorMessage: dmResult.error, errorCode: "DM_FAILED" } : {}),
    });
  } catch (err) {
    await updateRun({
      dmStatus: "failed",
      errorCode: "ENGINE_ERROR",
      errorMessage: err instanceof Error ? err.message : String(err),
      completedAt: new Date(),
    });
  }
}
