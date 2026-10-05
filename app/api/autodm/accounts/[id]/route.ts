import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { InstagramAccount } from "@/models/InstagramAccount";
import { verifyToken } from "@/lib/auth";

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const { id } = await params;
    await InstagramAccount.findOneAndUpdate(
      { _id: id, owner: admin.userId },
      { $set: { status: "disconnected" } }
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Failed to disconnect account" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Reconnect - re-fetch account info
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const { id } = await params;
    const account = await InstagramAccount.findOne({ _id: id, owner: admin.userId });
    if (!account) return NextResponse.json({ message: "Account not found" }, { status: 404 });

    await InstagramAccount.findByIdAndUpdate(id, {
      $set: { status: "connected", lastSyncAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Failed to reconnect" }, { status: 500 });
  }
}
