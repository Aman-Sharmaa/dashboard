import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Goal } from "@/models/Goal";

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
  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;
  const filter = Number.isFinite(year) ? { year } : {};

  const goals = await Goal.find(filter)
    .populate("business", "name kind")
    .sort({ targetAmount: -1, createdAt: -1 })
    .lean();

  return NextResponse.json({
    goals: goals.map((g: any) => ({
      id: String(g._id),
      year: g.year,
      targetAmount: g.targetAmount,
      business: g.business
        ? {
            id: String(g.business._id),
            name: g.business.name,
            kind: g.business.kind,
          }
        : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json().catch(() => ({}));
  const year = Number(body.year);
  const business = typeof body.businessId === "string" ? body.businessId : "";
  const targetAmount = Number(body.targetAmount);

  if (!Number.isFinite(year) || year < 2000 || year > 9999 || !business || !Number.isFinite(targetAmount) || targetAmount < 0) {
    return NextResponse.json({ message: "Invalid goal payload" }, { status: 400 });
  }

  try {
    const created = await Goal.create({
      year,
      business,
      targetAmount,
      createdBy: user.userId,
    });
    const populated = await Goal.findById(created._id).populate("business", "name kind").lean();
    return NextResponse.json(
      {
        goal: {
          id: String((populated as any)._id),
          year: (populated as any).year,
          targetAmount: (populated as any).targetAmount,
          business: (populated as any).business
            ? {
                id: String((populated as any).business._id),
                name: (populated as any).business.name,
                kind: (populated as any).business.kind,
              }
            : null,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { message: "Goal already exists for this business and year. Edit it instead." },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: "Failed to create goal" }, { status: 500 });
  }
}
