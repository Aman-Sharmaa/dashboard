import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import { Employee } from "@/models/Employee";

const COOKIE_NAME = "kalp_auth_token";

async function getUserFromCookie() {
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
  const auth = await getUserFromCookie();
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  if (!employeeId) {
    return NextResponse.json({ message: "employeeId required" }, { status: 400 });
  }

  const employee = await Employee.findById(employeeId).lean();
  if (!employee) {
    return NextResponse.json({ message: "Employee not found" }, { status: 404 });
  }

  const leaves = await Attendance.find({
    employee: employeeId,
    status: "leave",
  })
    .sort({ date: -1 })
    .lean();

  const monthlyBreakdown: Record<string, { month: string; casual: number; sick: number; unpaid: number; total: number }> = {};
  for (const l of leaves) {
    const d = new Date(l.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!monthlyBreakdown[key]) {
      monthlyBreakdown[key] = { month: label, casual: 0, sick: 0, unpaid: 0, total: 0 };
    }
    const entry = monthlyBreakdown[key];
    const lt = (l.leaveType || "").toLowerCase();
    if (lt.includes("casual")) entry.casual++;
    else if (lt.includes("sick")) entry.sick++;
    else if (lt.includes("unpaid") || !l.isPaid) entry.unpaid++;
    else entry.casual++;
    entry.total++;
  }

  const sorted = Object.entries(monthlyBreakdown)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, v]) => v);

  return NextResponse.json({
    balance: {
      casualLeaveBalance: employee.casualLeaveBalance ?? 0,
      casualLeaveTotal: employee.casualLeaveTotal ?? 0,
      sickLeaveBalance: employee.sickLeaveBalance ?? 0,
      sickLeaveTotal: employee.sickLeaveTotal ?? 0,
    },
    monthlyBreakdown: sorted,
    totalLeaves: leaves.length,
  });
}
