import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { GoalMetric } from "@/models/GoalMetric";
import { GoalTemplate } from "@/models/GoalTemplate";
import { MetricResult } from "@/models/MetricResult";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

/** GET /api/goal-templates/[id]/metrics */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const template = await GoalTemplate.findOne({ _id: id, organizationId: user.userId }).lean();
  if (!template) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const metrics = await GoalMetric.find({ goalId: id }).sort({ order: 1 }).lean();
  return NextResponse.json({ metrics: metrics.map((m) => ({ ...m, id: String(m._id) })) });
}

/** POST /api/goal-templates/[id]/metrics — add a metric */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Admin only" }, { status: 403 });

  await connectDB();
  const { id } = await params;

  const template = await GoalTemplate.findOne({ _id: id, organizationId: user.userId }).lean();
  if (!template) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json();
  const { metricName, target, unit, weight, direction, dataSource } = body;

  if (!metricName || typeof target !== "number") {
    return NextResponse.json({ message: "metricName and target are required" }, { status: 400 });
  }

  const count = await GoalMetric.countDocuments({ goalId: id });
  const metric = await GoalMetric.create({
    goalId: id,
    metricName: metricName.trim(),
    target,
    unit: unit || "",
    weight: weight || 0,
    direction: direction || "higher_is_better",
    dataSource: dataSource || "manual",
    order: count,
  });

  return NextResponse.json({ metric: { ...metric.toObject(), id: String(metric._id) } }, { status: 201 });
}

/** PATCH /api/goal-templates/[id]/metrics — update or delete a metric by metricId in body */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Admin only" }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const { metricId, ...updates } = body;

  if (!metricId) return NextResponse.json({ message: "metricId required" }, { status: 400 });

  const allowed = ["metricName", "target", "unit", "weight", "direction", "dataSource", "order"];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (key in updates) update[key] = updates[key];
  }

  const metric = await GoalMetric.findOneAndUpdate(
    { _id: metricId, goalId: id },
    { $set: update },
    { new: true }
  ).lean();

  if (!metric) return NextResponse.json({ message: "Metric not found" }, { status: 404 });

  // If target was updated, sync existing MetricResult records
  if (typeof update.target === "number") {
    await MetricResult.updateMany(
      { metricId },
      { $set: { target: update.target } }
    );
  }

  return NextResponse.json({ metric: { ...metric, id: String(metric._id) } });
}

/** DELETE /api/goal-templates/[id]/metrics?metricId=xxx */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Admin only" }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const metricId = new URL(req.url).searchParams.get("metricId");
  if (!metricId) return NextResponse.json({ message: "metricId required" }, { status: 400 });

  await MetricResult.deleteMany({ metricId });
  await GoalMetric.deleteOne({ _id: metricId, goalId: id });
  return NextResponse.json({ success: true });
}
