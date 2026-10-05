import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { Employee } from "@/models/Employee";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { sendMail } from "@/lib/mailer";
import { leaveRequestEmail } from "@/lib/email-templates";

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

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const employeeIdFromQuery = searchParams.get("employeeId");
  const statusFilter = searchParams.get("status");
  const approvalStatusFilter = searchParams.get("approvalStatus");

  let filter: any = {};

  if (statusFilter) filter.status = statusFilter;
  if (approvalStatusFilter) filter.approvalStatus = approvalStatusFilter;

  if (user.role === "admin") {
    if (employeeIdFromQuery) {
      filter.employee = employeeIdFromQuery;
    }
  } else if (user.role === "employee") {
    // Limit employees to only their own attendance
    const employee = await Employee.findOne({ email: user.email }).lean();
    if (!employee) {
      return NextResponse.json(
        { message: "Employee profile not found for this user" },
        { status: 404 }
      );
    }
    filter.employee = employee._id;
  } else {
    // Other roles (client/lead) currently have no attendance access
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const records = await Attendance.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .populate("employee", "name email")
    .lean();

  return NextResponse.json(
    {
      attendance: records.map((r) => ({
        id: String(r._id),
        employeeId: String(r.employee?._id || r.employee),
        employeeName:
          typeof r.employee === "object" && "name" in r.employee
            ? r.employee.name
            : undefined,
        employeeEmail:
          typeof r.employee === "object" && "email" in r.employee
            ? r.employee.email
            : undefined,
        date: r.date,
        status: r.status,
        leaveType: r.leaveType,
        isPaid: r.isPaid,
        approvalStatus: r.approvalStatus,
        approvedBy: r.approvedBy ? String(r.approvedBy) : null,
        reason: r.reason,
        checkInAt: r.checkInAt,
        checkOutAt: r.checkOutAt,
      })),
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Allow both employees and admins to create attendance records
  if (user.role !== "employee" && user.role !== "admin") {
    return NextResponse.json(
      { message: "Only employees and admins can create attendance requests" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { date, status, leaveType, isPaid, reason, checkInAt, checkOutAt, employeeId, leaveFrom, leaveTo } = body as {
    date?: string;
    status?: "present" | "absent" | "leave";
    leaveType?: string;
    isPaid?: boolean;
    reason?: string;
    checkInAt?: string;
    checkOutAt?: string;
    employeeId?: string;
    leaveFrom?: string;
    leaveTo?: string;
  };

  let employee;

  if (user.role === "admin") {
    // Admin can create for another employee (employeeId provided) or for self (no employeeId → lookup by email)
    if (employeeId) {
      employee = await Employee.findById(employeeId);
      if (!employee) {
        return NextResponse.json(
          { message: "Employee not found" },
          { status: 404 }
        );
      }
    } else {
      // Self-attendance: admin is also an employee
      employee = await Employee.findOne({ email: user.email });
      if (!employee) {
        return NextResponse.json(
          { message: "Employee profile not found for this user. Add yourself in Team members to use attendance." },
          { status: 404 }
        );
      }
    }
  } else {
    // Employees use their own employee record
    employee = await Employee.findOne({ email: user.email });
    if (!employee) {
      return NextResponse.json(
        { message: "Employee profile not found for this user" },
        { status: 404 }
      );
    }
  }

  if (!date || !status) {
    return NextResponse.json(
      { message: "Date and status are required" },
      { status: 400 }
    );
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json(
      { message: "Invalid date value" },
      { status: 400 }
    );
  }

  try {
    const update: Record<string, any> = {
      employee: employee._id,
      date: parsedDate,
      status,
      approvalStatus: "pending",
      approvedBy: null,
    };

    if (typeof leaveType !== "undefined") {
      update.leaveType = leaveType || undefined;
    }
    if (typeof isPaid !== "undefined") {
      update.isPaid = isPaid;
    } else {
      update.isPaid = true;
    }
    if (typeof reason !== "undefined") {
      update.reason = reason || undefined;
    }
    if (checkInAt) {
      const parsedCheckIn = new Date(checkInAt);
      if (!Number.isNaN(parsedCheckIn.getTime())) {
        update.checkInAt = parsedCheckIn;
      }
    }
    if (checkOutAt) {
      const parsedCheckOut = new Date(checkOutAt);
      if (!Number.isNaN(parsedCheckOut.getTime())) {
        update.checkOutAt = parsedCheckOut;
      }
    }
    if (leaveFrom) {
      const parsed = new Date(leaveFrom);
      if (!Number.isNaN(parsed.getTime())) update.leaveFrom = parsed;
    }
    if (leaveTo) {
      const parsed = new Date(leaveTo);
      if (!Number.isNaN(parsed.getTime())) update.leaveTo = parsed;
    }

    const record = await Attendance.findOneAndUpdate(
      { employee: employee._id, date: parsedDate },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Notifications (only notify others, never the acting user)
    try {
      const notifications: Parameters<typeof Notification.create>[0][] = [];

      // Notify the employee only if an admin is editing someone else's attendance
      if (user.role === "admin" && employee.email !== user.email) {
        const employeeUser = await User.findOne({ email: employee.email })
          .select("_id")
          .lean();
        if (employeeUser?._id) {
          notifications.push({
            user: employeeUser._id,
            type: "attendance_updated",
            title: "Attendance recorded",
            message: `Your attendance for ${parsedDate.toLocaleDateString("en-IN")} is "${status}".`,
            data: {
              attendanceId: String(record._id),
              employeeId: String(employee._id),
            },
          });
        }
      }

      // If leave request: notify ALL admin users + send email
      if (status === "leave" && user.role !== "admin") {
        const adminUsers = await User.find({ role: "admin" }).select("_id email name").lean();
        for (const admin of adminUsers) {
          notifications.push({
            user: admin._id,
            type: "leave_request",
            title: "New leave request",
            message: `${employee.name || employee.email} applied for ${leaveType || "leave"} on ${parsedDate.toLocaleDateString("en-IN")}.`,
            link: `/dashboard/people/${String(employee._id)}`,
            data: {
              attendanceId: String(record._id),
              employeeId: String(employee._id),
            },
          });

          try {
            await sendMail({
              to: admin.email,
              subject: `Leave Request: ${employee.name || employee.email}`,
              html: leaveRequestEmail({
                adminName: admin.name || "Admin",
                employeeName: employee.name || employee.email,
                date: parsedDate.toLocaleDateString("en-IN"),
                leaveType: leaveType || "Not specified",
                isPaid: isPaid !== false,
                reason,
                employeeId: String(employee._id),
              }),
            });
          } catch {
            // Email failures should not block
          }
        }
      }

      if (notifications.length > 0) {
        await Notification.create(notifications);
      }
    } catch {
      // ignore notification failures
    }

    return NextResponse.json(
      {
        attendance: {
          id: String(record._id),
          employeeId: String(employee._id),
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
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Could not save attendance record" },
      { status: 500 }
    );
  }
}

