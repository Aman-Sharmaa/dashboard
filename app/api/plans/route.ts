import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Plan } from "@/models/Plan";
import { PlanPage } from "@/models/PlanPage";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return payload; // Returns the full payload (id, role, etc.)
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const createdBy = searchParams.get("createdBy");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const query: any = {};

    // Visibility rules
    if (auth.role !== "admin") {
      query.$or = [
        { visibility: "org" },
        { createdBy: auth.userId },
        { sharedWith: auth.userId }
      ];
    }

    if (createdBy) query.createdBy = createdBy;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) query.name = { $regex: search, $options: "i" };
    if (searchParams.get("isPinnedToSidebar") === "true") query.isPinnedToSidebar = true;

    const plans = await Plan.find(query).sort({ createdAt: -1 }).lean();

    // For now, returning flat list as requested. 
    // If they want pagination, we can add it later.
    return NextResponse.json({ plans: plans.map(p => ({ ...p, _id: String(p._id) })) });
  } catch (err) {
    console.error("Plans GET error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to load plans." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    await connectDB();

    const body = await req.json();
    const { name, parentId, visibility, sharedWith } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ message: "Name is required." }, { status: 400 });
    }

    const plan = await Plan.create({
      name: name.trim(),
      parentId: parentId || null,
      visibility: visibility || "org",
      sharedWith: sharedWith || [],
      createdBy: auth.userId,
    });

    return NextResponse.json({
      plan: {
        ...plan.toObject(),
        _id: String(plan._id),
        pages: [],
        children: [],
      },
    });
  } catch (err) {
    console.error("Plans POST error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to create plan." },
      { status: 500 }
    );
  }
}
