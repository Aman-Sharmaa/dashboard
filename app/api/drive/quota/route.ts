import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import {
  DEFAULT_DRIVE_QUOTA_BYTES,
  getAuthUserFromCookie,
  getUserDriveQuota,
  getUserDriveUsage,
} from "@/lib/drive";
import { DriveQuota } from "@/models/DriveQuota";

export async function GET(req: NextRequest) {
  const user = await getAuthUserFromCookie();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const requestedUserId = req.nextUrl.searchParams.get("userId");
  const targetUserId =
    requestedUserId && mongoose.Types.ObjectId.isValid(requestedUserId) && user.role === "admin"
      ? requestedUserId
      : user.userId;

  const [usedBytes, maxBytes] = await Promise.all([
    getUserDriveUsage(targetUserId),
    getUserDriveQuota(targetUserId),
  ]);

  return NextResponse.json({
    userId: targetUserId,
    usedBytes,
    maxBytes,
    availableBytes: Math.max(0, maxBytes - usedBytes),
    defaultBytes: DEFAULT_DRIVE_QUOTA_BYTES,
  });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUserFromCookie();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json().catch(() => ({}));
  const userId = body?.userId;
  const maxBytes = Number(body?.maxBytes);

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ message: "Valid userId is required" }, { status: 400 });
  }
  if (!Number.isFinite(maxBytes) || maxBytes < 50 * 1024 * 1024) {
    return NextResponse.json(
      { message: "maxBytes must be at least 50MB" },
      { status: 400 }
    );
  }

  await DriveQuota.findOneAndUpdate(
    { user: userId },
    { $set: { maxBytes: Math.floor(maxBytes), updatedBy: user.userId } },
    { upsert: true, new: true }
  );

  const usedBytes = await getUserDriveUsage(userId);
  return NextResponse.json({
    ok: true,
    userId,
    maxBytes: Math.floor(maxBytes),
    usedBytes,
    availableBytes: Math.max(0, Math.floor(maxBytes) - usedBytes),
  });
}
