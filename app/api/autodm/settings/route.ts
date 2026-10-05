import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { AutoDMSettings } from "@/models/AutoDMSettings";
import { InstagramAccount } from "@/models/InstagramAccount";
import { verifyToken } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/deploy/encryption";
import { getInstagramAccountInfo } from "@/lib/autodm/engine";

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const user = verifyToken(token);
    if (user.role !== "admin") return null;
    return user;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const settings = await AutoDMSettings.findOne({ owner: admin.userId }).lean() as any;

    const envAppId = process.env.META_APP_ID || "";
    const envHasSecret = !!process.env.META_APP_SECRET;
    const envHasToken = !!process.env.META_SYSTEM_USER_ACCESS_TOKEN;
    const envHasWebhook = !!process.env.META_WEBHOOK_VERIFY_TOKEN;

    const metaAppId = settings?.metaAppId || envAppId;
    const hasAppSecret = !!settings?.metaAppSecretEncrypted || envHasSecret;
    const hasSystemToken = !!settings?.metaSystemUserTokenEncrypted || envHasToken;
    const hasWebhookToken = !!settings?.metaWebhookVerifyTokenEncrypted || envHasWebhook;

    return NextResponse.json({
      settings: {
        id: settings ? String(settings._id) : "default",
        metaAppId,
        hasAppSecret,
        hasSystemToken,
        hasWebhookToken,
        lastConnectionStatus: settings?.lastConnectionStatus || (envHasToken ? "connected" : undefined),
        lastCheckedAt: settings?.lastCheckedAt,
      },
    });
  } catch (err) {
    return NextResponse.json({ message: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const body = await req.json();
    const patch: any = {};

    if (body.metaAppId !== undefined) patch.metaAppId = body.metaAppId.trim();
    if (body.metaAppSecret && body.metaAppSecret.trim() && !body.metaAppSecret.includes("•")) {
      patch.metaAppSecretEncrypted = encrypt(body.metaAppSecret.trim());
    }
    if (body.metaSystemUserToken && body.metaSystemUserToken.trim() && !body.metaSystemUserToken.includes("•")) {
      patch.metaSystemUserTokenEncrypted = encrypt(body.metaSystemUserToken.trim());
    }
    if (body.metaWebhookVerifyToken && body.metaWebhookVerifyToken.trim() && !body.metaWebhookVerifyToken.includes("•")) {
      patch.metaWebhookVerifyTokenEncrypted = encrypt(body.metaWebhookVerifyToken.trim());
    }

    // If saving without supplying token but env has it, populate encrypted token
    if (!patch.metaSystemUserTokenEncrypted && process.env.META_SYSTEM_USER_ACCESS_TOKEN) {
      const existing = await AutoDMSettings.findOne({ owner: admin.userId }).lean() as any;
      if (!existing?.metaSystemUserTokenEncrypted) {
        patch.metaSystemUserTokenEncrypted = encrypt(process.env.META_SYSTEM_USER_ACCESS_TOKEN.trim());
      }
    }

    await AutoDMSettings.findOneAndUpdate(
      { owner: admin.userId },
      { $set: patch },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[AutoDM Settings] Error saving settings:", err);
    return NextResponse.json({ message: "Failed to save settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Test connection
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const settings = await AutoDMSettings.findOne({ owner: admin.userId }).lean() as any;
    
    let token: string | null = null;
    if (settings?.metaSystemUserTokenEncrypted) {
      try {
        token = decrypt(settings.metaSystemUserTokenEncrypted);
      } catch {
        // Fallback below
      }
    }

    if (!token && process.env.META_SYSTEM_USER_ACCESS_TOKEN) {
      token = process.env.META_SYSTEM_USER_ACCESS_TOKEN.trim();
    }

    if (!token) {
      return NextResponse.json({ status: "webhook_unconfigured", message: "No credentials configured." });
    }

    const info = await getInstagramAccountInfo(token);
    if (!info || info.error) {
      const errMsg = info?.error?.message || "Invalid credentials or token expired";
      await AutoDMSettings.updateOne(
        { owner: admin.userId },
        { $set: { lastConnectionStatus: "invalid", lastCheckedAt: new Date() } },
        { upsert: true }
      );
      return NextResponse.json({ status: "invalid", message: errMsg });
    }

    await AutoDMSettings.updateOne(
      { owner: admin.userId },
      {
        $set: {
          lastConnectionStatus: "connected",
          lastCheckedAt: new Date(),
          ...(settings?.metaSystemUserTokenEncrypted ? {} : { metaSystemUserTokenEncrypted: encrypt(token) }),
        },
      },
      { upsert: true }
    );

    // Auto-upsert the connected Instagram account + store Page Token for DM sending
    if (info.id && info.username) {
      // Also fetch the Page Access Token for this IG account (needed for DM via /me/messages)
      let pageId: string | undefined;
      let pageToken: string | undefined;
      try {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=id,access_token,instagram_business_account{id}&access_token=${token}`
        );
        const pagesData = await pagesRes.json();
        const matchedPage = (pagesData.data || []).find(
          (p: any) => p.instagram_business_account?.id === info.id
        );
        if (matchedPage) {
          pageId = matchedPage.id;
          pageToken = matchedPage.access_token;
        }
      } catch (pageErr) {
        console.warn("[AutoDM Settings] Could not fetch page token:", pageErr);
      }

      await InstagramAccount.findOneAndUpdate(
        { instagramUserId: info.id, owner: admin.userId },
        {
          $set: {
            username: info.username,
            profilePicture: info.profile_picture_url,
            accountType: info.account_type || "professional",
            accessTokenEncrypted: encrypt(token),
            ...(pageId ? { pageId } : {}),
            ...(pageToken ? { pageAccessTokenEncrypted: encrypt(pageToken) } : {}),
            status: "connected",
            connectedAt: new Date(),
            lastSyncAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({ status: "connected", message: "Connection successful.", info });
  } catch (err) {
    console.error("[AutoDM Test Connection] Error:", err);
    return NextResponse.json({ status: "error", message: "Test connection failed" }, { status: 500 });
  }
}

