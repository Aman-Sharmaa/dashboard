import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Debt } from "@/models/Debt";

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
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");   // "taken" | "given"
  const status = searchParams.get("status"); // "pending" | "settled" | "partial"

  const filter: Record<string, unknown> = { owner: user.userId };
  if (type && type !== "all") filter.type = type;
  if (status && status !== "all") filter.status = status;

  const list = await Debt.find(filter).sort({ date: -1 }).lean();

  const debts = list.map((d) => ({
    id: String(d._id),
    type: d.type,
    party: d.party,
    amount: d.amount,
    currency: d.currency,
    date: d.date,
    dueDate: d.dueDate ?? null,
    notes: d.notes ?? null,
    status: d.status,
    settledAmount: d.settledAmount ?? 0,
    createdAt: d.createdAt,
  }));

  return NextResponse.json({ debts });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const { type, party, amount, currency, date, dueDate, notes } = body;

  if (!type || !party || !amount) {
    return NextResponse.json({ message: "Type, party, and amount are required" }, { status: 400 });
  }

  const debt = await Debt.create({
    type,
    party: party.trim(),
    amount: Number(amount),
    currency: currency || "INR",
    date: date ? new Date(date) : new Date(),
    dueDate: dueDate ? new Date(dueDate) : undefined,
    notes: notes?.trim() || undefined,
    status: "pending",
    settledAmount: 0,
    owner: user.userId,
  });

  return NextResponse.json({ debt: { id: String(debt._id), ...debt.toObject() } }, { status: 201 });
}
