import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Reimbursement } from "@/models/Reimbursement";
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
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

/** List reimbursements for an employee (and optionally by payslipId or month/year). */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const payslipId = searchParams.get("payslipId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const filter: Record<string, unknown> = {};

  if (user.role === "admin") {
    if (employeeId) {
      filter.employee = mongoose.Types.ObjectId.isValid(employeeId)
        ? new mongoose.Types.ObjectId(employeeId)
        : employeeId;
    }
  } else {
    const employee = await Employee.findOne({ email: user.email }).lean();
    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }
    filter.employee = employee._id;
  }

  if (payslipId) filter.payslip = mongoose.Types.ObjectId.isValid(payslipId) ? new mongoose.Types.ObjectId(payslipId) : payslipId;
  if (month != null) filter.month = Number(month);
  if (year != null) filter.year = Number(year);

  const list = await Reimbursement.find(filter)
    .sort({ year: -1, month: -1, createdAt: -1 })
    .lean();

  const reimbursements = list.map((r) => ({
    id: String(r._id),
    employeeId: String(r.employee),
    payslipId: r.payslip ? String(r.payslip) : null,
    month: r.month,
    year: r.year,
    amount: r.amount,
    type: r.type || undefined,
    note: r.note || undefined,
    description: r.description || undefined,
    editRequestedAt: (r as any).editRequestedAt ?? undefined,
    editRequestNote: (r as any).editRequestNote ?? undefined,
    status: (r as any).status || "approved",
    approvedAt: (r as any).approvedAt ?? undefined,
    rejectedAt: (r as any).rejectedAt ?? undefined,
    rejectionReason: (r as any).rejectionReason ?? undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  return NextResponse.json({ reimbursements });
}

/** Create a reimbursement. If payslip exists for this employee+month+year, attach to it and update payslip totals. Admin can add for any employee; employees can add only for themselves. */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  let { employeeId, month, year, amount, type, note, description } = body as {
    employeeId: string;
    month: number;
    year: number;
    amount: number;
    type?: string;
    note?: string;
    description?: string;
  };

  if (user.role === "employee") {
    const employee = await Employee.findOne({ email: user.email }).lean();
    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }
    employeeId = String(employee._id);
  }

  if (!employeeId || month == null || year == null) {
    return NextResponse.json(
      { message: "employeeId, month, and year are required" },
      { status: 400 }
    );
  }

  const amountNum = Number(amount);
  if (Number.isNaN(amountNum) || amountNum < 0) {
    return NextResponse.json({ message: "amount must be a non-negative number" }, { status: 400 });
  }

  const employeeObjId = mongoose.Types.ObjectId.isValid(employeeId)
    ? new mongoose.Types.ObjectId(employeeId)
    : null;
  if (!employeeObjId) {
    return NextResponse.json({ message: "Invalid employeeId" }, { status: 400 });
  }

  const doc = await Reimbursement.create({
    employee: employeeObjId,
    payslip: null,
    month: Number(month),
    year: Number(year),
    amount: amountNum,
    type: type || undefined,
    note: note || undefined,
    description: description || undefined,
    status: "pending",
  });

  // Notifications: employee (requester) + admins
  try {
    const employee = await Employee.findById(employeeObjId).lean();
    const empUser = employee?.email
      ? await User.findOne({ email: employee.email }).select("_id").lean()
      : null;

    const notifications: Parameters<typeof Notification.create>[0][] = [];

    if (empUser?._id) {
      notifications.push({
        user: empUser._id,
        type: "reimbursement_created",
        title: "Reimbursement submitted",
        message: `A reimbursement of ₹${amountNum.toFixed(2)} was submitted and is pending admin approval.`,
        data: {
          reimbursementId: String(doc._id),
          payslipId: doc.payslip ? String(doc.payslip) : null,
        },
      });
    }

    // notify all admins regardless of who raised it
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    for (const a of admins) {
      notifications.push({
        user: a._id,
        type: "reimbursement_created",
        title: "Reimbursement approval required",
        message: `${employee?.name || employee?.email || "Employee"} submitted reimbursement of ₹${amountNum.toFixed(
          2
        )}. Approval is required before adding it to current month salary.`,
        data: {
          reimbursementId: String(doc._id),
          payslipId: doc.payslip ? String(doc.payslip) : null,
        },
      });
    }

    if (notifications.length > 0) {
      await Notification.create(notifications);
    }
  } catch {
    // ignore notification failures
  }

  return NextResponse.json(
    {
      reimbursement: {
        id: String(doc._id),
        employeeId: String(doc.employee),
        payslipId: doc.payslip ? String(doc.payslip) : null,
        month: doc.month,
        year: doc.year,
        amount: doc.amount,
        type: doc.type || undefined,
        note: doc.note || undefined,
        description: doc.description || undefined,
        status: (doc as any).status || "pending",
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    },
    { status: 201 }
  );
}
