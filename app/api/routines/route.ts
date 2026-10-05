import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Routine } from "@/models/Routine";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";
import { getEmployeeWorkScope } from "@/lib/employee-work-scope";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

/** GET /api/routines */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const ownerId = searchParams.get("ownerId");

  const query: Record<string, any> = {
    status: "active",
  };

  if (user.role === "employee") {
    const scope = await getEmployeeWorkScope(user.email);
    if (scope.employee) {
      query.ownerId = { $in: scope.employeeIds };
    } else {
      query.ownerId = user.userId;
    }
  } else if (ownerId) {
    query.ownerId = ownerId;
  }

  const routines = await Routine.find(query).sort({ createdAt: -1 }).lean();

  // Populate owner info
  const ownerIds = [...new Set(routines.map((r) => String(r.ownerId)))];
  const employees = await Employee.find({ _id: { $in: ownerIds } })
    .select("name email avatarUrl title")
    .lean();
  const empMap = Object.fromEntries(employees.map((e) => [String(e._id), e]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = routines.map((r) => {
    const owner = empMap[String(r.ownerId)];
    const todayDow = new Date().getDay();
    const isWorkingDay = r.workingDays.includes(todayDow);

    // Check if completed today
    const completedToday = (r.completions || []).some((c) => {
      const d = new Date(c.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    return {
      ...r,
      id: String(r._id),
      groupId: r.groupId || null,
      owner: owner ? { ...owner, id: String((owner as any)._id) } : null,
      completedToday,
      isWorkingDay,
    };
  });

  return NextResponse.json({ routines: enriched });
}

/** POST /api/routines — create routine(s) */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const managerScope = user.role === "employee" ? await getEmployeeWorkScope(user.email) : null;
  if (user.role !== "admin" && !managerScope?.isManager) return NextResponse.json({ message: "Admin or manager only" }, { status: 403 });

  await connectDB();

  const body = await req.json();
  const { ownerId, ownerIds, title, description, frequency, workingDays, dueTime } = body;

  const targetOwnerIds: string[] = Array.isArray(ownerIds) && ownerIds.length > 0
    ? ownerIds.map(String)
    : ownerId
      ? [String(ownerId)]
      : [];

  if (targetOwnerIds.length === 0 || !title) {
    return NextResponse.json({ message: "At least one owner/assignee and title are required" }, { status: 400 });
  }
  if (managerScope && targetOwnerIds.some((id) => !managerScope.employeeIds.map(String).includes(id))) {
    return NextResponse.json({ message: "You can only assign routines to your team" }, { status: 403 });
  }

  const isMulti = targetOwnerIds.length > 1;
  const groupId = isMulti ? new (await import("mongoose")).default.Types.ObjectId().toString() : null;

  const createdRoutines = [];
  for (const empId of targetOwnerIds) {
    const routine = await Routine.create({
      organizationId: user.userId,
      ownerId: empId,
      groupId,
      title: title.trim(),
      description: description?.trim() || "",
      frequency: frequency || "daily",
      workingDays: workingDays || [1, 2, 3, 4, 5],
      dueTime: dueTime || null,
      streak: 0,
      status: "active",
      completions: [],
    });
    createdRoutines.push({ ...routine.toObject(), id: String(routine._id) });
  }

  try {
    const employees = await Employee.find({ _id: { $in: targetOwnerIds } }).select("email").lean();
    const recipientEmails = employees.map((employee: any) => employee.email).filter((email: string) => email && email !== user.email);
    const users = await User.find({ email: { $in: recipientEmails } }).select("_id email").lean();
    const routineByOwner = new Map(createdRoutines.map((routine: any) => [String(routine.ownerId), routine]));
    const employeeIdByEmail = new Map(employees.map((employee: any) => [employee.email, String(employee._id)]));
    if (users.length > 0) {
      await Notification.create(users.map((recipient: any) => {
        const employeeId = employeeIdByEmail.get(recipient.email);
        const routine = employeeId ? routineByOwner.get(employeeId) : undefined;
        return {
          user: recipient._id,
          type: "routine_assigned",
          title: "New routine assigned to you",
          message: `Routine "${title.trim()}" has been assigned to you`,
          link: "/dashboard/todo?tab=routines",
          data: { routineId: routine ? String(routine._id) : null },
        };
      }));
    }
  } catch (notificationError) {
    console.error("[routines/POST] Notification error:", notificationError);
  }

  return NextResponse.json(
    {
      routine: createdRoutines[0],
      routines: createdRoutines,
      count: createdRoutines.length,
    },
    { status: 201 }
  );
}
