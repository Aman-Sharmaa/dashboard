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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { id } = await params;
  const body = await req.json();

  const debt = await Debt.findOne({ _id: id, owner: user.userId });
  if (!debt) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const { type, party, amount, currency, date, dueDate, notes, status, settledAmount } = body;

  if (type) debt.type = type;
  if (party) debt.party = party.trim();
  if (amount != null) debt.amount = Number(amount);
  if (currency) debt.currency = currency;
  if (date) debt.date = new Date(date);
  if (dueDate !== undefined) debt.dueDate = dueDate ? new Date(dueDate) : undefined;
  if (notes !== undefined) debt.notes = notes?.trim() || undefined;
  if (status) debt.status = status;
  if (settledAmount != null) debt.settledAmount = Number(settledAmount);

  await debt.save();
  return NextResponse.json({ debt: { id: String(debt._id), ...debt.toObject() } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { id } = await params;
  const debt = await Debt.findOneAndDelete({ _id: id, owner: user.userId });
  if (!debt) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({ message: "Deleted" });
}
