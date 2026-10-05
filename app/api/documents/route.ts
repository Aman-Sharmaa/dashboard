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

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const filter: any = {};

  // Non-admins can only see their own or public/shared docs
  if (user.role !== "admin") {
    filter.$or = [
      { owner: user.userId },
      { visibility: "public" },
      { sharedWith: user.userId },
    ];
  }

  if (q) {
    filter.title = { $regex: q, $options: "i" };
  }

  const documents = await DriveDocument.find(filter)
    .sort({ isPinned: -1, updatedAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({
    documents: documents.map((d: any) => ({
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
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const { title, content, visibility, tags } = body;

  if (!title?.trim()) {
    return NextResponse.json({ message: "Title is required" }, { status: 400 });
  }

  const doc = await DriveDocument.create({
    title: title.trim(),
    content: content || "",
    owner: user.userId,
    ownerName: (user as any).name || user.email || "Unknown",
    visibility: visibility || "private",
    tags: Array.isArray(tags) ? tags : [],
  });

  return NextResponse.json({
    document: {
      id: String(doc._id),
      title: doc.title,
      content: doc.content,
      owner: String(doc.owner),
      ownerName: doc.ownerName,
      visibility: doc.visibility,
      tags: doc.tags,
      isPinned: doc.isPinned,
      updatedAt: doc.updatedAt?.toISOString() || null,
      createdAt: doc.createdAt?.toISOString() || null,
      isOwner: true,
    },
  });
}
