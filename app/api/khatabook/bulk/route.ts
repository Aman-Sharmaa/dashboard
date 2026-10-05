import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { KhatabookEntry } from "@/models/KhatabookEntry";
import { DEFAULT_EMPLOYEE_FEATURES } from "@/lib/features";

const COOKIE_NAME = "kalp_auth_token";
const FEATURE_KEY = "khatabook";

type BulkEntryInput = {
  date?: string;
  revenue?: number;
  expense?: number;
  merchantAmount?: number;
  expenseType?: string;
  notes?: string;
  imageUrl?: string;
};

async function requireKhatabookAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const payload = verifyToken(token);
    if (payload.role === "admin") return payload;
    if (payload.role !== "employee") return null;

    await connectDB();
    const userDoc = await User.findById(payload.userId).select("featureAccess").lean();
    const featureAccess: string[] = (userDoc as any)?.featureAccess || [];
    if (featureAccess.length === 0 && DEFAULT_EMPLOYEE_FEATURES.includes(FEATURE_KEY)) {
      return payload;
    }
    if (featureAccess.includes(FEATURE_KEY)) return payload;
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireKhatabookAccess();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();
  const body = await req.json();
  const entries = Array.isArray(body?.entries) ? (body.entries as BulkEntryInput[]) : [];

  if (entries.length === 0) {
    return NextResponse.json({ message: "entries[] is required" }, { status: 400 });
  }
  if (entries.length > 1000) {
    return NextResponse.json({ message: "Maximum 1000 rows per upload" }, { status: 400 });
  }

  const validDocs: any[] = [];
  const errors: { row: number; message: string }[] = [];

  entries.forEach((row, index) => {
    const rowNo = index + 1;
    const revenue = Number(row?.revenue || 0);
    const expense = Number(row?.expense || 0);
    const merchantAmount = Number(row?.merchantAmount || 0);
    const expenseType = String(row?.expenseType || "").trim();
    const notes = String(row?.notes || "").trim();
    const imageUrl = row?.imageUrl ? String(row.imageUrl).trim() : undefined;
    const date = row?.date ? new Date(row.date) : new Date();

    if (Number.isNaN(date.getTime())) {
      errors.push({ row: rowNo, message: "Invalid date" });
      return;
    }
    if (Number.isNaN(revenue) || Number.isNaN(expense)) {
      errors.push({ row: rowNo, message: "Revenue/Expense must be valid numbers" });
      return;
    }
    if (revenue < 0 || expense < 0) {
      errors.push({ row: rowNo, message: "Revenue/Expense cannot be negative" });
      return;
    }
    if (revenue === 0 && expense === 0 && merchantAmount === 0) {
      errors.push({ row: rowNo, message: "Add revenue, expense or merchant amount" });
      return;
    }
    if (expense > 0 && !expenseType) {
      errors.push({ row: rowNo, message: "Expense type required when expense > 0" });
      return;
    }

    validDocs.push({
      date,
      revenue,
      expense,
      merchantAmount,
      expenseType: expenseType || undefined,
      notes: notes || undefined,
      imageUrl,
      createdBy: auth.userId,
    });
  });

  if (validDocs.length === 0) {
    return NextResponse.json({ message: "No valid rows found", errors }, { status: 400 });
  }

  await KhatabookEntry.insertMany(validDocs, { ordered: false });

  return NextResponse.json({
    inserted: validDocs.length,
    failed: errors.length,
    errors: errors.slice(0, 20),
  });
}
