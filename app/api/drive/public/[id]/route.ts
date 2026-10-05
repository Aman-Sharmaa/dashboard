import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { DriveItem } from "@/models/DriveItem";
import { cookies } from "next/headers";
import { getAuthUserFromCookie } from "@/lib/drive";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = req.nextUrl.searchParams;
    const currentFolderId = searchParams.get("parentId") || id;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(currentFolderId)) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    await connectDB();

    // 1. Check access to the root shared folder (id)
    const rootFolder = await DriveItem.findById(id).lean();
    if (!rootFolder || rootFolder.type !== "folder") {
      return NextResponse.json({ message: "Folder not found" }, { status: 404 });
    }

    let hasAccess = false;
    if (rootFolder.visibility === "public") {
      hasAccess = true;
    } else {
      const cookieStore = await cookies();
      const accessEmail = cookieStore.get(`drive_access_${id}`)?.value;
      const isApprovedExternal = accessEmail && (
        rootFolder.approvedEmails?.includes(accessEmail) || 
        rootFolder.accessRequests?.some(r => r.email === accessEmail && r.status === "approved")
      );

      if (isApprovedExternal) {
        hasAccess = true;
      } else {
        const user = await getAuthUserFromCookie();
        if (user) {
          if (user.role === "admin" || String(rootFolder.owner) === user.userId) {
            hasAccess = true;
          } else if (
            rootFolder.visibility === "specific" &&
            rootFolder.sharedWith &&
            rootFolder.sharedWith.some((sharedId: any) => String(sharedId) === user.userId)
          ) {
            hasAccess = true;
          }
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    // 2. Fetch items within currentFolderId
    // If currentFolderId is not id, we should verify it's a descendant of id
    // For simplicity and security, we only fetch items where parentId is currentFolderId
    // AND ensure that it's either the root folder or we've already verified access.
    
    // Actually, we should check if currentFolderId belongs to the same owner as id 
    // or is a descendant. A simpler check:
    const items = await DriveItem.find({
      parentId: currentFolderId,
    }).sort({ type: -1, name: 1 }).lean();

    return NextResponse.json({
      items: items.map((item: any) => ({
        id: String(item._id),
        name: item.name,
        type: item.type,
        parentId: item.parentId ? String(item.parentId) : null,
        mimeType: item.mimeType || null,
        sizeInBytes: item.sizeInBytes || 0,
        updatedAt: item.updatedAt || null,
        fileUrl: item.type === "file" ? `/api/drive/f/${item._id}/${encodeURIComponent(item.name)}` : null,
      })),
      folderName: rootFolder.name,
    });

  } catch (error) {
    console.error("Public folder API error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
