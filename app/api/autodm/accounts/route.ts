import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { InstagramAccount } from "@/models/InstagramAccount";
import { AutoDMSettings } from "@/models/AutoDMSettings";
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

function serializeAccount(acc: any) {
  return {
    id: String(acc._id),
    instagramUserId: acc.instagramUserId,
    username: acc.username,
    profilePicture: acc.profilePicture,
    accountType: acc.accountType,
    status: acc.status,
    connectedAt: acc.connectedAt,
    lastSyncAt: acc.lastSyncAt,
  };
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const accounts = await InstagramAccount.find({ owner: admin.userId }).lean();
    return NextResponse.json({ accounts: accounts.map(serializeAccount) });
  } catch {
    return NextResponse.json({ message: "Failed to load accounts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Manual account connect (using system user token from settings)
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const settings = await AutoDMSettings.findOne({ owner: admin.userId }).lean() as any;
    if (!settings?.metaSystemUserTokenEncrypted) {
      return NextResponse.json({
        message: "Please configure your Meta System User Access Token in Settings first.",
      }, { status: 400 });
    }

    const token = decrypt(settings.metaSystemUserTokenEncrypted);
    const info = await getInstagramAccountInfo(token);

    if (!info || info.error) {
      return NextResponse.json({
        message: info?.error?.message || "Failed to fetch Instagram account info. Check your token.",
      }, { status: 400 });
    }

    // Upsert the account
    const account = await InstagramAccount.findOneAndUpdate(
      { instagramUserId: info.id, owner: admin.userId },
      {
        $set: {
          username: info.username,
          profilePicture: info.profile_picture_url,
          accountType: info.account_type,
          accessTokenEncrypted: encrypt(token),
          status: "connected",
          connectedAt: new Date(),
          lastSyncAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ account: serializeAccount(account) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: "Failed to connect account" }, { status: 500 });
  }
}
