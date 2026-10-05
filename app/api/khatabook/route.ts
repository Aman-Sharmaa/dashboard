import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { KhatabookEntry } from "@/models/KhatabookEntry";
import { KhatabookArea } from "@/models/KhatabookArea";
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

function parseDateRange(req: NextRequest): { start: Date; end: Date } {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "monthly";

  if (view === "daily") {
    const rawDate = searchParams.get("date");
    const date = rawDate ? new Date(rawDate) : new Date();
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (view === "custom") {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && to) {
      const start = new Date(from);
      start.setHours(0, 0, 0, 0);
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }

  const monthRaw = searchParams.get("month"); // YYYY-MM
  const now = new Date();
  const year = monthRaw ? Number(monthRaw.split("-")[0]) : now.getFullYear();
  const monthIndex = monthRaw ? Number(monthRaw.split("-")[1]) - 1 : now.getMonth();
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function GET(req: NextRequest) {
  const auth = await requireKhatabookAccess();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();
  const { start, end } = parseDateRange(req);
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const areaId = searchParams.get("areaId");

  const filter: Record<string, unknown> = {
    date: { $gte: start, $lte: end },
  };

  // Employees can only see their own entries.
  if (auth.role === "employee") {
    filter.createdBy = auth.userId;
  } else if (auth.role === "admin" && employeeId) {
    filter.createdBy = employeeId;
  }

  if (areaId && areaId !== "all") {
    filter.area = areaId;
  }

  const rows = await KhatabookEntry.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .populate("createdBy", "name email")
    .populate("area", "name")
    .lean();

  const entries = rows.map((row: any) => ({
    id: String(row._id),
    date: row.date,
    revenue: row.revenue || 0,
    expense: row.expense || 0,
    merchantAmount: row.merchantAmount || 0,
    expenseType: row.expenseType || "",
    notes: row.notes || "",
    imageUrl: row.imageUrl || "",
    profit: (row.revenue || 0) - ((row.merchantAmount || 0) + (row.expense || 0)),
    createdBy: row.createdBy
      ? {
          id: String(row.createdBy._id),
          name: row.createdBy.name || "",
          email: row.createdBy.email || "",
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    area: row.area ? { id: String(row.area._id), name: row.area.name } : null,
  }));

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const auth = await requireKhatabookAccess();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();

  const body = await req.json();
  const revenue = Number(body?.revenue || 0);
  const expense = Number(body?.expense || 0);
  const merchantAmount = Number(body?.merchantAmount || 0);
  const expenseType = String(body?.expenseType || "").trim();
  const notes = String(body?.notes || "").trim();
  const imageUrl = body?.imageUrl ? String(body.imageUrl) : undefined;
  const areaId = body?.areaId ? String(body.areaId) : undefined;
  const date = body?.date ? new Date(body.date) : new Date();

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
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  }

  const entry = await KhatabookEntry.create({
    date,
    revenue,
    expense,
    merchantAmount,
    expenseType: expenseType || undefined,
    notes: notes || undefined,
    imageUrl,
    area: areaId || undefined,
    createdBy: auth.userId,
  });

  return NextResponse.json(
    {
      entry: {
        id: String(entry._id),
        date: entry.date,
        revenue: entry.revenue,
        expense: entry.expense,
        merchantAmount: entry.merchantAmount,
        expenseType: entry.expenseType || "",
        notes: entry.notes || "",
        imageUrl: entry.imageUrl || "",
        area: entry.area ? String(entry.area) : undefined,
        profit: entry.revenue - (entry.merchantAmount + entry.expense),
      },
    },
    { status: 201 }
  );
}
