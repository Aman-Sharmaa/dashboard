import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { DriveItem } from "@/models/DriveItem";
import { cookies } from "next/headers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const email = body.email?.trim()?.toLowerCase();
    const name = body.name?.trim() || "Anonymous";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ message: "Invalid email" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    await connectDB();
    const item = await DriveItem.findById(id);

    if (!item) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    // If already approved, set cookie and return granted
    if (item.approvedEmails && item.approvedEmails.includes(email)) {
      const cookieStore = await cookies();
      cookieStore.set(`drive_access_${id}`, email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
      return NextResponse.json({ status: "granted" });
    }

    // Check if there's an existing approved request in accessRequests
    const existingReq = item.accessRequests?.find(r => r.email === email);
    if (existingReq?.status === "approved") {
        const cookieStore = await cookies();
        cookieStore.set(`drive_access_${id}`, email, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
        });
        return NextResponse.json({ status: "granted" });
    }

    // Add to accessRequests if not there or update pending
    if (!item.accessRequests) item.accessRequests = [];
    const index = item.accessRequests.findIndex(r => r.email === email);
    if (index === -1) {
      item.accessRequests.push({ name, email, status: "pending", requestedAt: new Date() });
      await item.save();
    } else if (item.accessRequests[index].status === "rejected") {
        // Allow re-requesting if rejected? Or just keep as is.
        // Let's allow updating the name and resetting to pending.
        item.accessRequests[index].status = "pending";
        item.accessRequests[index].name = name;
        item.accessRequests[index].requestedAt = new Date();
        await item.save();
    }


    return NextResponse.json({ status: "pending" });
  } catch (error) {
    console.error("Access request error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
