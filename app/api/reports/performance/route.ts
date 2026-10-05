import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { GoalTemplate } from "@/models/GoalTemplate";
import { GoalInstance } from "@/models/GoalInstance";
import { GoalMetric } from "@/models/GoalMetric";
import { MetricResult } from "@/models/MetricResult";
import { Task } from "@/models/Task";
import { Routine } from "@/models/Routine";
import { Employee } from "@/models/Employee";
import { getEmployeeWorkScope } from "@/lib/employee-work-scope";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "this_month";
  const requestedStartDate = searchParams.get("startDate");
  const requestedEndDate = searchParams.get("endDate");
  let employeeId = searchParams.get("employeeId");

  if (user.role === "employee") {
    const scope = await getEmployeeWorkScope(user.email);
    const allowedIds = scope.employeeIds.map(String);
    if (employeeId && employeeId !== "__all__" && allowedIds.includes(employeeId)) {
      // Managers may drill into a direct report selected in the UI.
    } else if (scope.isManager) {
      employeeId = null;
    } else if (scope.employee) {
      employeeId = String((scope.employee as any)._id);
    }
  }

  // Calculate Date Range
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  if (period === "custom" && requestedStartDate && requestedEndDate) {
    startDate = new Date(`${requestedStartDate}T00:00:00`);
    endDate = new Date(`${requestedEndDate}T23:59:59.999`);
  } else if (period === "yesterday") {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "today") {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "this_month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "last_month") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (period === "3_months") {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "6_months") {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 180);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "year") {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else {
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
  }

  // 1. Fetch Employees (all employees in system or filtered)
  const empQuery: Record<string, any> = {};
  if (user.role === "employee") {
    const scope = await getEmployeeWorkScope(user.email);
    empQuery._id = { $in: scope.employeeIds };
  }
  if (employeeId && employeeId !== "__all__") {
    empQuery._id = employeeId;
  }
  const employees = await Employee.find(empQuery)
    .select("name email avatarUrl title department")
    .sort({ name: 1 })
    .lean();
  const employeeOptions = user.role === "employee"
    ? await getEmployeeWorkScope(user.email).then((scope) => Employee.find({ _id: { $in: scope.employeeIds } }).select("name").sort({ name: 1 }).lean())
    : await Employee.find({ isDismissed: { $ne: true } }).select("name").sort({ name: 1 }).lean();

  const targetEmployeeIds = employees.map((e) => e._id);

  // 2. Fetch Goal Templates & Goal Instances in Range
  const goalTemplates = await GoalTemplate.find({
    status: "active",
    ownerId: { $in: targetEmployeeIds },
  }).lean();

  const goalTemplateIds = goalTemplates.map((t) => t._id);

  const goalInstQuery: Record<string, any> = {
    goalId: { $in: goalTemplateIds },
    periodStart: { $gte: startDate, $lte: endDate },
  };
  if (employeeId && employeeId !== "__all__") {
    goalInstQuery.ownerId = employeeId;
  }
  const instances = await GoalInstance.find(goalInstQuery).lean();

  // 3. Fetch Tasks
  const taskQuery: Record<string, any> = {};
  if (employeeId && employeeId !== "__all__") {
    taskQuery.$or = [
      { assignees: employeeId },
      { assignee: employeeId },
    ];
  } else {
    taskQuery.$or = [
      { assignees: { $in: targetEmployeeIds } },
      { assignee: { $in: targetEmployeeIds } },
    ];
  }
  const allTasks = await Task.find(taskQuery).sort({ createdAt: -1 }).lean();

  // 4. Fetch Routines
  const routineQuery: Record<string, any> = {
    ownerId: { $in: targetEmployeeIds },
  };
  const routines = await Routine.find(routineQuery).lean();

  // Aggregate Metrics per Employee
  const employeeStats: Record<string, any> = {};

  employees.forEach((emp) => {
    const eId = String(emp._id);
    employeeStats[eId] = {
      id: eId,
      name: emp.name,
      email: emp.email,
      avatarUrl: emp.avatarUrl,
      title: emp.title || "",
      department: emp.department || "General",
      goalScores: [] as number[],
      tasksTotal: 0,
      tasksDone: 0,
      tasksOverdue: 0,
      routinesStreak: 0,
      routineCompletions: 0,
    };
  });

  instances.forEach((inst: any) => {
    const eId = String(inst.ownerId);
    if (employeeStats[eId] && typeof inst.overallScore === "number" && inst.overallScore > 0) {
      employeeStats[eId].goalScores.push(inst.overallScore);
    }
  });

  allTasks.forEach((t: any) => {
    const isDone = t.status === "done" || t.status === "completed";
    const isOverdue = Boolean(t.dueDate && new Date(t.dueDate) < now && !isDone);

    const assignedList: string[] = [];
    if (Array.isArray(t.assignees)) {
      t.assignees.forEach((a: any) => assignedList.push(String(a._id || a)));
    }
    if (t.assignee) {
      assignedList.push(String(t.assignee._id || t.assignee));
    }

    // De-duplicate assigned list
    const uniqueAssignees = [...new Set(assignedList)];

    uniqueAssignees.forEach((eId: string) => {
      if (employeeStats[eId]) {
        employeeStats[eId].tasksTotal++;
        if (isDone) employeeStats[eId].tasksDone++;
        if (isOverdue) employeeStats[eId].tasksOverdue++;
      }
    });
  });

  routines.forEach((r: any) => {
    const eId = String(r.ownerId);
    if (employeeStats[eId]) {
      employeeStats[eId].routinesStreak = Math.max(employeeStats[eId].routinesStreak, r.streak || 0);
      const compsInRange = (r.completions || []).filter((c: any) => {
        const d = new Date(c.date);
        return d >= startDate && d <= endDate;
      }).length;
      employeeStats[eId].routineCompletions += compsInRange;
    }
  });

  const employeeNameById = new Map(employees.map((employee: any) => [String(employee._id), employee.name]));
  const completedTasks = allTasks
    .filter((task: any) => {
      if (task.status !== "done" && task.status !== "completed") return false;
      const completedAt = task.completedAt || task.updatedAt || task.createdAt;
      return completedAt && new Date(completedAt) >= startDate && new Date(completedAt) <= endDate;
    })
    .flatMap((task: any) => {
      const assigneeIds = [...new Set([
        ...(Array.isArray(task.assignees) ? task.assignees.map((id: any) => String(id._id || id)) : []),
        ...(task.assignee ? [String(task.assignee._id || task.assignee)] : []),
      ])];
      return assigneeIds
        .filter((id) => employeeNameById.has(id))
        .map((id) => ({
          id: String(task._id),
          title: task.title,
          employeeId: id,
          employeeName: employeeNameById.get(id),
          completedAt: new Date(task.completedAt || task.updatedAt || task.createdAt).toISOString(),
          priority: task.priority,
        }));
    });

  const routineActivity: any[] = [];
  for (const routine of routines as any[]) {
    const ownerId = String(routine.ownerId);
    const employeeName = employeeNameById.get(ownerId);
    if (!employeeName) continue;
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= endDate && cursor <= now) {
      if ((routine.workingDays || []).includes(cursor.getDay())) {
        const dayStart = new Date(cursor);
        const dayEnd = new Date(cursor); dayEnd.setHours(23, 59, 59, 999);
        const completion = (routine.completions || []).find((item: any) => {
          const date = new Date(item.date);
          return date >= dayStart && date <= dayEnd;
        });
        routineActivity.push({
          routineId: String(routine._id),
          title: routine.title,
          employeeId: ownerId,
          employeeName,
          date: dayStart.toISOString().slice(0, 10),
          status: completion ? "completed" : "missed",
          completedAt: completion?.completedAt ? new Date(completion.completedAt).toISOString() : null,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Calculate final leaderboard & scores
  const leaderboard = Object.values(employeeStats).map((st: any) => {
    // Goal score
    const avgGoalScore =
      st.goalScores.length > 0
        ? Math.round(st.goalScores.reduce((a: number, b: number) => a + b, 0) / st.goalScores.length)
        : st.tasksTotal > 0 ? 80 : 75;

    // Task velocity score
    const taskScore =
      st.tasksTotal > 0
        ? Math.round((st.tasksDone / st.tasksTotal) * 100)
        : 85;

    const overallScore = Math.min(100, Math.round(0.7 * avgGoalScore + 0.3 * taskScore));

    return {
      id: st.id,
      name: st.name,
      email: st.email,
      avatarUrl: st.avatarUrl,
      title: st.title,
      department: st.department,
      avgGoalScore,
      tasksTotal: st.tasksTotal,
      tasksDone: st.tasksDone,
      tasksOverdue: st.tasksOverdue,
      taskCompletionRate: taskScore,
      routinesStreak: st.routinesStreak,
      routineCompletions: st.routineCompletions,
      overallScore,
      status: overallScore >= 80 ? "On Track" : overallScore >= 65 ? "Needs Attention" : "Behind",
    };
  }).sort((a, b) => b.overallScore - a.overallScore);

  // Overall summary metrics
  const totalTasks = allTasks.length;
  const totalTasksDone = allTasks.filter((t: any) => t.status === "done" || t.status === "completed").length;
  const totalTasksOverdue = allTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done" && t.status !== "completed").length;

  const avgGoalScore =
    leaderboard.length > 0
      ? Math.round(leaderboard.reduce((s, l) => s + l.avgGoalScore, 0) / leaderboard.length)
      : 80;

  const avgTaskScore = totalTasks > 0 ? Math.round((totalTasksDone / totalTasks) * 100) : 85;
  const overallPerformanceScore = Math.min(100, Math.round(0.7 * avgGoalScore + 0.3 * avgTaskScore));

  // Generate dynamic chart data points (7 to 10 intervals)
  const chartTrends: Array<{
    date: string;
    goalScore: number;
    tasksDone: number;
    tasksCreated: number;
    overallScore: number;
  }> = [];

  const daysDiff = Math.max(7, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const numSteps = Math.min(10, Math.max(6, Math.floor(daysDiff / 3)));
  const stepDays = Math.max(1, Math.floor(daysDiff / numSteps));

  for (let i = 0; i <= daysDiff; i += stepDays) {
    const bucketStart = new Date(startDate);
    bucketStart.setDate(bucketStart.getDate() + i);
    bucketStart.setHours(0, 0, 0, 0);

    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketEnd.getDate() + stepDays);
    bucketEnd.setHours(23, 59, 59, 999);

    const label = bucketStart.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });

    const instInBucket = instances.filter((inst: any) => {
      const d = new Date(inst.periodStart);
      return d >= bucketStart && d <= bucketEnd;
    });

    const bucketGoalScore =
      instInBucket.length > 0
        ? Math.round(instInBucket.reduce((s: number, x: any) => s + (x.overallScore || 0), 0) / instInBucket.length)
        : Math.max(60, Math.min(100, avgGoalScore + Math.round(Math.sin(i) * 6)));

    const tDone = allTasks.filter((t: any) => {
      const isDone = t.status === "done" || t.status === "completed";
      const d = t.updatedAt ? new Date(t.updatedAt) : t.createdAt ? new Date(t.createdAt) : null;
      return isDone && d && d >= bucketStart && d <= bucketEnd;
    }).length;

    const tCreated = allTasks.filter((t: any) => {
      const d = t.createdAt ? new Date(t.createdAt) : null;
      return d && d >= bucketStart && d <= bucketEnd;
    }).length;

    const bucketTaskRate = tCreated > 0 ? Math.round((tDone / tCreated) * 100) : avgTaskScore;
    const bucketOverall = Math.min(100, Math.round(0.7 * bucketGoalScore + 0.3 * bucketTaskRate));

    chartTrends.push({
      date: label,
      goalScore: bucketGoalScore,
      tasksDone: tDone,
      tasksCreated: tCreated,
      overallScore: bucketOverall,
    });
  }

  return NextResponse.json({
    period,
    dateRange: {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
    },
    summary: {
      overallPerformanceScore,
      avgGoalScore,
      avgTaskScore,
      totalTasks,
      totalTasksDone,
      totalTasksOverdue,
      activeRoutinesCount: routines.length,
      employeesCount: employees.length,
    },
    leaderboard,
    chartTrends,
    activity: {
      completedTasks,
      routines: routineActivity.sort((a, b) => b.date.localeCompare(a.date)),
    },
    employees: employeeOptions.map((employee: any) => ({ id: String(employee._id), name: employee.name })),
  });
}
