import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Monitor } from "@/models/Monitor";
import { MonitorGroup } from "@/models/MonitorGroup";
import { MonitorLog } from "@/models/MonitorLog";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

async function requireAuth(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();

  const mon = await Monitor.findById(id).select("group").lean();
  if (!mon) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const g = await MonitorGroup.findById(mon.group).select("owner").lean();
  if (!g || String(g.owner) !== auth.userId) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const limit = Math.min(500, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 96));
  const logs = await MonitorLog.find({ monitor: id })
    .sort({ checkedAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({ logs });
}
