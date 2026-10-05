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
    return verifyToken(token) as { userId: string; role: string };
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();
  const group = await MonitorGroup.findById(id).lean();
  if (!group) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (!(await canAccessGroup(auth.userId, String(group.owner)))) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const monitors = await Monitor.find({ group: id }).sort({ order: 1, name: 1 }).lean();
  return NextResponse.json({ monitors });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth || auth.role !== "admin") return NextResponse.json({ message: "Forbidden: Admin access required." }, { status: 403 });

  const { id } = await params;
  await connectDB();
  const group = await MonitorGroup.findById(id);
  if (!group) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (!(await canAccessGroup(auth.userId, String(group.owner)))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const url = String(body.url || "").trim();
  const type = body.type === "api" ? "api" : "http";
  const method = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].includes(body.method) ? body.method : "GET";
  const requestBody = typeof body.requestBody === "string" ? body.requestBody.trim() || undefined : undefined;
  const upStatusCodes = parseUpStatusCodes(body.upStatusCodes);
  const intervalMinutes = Math.max(1, Math.min(60, Number(body.intervalMinutes) || 5));
  const enabled = body.enabled !== false;

  if (!name || !url) return NextResponse.json({ message: "Name and URL are required" }, { status: 400 });

  const count = await Monitor.countDocuments({ group: id });
  const monitor = await Monitor.create({
    group: id,
    name,
    url,
    type,
    method,
    requestBody,
    upStatusCodes,
    intervalMinutes,
    enabled,
    order: count,
  });

  return NextResponse.json({ monitor }, { status: 201 });
}
