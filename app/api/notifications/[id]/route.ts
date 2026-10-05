import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Notification } from "@/models/Notification";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json().catch(() => ({}));

  const notification = await Notification.findOne({
    _id: id,
    user: user.userId,
  });

  if (!notification) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (body.read !== undefined) {
    notification.read = !!body.read;
  }

  await notification.save();

  return NextResponse.json({
    notification: {
      id: String(notification._id),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      createdAt: (notification as any).createdAt || new Date().toISOString(),
      data: (notification as any).data ?? null,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const result = await Notification.findOneAndDelete({
    _id: id,
    user: user.userId,
  });

  if (!result) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
