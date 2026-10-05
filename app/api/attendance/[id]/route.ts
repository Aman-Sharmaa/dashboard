import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { Employee } from "@/models/Employee";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";

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

async function requireAdmin() {
  const payload = await getAuthUser();
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await req.json();
  const { approvalStatus } = body as {
    approvalStatus?: "approved" | "rejected";
  };

  if (!approvalStatus) {
    return NextResponse.json(
      { message: "approvalStatus is required" },
      { status: 400 }
    );
  }

  const record = await Attendance.findById(id);
  if (!record) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const previousStatus = record.approvalStatus;
  record.approvalStatus = approvalStatus;
  record.approvedBy = new mongoose.Types.ObjectId(admin.userId);
  await record.save();

  // Update leave balance when leave is approved or rejected
  if (record.status === "leave" && record.isPaid && record.leaveType) {
    const employee = await Employee.findById(record.employee);
    if (employee) {
      const isCasual = record.leaveType.toLowerCase().includes("casual");
      const isSick = record.leaveType.toLowerCase().includes("sick");

      if (approvalStatus === "approved" && previousStatus !== "approved") {
        // Deduct leave balance when approved
        if (isCasual) {
          employee.casualLeaveBalance = Math.max(0, (employee.casualLeaveBalance || 0) - 1);
        } else if (isSick) {
          employee.sickLeaveBalance = Math.max(0, (employee.sickLeaveBalance || 0) - 1);
        }
      } else if (approvalStatus === "rejected" && previousStatus === "approved") {
        // Restore leave balance if previously approved and now rejected
        if (isCasual) {
          employee.casualLeaveBalance = (employee.casualLeaveBalance || 0) + 1;
        } else if (isSick) {
          employee.sickLeaveBalance = (employee.sickLeaveBalance || 0) + 1;
        }
      }
      await employee.save();
    }
  }

  // Notify employee about approval decision
  try {
    const employee = await Employee.findById(record.employee).lean();
    if (employee?.email) {
      const employeeUser = await User.findOne({ email: employee.email })
        .select("_id")
        .lean();
      if (employeeUser?._id) {
        await Notification.create({
          user: employeeUser._id,
          type: "attendance_updated",
          title: `Attendance ${approvalStatus}`,
          message: `Your attendance for ${record.date.toLocaleDateString("en-IN")} was ${approvalStatus}.`,
          data: {
            attendanceId: String(record._id),
            employeeId: String(record.employee),
          },
        });
      }
    }
  } catch {
    // ignore notification failures
  }

  return NextResponse.json(
    {
      attendance: {
        id: String(record._id),
        employeeId: String(record.employee),
        date: record.date,
        status: record.status,
        leaveType: record.leaveType,
        isPaid: record.isPaid,
        approvalStatus: record.approvalStatus,
        approvedBy: record.approvedBy
          ? String(record.approvedBy)
          : null,
        reason: record.reason,
        checkInAt: record.checkInAt,
        checkOutAt: record.checkOutAt,
      },
    },
    { status: 200 }
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const record = await Attendance.findById(id);
  if (!record) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { date, status, leaveType, reason, checkInAt, checkOutAt } = body as {
    date?: string;
    status?: "present" | "absent" | "leave";
    leaveType?: string;
    reason?: string;
    checkInAt?: string;
    checkOutAt?: string;
  };

  const isEmployee = user.role === "employee";
  if (isEmployee) {
    const employee = await Employee.findOne({ email: user.email }).lean();
    if (!employee || String(employee._id) !== String(record.employee)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    // Employees can only touch their own record and may not arbitrarily edit other fields.
    // However, we allow late check-out on a previous day's record where they already checked in.
    // "reason" is allowed to be set/updated with quick check-in/out, so we don't treat it as an extra field.
    const noOtherFields =
      date === undefined &&
      leaveType === undefined;
    const onlyCheckIn =
      checkInAt != null &&
      checkOutAt === undefined &&
      noOtherFields &&
      (status === undefined || status === "present");
    const onlyCheckOut =
      checkOutAt != null &&
      checkInAt === undefined &&
      noOtherFields &&
      status === undefined;

    const recordDate = new Date(record.date);
    const today = new Date();
    const isToday =
      recordDate.getFullYear() === today.getFullYear() &&
      recordDate.getMonth() === today.getMonth() &&
      recordDate.getDate() === today.getDate();

    // For non-today records, employees are only allowed to add a missing check-out.
    if (!isToday && !onlyCheckOut) {
      return NextResponse.json(
        { message: "You can only check in for today. For previous days you may only check out after a valid check-in." },
        { status: 403 }
      );
    }
    if (onlyCheckIn) {
      const parsedCheckIn = new Date(checkInAt);
      if (Number.isNaN(parsedCheckIn.getTime())) {
        return NextResponse.json(
          { message: "Invalid checkInAt value" },
          { status: 400 }
        );
      }
      record.checkInAt = parsedCheckIn;
      record.status = "present";
      record.approvalStatus = "pending";
      record.approvedBy = undefined;
      await record.save();
      return NextResponse.json(
        {
          attendance: {
            id: String(record._id),
            employeeId: String(record.employee),
            date: record.date,
            status: record.status,
            leaveType: record.leaveType,
            isPaid: record.isPaid,
            approvalStatus: record.approvalStatus,
            approvedBy: record.approvedBy ? String(record.approvedBy) : null,
            reason: record.reason,
            checkInAt: record.checkInAt,
            checkOutAt: record.checkOutAt,
          },
        },
        { status: 200 }
      );
    }
    if (onlyCheckOut) {
      const parsedCheckOut = new Date(checkOutAt);
      if (Number.isNaN(parsedCheckOut.getTime())) {
        return NextResponse.json(
          { message: "Invalid checkOutAt value" },
          { status: 400 }
        );
      }
      record.checkOutAt = parsedCheckOut;
      record.approvalStatus = "pending";
      record.approvedBy = undefined;
      await record.save();
      return NextResponse.json(
        {
          attendance: {
            id: String(record._id),
            employeeId: String(record.employee),
            date: record.date,
            status: record.status,
            leaveType: record.leaveType,
            isPaid: record.isPaid,
            approvalStatus: record.approvalStatus,
            approvedBy: record.approvedBy ? String(record.approvedBy) : null,
            reason: record.reason,
            checkInAt: record.checkInAt,
            checkOutAt: record.checkOutAt,
          },
        },
        { status: 200 }
      );
    }
    return NextResponse.json(
      { message: "Employees can only check in or check out for today" },
      { status: 403 }
    );
  }

  if (user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Admin: full edit
  if (date) {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid date value" },
        { status: 400 }
      );
    }
    record.date = parsedDate;
  }

  if (status) {
    record.status = status;
  }

  if (typeof leaveType !== "undefined") {
    record.leaveType = leaveType || undefined;
  }

  if (typeof reason !== "undefined") {
    record.reason = reason || undefined;
  }

  if (typeof checkInAt !== "undefined") {
    if (!checkInAt) {
      record.checkInAt = undefined;
    } else {
      const parsedCheckIn = new Date(checkInAt);
      if (Number.isNaN(parsedCheckIn.getTime())) {
        return NextResponse.json(
          { message: "Invalid checkInAt value" },
          { status: 400 }
        );
      }
      record.checkInAt = parsedCheckIn;
    }
  }

  if (typeof checkOutAt !== "undefined") {
    if (!checkOutAt) {
      record.checkOutAt = undefined;
    } else {
      const parsedCheckOut = new Date(checkOutAt);
      if (Number.isNaN(parsedCheckOut.getTime())) {
        return NextResponse.json(
          { message: "Invalid checkOutAt value" },
          { status: 400 }
        );
      }
      record.checkOutAt = parsedCheckOut;
    }
  }

  record.approvalStatus = "pending";
  record.approvedBy = undefined;

  await record.save();

  return NextResponse.json(
    {
      attendance: {
        id: String(record._id),
        employeeId: String(record.employee),
        date: record.date,
        status: record.status,
        leaveType: record.leaveType,
        isPaid: record.isPaid,
        approvalStatus: record.approvalStatus,
        approvedBy: record.approvedBy ? String(record.approvedBy) : null,
        reason: record.reason,
        checkInAt: record.checkInAt,
        checkOutAt: record.checkOutAt,
      },
    },
    { status: 200 }
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const record = await Attendance.findById(id);
  if (!record) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await Attendance.findByIdAndDelete(id);

  return NextResponse.json({ ok: true }, { status: 200 });
}


