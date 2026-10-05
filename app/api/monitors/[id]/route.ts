import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { MonitorGroup } from "@/models/MonitorGroup";
import { Monitor } from "@/models/Monitor";
import { verifyToken } from "@/lib/auth";
import { parseUpStatusCodes } from "@/lib/monitor-utils";

import { User } from "@/models/User";

const COOKIE_NAME = "kalp_auth_token";

async function requireAuth(): Promise<{ userId: string; role: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

async function canAccessGroup(userId: string, groupOwnerId: string): Promise<boolean> {
  if (userId === groupOwnerId) return true;
  const [u1, u2] = await Promise.all([
    User.findById(userId).select("company").lean(),
    User.findById(groupOwnerId).select("company").lean(),
  ]);
  return !!(u1?.company && u2?.company && u1.company === u2.company);
}

async function getGroupOwner(monitorId: string): Promise<string | null> {
  const mon = await Monitor.findById(monitorId).select("group").lean();
  if (!mon) return null;
  const g = await MonitorGroup.findById(mon.group).select("owner").lean();
  return g ? String(g.owner) : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();
  const ownerId = await getGroupOwner(id);
  if (!ownerId) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (!(await canAccessGroup(auth.userId, ownerId))) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const monitor = await Monitor.findById(id).populate("group", "name slug").lean();
  if (!monitor) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ monitor });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth || auth.role !== "admin") return NextResponse.json({ message: "Forbidden: Admin access required." }, { status: 403 });

  const { id } = await params;
  await connectDB();
  const ownerId = await getGroupOwner(id);
  if (!ownerId) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (!(await canAccessGroup(auth.userId, ownerId))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const monitor = await Monitor.findById(id);
  if (!monitor) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.name === "string" && body.name.trim()) monitor.name = body.name.trim();
  if (typeof body.url === "string" && body.url.trim()) monitor.url = body.url.trim();
  if (body.type === "api" || body.type === "http") monitor.type = body.type;
  if (["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].includes(body.method)) monitor.method = body.method;
  if (typeof body.requestBody === "string") monitor.requestBody = body.requestBody.trim() || undefined;
  if (body.upStatusCodes !== undefined) {
    monitor.upStatusCodes = parseUpStatusCodes(body.upStatusCodes);
  }
  if (typeof body.intervalMinutes === "number") monitor.intervalMinutes = Math.max(1, Math.min(60, body.intervalMinutes));
  if (typeof body.enabled === "boolean") monitor.enabled = body.enabled;
  if (typeof body.order === "number") monitor.order = body.order;
  await monitor.save();

  return NextResponse.json({ monitor });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();
  const ownerId = await getGroupOwner(id);
  if (ownerId !== auth.userId) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const { MonitorLog } = await import("@/models/MonitorLog");
  await MonitorLog.deleteMany({ monitor: id });
  await Monitor.deleteOne({ _id: id });

  return NextResponse.json({ ok: true });
}
