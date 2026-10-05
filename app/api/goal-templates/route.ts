import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { GoalTemplate } from "@/models/GoalTemplate";
import { GoalMetric } from "@/models/GoalMetric";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";
import { getEmployeeWorkScope } from "@/lib/employee-work-scope";

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

/** GET /api/goal-templates — list goal templates */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const ownerId = searchParams.get("ownerId");
  const workType = searchParams.get("workType");
  const status = searchParams.get("status") || "active";

  const query: Record<string, any> = { status };
  if (user.role === "admin") {
    query.organizationId = user.userId;
    if (ownerId) query.ownerId = ownerId;
  } else {
    const scope = await getEmployeeWorkScope(user.email);
    const allowedIds = scope.employeeIds.map(String);
    if (ownerId && allowedIds.includes(ownerId)) {
      query.$or = [{ ownerId }, { ownerIds: ownerId }];
    } else {
      query.$or = [{ ownerId: { $in: scope.employeeIds } }, { ownerIds: { $in: scope.employeeIds } }];
    }
  }
  if (workType) query.workType = workType;

  const templates = await GoalTemplate.find(query)
    .sort({ createdAt: -1 })
    .lean();

  // Populate owner names
  const allOwnerIds = [
    ...new Set(
      templates.flatMap((t) => [
        ...(Array.isArray(t.ownerIds) ? t.ownerIds.map(String) : []),
        String(t.ownerId),
      ]).filter(Boolean)
    ),
  ];
  const employees = await Employee.find({ _id: { $in: allOwnerIds } })
    .select("name email avatarUrl title")
    .lean();
  const employeeMap = Object.fromEntries(
    employees.map((e) => [String(e._id), e])
  );

  // Attach metrics to each template
  const templateIds = templates.map((t) => t._id);
  const metrics = await GoalMetric.find({ goalId: { $in: templateIds } })
    .sort({ order: 1 })
    .lean();

  const metricsByGoal = metrics.reduce<Record<string, any[]>>((acc, m) => {
    const key = String(m.goalId);
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...m, id: String(m._id) });
    return acc;
  }, {});

  const result = templates.map((t) => {
    const ownersList = Array.isArray(t.ownerIds) && t.ownerIds.length > 0
      ? t.ownerIds.map((id) => employeeMap[String(id)]).filter(Boolean)
      : (employeeMap[String(t.ownerId)] ? [employeeMap[String(t.ownerId)]] : []);

    return {
      ...t,
      id: String(t._id),
      owner: employeeMap[String(t.ownerId)] || null,
      owners: ownersList,
      metrics: metricsByGoal[String(t._id)] || [],
    };
  });

  return NextResponse.json({ templates: result });
}

/** POST /api/goal-templates — create a new goal template with metrics */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const managerScope = user.role === "employee" ? await getEmployeeWorkScope(user.email) : null;
  if (user.role !== "admin" && !managerScope?.isManager) return NextResponse.json({ message: "Admin or manager only" }, { status: 403 });

  await connectDB();

  const body = await req.json();
  const {
    ownerId,
    ownerIds,
    managerId,
    title,
    description,
    businessId,
    teamId,
    workType = "goal",
    frequency = "daily",
    workingDays = [1, 2, 3, 4, 5],
    startDate,
    endDate,
    noEndDate = true,
    metrics = [],
  } = body;

  const targetOwnerIds: string[] = Array.isArray(ownerIds) && ownerIds.length > 0
    ? ownerIds.map(String)
    : ownerId
      ? [String(ownerId)]
      : [];

  if (targetOwnerIds.length === 0 || !title || !startDate) {
    return NextResponse.json(
      { message: "At least one owner/assignee, title, and startDate are required" },
      { status: 400 }
    );
  }
  if (managerScope && targetOwnerIds.some((id) => !managerScope.employeeIds.map(String).includes(id))) {
    return NextResponse.json({ message: "You can only assign goals to your team" }, { status: 403 });
  }

  const primaryOwnerId = targetOwnerIds[0];

  const templateData: Record<string, any> = {
    organizationId: user.role === "admin"
      ? user.userId
      : String((await User.findOne({ role: "admin" }).select("_id").lean())?._id || user.userId),
    ownerId: primaryOwnerId,
    ownerIds: targetOwnerIds,
    managerId: managerId || null,
    title: title.trim(),
    description: description?.trim() || "",
    businessId: businessId || null,
    teamId: teamId || null,
    workType,
    frequency,
    workingDays,
    startDate: new Date(startDate),
    noEndDate: !!noEndDate,
    status: "active",
    createdBy: user.userId,
  };
  if (!noEndDate && endDate) {
    templateData.endDate = new Date(endDate);
  }

  const template: any = await GoalTemplate.create(templateData);

  try {
    const employees = await Employee.find({ _id: { $in: targetOwnerIds } }).select("name email").lean();
    const recipientEmails = employees.map((employee: any) => employee.email).filter((email: string) => email && email !== user.email);
    const users = await User.find({ email: { $in: recipientEmails } }).select("_id email").lean();
    if (users.length > 0) {
      await Notification.create(users.map((recipient: any) => ({
        user: recipient._id,
        type: "goal_assigned",
        title: "New goal assigned to you",
        message: `Goal "${title.trim()}" has been assigned to you`,
        link: "/dashboard/todo?tab=goals",
        data: { goalId: String(template._id) },
      })));
    }
  } catch (notificationError) {
    console.error("[goal-templates/POST] Notification error:", notificationError);
  }

  // Create metrics
  const createdMetrics: any[] = [];
  if (Array.isArray(metrics) && metrics.length > 0) {
    for (let i = 0; i < metrics.length; i++) {
      const m = metrics[i];
      if (!m.metricName || typeof m.target !== "number") continue;
      const metric: any = await GoalMetric.create({
        goalId: template._id,
        metricName: m.metricName.trim(),
        target: m.target,
        unit: m.unit || "",
        weight: m.weight || 0,
        direction: m.direction || "higher_is_better",
        dataSource: m.dataSource || "manual",
        order: i,
      });
      createdMetrics.push({ ...metric.toObject(), id: String(metric._id) });
    }
  }

  return NextResponse.json(
    {
      template: { ...template.toObject(), id: String(template._id), metrics: createdMetrics },
    },
    { status: 201 }
  );
}
