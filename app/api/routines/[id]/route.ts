import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
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

/**
 * GET /api/routines/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const routine = await Routine.findById(id).lean();
  if (!routine) return NextResponse.json({ message: "Routine not found" }, { status: 404 });

  const owner = await Employee.findById(routine.ownerId).select("name email avatarUrl").lean();

  return NextResponse.json({
    routine: {
      ...routine,
      id: String(routine._id),
      owner: owner ? { ...owner, id: String((owner as any)._id) } : null,
    },
  });
}

/**
 * PATCH /api/routines/[id]
 * Update title, description, ownerId, frequency, workingDays, dueTime, status
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const routine = await Routine.findById(id);
  if (!routine) return NextResponse.json({ message: "Routine not found" }, { status: 404 });

  // Only admin or owner can edit
  if (user.role !== "admin") {
    const scope = await getEmployeeWorkScope(user.email);
    if (!scope.employeeIds.map(String).includes(String(routine.ownerId))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const { title, description, ownerId, frequency, workingDays, dueTime, status } = body;

  if (title !== undefined) routine.title = title.trim();
  if (description !== undefined) routine.description = description.trim();
  if (ownerId !== undefined) {
    if (user.role !== "admin") {
      const scope = await getEmployeeWorkScope(user.email);
      if (!scope.employeeIds.map(String).includes(String(ownerId))) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    routine.ownerId = ownerId;
  }
  if (frequency !== undefined) routine.frequency = frequency;
  if (Array.isArray(workingDays)) routine.workingDays = workingDays;
  if (dueTime !== undefined) routine.dueTime = dueTime || null;
  if (status !== undefined) routine.status = status;

  await routine.save();

  return NextResponse.json({
    routine: { ...routine.toObject(), id: String(routine._id) },
  });
}

/**
 * DELETE /api/routines/[id]
 * Delete or archive routine
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const routine = await Routine.findById(id);
  if (!routine) return NextResponse.json({ message: "Routine not found" }, { status: 404 });

  // Only admin or owner can delete
  if (user.role !== "admin") {
    const scope = await getEmployeeWorkScope(user.email);
    if (!scope.employeeIds.map(String).includes(String(routine.ownerId))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  await Routine.findByIdAndDelete(id);

  return NextResponse.json({ success: true, message: "Routine deleted successfully" });
}
