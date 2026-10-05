import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getAuthUserFromCookie } from "@/lib/drive";
import { DriveItem } from "@/models/DriveItem";

function normalizeSharedWith(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((id) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id))
    .map((id) => id.trim());
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromCookie();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid item id" }, { status: 400 });
  }

  const item = await DriveItem.findById(id);
  if (!item) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const canEdit = user.role === "admin" || String(item.owner) === user.userId;
  if (!canEdit) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ message: "Name cannot be empty" }, { status: 400 });
    }
    item.name = trimmed;
  }

  if (typeof body.visibility === "string") {
    if (!["private", "public", "specific"].includes(body.visibility)) {
      return NextResponse.json({ message: "Invalid visibility" }, { status: 400 });
    }
    item.visibility = body.visibility;
  }

  if ("sharedWith" in body) {
    item.sharedWith = normalizeSharedWith(body.sharedWith).map(
      (id) => new mongoose.Types.ObjectId(id)
    ) as any;
  }

  if (typeof body.approveEmail === "string") {
    const email = body.approveEmail.trim().toLowerCase();
    item.pendingEmails = (item.pendingEmails || []).filter((e: string) => e !== email);
    if (!item.approvedEmails) item.approvedEmails = [];
    if (!item.approvedEmails.includes(email)) {
      item.approvedEmails.push(email);
    }
    // Also update accessRequests
    if (item.accessRequests) {
      const idx = item.accessRequests.findIndex(r => r.email === email);
      if (idx !== -1) item.accessRequests[idx].status = "approved";
    }
  }

  if (typeof body.rejectEmail === "string") {
    const email = body.rejectEmail.trim().toLowerCase();
    item.pendingEmails = (item.pendingEmails || []).filter((e: string) => e !== email);
    // Also update accessRequests
    if (item.accessRequests) {
      const idx = item.accessRequests.findIndex(r => r.email === email);
      if (idx !== -1) item.accessRequests[idx].status = "rejected";
    }
  }

  if (typeof body.revokeEmail === "string") {
    const email = body.revokeEmail.trim().toLowerCase();
    item.approvedEmails = (item.approvedEmails || []).filter((e: string) => e !== email);
    // Also update accessRequests
    if (item.accessRequests) {
      const idx = item.accessRequests.findIndex(r => r.email === email);
      if (idx !== -1) item.accessRequests[idx].status = "pending";
    }
  }


  if ("parentId" in body) {
    if (!body.parentId || body.parentId === "root") {
      item.parentId = null as any;
    } else if (typeof body.parentId === "string" && mongoose.Types.ObjectId.isValid(body.parentId)) {
      if (body.parentId === id) {
        return NextResponse.json({ message: "Cannot move item into itself" }, { status: 400 });
      }
      const target = await DriveItem.findById(body.parentId).select("_id type owner").lean();
      if (!target || target.type !== "folder") {
        return NextResponse.json({ message: "Target folder not found" }, { status: 404 });
      }
      if (String((target as any).owner) !== String(item.owner) && user.role !== "admin") {
        return NextResponse.json(
          { message: "You can only move into folders owned by the same user" },
          { status: 400 }
        );
      }
      item.parentId = new mongoose.Types.ObjectId(body.parentId) as any;
    } else {
      return NextResponse.json({ message: "Invalid parent folder" }, { status: 400 });
    }
  }

  await item.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromCookie();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid item id" }, { status: 400 });
  }

  const item = await DriveItem.findById(id).select("_id owner type").lean();
  if (!item) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const canDelete = user.role === "admin" || String((item as any).owner) === user.userId;
  if (!canDelete) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  if (item.type === "folder") {
    const hasChildren = await DriveItem.exists({ parentId: item._id });
    if (hasChildren) {
      return NextResponse.json(
        { message: "Folder is not empty. Delete child items first." },
        { status: 400 }
      );
    }
  }

  await DriveItem.deleteOne({ _id: item._id });
  return NextResponse.json({ ok: true });
}
