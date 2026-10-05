import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { MonitorGroup } from "@/models/MonitorGroup";
import { Monitor } from "@/models/Monitor";
import { verifyToken } from "@/lib/auth";

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
  const groupRaw = await MonitorGroup.findById(id).lean();
  if (!groupRaw) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (!(await canAccessGroup(auth.userId, String(groupRaw.owner)))) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ group: groupRaw });
}

export async function PUT(
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
  if (typeof body.name === "string" && body.name.trim()) group.name = body.name.trim();
  if (typeof body.slug === "string") {
    const slug = body.slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (slug) {
      const existing = await MonitorGroup.findOne({ owner: group.owner, slug, _id: { $ne: id } });
      if (existing) return NextResponse.json({ message: "Slug already in use" }, { status: 400 });
      group.slug = slug;
    }
  }
  if (typeof body.order === "number") group.order = body.order;
  await group.save();

  return NextResponse.json({ group });
}

export async function DELETE(
  _req: NextRequest,
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

  await Monitor.deleteMany({ group: id });
  await MonitorGroup.deleteOne({ _id: id });

  return NextResponse.json({ ok: true });
}
