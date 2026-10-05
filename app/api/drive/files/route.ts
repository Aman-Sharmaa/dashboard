import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import {
  getAuthUserFromCookie,
  getUserDriveQuota,
  getUserDriveUsage,
} from "@/lib/drive";
import { uploadDriveFile } from "@/lib/s3";
import { DriveItem } from "@/models/DriveItem";

function normalizeSharedWith(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((id) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id))
        .map((id) => id.trim());
    }
  } catch {
    // ignore
  }
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
}

export async function POST(req: NextRequest) {
  const user = await getAuthUserFromCookie();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = ((formData.get("name") as string | null) || "").trim();
  const rawParentId = ((formData.get("parentId") as string | null) || "").trim();
  const visibility = ((formData.get("visibility") as string | null) || "private").trim();
  const sharedWith = normalizeSharedWith(formData.get("sharedWith") as string | null);

  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    return NextResponse.json({ message: "File is required" }, { status: 400 });
  }

  let parentId: mongoose.Types.ObjectId | null = null;
  if (rawParentId && rawParentId !== "root") {
    if (!mongoose.Types.ObjectId.isValid(rawParentId)) {
      return NextResponse.json({ message: "Invalid parent folder" }, { status: 400 });
    }
    parentId = new mongoose.Types.ObjectId(rawParentId);
  }

  if (parentId) {
    const parent = await DriveItem.findById(parentId).select("_id owner type").lean();
    if (!parent || parent.type !== "folder") {
      return NextResponse.json({ message: "Parent folder not found" }, { status: 404 });
    }
    if (String((parent as any).owner) !== user.userId && user.role !== "admin") {
      return NextResponse.json(
        { message: "You can only upload in your own folders" },
        { status: 403 }
      );
    }
  }

  const usage = await getUserDriveUsage(user.userId);
  const quota = await getUserDriveQuota(user.userId);
  const fileSize = typeof (file as any).size === "number" ? Number((file as any).size) : 0;

  if (usage + fileSize > quota) {
    return NextResponse.json(
      { message: "Storage quota exceeded. Ask an admin to increase your drive size." },
      { status: 413 }
    );
  }

  const upload = await uploadDriveFile(file, user.userId);

  const doc = await DriveItem.create({
    owner: user.userId,
    name: name || (file as any).name || "Untitled file",
    type: "file",
    parentId: parentId || null,
    visibility:
      visibility === "public" || visibility === "specific" ? visibility : "private",
    sharedWith,
    mimeType: upload.mimeType,
    sizeInBytes: upload.sizeInBytes,
    fileUrl: upload.url,
    fileKey: upload.key,
  });

  return NextResponse.json(
    {
      item: {
        id: String(doc._id),
        name: doc.name,
        type: doc.type,
        parentId: doc.parentId ? String(doc.parentId) : null,
        visibility: doc.visibility,
        sizeInBytes: doc.sizeInBytes,
        fileUrl: `/api/drive/f/${doc._id}/${encodeURIComponent(doc.name)}`,
      },
    },
    { status: 201 }
  );
}
