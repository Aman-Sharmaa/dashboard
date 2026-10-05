import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { InstagramAccount } from "@/models/InstagramAccount";
import { AutoDMSettings } from "@/models/AutoDMSettings";
import { verifyToken } from "@/lib/auth";
import { decrypt, fetchInstagramMedia } from "@/lib/autodm/engine";

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

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    
    if (!accountId) {
      return NextResponse.json({ message: "accountId is required" }, { status: 400 });
    }

    const account = await InstagramAccount.findOne({
      _id: accountId,
      owner: admin.userId,
      status: "connected",
    }).lean() as any;
    
    if (!account) {
      return NextResponse.json({ message: "Instagram account not found or disconnected" }, { status: 404 });
    }

    let accessToken: string | null = null;
    if (account.accessTokenEncrypted) {
      try {
        accessToken = decrypt(account.accessTokenEncrypted);
      } catch {
        // Fallback
      }
    }

    if (!accessToken && process.env.META_SYSTEM_USER_ACCESS_TOKEN) {
      accessToken = process.env.META_SYSTEM_USER_ACCESS_TOKEN.trim();
    }

    if (!accessToken) {
      return NextResponse.json({ message: "No access token found for account" }, { status: 400 });
    }

    const media = await fetchInstagramMedia(account.instagramUserId, accessToken);

    return NextResponse.json({ media });
  } catch (err) {
    console.error("[AutoDM Media] Error fetching media:", err);
    return NextResponse.json({ message: "Failed to fetch media" }, { status: 500 });
  }
}
