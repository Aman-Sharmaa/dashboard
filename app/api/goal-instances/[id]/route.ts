import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { GoalInstance } from "@/models/GoalInstance";
import { GoalMetric } from "@/models/GoalMetric";
import { MetricResult } from "@/models/MetricResult";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

/** GET /api/goal-instances/[id] — single instance with results */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const instance = await GoalInstance.findById(id).lean();
  if (!instance) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const [metrics, results] = await Promise.all([
    GoalMetric.find({ goalId: instance.goalId }).sort({ order: 1 }).lean(),
    MetricResult.find({ goalInstanceId: id }).lean(),
  ]);

  return NextResponse.json({
    instance: {
      ...instance,
      id: String(instance._id),
      metrics: metrics.map((m) => ({ ...m, id: String(m._id) })),
      results: results.map((r) => ({ ...r, id: String(r._id) })),
    },
  });
}

/** PATCH /api/goal-instances/[id] — update overall score / status */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["overallScore", "expectedProgress", "status"];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const instance = await GoalInstance.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true }
  ).lean();

  if (!instance) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ instance: { ...instance, id: String(instance._id) } });
}
