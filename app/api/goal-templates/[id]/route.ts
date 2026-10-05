import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { GoalTemplate } from "@/models/GoalTemplate";
import { GoalMetric } from "@/models/GoalMetric";
import { GoalInstance } from "@/models/GoalInstance";
import { MetricResult } from "@/models/MetricResult";
import { Employee } from "@/models/Employee";
import { getEmployeeWorkScope } from "@/lib/employee-work-scope";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

/** GET /api/goal-templates/[id] */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const template = await GoalTemplate.findById(id).lean();

  if (!template) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (user.role === "employee") {
    const scope = await getEmployeeWorkScope(user.email);
    const ownerIds = [String(template.ownerId), ...(template.ownerIds || []).map(String)];
    if (!ownerIds.some((ownerId) => scope.employeeIds.map(String).includes(ownerId))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  const metrics = await GoalMetric.find({ goalId: id }).sort({ order: 1 }).lean();
  
  const allOwnerIds = [
    ...new Set([
      ...(Array.isArray(template.ownerIds) ? template.ownerIds.map(String) : []),
      String(template.ownerId),
    ].filter(Boolean))
  ];
  const employees = await Employee.find({ _id: { $in: allOwnerIds } })
    .select("name email avatarUrl title")
    .lean();
  const empMap = Object.fromEntries(employees.map((e) => [String(e._id), e]));

  const ownersList = Array.isArray(template.ownerIds) && template.ownerIds.length > 0
    ? template.ownerIds.map((oId) => empMap[String(oId)]).filter(Boolean)
    : (empMap[String(template.ownerId)] ? [empMap[String(template.ownerId)]] : []);

  return NextResponse.json({
    template: {
      ...template,
      id: String(template._id),
      owner: empMap[String(template.ownerId)] || null,
      owners: ownersList,
      metrics: metrics.map((m) => ({ ...m, id: String(m._id) })),
    },
  });
}

/** PATCH /api/goal-templates/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const managerScope = user.role === "employee" ? await getEmployeeWorkScope(user.email) : null;
  if (user.role !== "admin" && !managerScope?.isManager) return NextResponse.json({ message: "Admin or manager only" }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["title", "description", "ownerId", "ownerIds", "managerId", "businessId",
    "teamId", "frequency", "workingDays", "startDate", "endDate", "noEndDate", "status"];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Array.isArray(update.ownerIds) && update.ownerIds.length > 0) {
    update.ownerId = update.ownerIds[0];
  }
  if (managerScope) {
    const requestedOwners = Array.isArray(update.ownerIds) ? update.ownerIds.map(String) : update.ownerId ? [String(update.ownerId)] : [];
    if (requestedOwners.some((ownerId: string) => !managerScope.employeeIds.map(String).includes(ownerId))) {
      return NextResponse.json({ message: "You can only manage goals for your team" }, { status: 403 });
    }
  }

  const existingTemplate = await GoalTemplate.findById(id).select("ownerId ownerIds").lean();
  if (managerScope && existingTemplate) {
    const existingOwners = [String(existingTemplate.ownerId), ...((existingTemplate as any).ownerIds || []).map(String)];
    if (!existingOwners.some((ownerId) => managerScope.employeeIds.map(String).includes(ownerId))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }
  const template = await GoalTemplate.findOneAndUpdate(
    { _id: id },
    { $set: update },
    { new: true }
  ).lean();

  if (!template) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({ template: { ...template, id: String(template._id) } });
}

/** DELETE /api/goal-templates/[id] — completely deletes the template and its instances/metrics */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Admin only" }, { status: 403 });

  await connectDB();
  const { id } = await params;

  // 1. Find all instances for this goal
  const instances = await GoalInstance.find({ goalId: id }).select("_id").lean();
  const instanceIds = instances.map((i) => i._id);

  // 2. Delete all metric results
  if (instanceIds.length > 0) {
    await MetricResult.deleteMany({ goalInstanceId: { $in: instanceIds } });
  }

  // 3. Delete all instances
  await GoalInstance.deleteMany({ goalId: id });

  // 4. Delete all goal metrics
  await GoalMetric.deleteMany({ goalId: id });

  // 5. Delete the template
  await GoalTemplate.deleteOne({ _id: id, organizationId: user.userId });

  return NextResponse.json({ success: true });
}
