import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { verifyToken } from "@/lib/auth";
import { Employee } from "@/models/Employee";

const COOKIE_NAME = "kalp_auth_token";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const user = verifyToken(token);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    // Get the employee record for the authenticated user
    const employee = await Employee.findOne({ email: user.email }).select("_id name").lean();
    if (!employee) return NextResponse.json({ message: "Employee not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    // month: "YYYY-MM" format, defaults to current month
    const monthParam = searchParams.get("month");
    const now = new Date();
    const year = monthParam ? parseInt(monthParam.split("-")[0]) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam.split("-")[1]) - 1 : now.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const empId = (employee as any)._id;

    // All tasks assigned to this employee (for counts by status)
    const allTasks = await Task.find({
      $or: [{ assignees: empId }, { assignee: empId }],
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    })
      .select("title status priority dueDate type createdAt")
      .lean();

    const counts = {
      total: allTasks.length,
      done: allTasks.filter((t) => t.status === "done").length,
      inProgress: allTasks.filter((t) => t.status === "in_progress").length,
      todo: allTasks.filter((t) => t.status === "todo").length,
      backlog: allTasks.filter((t) => t.status === "backlog").length,
      overdue: allTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done"
      ).length,
    };

    // Recent tasks (last 10)
    const recentTasks = await Task.find({
      $or: [{ assignees: empId }, { assignee: empId }],
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("title status priority dueDate type")
      .lean();

    return NextResponse.json({
      employee: { id: String(empId), name: (employee as any).name },
      month: { year, month: month + 1 },
      counts,
      recentTasks: recentTasks.map((t) => ({
        id: String(t._id),
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate || null,
        type: (t as any).type || "task",
      })),
    });
  } catch (error) {
    console.error("[tasks/my-overview] Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
