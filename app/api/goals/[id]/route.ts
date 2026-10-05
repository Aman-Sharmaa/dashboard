import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Goal } from "@/models/Goal";

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const user = verifyToken(token);
    return user.role === "admin" ? user : null;
  } catch {
    return null;
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const targetAmount = Number(body.targetAmount);
  if (!Number.isFinite(targetAmount) || targetAmount < 0) {
    return NextResponse.json({ message: "Invalid target amount" }, { status: 400 });
  }

  await connectDB();
  const updated = await Goal.findByIdAndUpdate(id, { $set: { targetAmount } }, { new: true })
    .populate("business", "name kind")
    .lean();
  if (!updated) return NextResponse.json({ message: "Goal not found" }, { status: 404 });

  return NextResponse.json({
    goal: {
      id: String((updated as any)._id),
      year: (updated as any).year,
      targetAmount: (updated as any).targetAmount,
      business: (updated as any).business
        ? {
            id: String((updated as any).business._id),
            name: (updated as any).business.name,
            kind: (updated as any).business.kind,
          }
        : null,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await connectDB();
  const deleted = await Goal.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ message: "Goal not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
