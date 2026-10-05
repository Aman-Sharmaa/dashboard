import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Employee } from "@/models/Employee";
import { ReimbursementStash } from "@/models/ReimbursementStash";

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

/** Update (upsert) stash items for an employee + month + year. Admin can update any employee; employees can update only their own stash. */
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  let { employeeId, month, year, items } = body as {
    employeeId: string;
    month: number;
    year: number;
    items: { amount: number; type?: string; note?: string; description?: string }[];
  };

  if (user.role === "employee") {
    const employee = await Employee.findOne({ email: user.email }).lean();
    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }
    employeeId = String(employee._id);
  } else if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!employeeId || !month || !year) {
    return NextResponse.json(
      { message: "employeeId, month, and year are required" },
      { status: 400 }
    );
  }

  if (month < 1 || month > 12) {
    return NextResponse.json({ message: "Month must be 1–12" }, { status: 400 });
  }

  const employeeObjId = mongoose.Types.ObjectId.isValid(employeeId)
    ? new mongoose.Types.ObjectId(employeeId)
    : null;
  if (!employeeObjId) {
    return NextResponse.json({ message: "Invalid employeeId" }, { status: 400 });
  }

  const stashItems = Array.isArray(items)
    ? items.map((i) => ({
      amount: Number(i.amount) || 0,
      type: i.type !== undefined && i.type !== null ? String(i.type) : undefined,
      note: i.note !== undefined && i.note !== null ? String(i.note) : undefined,
      description: i.description !== undefined && i.description !== null ? String(i.description) : undefined,
    }))
    : [];

  const stash = await ReimbursementStash.findOneAndUpdate(
    { employee: employeeObjId, month, year },
    { $set: { items: stashItems } },
    { upsert: true, new: true }
  ).lean();

  const raw = stash as unknown as Record<string, unknown>;
  const resultItems = (raw.items as { amount: number; type?: string; note?: string; description?: string }[] || []).map(
    (i) => ({
      amount: Number(i.amount) || 0,
      type: i.type || undefined,
      note: i.note || undefined,
      description: i.description || undefined,
    })
  );

  return NextResponse.json({
    stash: {
      month: stash.month,
      year: stash.year,
      items: resultItems,
    },
  });
}

/** Delete stash for an employee + month + year. Admin only. */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  if (!employeeId || month == null || year == null) {
    return NextResponse.json(
      { message: "employeeId, month, and year are required (query params)" },
      { status: 400 }
    );
  }

  const employeeObjId = mongoose.Types.ObjectId.isValid(employeeId)
    ? new mongoose.Types.ObjectId(employeeId)
    : null;
  if (!employeeObjId) {
    return NextResponse.json({ message: "Invalid employeeId" }, { status: 400 });
  }

  await ReimbursementStash.findOneAndDelete({
    employee: employeeObjId,
    month: Number(month),
    year: Number(year),
  });

  return NextResponse.json({ ok: true });
}
