import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Task } from "@/models/Task";
import { Routine } from "@/models/Routine";
import { Employee } from "@/models/Employee";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

/**
 * POST /api/tasks/[id]/convert-to-routine
 * Converts a task into recurring daily/weekly routines.
 * If the task is assigned to multiple employees, creates a separate routine for each assigned employee.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const task = await Task.findById(id);
  if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const {
    title,
    description,
    frequency = "daily",
    workingDays = [1, 2, 3, 4, 5],
    dueTime,
    assignedEmployeeIds,
    deleteOriginalTask = false,
  } = body;

  // 1. Determine target employees for the routines
  let targetEmpIds: string[] = [];

  if (Array.isArray(assignedEmployeeIds) && assignedEmployeeIds.length > 0) {
    targetEmpIds = assignedEmployeeIds.map(String);
  } else if (Array.isArray(task.assignees) && task.assignees.length > 0) {
    targetEmpIds = task.assignees.map((a: any) => String(a));
  } else if (task.assignee) {
    targetEmpIds = [String(task.assignee)];
  }

  // If no employees assigned, fallback to the current authenticated employee or first employee
  if (targetEmpIds.length === 0) {
    const currentEmp = await Employee.findOne({ email: user.email }).select("_id").lean();
    if (currentEmp) {
      targetEmpIds = [String((currentEmp as any)._id)];
    } else {
      const anyEmp = await Employee.findOne({ organizationId: user.userId }).select("_id").lean();
      if (anyEmp) {
        targetEmpIds = [String((anyEmp as any)._id)];
      }
    }
  }

  // Deduplicate
  targetEmpIds = [...new Set(targetEmpIds.filter(Boolean))];

  if (targetEmpIds.length === 0) {
    return NextResponse.json(
      { message: "No assigned employee found to create routine for" },
      { status: 400 }
    );
  }

  // Determine due time
  let resolvedDueTime = dueTime;
  if (!resolvedDueTime && task.dueDate) {
    const d = new Date(task.dueDate);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    resolvedDueTime = `${hours}:${minutes}`;
    if (resolvedDueTime === "00:00") resolvedDueTime = "18:00";
  }
  if (!resolvedDueTime) resolvedDueTime = "18:00";

  const routineTitle = (title || task.title || "Routine").trim();
  const routineDescription = description !== undefined ? description.trim() : (task.description || "").trim();

  // 2. Create separate routine for each assigned employee
  const createdRoutines = [];
  for (const empId of targetEmpIds) {
    const routine = await Routine.create({
      organizationId: user.userId,
      ownerId: empId,
      title: routineTitle,
      description: routineDescription,
      frequency,
      workingDays,
      dueTime: resolvedDueTime,
      streak: 0,
      status: "active",
      completions: [],
    });
    createdRoutines.push({
      ...routine.toObject(),
      id: String(routine._id),
    });
  }

  // 3. Delete or keep original task
  if (deleteOriginalTask) {
    await Task.findByIdAndDelete(id);
  }

  return NextResponse.json({
    success: true,
    message: `Created ${createdRoutines.length} routine(s) successfully`,
    count: createdRoutines.length,
    routines: createdRoutines,
  });
}
