import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    await connectDB();

    const { pageId } = await params;
    if (!pageId) return NextResponse.json({ message: "Page ID required." }, { status: 400 });

    const page = await PlanPage.findById(pageId).lean();
    if (!page) return NextResponse.json({ message: "Page not found." }, { status: 404 });

    // Visibility check
    if (auth.role !== "admin" && page.visibility !== "org" && String(page.createdBy) !== auth.userId && !page.sharedWith?.map(String).includes(auth.userId)) {
      return NextResponse.json({ message: "You do not have permission to view this page." }, { status: 403 });
    }

    return NextResponse.json({ page });
  } catch (err) {
    console.error("Plan page GET error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to fetch page." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    await connectDB();

    const { pageId } = await params;
    if (!pageId) return NextResponse.json({ message: "Page ID required." }, { status: 400 });

    const page = await PlanPage.findById(pageId);
    if (!page) return NextResponse.json({ message: "Page not found." }, { status: 404 });

    // Permission check: admin or creator
    if (auth.role !== "admin" && String(page.createdBy) !== auth.userId) {
      return NextResponse.json({ message: "You do not have permission to edit this page." }, { status: 403 });
    }

    const body = await req.json();
    if (body.name != null) page.name = String(body.name).trim();
    if (body.visibility != null) page.visibility = body.visibility;
    if (body.sharedWith != null) page.sharedWith = body.sharedWith;
    if (body.url !== undefined) page.url = body.url?.trim() || undefined;
    if (body.content !== undefined) page.content = body.content || undefined;
    if (body.projectId !== undefined) page.projectId = body.projectId || undefined;
    if (body.order != null) page.order = Number(body.order);
    if (body.isPinned !== undefined) (page as any).isPinned = body.isPinned;
    if (body.isPinnedToSidebar !== undefined) (page as any).isPinnedToSidebar = body.isPinnedToSidebar;

    await page.save();

    return NextResponse.json({
      page: {
        ...page.toObject(),
        _id: String(page._id),
        planId: String(page.planId),
      },
    });
  } catch (err) {
    console.error("Plan page PUT error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to update page." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    await connectDB();

    const { pageId } = await params;
    if (!pageId) return NextResponse.json({ message: "Page ID required." }, { status: 400 });

    const page = await PlanPage.findById(pageId);
    if (!page) return NextResponse.json({ message: "Page not found." }, { status: 404 });

    // Permission check: admin or creator
    if (auth.role !== "admin" && String(page.createdBy) !== auth.userId) {
      return NextResponse.json({ message: "You do not have permission to delete this page." }, { status: 403 });
    }

    await PlanPage.findByIdAndDelete(pageId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Plan page DELETE error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to delete page." },
      { status: 500 }
    );
  }
}
