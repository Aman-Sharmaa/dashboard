import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

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

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    // Fetch unread notifications first, then some read ones, or just last 20
    const notifications = await Notification.find({ user: user.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      notifications: notifications.map((n: any) => ({
        ...n,
        id: String(n._id),
      }))
    });
  } catch (err) {
    return NextResponse.json({ message: "Error fetching notifications" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, markAllRead } = body;

    await connectDB();

    if (markAllRead) {
      await Notification.updateMany({ user: user.userId, read: false }, { read: true });
      return NextResponse.json({ message: "All marked as read" });
    }

    if (id) {
      await Notification.findByIdAndUpdate(id, { read: true });
      return NextResponse.json({ message: "Marked as read" });
    }

    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ message: "Error updating" }, { status: 500 });
  }
}

// POST to create notification (internal use mostly, but can be exposed)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    // Only allow if authenticated (and maybe admin? or system can call this)
    // For now, let's allow it so we can test easily from frontend/postman
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    await connectDB();

    const notification = await Notification.create({
      ...body,
      // If user not specified in body, maybe default to current user? No, notification is FOR a user.
    });

    return NextResponse.json({ notification });
  } catch (err) {
    return NextResponse.json({ message: "Error creating" }, { status: 500 });
  }
}
