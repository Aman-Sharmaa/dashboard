import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { Employee } from "@/models/Employee";
import { verifyToken } from "@/lib/auth";

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

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const filter: Record<string, unknown> = {};
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const includeAllTasks = scope === "all";

  if (user.role === "employee" && !includeAllTasks) {
    const employee = await Employee.findOne({ email: user.email }).select("_id").lean();
    if (!employee) {
      return NextResponse.json({
        total: 0,
        todo: 0,
        in_progress: 0,
        in_review: 0,
        done: 0,
        overdue: 0,
        backlogs: 0,
      });
    }
    const empId = (employee as any)._id;
    filter.$or = [{ assignees: empId }, { assignee: empId }];
  }

  const tasks = await Task.find(filter)
    .select("status dueDate")
    .lean();

  const now = new Date();
  const todo = tasks.filter((t) => t.status === "todo").length;
  const in_progress = tasks.filter((t) => t.status === "in_progress").length;
  const in_review = tasks.filter((t) => t.status === "in_review").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < now &&
      t.status !== "done"
  ).length;
  const total = tasks.length;
  const backlogs = todo + in_progress + in_review;

  return NextResponse.json({
    total,
    todo,
    in_progress,
    in_review,
    done,
    overdue,
    backlogs,
  });
}
