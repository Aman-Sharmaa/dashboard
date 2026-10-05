import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getAuthUserFromCookie } from "@/lib/drive";
import { DriveItem } from "@/models/DriveItem";

export async function POST(req: NextRequest) {
  const user = await getAuthUserFromCookie();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const body = await req.json().catch(() => ({}));
  const name = (body?.name || "").trim();
  const rawParentId = body?.parentId;

  if (!name) {
    return NextResponse.json({ message: "Folder name is required" }, { status: 400 });
  }

  let parentId: mongoose.Types.ObjectId | null = null;
  if (rawParentId) {
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
        { message: "You can only create folders in your own folders" },
        { status: 403 }
      );
    }
  }

  const folder = await DriveItem.create({
    owner: user.userId,
    name,
    type: "folder",
    parentId: parentId || null,
    visibility: "private",
    sharedWith: [],
    sizeInBytes: 0,
  });

  return NextResponse.json(
    {
      item: {
        id: String(folder._id),
        name: folder.name,
        type: folder.type,
        parentId: folder.parentId ? String(folder.parentId) : null,
        visibility: folder.visibility,
      },
    },
    { status: 201 }
  );
}
