import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { DriveDocument } from "@/models/DriveDocument";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { id } = await params;

  const doc = await DriveDocument.findById(id).lean();
  if (!doc) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const d = doc as any;
  // Check access
  if (
    user.role !== "admin" &&
    String(d.owner) !== user.userId &&
    d.visibility !== "public" &&
    !(d.sharedWith || []).includes(user.userId)
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    document: {
      id: String(d._id),
      title: d.title,
      content: d.content,
      owner: String(d.owner),
      ownerName: d.ownerName || "Unknown",
      visibility: d.visibility,
      sharedWith: d.sharedWith || [],
      tags: d.tags || [],
      isPinned: d.isPinned || false,
      updatedAt: d.updatedAt?.toISOString() || null,
      createdAt: d.createdAt?.toISOString() || null,
      isOwner: String(d.owner) === user.userId,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { id } = await params;

  const doc = await DriveDocument.findById(id);
  if (!doc) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const isOwner = String(doc.owner) === user.userId;
  if (!isOwner && user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, content, visibility, sharedWith, tags, isPinned } = body;

  if (title !== undefined) doc.title = title;
  if (content !== undefined) doc.content = content;
  if (visibility !== undefined) doc.visibility = visibility;
  if (Array.isArray(sharedWith)) doc.sharedWith = sharedWith;
  if (Array.isArray(tags)) doc.tags = tags;
  if (isPinned !== undefined) doc.isPinned = isPinned;

  await doc.save();

  return NextResponse.json({ message: "Updated" });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { id } = await params;

  const doc = await DriveDocument.findById(id);
  if (!doc) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const isOwner = String(doc.owner) === user.userId;
  if (!isOwner && user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await DriveDocument.findByIdAndDelete(id);
  return NextResponse.json({ message: "Deleted" });
}
