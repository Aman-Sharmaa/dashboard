import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AutoDMRun } from "@/models/AutoDMRun";
import { AutoDMAutomation } from "@/models/AutoDMAutomation";
import { InstagramAccount } from "@/models/InstagramAccount";
import { decrypt, checkFollowStatus, parseTemplate, sendInstagramDM } from "@/lib/autodm/engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return new NextResponse("Invalid request", { status: 400 });
    }

    await connectDB();

    const run = await AutoDMRun.findById(runId);
    if (!run) return new NextResponse("Verification link expired or invalid", { status: 404 });

    if (run.followVerified || run.dmStatus === "sent") {
      return new NextResponse(
        "<html><body style='font-family:sans-serif;text-align:center;padding:2rem;'><h2>Already verified!</h2><p>Check your Instagram DMs.</p></body></html>",
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const account = await InstagramAccount.findById(run.instagramAccountId);
    const automation = await AutoDMAutomation.findById(run.automationId);

    if (!account || !automation) {
      return new NextResponse("Configuration error", { status: 500 });
    }

    let accessToken: string;
    try {
      accessToken = decrypt(account.accessTokenEncrypted);
    } catch {
      return new NextResponse("Token error", { status: 500 });
    }

    // Decrypt page token if available (preferred for DM sending)
    let pageAccessToken: string | undefined;
    try {
      if (account.pageAccessTokenEncrypted) {
        pageAccessToken = decrypt(account.pageAccessTokenEncrypted);
      }
    } catch { /* fall back to system token */ }

    // Check follow status
    const status = await checkFollowStatus(account.instagramUserId, run.instagramUserId, accessToken);

    if (status === "following") {
      // Send main DM
      const mainMessage = parseTemplate(automation.mainMessage, {
        name: run.username,
        username: run.username,
        accountUsername: account.username,
      });

      const dmResult = await sendInstagramDM(
        { id: run.instagramUserId },
        mainMessage,
        automation.buttons || [],
        accessToken,
        account.instagramUserId,  // /{ig-user-id}/messages endpoint
        pageAccessToken           // Page token (preferred strategy)
      );

      await AutoDMRun.findByIdAndUpdate(runId, {
        $set: {
          followVerified: true,
          dmStatus: dmResult.success ? "sent" : "failed",
          completedAt: new Date(),
          ...(dmResult.error ? { errorMessage: dmResult.error, errorCode: "DM_FAILED" } : {}),
        },
      });

      return new NextResponse(
        "<html><body style='font-family:sans-serif;text-align:center;padding:2rem;'><h2>Follow Confirmed! ✅</h2><p>The link has been sent to your DMs.</p></body></html>",
        { headers: { "Content-Type": "text/html" } }
      );
    } else {
      return new NextResponse(
        `<html><body style='font-family:sans-serif;text-align:center;padding:2rem;'><h2>Not following yet</h2><p>Please follow @${account.username} on Instagram first, then click the button again.</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }
  } catch (err) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
