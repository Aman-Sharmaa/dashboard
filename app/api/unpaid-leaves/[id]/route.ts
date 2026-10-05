import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { UnpaidLeave } from "@/models/UnpaidLeave";
import { Employee } from "@/models/Employee";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

// PATCH: Admin approves/rejects an unpaid leave request
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") {
      return NextResponse.json({ message: "Admin only" }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { status, adminNote } = body;

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ message: "status must be approved or rejected" }, { status: 400 });
    }

    const leave = await UnpaidLeave.findById(id);
    if (!leave) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (leave.status !== "pending") {
      return NextResponse.json({ message: "This leave has already been reviewed" }, { status: 400 });
    }

    // Find the reviewing admin's employee record
    const adminEmployee = await Employee.findOne({ email: user.email }).select("_id").lean();

    leave.status = status;
    leave.adminNote = adminNote || undefined;
    leave.reviewedBy = adminEmployee ? (adminEmployee as any)._id : undefined;
    leave.reviewedAt = new Date();
    await leave.save();

    // If approved, increment employee's unpaidLeaveBalance
    if (status === "approved") {
      await Employee.findByIdAndUpdate(
        leave.employeeId,
        { $inc: { unpaidLeaveBalance: leave.days } }
      );
    }

    const updated = await UnpaidLeave.findById(id)
      .populate("employeeId", "name email avatarUrl")
      .populate("reviewedBy", "name email")
      .lean();

    return NextResponse.json({ leave: updated });
  } catch (error) {
    console.error("[unpaid-leaves/[id] PATCH]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// DELETE: Admin or employee can cancel/delete a pending leave
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { id } = await params;
    const leave = await UnpaidLeave.findById(id);
    if (!leave) return NextResponse.json({ message: "Not found" }, { status: 404 });

    // Employee can only delete their own pending leaves
    if (user.role !== "admin") {
      const employee = await Employee.findOne({ email: user.email }).select("_id").lean();
      if (!employee || String((employee as any)._id) !== String(leave.employeeId)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
      if (leave.status !== "pending") {
        return NextResponse.json({ message: "Cannot delete a reviewed leave" }, { status: 400 });
      }
    }

    await leave.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[unpaid-leaves/[id] DELETE]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
