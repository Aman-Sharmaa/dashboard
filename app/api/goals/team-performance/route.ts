import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { GoalInstance } from "@/models/GoalInstance";
import { GoalTemplate } from "@/models/GoalTemplate";
import { GoalMetric } from "@/models/GoalMetric";
import { MetricResult } from "@/models/MetricResult";
import { Task } from "@/models/Task";
import { Employee } from "@/models/Employee";

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

function getScoreStatus(score: number) {
  if (score >= 90) return { label: "Excellent", color: "green", emoji: "🟢" };
  if (score >= 75) return { label: "On Track", color: "green", emoji: "🟢" };
  if (score >= 60) return { label: "Needs Attention", color: "yellow", emoji: "🟡" };
  return { label: "Behind", color: "red", emoji: "🔴" };
}

/**
 * GET /api/goals/team-performance
 * Returns today's aggregated team performance:
 * - Per-employee: goal score, task completion, overall score
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const managerId = searchParams.get("managerId");

  const today = new Date();
  const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);

  // Get all active employees
  const empQuery: Record<string, any> = { isDismissed: { $ne: true } };
  const employees = await Employee.find(empQuery)
    .select("name email avatarUrl title department manager workStartTime workEndTime")
    .lean();

  const employeeIds = employees.map((e) => (e as any)._id);
  const empMap = Object.fromEntries(employees.map((e) => [String((e as any)._id), e]));

  // Get today's goal instances for all employees
  const instances = await GoalInstance.find({
    ownerId: { $in: employeeIds },
    periodStart: { $gte: todayStart, $lte: todayEnd },
  }).lean();

  const instanceIds = instances.map((i) => i._id);
  const goalIds = [...new Set(instances.map((i) => String(i.goalId)))];

  const [allMetrics, allResults] = await Promise.all([
    GoalMetric.find({ goalId: { $in: goalIds } }).lean(),
    MetricResult.find({ goalInstanceId: { $in: instanceIds } }).lean(),
  ]);

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

  // Group instances by owner
  const instancesByOwner = instances.reduce<Record<string, any[]>>((acc, inst) => {
    const k = String(inst.ownerId);
    if (!acc[k]) acc[k] = [];
    acc[k].push(inst);
    return acc;
  }, {});

  // Get today's tasks per employee (assigned, completed)
  const tasksByEmployee: Record<string, { total: number; done: number }> = {};
  const tasks = await Task.find({
    assignees: { $in: employeeIds },
    createdAt: { $lte: todayEnd },
  }).select("assignees status").lean();

  for (const task of tasks) {
    for (const assigneeId of (task as any).assignees) {
      const k = String(assigneeId);
      if (!tasksByEmployee[k]) tasksByEmployee[k] = { total: 0, done: 0 };
      tasksByEmployee[k].total += 1;
      if (task.status === "done") tasksByEmployee[k].done += 1;
    }
  }

  // Build per-employee performance summary
  const teamPerformance = employees.map((emp) => {
    const empId = String((emp as any)._id);
    const empInstances = instancesByOwner[empId] || [];

    // Compute goal score across all of today's instances
    let totalGoalScore = 0;
    let goalCount = 0;
    const goalDetails: any[] = [];

    for (const inst of empInstances) {
      const metrics = metricsByGoal[String(inst.goalId)] || [];
      const results = resultsByInstance[String(inst._id)] || [];
      const metricMap = Object.fromEntries(results.map((r) => [String(r.metricId), r]));

      let totalWeight = 0;
      let weightedScore = 0;
      const kpiBreakdown: any[] = [];

      for (const m of metrics) {
        const w = (m as any).weight || 0;
        totalWeight += w;
        const r = metricMap[String(m._id)];
        const actual = r?.actual || 0;
        const ach = calcAchievement(actual, (m as any).target, (m as any).direction);
        weightedScore += (ach * w) / 100;
        kpiBreakdown.push({
          metricName: (m as any).metricName,
          target: (m as any).target,
          actual,
          unit: (m as any).unit || "",
          achievement: Math.round(ach),
          direction: (m as any).direction,
        });
      }

      const instanceScore = totalWeight > 0
        ? Math.round((weightedScore / totalWeight) * 100)
        : 0;

      goalDetails.push({
        instanceId: String(inst._id),
        goalId: String(inst.goalId),
        score: instanceScore,
        kpiBreakdown,
      });

      totalGoalScore += instanceScore;
      goalCount++;
    }

    const avgGoalScore = goalCount > 0 ? Math.round(totalGoalScore / goalCount) : null;
    const taskStats = tasksByEmployee[empId] || { total: 0, done: 0 };

    // Overall score: 70% goal + 30% tasks (configurable later)
    let overallScore: number | null = null;
    if (avgGoalScore !== null || taskStats.total > 0) {
      const goalComponent = avgGoalScore !== null ? avgGoalScore * 0.7 : 0;
      const taskComponent = taskStats.total > 0
        ? ((taskStats.done / taskStats.total) * 100) * 0.3
        : 0;
      const denominator = (avgGoalScore !== null ? 0.7 : 0) + (taskStats.total > 0 ? 0.3 : 0);
      overallScore = denominator > 0 ? Math.round((goalComponent + taskComponent) / denominator) : null;
    }

    return {
      id: empId,
      name: (emp as any).name,
      email: (emp as any).email,
      avatarUrl: (emp as any).avatarUrl || null,
      title: (emp as any).title || "",
      department: (emp as any).department || "",
      manager: (emp as any).manager || "",
      goalScore: avgGoalScore,
      goalStatus: avgGoalScore !== null ? getScoreStatus(avgGoalScore) : null,
      tasks: taskStats,
      overallScore,
      overallStatus: overallScore !== null ? getScoreStatus(overallScore) : null,
      goalDetails,
      hasGoals: goalCount > 0,
    };
  });

  // Sort: employees with goals first, then by overall score desc
  teamPerformance.sort((a, b) => {
    if (a.hasGoals && !b.hasGoals) return -1;
    if (!a.hasGoals && b.hasGoals) return 1;
    return (b.overallScore ?? 0) - (a.overallScore ?? 0);
  });

  // Attention required: identify employees who are behind
  const attentionRequired = teamPerformance
    .filter((e) => e.goalScore !== null && e.goalScore < 60)
    .map((e) => ({
      id: e.id,
      name: e.name,
      goalScore: e.goalScore,
      status: e.goalStatus,
      issues: e.goalDetails
        .filter((d: any) => d.score < 60)
        .map((d: any) => ({
          kpiBreakdown: d.kpiBreakdown.filter((k: any) => k.achievement < 60),
        })),
    }));

  return NextResponse.json({ teamPerformance, attentionRequired });
}
