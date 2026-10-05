import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { Employee } from "@/models/Employee";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const user = verifyToken(token);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") {
      return NextResponse.json({ message: "Admin only" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const monthParam = searchParams.get("month");
    const year = monthParam ? parseInt(monthParam.split("-")[0]) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam.split("-")[1]) - 1 : now.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Get all employees
    const employees = await Employee.find({}).select("_id name email avatarUrl title").lean();

    // Aggregate tasks per employee for the given month
    const performanceData = await Promise.all(
      employees.map(async (emp) => {
        const empId = (emp as any)._id;
        const tasks = await Task.find({
          $or: [{ assignees: empId }, { assignee: empId }],
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        })
          .select("status dueDate priority")
          .lean();

        const total = tasks.length;
        const done = tasks.filter((t) => t.status === "done").length;
        const overdue = tasks.filter(
          (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done"
        ).length;
        const highPriority = tasks.filter((t) => t.priority === "high" || t.priority === "urgent").length;
        const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

        return {
          id: String(empId),
          name: (emp as any).name || "Unknown",
          email: emp.email,
          avatarUrl: (emp as any).avatarUrl || null,
          title: (emp as any).title || null,
          total,
          done,
          overdue,
          highPriority,
          completionRate,
        };
      })
    );

    // Sort by completion rate descending, then total tasks
    performanceData.sort((a, b) => b.completionRate - a.completionRate || b.total - a.total);

    return NextResponse.json({
      month: { year, month: month + 1 },
      performance: performanceData,
    });
  } catch (error) {
    console.error("[employees/performance] Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
