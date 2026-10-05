import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { MetricResult } from "@/models/MetricResult";
import { GoalMetric } from "@/models/GoalMetric";
import { GoalInstance } from "@/models/GoalInstance";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

function calcAchievement(actual: number, target: number, direction: string): number {
  if (target === 0) return 0;
  if (direction === "lower_is_better") {
    return actual === 0 ? 150 : Math.min(150, (target / actual) * 100);
  }
  return Math.min(150, (actual / target) * 100);
}

/**
 * PATCH /api/metric-results
 * Body: { goalInstanceId, metricId, actual, source? }
 * Updates the actual value, recalculates achievement, appends to audit log.
 */
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const body = await req.json();
  const { goalInstanceId, metricId, actual, source = "manual" } = body;

  if (!goalInstanceId || !metricId || typeof actual !== "number") {
    return NextResponse.json(
      { message: "goalInstanceId, metricId, and actual (number) are required" },
      { status: 400 }
    );
  }

  const metric = await GoalMetric.findById(metricId).lean();
  if (!metric) return NextResponse.json({ message: "Metric not found" }, { status: 404 });

  const achievement = Math.round(
    calcAchievement(actual, (metric as any).target, (metric as any).direction)
  );

  const auditEntry = {
    value: actual,
    source,
    updatedAt: new Date(),
    updatedBy: user.email,
  };

  const result = await MetricResult.findOneAndUpdate(
    { goalInstanceId, metricId },
    {
      $set: { actual, achievement, source },
      $push: { auditLog: { $each: [auditEntry], $slice: -50 } }, // keep last 50
    },
    { new: true, upsert: true }
  ).lean();

  // Recompute overall score for the instance
  const allResults = await MetricResult.find({ goalInstanceId }).lean();
  const allMetrics = await GoalMetric.find({
    _id: { $in: allResults.map((r) => r.metricId) },
  }).lean();

  const metricMap = Object.fromEntries(allMetrics.map((m) => [String(m._id), m]));
  let totalWeight = 0;
  let weightedScore = 0;

  for (const r of allResults) {
    const m = metricMap[String(r.metricId)];
    if (!m) continue;
    const w = (m as any).weight || 0;
    totalWeight += w;
    const ach = calcAchievement(r.actual || 0, (m as any).target, (m as any).direction);
    weightedScore += (ach * w) / 100;
  }

  const overallScore = totalWeight > 0
    ? Math.round((weightedScore / totalWeight) * 100)
    : 0;

  // Determine status from score
  let status: string;
  if (overallScore >= 90) status = "completed";
  else if (overallScore > 0) status = "in_progress";
  else status = "pending";

  await GoalInstance.findByIdAndUpdate(goalInstanceId, {
    $set: { overallScore, status },
  });

  return NextResponse.json({
    result: { ...result, id: String((result as any)._id) },
    overallScore,
  });
}

/**
 * GET /api/metric-results?goalInstanceId=xxx
 * Returns all metric results for a given instance.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const goalInstanceId = new URL(req.url).searchParams.get("goalInstanceId");
  if (!goalInstanceId) return NextResponse.json({ message: "goalInstanceId required" }, { status: 400 });

  const results = await MetricResult.find({ goalInstanceId }).lean();
  return NextResponse.json({ results: results.map((r) => ({ ...r, id: String(r._id) })) });
}
