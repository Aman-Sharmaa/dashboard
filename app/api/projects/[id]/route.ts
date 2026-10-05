import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { ProjectPayment } from "@/models/ProjectPayment";
import { Employee } from "@/models/Employee";
import { verifyToken } from "@/lib/auth";
import { normalizeAssignedMemberIds } from "@/lib/project-assignees";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";

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

async function requireAdmin() {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const project = await Project.findById(id)
    .populate("assignedMembers", "name email")
    .populate("manager", "name email")
    .populate("client", "name companyName email")
    .lean();

  if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const managerObj = project.manager && typeof project.manager === "object"
    ? { id: String((project.manager as any)._id), name: (project.manager as any).name, email: (project.manager as any).email }
    : null;

  return NextResponse.json({
    project: {
      id: String(project._id),
      client: project.client && typeof project.client === "object"
        ? { id: String((project.client as any)._id), name: (project.client as any).name, companyName: (project.client as any).companyName, email: (project.client as any).email }
        : { id: String(project.client), name: "", companyName: "", email: "" },
      name: project.name,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
      maintenanceStartDate: project.maintenanceStartDate,
      maintenanceEndDate: project.maintenanceEndDate,
      assignedMembers: (project.assignedMembers as any[])?.map((m) => ({
        id: String(m._id),
        name: m.name,
        email: m.email,
      })) || [],
      manager: managerObj,
      status: project.status,
      budget: (project as any).budget,
      domains: (project as any).domains || [],
      isPinned: (project as any).isPinned || false,
      isPinnedToSidebar: (project as any).isPinnedToSidebar || false,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const existing = await Project.findById(id).select("manager").lean();
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const isAdmin = user.role === "admin";
  let canEdit = isAdmin;
  if (!canEdit) {
    const employee = await Employee.findOne({ email: user.email }).select("_id").lean();
    canEdit = !!(employee && existing.manager && String(existing.manager) === String(employee._id));
  }
  if (!canEdit) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const previousStatus = (existing as any).status;
  const previousAssignedMembers = (existing as any).assignedMembers
    ? (existing as any).assignedMembers.map((m: any) => String(m))
    : [];
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.description !== undefined) update.description = body.description;
  if (body.startDate !== undefined) update.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) update.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.maintenanceStartDate !== undefined) update.maintenanceStartDate = body.maintenanceStartDate ? new Date(body.maintenanceStartDate) : null;
  if (body.maintenanceEndDate !== undefined) update.maintenanceEndDate = body.maintenanceEndDate ? new Date(body.maintenanceEndDate) : null;
  if (body.assignedMemberIds !== undefined) {
    update.assignedMembers = normalizeAssignedMemberIds(body.assignedMemberIds);
  }
  if (body.managerId !== undefined) {
    update.manager = body.managerId && mongoose.Types.ObjectId.isValid(body.managerId)
      ? new mongoose.Types.ObjectId(body.managerId)
      : null;
  }
  if (body.status !== undefined) update.status = body.status;
  if (body.domains !== undefined) update.domains = body.domains;
  if (body.isPinned !== undefined) update.isPinned = body.isPinned;
  if (body.isPinnedToSidebar !== undefined) update.isPinnedToSidebar = body.isPinnedToSidebar;

  // Budget: allow number, null, or key present with empty string to clear
  if (Object.prototype.hasOwnProperty.call(body, "budget")) {
    const budgetVal = body.budget == null || body.budget === "" ? null : Number(body.budget);
    if (budgetVal === null || Number.isNaN(budgetVal)) {
      update.budget = null;
    } else {
      update.budget = budgetVal;
    }
  }

  try {
    await Project.findByIdAndUpdate(id, { $set: update }, { runValidators: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Validation failed";
    return NextResponse.json({ message }, { status: 400 });
  }

  const updated = await Project.findById(id)
    .populate("assignedMembers", "name email")
    .populate("manager", "name email")
    .populate("client", "name companyName email")
    .lean();

  const managerObj = updated!.manager && typeof updated!.manager === "object"
    ? { id: String((updated!.manager as any)._id), name: (updated!.manager as any).name, email: (updated!.manager as any).email }
    : null;

  const clientObj = updated!.client && typeof updated!.client === "object"
    ? { id: String((updated!.client as any)._id), name: (updated!.client as any).name, companyName: (updated!.client as any).companyName, email: (updated!.client as any).email }
    : { id: String(updated!.client), name: "", companyName: "", email: "" };

  // Notifications for project updates (status change, assignments)
  try {
    const notifications: Parameters<typeof Notification.create>[0][] = [];

    // Status change → notify creator/manager if available
    if (body.status && body.status !== previousStatus) {
      if (user.userId) {
        notifications.push({
          user: user.userId,
          type: "project_updated",
          title: "Project status updated",
          message: `You updated status of project "${updated!.name}" to "${body.status}"`,
          link: "/dashboard/projects",
          data: { projectId: String(updated!._id) },
        });
      }
    }

    // Assigned members changes
    if (body.assignedMemberIds !== undefined) {
      const newAssignedIds = normalizeAssignedMemberIds(body.assignedMemberIds).map((id) =>
        String(id)
      );
      const addedIds = newAssignedIds.filter((id) => !previousAssignedMembers.includes(id));

      if (addedIds.length > 0) {
        const addedEmployees = await Employee.find({ _id: { $in: addedIds } })
          .select("email name")
          .lean();
        const emails = addedEmployees.map((e) => e.email).filter(Boolean);
        if (emails.length > 0) {
          const users = await User.find({ email: { $in: emails } })
            .select("_id email")
            .lean();
          const userByEmail = new Map(users.map((u) => [u.email as string, u._id]));
          for (const emp of addedEmployees) {
            const uid = userByEmail.get(emp.email);
            if (uid) {
              notifications.push({
                user: uid,
                type: "project_assigned",
                title: "Added to project",
                message: `You were added to project "${updated!.name}"`,
                link: "/dashboard/projects",
                data: { projectId: String(updated!._id) },
              });
            }
          }
        }
      }
    }

    if (notifications.length > 0) {
      await Notification.create(notifications);
    }
  } catch {
    // ignore notification failures
  }

  return NextResponse.json({
    project: {
      id: String(updated!._id),
      client: clientObj,
      name: updated!.name,
      description: updated!.description,
      startDate: updated!.startDate,
      endDate: updated!.endDate,
      maintenanceStartDate: updated!.maintenanceStartDate,
      maintenanceEndDate: updated!.maintenanceEndDate,
      assignedMembers: (updated!.assignedMembers as any[])?.map((m) => ({
        id: String(m._id),
        name: m.name,
        email: m.email,
      })) || [],
      manager: managerObj,
      status: updated!.status,
      budget: (updated as any).budget,
      domains: (updated as any).domains || [],
      isPinned: (updated as any).isPinned || false,
      isPinnedToSidebar: (updated as any).isPinnedToSidebar || false,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const project = await Project.findById(id);
  if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const billsCount = await ProjectPayment.countDocuments({
    project: id,
    billGeneratedAt: { $exists: true, $ne: null },
  });
  if (billsCount > 0) {
    return NextResponse.json(
      {
        message: `Cannot delete project: ${billsCount} bill(s) have been generated. Delete all related bills (payments) first.`,
      },
      { status: 400 }
    );
  }

  await Project.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
