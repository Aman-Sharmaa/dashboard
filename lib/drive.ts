import { cookies } from "next/headers";
import mongoose from "mongoose";
import { verifyToken, type JWTPayload } from "@/lib/auth";
import { DriveItem } from "@/models/DriveItem";
import { DriveQuota } from "@/models/DriveQuota";

const COOKIE_NAME = "kalp_auth_token";

export const DEFAULT_DRIVE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

export async function getAuthUserFromCookie(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function getUserDriveUsage(userId: string): Promise<number> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return 0;
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const summary = await DriveItem.aggregate([
    {
      $match: {
        owner: objectUserId,
        type: "file",
      },
    },
    { $group: { _id: null, total: { $sum: "$sizeInBytes" } } },
  ]);

  return Number(summary?.[0]?.total || 0);
}

export async function getUserDriveQuota(userId: string): Promise<number> {
  const quotaDoc = await DriveQuota.findOne({ user: userId }).select("maxBytes").lean();
  return Number(quotaDoc?.maxBytes || DEFAULT_DRIVE_QUOTA_BYTES);
}
