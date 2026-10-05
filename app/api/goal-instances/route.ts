import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { GoalTemplate } from "@/models/GoalTemplate";
import { GoalMetric } from "@/models/GoalMetric";
import { GoalInstance } from "@/models/GoalInstance";
import { MetricResult } from "@/models/MetricResult";
import { Employee } from "@/models/Employee";
import { getEmployeeWorkScope } from "@/lib/employee-work-scope";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

/**
 * Calculate expected progress (%) based on elapsed working time.
 * workStart/workEnd: "HH:MM" strings. now: current Date.
 */
function calcExpectedProgress(
  workStart: string,
  workEnd: string,
  now: Date
): number {
  const [sh, sm] = workStart.split(":").map(Number);
  const [eh, em] = workEnd.split(":").map(Number);
  const startMs = sh * 60 + sm;
  const endMs = eh * 60 + em;
  const nowMs = now.getHours() * 60 + now.getMinutes();
  if (nowMs <= startMs) return 0;
  if (nowMs >= endMs) return 100;
  return Math.round(((nowMs - startMs) / (endMs - startMs)) * 100);
}

/**
 * Calculate weighted overall score for a goal instance.
 */
function calcOverallScore(
  metrics: Array<{ weight: number; direction: string; target: number }>,
  results: Array<{ metricId: string; actual: number; target: number }>
): number {
  const resultMap = Object.fromEntries(results.map((r) => [String(r.metricId), r]));
  let totalWeight = 0;
  let weightedScore = 0;

  for (const m of metrics) {
    const weight = m.weight || 0;
    totalWeight += weight;
    const r = resultMap[String((m as any)._id || (m as any).id)];
    if (!r || m.target === 0) continue;
    const actual = r.actual || 0;
    let achievement: number;
    if (m.direction === "lower_is_better") {
      // For lower-is-better: achievement = target/actual * 100 (capped at 150%)
      achievement = actual === 0 ? 150 : Math.min(150, (m.target / actual) * 100);
    } else {
      achievement = Math.min(150, (actual / m.target) * 100);
    }
    weightedScore += (achievement * weight) / 100;
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedScore / totalWeight) * 100);
}

/**
 * Ensure today's GoalInstance exists for a given template and specific owner.
 * Also creates MetricResult stubs if missing.
 */
async function ensureTodayInstance(
  template: any,
  ownerId: string | any,
  metrics: any[],
  today: Date,
  employeeWorkStart: string,
  employeeWorkEnd: string
) {
  const periodStart = new Date(today);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(today);
  periodEnd.setHours(23, 59, 59, 999);

  let instance = await GoalInstance.findOne({
    goalId: template._id,
    ownerId,
    periodStart,
  }).lean();

  if (!instance) {
    const expectedProgress = calcExpectedProgress(employeeWorkStart, employeeWorkEnd, new Date());
    instance = (await GoalInstance.create({
      goalId: template._id,
      ownerId,
      periodStart,
      periodEnd,
      overallScore: 0,
      expectedProgress,
      status: "pending",
    })).toObject();
  }

  // Ensure MetricResult stubs exist
  const existingResults = await MetricResult.find({ goalInstanceId: instance._id }).lean();
  const existingMetricIds = new Set(existingResults.map((r) => String(r.metricId)));

  for (const m of metrics) {
    if (!existingMetricIds.has(String(m._id))) {
      await MetricResult.create({
        goalInstanceId: instance._id,
        metricId: m._id,
        target: m.target,
        actual: 0,
        achievement: 0,
        source: "manual",
        auditLog: [],
      });
    }
  }

  return instance;
}

/**
 * GET /api/goal-instances
 * Query params:
 *   - date: ISO date string (defaults to today)
 *   - ownerId: filter by employee
 *   - range: "today" | "yesterday" | "week" | "month"
 *   - ensureToday: "1" — auto-create today's instances for all active templates
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const ownerId = searchParams.get("ownerId");
  const ensureToday = searchParams.get("ensureToday") === "1";
  const range = searchParams.get("range") || "today";

  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  switch (range) {
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      periodStart = new Date(y); periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(y); periodEnd.setHours(23, 59, 59, 999);
      break;
    }
    case "week": {
      periodStart = new Date(now); periodStart.setDate(now.getDate() - 6); periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(now); periodEnd.setHours(23, 59, 59, 999);
      break;
    }
    case "month": {
      periodStart = new Date(now); periodStart.setDate(now.getDate() - 29); periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(now); periodEnd.setHours(23, 59, 59, 999);
      break;
    }
    default: {
      periodStart = new Date(now); periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(now); periodEnd.setHours(23, 59, 59, 999);
      break;
    }
  }

  // Auto-create today's instances if requested (called on page load)
  if (ensureToday && range === "today") {
    const activeTemplates = await GoalTemplate.find({
      organizationId: user.userId,
      status: "active",
      workType: "goal",
      startDate: { $lte: now },
      $or: [{ noEndDate: true }, { endDate: { $gte: now } }],
    }).lean();

    // Get today's day of week (0=Sun … 6=Sat)
    const todayDow = now.getDay();

    const allOwnerIds = [
      ...new Set(
        activeTemplates.flatMap((t) => [
          ...(Array.isArray(t.ownerIds) ? t.ownerIds.map(String) : []),
          String(t.ownerId),
        ]).filter(Boolean)
      ),
    ];
    const employees = await Employee.find({ _id: { $in: allOwnerIds } })
      .select("workStartTime workEndTime")
      .lean();
    const empMap = Object.fromEntries(employees.map((e) => [String(e._id), e]));

    for (const template of activeTemplates) {
      if (!template.workingDays.includes(todayDow)) continue;
      const metrics = await GoalMetric.find({ goalId: template._id }).lean();

      const targetOwnerIds = Array.isArray(template.ownerIds) && template.ownerIds.length > 0
        ? template.ownerIds.map(String)
        : [String(template.ownerId)];

      for (const oId of targetOwnerIds) {
        const emp = empMap[oId];
        const workStart = (emp as any)?.workStartTime || "09:00";
        const workEnd = (emp as any)?.workEndTime || "18:00";
        await ensureTodayInstance(template, oId, metrics, now, workStart, workEnd).catch(() => {});
      }
    }
  }

  // Query instances
  const instanceQuery: Record<string, any> = {
    periodStart: { $gte: periodStart, $lte: periodEnd },
  };
  if (ownerId) instanceQuery.ownerId = ownerId;
  // For employees, only show their own instances
  if (user.role === "employee") {
    const scope = await getEmployeeWorkScope(user.email);
    const allowedIds = scope.employeeIds.map(String);
    instanceQuery.ownerId = ownerId && allowedIds.includes(ownerId)
      ? ownerId
      : { $in: scope.employeeIds };
  }

  const instances = await GoalInstance.find(instanceQuery)
    .sort({ periodStart: -1 })
    .lean();

  const instanceIds = instances.map((i) => i._id);
  const goalIds = [...new Set(instances.map((i) => String(i.goalId)))];

  const [templates, allMetrics, allResults, allOwners] = await Promise.all([
    GoalTemplate.find({ _id: { $in: goalIds } }).lean(),
    GoalMetric.find({ goalId: { $in: goalIds } }).sort({ order: 1 }).lean(),
    MetricResult.find({ goalInstanceId: { $in: instanceIds } }).lean(),
    Employee.find({ _id: { $in: instances.map((i) => i.ownerId) } })
      .select("name email avatarUrl title workStartTime workEndTime")
      .lean(),
  ]);

  const templateMap = Object.fromEntries(templates.map((t) => [String(t._id), t]));
  const metricsByGoal = allMetrics.reduce<Record<string, any[]>>((acc, m) => {
    const k = String(m.goalId);
    if (!acc[k]) acc[k] = [];
    acc[k].push(m);
    return acc;
  }, {});
  const resultsByInstance = allResults.reduce<Record<string, any[]>>((acc, r) => {
    const k = String(r.goalInstanceId);
    if (!acc[k]) acc[k] = [];
    acc[k].push(r);
    return acc;
  }, {});
  const ownerMap = Object.fromEntries(allOwners.map((e) => [String(e._id), e]));

  // Update expectedProgress for today's instances
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  const enriched = instances
    .filter((inst) => {
      const template = templateMap[String(inst.goalId)];
      return template && template.status === "active";
    })
    .map((inst) => {
      const template = templateMap[String(inst.goalId)];
      const metrics = metricsByGoal[String(inst.goalId)] || [];
      const results = resultsByInstance[String(inst._id)] || [];
      const owner = ownerMap[String(inst.ownerId)];

      // Recalculate expected progress for today
      let expectedProgress = inst.expectedProgress;
      if (inst.periodStart >= todayStart && owner) {
        const ws = (owner as any).workStartTime || "09:00";
        const we = (owner as any).workEndTime || "18:00";
        expectedProgress = calcExpectedProgress(ws, we, now);
      }

      // Calculate per-metric achievement
      const enrichedResults = results.map((r) => {
        const metric = metrics.find((m) => String(m._id) === String(r.metricId));
        let achievement = 0;
        if (metric && metric.target > 0) {
          if (metric.direction === "lower_is_better") {
            achievement = r.actual === 0 ? 150 : Math.min(150, (metric.target / r.actual) * 100);
          } else {
            achievement = Math.min(150, (r.actual / metric.target) * 100);
          }
        }
        return {
          ...r,
          id: String(r._id),
          metricId: String(r.metricId),
          metricName: metric?.metricName || "",
          unit: metric?.unit || "",
          weight: metric?.weight || 0,
          direction: metric?.direction || "higher_is_better",
          achievement: Math.round(achievement),
        };
      });

      // Compute overall weighted score
      const overallScore = calcOverallScore(metrics, results);

      return {
        ...inst,
        id: String(inst._id),
        goalId: String(inst.goalId),
        ownerId: String(inst.ownerId),
        template: template ? { ...template, id: String(template._id) } : null,
        metrics: metrics.map((m) => ({ ...m, id: String(m._id) })),
        results: enrichedResults,
        overallScore,
        expectedProgress,
        owner: owner ? { ...owner, id: String((owner as any)._id) } : null,
      };
    });

  return NextResponse.json({ instances: enriched });
}

/** POST /api/goal-instances — manually create an instance */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Admin only" }, { status: 403 });

  await connectDB();

  const body = await req.json();
  const { goalId, ownerId, periodStart, periodEnd } = body;

  if (!goalId || !ownerId || !periodStart || !periodEnd) {
    return NextResponse.json({ message: "goalId, ownerId, periodStart, periodEnd required" }, { status: 400 });
  }

  const template = await GoalTemplate.findOne({ _id: goalId, organizationId: user.userId }).lean();
  if (!template) return NextResponse.json({ message: "Goal not found" }, { status: 404 });

  const metrics = await GoalMetric.find({ goalId }).lean();

  const instance = await GoalInstance.create({
    goalId,
    ownerId,
    periodStart: new Date(periodStart),
    periodEnd: new Date(periodEnd),
    overallScore: 0,
    expectedProgress: 0,
    status: "pending",
  });

  // Create metric result stubs
  for (const m of metrics) {
    await MetricResult.create({
      goalInstanceId: instance._id,
      metricId: m._id,
      target: m.target,
      actual: 0,
      achievement: 0,
      source: "manual",
      auditLog: [],
    });
  }

  return NextResponse.json({ instance: { ...instance.toObject(), id: String(instance._id) } }, { status: 201 });
}
