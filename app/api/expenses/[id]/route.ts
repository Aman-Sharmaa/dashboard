import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Expense } from "@/models/Expense";
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await connectDB();
    const body = await req.json();

    const updated = await Expense.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    )
      .populate("product", "name kind")
      .lean();

    if (!updated) return NextResponse.json({ message: "Expense not found" }, { status: 404 });

    return NextResponse.json({
      expense: {
        id: String(updated._id),
        product: updated.product && typeof updated.product === "object"
          ? { id: String((updated.product as any)._id), name: (updated.product as any).name, kind: (updated.product as any).kind }
          : null,
        type: updated.type,
        amount: updated.amount,
        frequency: updated.frequency,
        customMonths: updated.customMonths,
        remark: updated.remark,
        isPaused: Boolean(updated.isPaused),
        createdAt: updated.createdAt?.toISOString(),
      },
    });
  } catch (err) {
    console.error("PUT expense error:", err);
    return NextResponse.json({ message: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await connectDB();

    const deleted = await Expense.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ message: "Expense not found" }, { status: 404 });

    return NextResponse.json({ message: "Expense deleted" });
  } catch (err) {
    console.error("DELETE expense error:", err);
    return NextResponse.json({ message: "Failed to delete expense" }, { status: 500 });
  }
}
