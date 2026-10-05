import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { ProjectService } from "@/models/ProjectService";
import { ProjectsFolderClient } from "@/components/projects-folder-client";
import type { ProjectFolderRow } from "@/components/projects-folder-client";

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
  return months >= 0 ? months + 1 : null;
}

export default async function ProjectsAllPage() {
  await requireAuth();
  await connectDB();

  const [projects, services] = await Promise.all([
    Project.find()
      .populate("client", "companyName name")
      .sort({ startDate: -1, createdAt: -1 })
      .lean(),
    ProjectService.find({ costType: "monthly" }).select("project cost").lean(),
  ]);

  const monthlyByProject = new Map<string, number>();
  for (const s of services) {
    const pid = String((s as any).project);
    monthlyByProject.set(pid, (monthlyByProject.get(pid) ?? 0) + Number((s as any).cost ?? 0));
  }

  const list: ProjectFolderRow[] = projects.map((p) => {
    const clientObj = p.client && typeof p.client === "object" ? (p.client as { _id: unknown; companyName?: string }) : null;
    const clientId = clientObj ? String(clientObj._id) : String(p.client);
    const start = p.startDate ? new Date(p.startDate) : null;
    const end = p.endDate ? new Date(p.endDate) : null;
    return {
      id: String(p._id),
      clientId,
      clientName: clientObj?.companyName ?? "~",
      name: p.name,
      status: p.status,
      startDate: p.startDate ? (p.startDate as Date).toISOString() : undefined,
      endDate: p.endDate ? (p.endDate as Date).toISOString() : undefined,
      totalMonths: totalMonths(start, end),
      monthlyRecurringCost: monthlyByProject.get(String(p._id)) ?? 0,
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b pb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">All projects</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and open projects across all clients.
          </p>
        </div>
      </div>
      <ProjectsFolderClient projects={list} />
    </div>
  );
}
