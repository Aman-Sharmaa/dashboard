import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MonitorGroup } from "@/models/MonitorGroup";
import { Monitor } from "@/models/Monitor";
import { MonitorLog } from "@/models/MonitorLog";

/** Public status page data by group slug. No auth. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupSlug: string }> }
) {
  const { groupSlug } = await params;
  if (!groupSlug) return NextResponse.json({ message: "Bad request" }, { status: 400 });

  await connectDB();
  const group = await MonitorGroup.findOne({ slug: groupSlug }).lean();
  if (!group) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const monitors = await Monitor.find({ group: group._id })
    .sort({ order: 1, name: 1 })
    .lean();

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const slots = 96; // 15-min slots in 24h
  const slotMs = oneDayMs / slots;

  const monitorsWithLogs = await Promise.all(
    monitors.map(async (m) => {
      const logs = await MonitorLog.find({ monitor: m._id, checkedAt: { $gte: new Date(now - oneDayMs) } })
        .sort({ checkedAt: 1 })
        .lean();
      const statusBars: { up: boolean; hasData: boolean; ts: number }[] = [];
      for (let i = 0; i < slots; i++) {
        const slotStart = now - oneDayMs + i * slotMs;
        const slotEnd = slotStart + slotMs;
        const inSlot = logs.filter(
          (l) => l.checkedAt && new Date(l.checkedAt).getTime() >= slotStart && new Date(l.checkedAt).getTime() < slotEnd
        );
        const up = inSlot.length ? inSlot.every((l) => l.isUp) : null;
        statusBars.push({ up: up === true, hasData: inSlot.length > 0, ts: slotStart });
      }
      return {
        _id: m._id,
        name: m.name,
        url: m.url,
        type: m.type,
        isUp: m.isUp,
        lastChecked: m.lastChecked,
        lastStatusCode: m.lastStatusCode,
        lastResponseTimeMs: m.lastResponseTimeMs,
        statusBars24h: statusBars,
      };
    })
  );

  return NextResponse.json({
    group: {
      _id: group._id,
      name: group.name,
      slug: group.slug,
    },
    monitors: monitorsWithLogs,
  });
}
