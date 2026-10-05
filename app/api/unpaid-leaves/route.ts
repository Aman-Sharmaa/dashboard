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

// GET: List unpaid leaves
// Admin: all leaves. Employee: only their own.
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const isAdmin = user.role === "admin";

    // Find employee record
    const employee = await Employee.findOne({ email: user.email }).select("_id").lean();
    if (!employee && !isAdmin) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    const query: Record<string, any> = {};
    if (!isAdmin) {
      query.employeeId = (employee as any)._id;
    } else if (searchParams.get("employeeId")) {
      query.employeeId = searchParams.get("employeeId");
    }
    if (statusFilter) query.status = statusFilter;

    const leaves = await UnpaidLeave.find(query)
      .populate("employeeId", "name email avatarUrl")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ leaves });
  } catch (error) {
    console.error("[unpaid-leaves GET]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// POST: Employee applies for unpaid leave
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const employee = await Employee.findOne({ email: user.email }).select("_id").lean();
    if (!employee) return NextResponse.json({ message: "Employee not found" }, { status: 404 });

    const body = await req.json();
    const { reason, startDate, endDate, days } = body;

    if (!reason || !startDate || !endDate || !days) {
      return NextResponse.json({ message: "reason, startDate, endDate and days are required" }, { status: 400 });
    }

    if (days <= 0) {
      return NextResponse.json({ message: "Days must be greater than 0" }, { status: 400 });
    }

    const leave = await UnpaidLeave.create({
      employeeId: (employee as any)._id,
      reason,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      days: Number(days),
      status: "pending",
    });

    return NextResponse.json({ leave }, { status: 201 });
  } catch (error) {
    console.error("[unpaid-leaves POST]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
