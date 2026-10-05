import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import { Project } from "@/models/Project";
import { ProjectService } from "@/models/ProjectService";
import { Employee } from "@/models/Employee";
import { Task } from "@/models/Task";
import type { ProjectFolderRow } from "@/components/projects-folder-client";
import { ProjectsFolderClient } from "@/components/projects-folder-client";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

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

function totalMonths(start: Date | null | undefined, end: Date | null | undefined): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return null;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return months >= 0 ? months + 1 : null; // inclusive of start month
}

export default async function ProjectsPage() {
  const user = await requireAuth();
  await connectDB();

  const isEmployee = user.role === "employee";
  const projectFilter: Record<string, unknown> = {};
  if (isEmployee) {
    const employee = await Employee.findOne({ email: user.email }).select("_id").lean();
    if (!employee) {
      return (
        <div className="space-y-8">
          <div className="border-b pb-8">
            <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
            <p className="text-sm text-muted-foreground mt-1">Projects assigned to you.</p>
          </div>
          <ProjectsFolderClient projects={[]} hideCost />
        </div>
      );
    }
    (projectFilter as any).assignedMembers = employee._id;
  }

  const [clients, projects, services, taskCounts] = await Promise.all([
    Client.find().sort({ companyName: 1 }).select("companyName").lean(),
    Project.find(projectFilter)
      .populate("client", "companyName name")
      .populate("assignedMembers", "name")
      .sort({ startDate: -1, createdAt: -1 })
      .lean(),
    ProjectService.find({ costType: "monthly" }).select("project cost").lean(),
    Task.aggregate([
      { $group: { _id: "$project", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } } } },
    ]),
  ]);

  const clientMap = new Map(
    clients.map((c) => [String(c._id), (c as { companyName?: string }).companyName ?? "~"])
  );
  const monthlyByProject = new Map<string, number>();
  for (const s of services) {
    const pid = String((s as any).project);
    monthlyByProject.set(pid, (monthlyByProject.get(pid) ?? 0) + Number((s as any).cost ?? 0));
  }
  const taskCountByProject = new Map<string, { total: number; done: number }>();
  for (const t of taskCounts as { _id: unknown; total: number; done: number }[]) {
    const pid = String(t._id);
    taskCountByProject.set(pid, { total: t.total, done: t.done });
  }

  const folderRows: ProjectFolderRow[] = projects.map((p) => {
    const clientObj = p.client && typeof p.client === "object" ? (p.client as { _id: unknown; companyName?: string }) : null;
    const clientId = clientObj ? String(clientObj._id) : String(p.client);
    const start = p.startDate ? new Date(p.startDate) : null;
    const end = p.endDate ? new Date(p.endDate) : null;
    const members = (p as any).assignedMembers;
    const assignedMembers = Array.isArray(members)
      ? members.map((m: { _id?: unknown; name?: string }) => ({
        id: m._id ? String(m._id) : "",
        name: (m as { name?: string }).name ?? "",
      }))
      : [];
    const tc = taskCountByProject.get(String(p._id));
    return {
      id: String(p._id),
      clientId,
      clientName: clientObj?.companyName ?? clientMap.get(clientId) ?? "~",
      name: p.name,
      status: p.status,
      startDate: p.startDate ? (p.startDate as Date).toISOString() : undefined,
      endDate: p.endDate ? (p.endDate as Date).toISOString() : undefined,
      totalMonths: totalMonths(start, end),
      monthlyRecurringCost: monthlyByProject.get(String(p._id)) ?? 0,
      assignedMembers,
      taskTotal: tc?.total ?? 0,
      taskDone: tc?.done ?? 0,
      isPinned: p.isPinned || false,
      isPinnedToSidebar: p.isPinnedToSidebar || false,
      isPublic: (p as any).isPublic || false,
      publicSlug: (p as any).publicSlug || null,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 pb-12">
      {/* ── Sticky Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800 -mx-4 md:-mx-6 px-4 md:px-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
              Projects & Workspaces
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEmployee
                ? "Active client deliverables and project initiatives assigned to you."
                : "Manage client projects, track deliverables, milestones, and retainer contracts."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {!isEmployee && (
            <Button
              size="sm"
              asChild
              className="rounded-xl h-9 px-4 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Link href="/dashboard/projects/new">
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      <ProjectsFolderClient projects={folderRows} hideCost={isEmployee} />
    </div>
  );
}
