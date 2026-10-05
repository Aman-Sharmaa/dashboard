import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Task } from "@/models/Task";
import { Employee } from "@/models/Employee";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await connectDB();

    // Get all tasks with only necessary fields
    const tasks = await Task.find({})
      .select("status dueDate assignee assignees priority")
      .lean();

    const now = new Date();

    // ── Status counts (for pie chart) ──
    const todo = tasks.filter((t) => t.status === "todo").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const inReview = tasks.filter((t) => t.status === "in_review").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const total = tasks.length;
    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done"
    ).length;

    // ── Per-employee stats ──
    // Collect all unique assignee IDs from both fields
    const empTaskMap = new Map<string, { completed: number; overdue: number; total: number }>();

    for (const t of tasks) {
      const ids: string[] = [];
      if (Array.isArray((t as any).assignees) && (t as any).assignees.length > 0) {
        for (const a of (t as any).assignees) ids.push(String(a));
      } else if ((t as any).assignee) {
        ids.push(String((t as any).assignee));
      }

      for (const empId of ids) {
        if (!empTaskMap.has(empId)) empTaskMap.set(empId, { completed: 0, overdue: 0, total: 0 });
        const entry = empTaskMap.get(empId)!;
        entry.total++;
        if (t.status === "done") entry.completed++;
        if (t.dueDate && new Date(t.dueDate) < now && t.status !== "done") entry.overdue++;
      }
    }

    // Fetch employee names
    const empIds = [...empTaskMap.keys()];
    const empDocs = empIds.length > 0
      ? await Employee.find({ _id: { $in: empIds } }).select("name email").lean()
      : [];
    const empNameMap = new Map(empDocs.map((e: any) => [String(e._id), { name: e.name, email: e.email }]));

    // Build leaderboard: sort by completed desc
    const leaderboard = empIds
      .map((id) => {
        const stats = empTaskMap.get(id)!;
        const emp = empNameMap.get(id);
        return {
          id,
          name: emp?.name || "Unknown",
          email: emp?.email || "",
          completed: stats.completed,
          overdue: stats.overdue,
          total: stats.total,
          completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        };
      })
      .filter((e) => e.total > 0)
      .sort((a, b) => b.completed - a.completed);

    // Overdue tasks by employee (sorted by most overdue first)
    const overdueLeaderboard = [...leaderboard]
      .filter((e) => e.overdue > 0)
      .sort((a, b) => b.overdue - a.overdue);

    // ── Priority breakdown ──
    const byPriority = {
      low: tasks.filter((t) => t.priority === "low").length,
      medium: tasks.filter((t) => t.priority === "medium").length,
      high: tasks.filter((t) => t.priority === "high").length,
      urgent: tasks.filter((t) => t.priority === "urgent").length,
    };

    return NextResponse.json({
      statusCounts: { total, todo, inProgress, inReview, done, overdue },
      byPriority,
      leaderboard: leaderboard.slice(0, 10),
      overdueLeaderboard: overdueLeaderboard.slice(0, 10),
    });
  } catch (err: any) {
    console.error("GET /api/tasks/performance error:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
