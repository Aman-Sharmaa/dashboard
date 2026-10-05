import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { Employee } from "@/models/Employee";
import { Attendance } from "@/models/Attendance";
import { verifyToken } from "@/lib/auth";
import mongoose from "mongoose";

const COOKIE_NAME = "kalp_auth_token";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const user = verifyToken(token);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { id } = await params;

    // Allow admin or the employee themselves
    if (user.role !== "admin") {
      const self = await Employee.findOne({ email: user.email }).select("_id").lean();
      if (!self || String((self as any)._id) !== id) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    const employee = await Employee.findById(id)
      .select("name email casualLeaveBalance casualLeaveTotal sickLeaveBalance sickLeaveTotal wfhAllowedPerMonth unpaidLeaveBalance")
      .lean();

    if (!employee) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const empObjectId = new mongoose.Types.ObjectId(id);

    // ────────────────────────────────────────────────
    // Task stats (all time + current month)
    // ────────────────────────────────────────────────
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const allTasks = await Task.find({
      $or: [{ assignees: empObjectId }, { assignee: empObjectId }],
    }).select("status dueDate priority createdAt title").lean();

    const monthTasks = allTasks.filter((t) => {
      const d = t.createdAt ? new Date(t.createdAt) : null;
      return d && d >= startOfMonth && d <= endOfMonth;
    });

    function taskStats(tasks: typeof allTasks) {
      const total = tasks.length;
      const done = tasks.filter((t) => t.status === "done").length;
      const inProgress = tasks.filter((t) => t.status === "in_progress").length;
      const overdue = tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done" && t.status !== "rejected"
      ).length;
      const highPriority = tasks.filter((t) => t.priority === "high" || t.priority === "urgent").length;
      const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
      return { total, done, inProgress, overdue, highPriority, completionRate };
    }

    const allTimeStats = taskStats(allTasks);
    const monthStats = taskStats(monthTasks);

    // ────────────────────────────────────────────────
    // Recent tasks (last 20 across all time)
    // ────────────────────────────────────────────────
    const recentTasks = [...allTasks]
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 20)
      .map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : null,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : null,
      }));

    // ────────────────────────────────────────────────
    // Leave summary
    // ────────────────────────────────────────────────
    const emp = employee as any;
    const leaveData = {
      casualUsed: (emp.casualLeaveTotal ?? 0) - (emp.casualLeaveBalance ?? 0),
      casualTotal: emp.casualLeaveTotal ?? 0,
      casualBalance: emp.casualLeaveBalance ?? 0,
      sickUsed: (emp.sickLeaveTotal ?? 0) - (emp.sickLeaveBalance ?? 0),
      sickTotal: emp.sickLeaveTotal ?? 0,
      sickBalance: emp.sickLeaveBalance ?? 0,
      unpaidLeave: emp.unpaidLeaveBalance ?? 0,
    };

    // ────────────────────────────────────────────────
    // WFH this month (attendance with leaveType "wfh")
    // ────────────────────────────────────────────────
    const wfhRecords = await Attendance.find({
      employee: empObjectId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
      leaveType: { $regex: /wfh/i },
      approvalStatus: { $in: ["approved", "pending"] },
    }).lean();

    const wfhUsedThisMonth = wfhRecords.length;
    const wfhAllowed = emp.wfhAllowedPerMonth ?? 2;

    // WFH history for last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const allWfh = await Attendance.find({
      employee: empObjectId,
      date: { $gte: sixMonthsAgo },
      leaveType: { $regex: /wfh/i },
      approvalStatus: { $in: ["approved", "pending"] },
    }).select("date approvalStatus").lean();

    // Group WFH by month
    const wfhByMonth: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      wfhByMonth[key] = 0;
    }
    for (const r of allWfh) {
      const d = new Date((r as any).date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in wfhByMonth) wfhByMonth[key]++;
    }

    return NextResponse.json({
      tasks: {
        allTime: allTimeStats,
        thisMonth: monthStats,
        recent: recentTasks,
      },
      leaves: leaveData,
      wfh: {
        usedThisMonth: wfhUsedThisMonth,
        allowedPerMonth: wfhAllowed,
        remainingThisMonth: Math.max(0, wfhAllowed - wfhUsedThisMonth),
        history: Object.entries(wfhByMonth)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      },
    });
  } catch (error) {
    console.error("[employees/[id]/performance] Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
