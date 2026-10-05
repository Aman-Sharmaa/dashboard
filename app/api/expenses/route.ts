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

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const expenses = await Expense.find({})
      .populate("product", "name kind")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      expenses: expenses.map((e: any) => ({
        id: String(e._id),
        product: e.product && typeof e.product === "object"
          ? { id: String(e.product._id), name: e.product.name, kind: e.product.kind }
          : null,
        type: e.type,
        amount: e.amount,
        frequency: e.frequency || "monthly",
        customMonths: e.customMonths || undefined,
        remark: e.remark || "",
        isPaused: Boolean(e.isPaused),
        createdAt: e.createdAt?.toISOString(),
      })),
    });
  } catch (err) {
    console.error("GET expenses error:", err);
    return NextResponse.json({ message: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await connectDB();
    const body = await req.json();
    const { product, type, amount, frequency, customMonths, remark } = body;

    if (!product || !type || amount == null) {
      return NextResponse.json({ message: "Product, type, and amount are required" }, { status: 400 });
    }

    const expense = await Expense.create({
      product,
      type: String(type).trim(),
      amount: Number(amount),
      frequency: frequency || "monthly",
      customMonths: customMonths ? Number(customMonths) : undefined,
      remark: remark || "",
      isPaused: false,
    });

    const populated = await Expense.findById(expense._id).populate("product", "name kind").lean();

    return NextResponse.json(
      {
        expense: {
          id: String(populated!._id),
          product: populated!.product && typeof populated!.product === "object"
            ? { id: String((populated!.product as any)._id), name: (populated!.product as any).name, kind: (populated!.product as any).kind }
            : null,
          type: populated!.type,
          amount: populated!.amount,
          frequency: populated!.frequency,
          customMonths: populated!.customMonths,
          remark: populated!.remark,
          isPaused: Boolean(populated!.isPaused),
          createdAt: populated!.createdAt?.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST expense error:", err);
    return NextResponse.json({ message: "Failed to create expense" }, { status: 500 });
  }
}
