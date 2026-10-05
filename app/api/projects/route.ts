import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { Employee } from "@/models/Employee";
import { verifyToken } from "@/lib/auth";
import { normalizeAssignedMemberIds } from "@/lib/project-assignees";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { Client } from "@/models/Client";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const includeCompleted = searchParams.get("includeCompleted") === "true";

  const filter: Record<string, unknown> = {};
  // Project selectors throughout the app use this endpoint. Completed projects
  // remain available on history/management pages, but are not selectable.
  if (!includeCompleted) filter.status = { $ne: "completed" };
  
  if (clientId) {
    const client = await Client.findById(clientId).select("isActive").lean();
    if (!client || !(client as any).isActive) {
      return NextResponse.json({ projects: [] });
    }
    filter.client = clientId;
  } else {
    const activeClients = await Client.find({ isActive: true }).select("_id").lean();
    const activeClientIds = activeClients.map(c => c._id);
    filter.client = { $in: activeClientIds };
  }

  if (searchParams.get("isPinnedToSidebar") === "true") (filter as any).isPinnedToSidebar = true;

  if (user.role === "employee") {
    const employee = await Employee.findOne({ email: user.email }).select("_id").lean();
    if (!employee) return NextResponse.json({ projects: [] });
    (filter as any).assignedMembers = employee._id;
  }

  const projects = await Project.find(filter)
    .populate("assignedMembers", "name email")
    .sort({ startDate: -1, createdAt: -1 })
    .lean();

  return NextResponse.json({
    projects: projects.map((p) => ({
      id: String(p._id),
      client: String(p.client),
      name: p.name,
      description: p.description,
      startDate: p.startDate,
      endDate: p.endDate,
      maintenanceStartDate: p.maintenanceStartDate,
      maintenanceEndDate: p.maintenanceEndDate,
      assignedMembers: (p.assignedMembers as any[])?.map((m) => ({
        id: String(m._id),
        name: m.name,
        email: m.email,
      })) || [],
      status: p.status,
      budget: (p as any).budget,
      domains: (p as any).domains || [],
      isPinned: (p as any).isPinned || false,
      isPinnedToSidebar: (p as any).isPinnedToSidebar || false,
      createdAt: p.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const body = await req.json();
  const {
    clientId,
    name,
    description,
    startDate,
    endDate,
    maintenanceStartDate,
    maintenanceEndDate,
    assignedMemberIds,
    status,
  } = body;

  if (!clientId || !name) {
    return NextResponse.json(
      { message: "Client and project name are required" },
      { status: 400 }
    );
  }

  const assignedMembers = normalizeAssignedMemberIds(assignedMemberIds);

  const project = await Project.create({
    client: clientId,
    name: String(name).trim(),
    description: description || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    maintenanceStartDate: maintenanceStartDate ? new Date(maintenanceStartDate) : undefined,
    maintenanceEndDate: maintenanceEndDate ? new Date(maintenanceEndDate) : undefined,
    assignedMembers,
    status: status || "active",
    budget: body.budget != null && body.budget !== "" ? Number(body.budget) : undefined,
    domains: body.domains || [],
  });

  const populated = await Project.findById(project._id)
    .populate("assignedMembers", "name email")
    .lean();

  // Create notifications for project creation (assigned members and creator)
  try {
    const notifications: Parameters<typeof Notification.create>[0][] = [];

    // Notify creator (admin)
    notifications.push({
      user: admin.userId,
      type: "project_created",
      title: "Project created",
      message: `You created project "${String(name).trim()}"`,
      link: "/dashboard/projects",
      data: {
        projectId: String(project._id),
        clientId,
      },
    });

    // Notify assigned members mapped to Users by email
    const members = (populated?.assignedMembers as any[]) || [];
    if (members.length > 0) {
      const emails = members.map((m) => m.email).filter(Boolean);
      if (emails.length > 0) {
        const users = await User.find({ email: { $in: emails } })
          .select("_id email")
          .lean();
        const userByEmail = new Map(users.map((u) => [u.email as string, u._id]));
        for (const m of members) {
          const uid = userByEmail.get(m.email);
          if (uid) {
            notifications.push({
              user: uid,
              type: "project_assigned",
              title: "New project assignment",
              message: `You were added to project "${String(name).trim()}"`,
              link: "/dashboard/projects",
              data: {
                projectId: String(project._id),
                clientId,
              },
            });
          }
        }
      }
    }

    if (notifications.length > 0) {
      await Notification.create(notifications);
    }
  } catch {
    // Ignore notification errors
  }

  return NextResponse.json(
    {
      project: {
        id: String(populated!._id),
        client: String(populated!.client),
        name: populated!.name,
        description: populated!.description,
        startDate: populated!.startDate,
        endDate: populated!.endDate,
        maintenanceStartDate: populated!.maintenanceStartDate,
        maintenanceEndDate: populated!.maintenanceEndDate,
        assignedMembers: (populated!.assignedMembers as any[])?.map((m) => ({
          id: String(m._id),
          name: m.name,
          email: m.email,
        })) || [],
        status: populated!.status,
        budget: (populated as any).budget,
        domains: (populated as any).domains || [],
      },
    },
    { status: 201 }
  );
}
