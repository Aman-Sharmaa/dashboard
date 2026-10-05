import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { KhatabookEntry } from "@/models/KhatabookEntry";
import { DEFAULT_EMPLOYEE_FEATURES } from "@/lib/features";

const COOKIE_NAME = "kalp_auth_token";
const FEATURE_KEY = "khatabook";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireKhatabookAccess();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();

  const entry = await KhatabookEntry.findById(id);
  if (!entry) return NextResponse.json({ message: "Entry not found" }, { status: 404 });
  if (auth.role === "employee" && String(entry.createdBy) !== auth.userId) {
    return NextResponse.json({ message: "You can edit only your own entries" }, { status: 403 });
  }

  const body = await req.json();
  const date = body?.date ? new Date(body.date) : entry.date;
  const revenue = body?.revenue !== undefined ? Number(body.revenue) : entry.revenue;
  const expense = body?.expense !== undefined ? Number(body.expense) : entry.expense;
  const merchantAmount = body?.merchantAmount !== undefined ? Number(body.merchantAmount) : entry.merchantAmount;
  const expenseType = body?.expenseType !== undefined ? String(body.expenseType || "").trim() : entry.expenseType;
  const notes = body?.notes !== undefined ? String(body.notes || "").trim() : entry.notes;
  const imageUrl = body?.imageUrl !== undefined ? String(body.imageUrl || "").trim() : entry.imageUrl;
  const areaId = body?.areaId !== undefined ? String(body.areaId || "").trim() : entry.area;

  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  }
  if (Number.isNaN(revenue) || Number.isNaN(expense)) {
    return NextResponse.json({ message: "Revenue and expense must be valid numbers" }, { status: 400 });
  }
  if (revenue < 0 || expense < 0) {
    return NextResponse.json({ message: "Revenue and expense cannot be negative" }, { status: 400 });
  }
  if (revenue === 0 && expense === 0 && merchantAmount === 0) {
    return NextResponse.json({ message: "Add at least revenue, expense or merchant amount paid" }, { status: 400 });
  }
  if (expense > 0 && !expenseType) {
    return NextResponse.json({ message: "Expense type is required when expense is added" }, { status: 400 });
  }

  entry.date = date;
  entry.revenue = revenue;
  entry.expense = expense;
  entry.merchantAmount = merchantAmount;
  entry.expenseType = expenseType || undefined;
  entry.notes = notes || undefined;
  entry.imageUrl = imageUrl || undefined;
  (entry as any).area = areaId || undefined;
  await entry.save();

  return NextResponse.json({
    entry: {
      id: String(entry._id),
      date: entry.date,
      revenue: entry.revenue,
      expense: entry.expense,
      merchantAmount: entry.merchantAmount,
      expenseType: entry.expenseType || "",
      notes: entry.notes || "",
      imageUrl: entry.imageUrl || "",
      area: (entry as any).area ? String((entry as any).area) : undefined,
      profit: entry.revenue - (entry.merchantAmount + entry.expense),
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireKhatabookAccess();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();

  const entry = await KhatabookEntry.findById(id);
  if (!entry) return NextResponse.json({ message: "Entry not found" }, { status: 404 });
  if (auth.role === "employee" && String(entry.createdBy) !== auth.userId) {
    return NextResponse.json({ message: "You can delete only your own entries" }, { status: 403 });
  }

  const deleted = await KhatabookEntry.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ message: "Entry not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
