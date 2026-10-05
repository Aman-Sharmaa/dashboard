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
    return payload;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    await connectDB();

    const { id: planId } = await params;
    if (!planId) return NextResponse.json({ message: "Plan ID required." }, { status: 400 });

    const query: any = { planId };

    // Visibility rules for pages
    if (auth.role !== "admin") {
      query.$or = [
        { visibility: "org" },
        { createdBy: auth.userId },
        { sharedWith: auth.userId }
      ];
    }

    const pages = await PlanPage.find(query).sort({ order: 1, name: 1 }).lean();
    return NextResponse.json({ pages: pages.map((p: any) => ({ ...p, _id: String(p._id), planId: String(p.planId) })) });
  } catch (err) {
    console.error("Plan pages GET error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to load pages." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    await connectDB();

    const { id: planId } = await params;
    if (!planId) return NextResponse.json({ message: "Plan ID required." }, { status: 400 });

    const plan = await Plan.findById(planId);
    if (!plan) return NextResponse.json({ message: "Plan not found." }, { status: 404 });

    const body = await req.json();
    const { name, url, content, projectId, visibility, sharedWith } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ message: "Name is required." }, { status: 400 });
    }

    const maxOrder = await PlanPage.findOne({ planId }).sort({ order: -1 }).select("order").lean();
    const order = (maxOrder?.order ?? -1) + 1;

    const page = await PlanPage.create({
      planId,
      name: name.trim(),
      url: url?.trim() || undefined,
      content: content || undefined,
      projectId: projectId || undefined,
      visibility: visibility || "org",
      sharedWith: sharedWith || [],
      createdBy: auth.userId,
      order,
    });

    return NextResponse.json({
      page: {
        ...page.toObject(),
        _id: String(page._id),
        planId: String(page.planId),
      },
    });
  } catch (err) {
    console.error("Plan page POST error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to add page." },
      { status: 500 }
    );
  }
}
