import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getAuthUserFromCookie } from "@/lib/drive";
import { cookies } from "next/headers";
import { DriveItem } from "@/models/DriveItem";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  try {
    const { id, name } = await params;

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid file ID" }, { status: 400 });
    }

    const item = await DriveItem.findById(id).lean();

    if (!item || item.type !== "file") {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    // Access control check
    if (item.visibility !== "public") {
      const cookieStore = await cookies();
      const accessEmail = cookieStore.get(`drive_access_${id}`)?.value;
      const isApprovedExternal = accessEmail && item.approvedEmails?.includes(accessEmail);

      if (!isApprovedExternal) {
        const user = await getAuthUserFromCookie();
        if (!user) {
          return NextResponse.redirect(new URL(`/dashboard/drive`, req.url));
        }

        if (String(item.owner) !== user.userId && user.role !== "admin") {
          if (item.visibility === "private" || !item.visibility) {
            return NextResponse.redirect(new URL(`/dashboard/drive`, req.url));
          }
          if (
            item.visibility === "specific" &&
            (!item.sharedWith || !item.sharedWith.some((sharedId: any) => String(sharedId) === user.userId))
          ) {
            return NextResponse.redirect(new URL(`/dashboard/drive`, req.url));
          }
        }
      }
    }

    const mimeType = item.mimeType || "application/octet-stream";

    // Handle local file resolution from public uploads
    const cleanKey = (item.fileKey || item.fileUrl || "").replace(/^\/+/, "");
    if (cleanKey.startsWith("uploads/")) {
      const filePath = path.join(process.cwd(), "public", cleanKey);
      if (fs.existsSync(filePath)) {
        const fileStream = fs.createReadStream(filePath);
        return new NextResponse(fileStream as any, {
          headers: {
            "Content-Type": mimeType,
            "Content-Disposition": `inline; filename="${encodeURIComponent(item.name || name)}"`,
          },
        });
      }
    }

    // External URL fallback if applicable
    if (item.fileUrl && item.fileUrl.startsWith("http")) {
      try {
        const externalRes = await fetch(item.fileUrl);
        if (externalRes.ok) {
          return new NextResponse(externalRes.body as any, {
            headers: {
              "Content-Type": externalRes.headers.get("content-type") || mimeType,
              "Content-Length": externalRes.headers.get("content-length") || "",
              "Content-Disposition": `inline; filename="${encodeURIComponent(item.name || name)}"`,
            } as any,
          });
        }
      } catch {
        // fall through
      }
    }

    return NextResponse.json({ message: "File not found on server" }, { status: 404 });
  } catch (error: any) {
    console.error("Error streaming file:", error);
    return NextResponse.json({ message: "Failed to load file" }, { status: 500 });
  }
}
