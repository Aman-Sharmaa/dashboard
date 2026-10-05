import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { AutoDMRun } from "@/models/AutoDMRun";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const user = verifyToken(token);
    if (user.role !== "admin") return null;
    return user;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const automationId = searchParams.get("automationId");
    const limit = Number(searchParams.get("limit") || "100");

    const filter: any = { owner: admin.userId };
    if (automationId) filter.automationId = automationId;

    const runs = await AutoDMRun.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      runs: runs.map((r: any) => ({
        id: String(r._id),
        automationId: String(r.automationId),
        username: r.username,
        triggerText: r.triggerText,
        followRequired: r.followRequired,
        followVerified: r.followVerified,
        publicReplyStatus: r.publicReplyStatus,
        dmStatus: r.dmStatus,
        errorMessage: r.errorMessage,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      })),
    });
  } catch {
    return NextResponse.json({ message: "Failed to load logs" }, { status: 500 });
  }
}
