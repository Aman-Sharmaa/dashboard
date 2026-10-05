import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { Project } from "@/models/Project";
import { ProjectService } from "@/models/ProjectService";
import { ProjectDetailClient } from "@/components/project-detail-client";

const COOKIE_NAME = "kalp_auth_token";

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login");
  try {
    return verifyToken(token);
  } catch {
    redirect("/login");
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const user = await requireAuth();
  await connectDB();

  const { id, projectId } = await params;

  const [project, services] = await Promise.all([
    Project.findById(projectId)
      .populate("assignedMembers", "name email")
      .populate("manager", "name email")
      .populate("client", "name companyName email")
      .lean(),
    ProjectService.find({ project: projectId }).select("cost costType customMonths").lean(),
  ]);

  if (!project) redirect("/dashboard/projects");

  if (user.role === "employee") {
    const employee = await Employee.findOne({ email: user.email }).select("_id").lean();
    const assignedIds = (project.assignedMembers as any[])?.map((m) => String(m._id)) ?? [];
    if (!employee || !assignedIds.includes(String(employee._id))) redirect("/dashboard/projects");
  }

  const clientId = String(project.client?._id ?? project.client);
  if (clientId !== id) redirect("/dashboard/projects");

  function monthlyEquivalent(s: { cost?: number; costType?: string; customMonths?: number }) {
    const cost = Number(s.cost) || 0;
    if (s.costType === "monthly") return cost;
    if (s.costType === "daily") return cost * 30;
    if (s.costType === "custom_months" && (s.customMonths || 0) >= 1) return cost / (s.customMonths || 1);
    return cost;
  }
  const totalManagingCost = (services as any[]).reduce((sum, s) => sum + monthlyEquivalent(s), 0);

  const projectData = {
    id: String(project._id),
    client: project.client && typeof project.client === "object"
      ? {
        id: String((project.client as any)._id),
        name: (project.client as any).name,
        companyName: (project.client as any).companyName,
        email: (project.client as any).email,
      }
      : { id: clientId, name: "", companyName: "", email: "" },
    name: project.name,
    description: project.description ?? "",
    startDate: project.startDate ? (project.startDate as Date).toISOString() : undefined,
    endDate: project.endDate ? (project.endDate as Date).toISOString() : undefined,
    maintenanceStartDate: project.maintenanceStartDate ? (project.maintenanceStartDate as Date).toISOString() : undefined,
    maintenanceEndDate: project.maintenanceEndDate ? (project.maintenanceEndDate as Date).toISOString() : undefined,
    assignedMembers: (project.assignedMembers as any[])?.map((m) => ({
      id: String(m._id),
      name: m.name,
      email: m.email,
    })) ?? [],
    manager: project.manager && typeof project.manager === "object"
      ? { id: String((project.manager as any)._id), name: (project.manager as any).name, email: (project.manager as any).email }
      : null,
    status: project.status,
    budget: (project as any).budget != null ? Number((project as any).budget) : undefined,
    domains: ((project as any).domains || []).map((d: any) => ({
      url: d.url,
      label: d.label,
      lastChecked: d.lastChecked ? (d.lastChecked as Date).toISOString() : undefined,
      isUp: d.isUp,
      lastStatusCode: d.lastStatusCode,
    })),
  };

  const isAdmin = user.role === "admin";
  const managerEmail = project.manager && typeof project.manager === "object" ? (project.manager as any).email : null;
  const canEdit = isAdmin || (managerEmail && managerEmail === user.email);

  return (
    <div className="space-y-6">
      <ProjectDetailClient
        clientId={id}
        project={projectData}
        totalManagingCost={Math.round(totalManagingCost)}
        isAdmin={isAdmin}
        canEdit={canEdit}
      />
    </div>
  );
}
