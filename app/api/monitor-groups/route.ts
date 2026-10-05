import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { MonitorGroup } from "@/models/MonitorGroup";
import { Monitor } from "@/models/Monitor";
import { MonitorLog } from "@/models/MonitorLog";
import { User } from "@/models/User";

import { verifyToken } from "@/lib/auth";

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

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ message: "Authentication required." }, { status: 403 });

    await connectDB();
    const withStatus = req.nextUrl.searchParams.get("withStatus") === "1";

    // Find all users in the same company
    const currentUser = await User.findById(auth.userId).lean();
    let ownerIds = [auth.userId];

    if (currentUser?.company) {
      const companyUsers = await User.find({ company: currentUser.company }).select("_id").lean();
      ownerIds = companyUsers.map(u => String(u._id));
    }

    const groups = await MonitorGroup.find({ owner: { $in: ownerIds } })
      .sort({ order: 1, name: 1 })
      .lean();

    if (!withStatus) return NextResponse.json({ groups });

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const slots = 96;
    const slotMs = oneDayMs / slots;

    const groupsWithMonitors = await Promise.all(
      groups.map(async (g) => {
        const monitors = await Monitor.find({ group: g._id }).sort({ order: 1, name: 1 }).lean();
        const monitorsWithBars = await Promise.all(
          monitors.map(async (m) => {
            const logs = await MonitorLog.find({
              monitor: m._id,
              checkedAt: { $gte: new Date(now - oneDayMs) },
            })
              .sort({ checkedAt: 1 })
              .lean();
            const statusBars24h: { up: boolean; hasData: boolean; ts: number }[] = [];
            for (let i = 0; i < slots; i++) {
              const slotStart = now - oneDayMs + i * slotMs;
              const slotEnd = slotStart + slotMs;
              const inSlot = logs.filter(
                (l) =>
                  l.checkedAt &&
                  new Date(l.checkedAt).getTime() >= slotStart &&
                  new Date(l.checkedAt).getTime() < slotEnd
              );
              const up = inSlot.length ? inSlot.every((l) => l.isUp) : null;
              statusBars24h.push({ up: up === true, hasData: inSlot.length > 0, ts: slotStart });
            }
            return { ...m, statusBars24h };
          })
        );
        return { ...g, monitors: monitorsWithBars };
      })
    );

    return NextResponse.json({ groups: groupsWithMonitors });
  } catch (err) {
    console.error("Monitor groups GET error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to load monitor groups." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth || auth.role !== "admin") return NextResponse.json({ message: "Forbidden: Admin access required." }, { status: 403 });

  await connectDB();
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ message: "Group name is required" }, { status: 400 });

  const slug =
    String(name)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") || "group";
  const existing = await MonitorGroup.findOne({ owner: auth.userId, slug });
  if (existing) return NextResponse.json({ message: "Slug already in use for this workspace" }, { status: 400 });

  const count = await MonitorGroup.countDocuments({ owner: auth.userId });
  const group = await MonitorGroup.create({
    owner: auth.userId,
    name,
    slug,
    order: count,
  });

  return NextResponse.json({ group }, { status: 201 });
}
