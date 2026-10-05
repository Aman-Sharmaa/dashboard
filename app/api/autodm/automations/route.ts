import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { AutoDMAutomation } from "@/models/AutoDMAutomation";
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

function serialize(a: any) {
  return {
    id: String(a._id),
    name: a.name,
    instagramAccountId: String(a.instagramAccountId),
    triggerType: a.triggerType || "post",
    mediaType: a.mediaType || "specific",
    mediaId: a.mediaId,
    mediaUrl: a.mediaUrl,
    commentMode: a.commentMode || "any",
    includedKeywords: a.includedKeywords || [],
    excludedKeywords: a.excludedKeywords || [],
    delayMinutes: a.delayMinutes ?? 0,
    publicReplyEnabled: a.publicReplyEnabled ?? false,
    publicReplies: a.publicReplies || [],
    followGateEnabled: a.followGateEnabled ?? false,
    followOpeningMessage: a.followOpeningMessage || "",
    mainMessage: a.mainMessage || "",
    buttons: a.buttons || [],
    status: a.status || "active",
    stats: a.stats || { runs: 0, dmsSent: 0, followsGained: 0 },
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const status = searchParams.get("status");
    
    const filter: any = { owner: admin.userId };
    if (accountId) filter.instagramAccountId = accountId;
    if (status) filter.status = status;

    const automations = await AutoDMAutomation.find(filter).sort({ createdAt: -1 }).lean();
    
    // Aggregate run stats per automation
    const ids = automations.map((a: any) => a._id);
    const stats = await AutoDMRun.aggregate([
      { $match: { automationId: { $in: ids } } },
      { $group: {
        _id: "$automationId",
        runs: { $sum: 1 },
        dmsSent: { $sum: { $cond: [{ $eq: ["$dmStatus", "sent"] }, 1, 0] } },
        followsGained: { $sum: { $cond: [{ $and: [{ $eq: ["$followRequired", true] }, { $eq: ["$followVerified", true] }] }, 1, 0] } },
      }},
    ]);

    const statsMap = new Map(stats.map((s: any) => [String(s._id), s]));
    
    return NextResponse.json({
      automations: automations.map((a: any) => {
        const s = statsMap.get(String(a._id)) || {};
        return { ...serialize(a), stats: { runs: (s as any).runs || 0, dmsSent: (s as any).dmsSent || 0, followsGained: (s as any).followsGained || 0 } };
      }),
    });
  } catch (err) {
    return NextResponse.json({ message: "Failed to load automations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const body = await req.json();
    const automation = await AutoDMAutomation.create({ ...body, owner: admin.userId });
    return NextResponse.json({ automation: serialize(automation) }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to create automation" }, { status: 500 });
  }
}
