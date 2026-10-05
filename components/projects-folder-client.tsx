"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Search,
  LayoutGrid,
  List,
  Globe,
  GlobeLock,
  ExternalLink,
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
  SlidersHorizontal,
  IndianRupee,
  Plus,
  Building2,
  Users,
} from "lucide-react";
import { ProjectFolderCard } from "@/components/project-folder-card";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

export type ProjectFolderRow = {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  totalMonths: number | null;
  monthlyRecurringCost: number;
  assignedMembers?: { id: string; name: string }[];
  taskTotal?: number;
  taskDone?: number;
  isPinned?: boolean;
  isPinnedToSidebar?: boolean;
  isPublic?: boolean;
  publicSlug?: string | null;
};

type Props = {
  projects: ProjectFolderRow[];
  /** When true (e.g. employee view), hide monthly cost on cards */
  hideCost?: boolean;
};

const STATUS_FILTERS = [
  { value: "all", label: "All Projects" },
  { value: "in_progress", label: "In Progress", statuses: ["planned", "active", "on_hold"] },
  { value: "completed", label: "Completed", statuses: ["completed"] },
  { value: "maintenance", label: "Maintenance", statuses: ["maintenance"] },
];

export function ProjectsFolderClient({ projects: initialProjects, hideCost }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("in_progress");
  const [clientFilter, setClientFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "deadline" | "progress" | "cost">("name");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState<string | null>(null);
  const [projects, setProjects] = useState(initialProjects);
  const router = useRouter();

  const togglePublic = async (id: string) => {
    setTogglingPublic(id);
    try {
      const res = await fetch(`/api/projects/${id}/public`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, isPublic: data.isPublic, publicSlug: data.publicSlug } : p
        )
      );
      toast.success(data.isPublic ? "Project portfolio page is now public 🌐" : "Project is now private 🔒");
    } catch {
      toast.error("Failed to toggle public status");
    } finally {
      setTogglingPublic(null);
    }
  };

  // Distinct clients list for filter dropdown
  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => {
      if (p.clientId && p.clientName) {
        map.set(p.clientId, p.clientName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [projects]);

  // Filtered & sorted projects
  const filtered = useMemo(() => {
    let list = projects;

    if (statusFilter !== "all") {
      const filter = STATUS_FILTERS.find((f) => f.value === statusFilter);
      if (filter?.statuses) {
        list = list.filter((p) => filter.statuses!.includes(p.status));
      }
    }

    if (clientFilter !== "all") {
      list = list.filter((p) => p.clientId === clientFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === "deadline") {
        const da = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        const db = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        return da - db;
      }
      if (sortBy === "progress") {
        const pa = a.taskTotal ? a.taskDone! / a.taskTotal : 0;
        const pb = b.taskTotal ? b.taskDone! / b.taskTotal : 0;
        return pb - pa;
      }
      if (sortBy === "cost") {
        return (b.monthlyRecurringCost || 0) - (a.monthlyRecurringCost || 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [projects, statusFilter, clientFilter, search, sortBy]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const all = projects.length;
    const inProgress = projects.filter((p) =>
      ["planned", "active", "on_hold"].includes(p.status)
    ).length;
    const completed = projects.filter((p) => p.status === "completed").length;
    const maintenance = projects.filter((p) => p.status === "maintenance").length;

    let totalTasks = 0;
    let completedTasks = 0;
    let totalMRR = 0;

    projects.forEach((p) => {
      totalTasks += p.taskTotal || 0;
      completedTasks += p.taskDone || 0;
      totalMRR += p.monthlyRecurringCost || 0;
    });

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      all,
      inProgress,
      completed,
      maintenance,
      totalTasks,
      completedTasks,
      completionRate,
      totalMRR,
    };
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Projects
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight">
            {stats.all}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {stats.inProgress} active initiatives
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              In Progress
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {stats.inProgress}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {stats.completed} delivered
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Task Velocity
            </span>
            <div className="h-7 w-7 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight">
              {stats.completionRate}%
            </p>
            <span className="text-xs text-muted-foreground font-medium">
              ({stats.completedTasks}/{stats.totalTasks})
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden mt-1">
            <div
              className="h-full rounded-full bg-purple-600 dark:bg-purple-500 transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        {!hideCost ? (
          <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Monthly Recurring
              </span>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight">
              ₹{stats.totalMRR.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-muted-foreground">Active retainer value</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Maintenance
              </span>
              <div className="h-7 w-7 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight">
              {stats.maintenance}
            </p>
            <p className="text-[11px] text-muted-foreground">Supported ongoing</p>
          </div>
        )}
      </div>

      {/* ── Filters & Controls Toolbar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-2">
        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 overflow-x-auto scrollbar-none w-fit">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                statusFilter === f.value
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              )}
            >
              {f.label}
              {f.value === "all" && stats.all > 0 && (
                <span className="ml-1.5 opacity-70">({stats.all})</span>
              )}
              {f.value === "in_progress" && stats.inProgress > 0 && (
                <span className="ml-1.5 opacity-70">({stats.inProgress})</span>
              )}
              {f.value === "completed" && stats.completed > 0 && (
                <span className="ml-1.5 opacity-70">({stats.completed})</span>
              )}
              {f.value === "maintenance" && stats.maintenance > 0 && (
                <span className="ml-1.5 opacity-70">({stats.maintenance})</span>
              )}
            </button>
          ))}
        </div>

        {/* Right Search, Client & View toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Client Filter */}
          {clientOptions.length > 1 && (
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="rounded-xl h-9 text-xs font-semibold w-[140px] bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Clients</SelectItem>
                {clientOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort By */}
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="rounded-xl h-9 text-xs font-semibold w-[140px] bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="deadline">Due Date</SelectItem>
              <SelectItem value="progress">Progress Rate</SelectItem>
              {!hideCost && <SelectItem value="cost">Highest Value</SelectItem>}
            </SelectContent>
          </Select>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects or clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl text-xs bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/60 p-0.5">
            <button
              onClick={() => setViewMode("card")}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                viewMode === "card"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                viewMode === "list"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Project Content List / Grid ── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              No matching projects found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search || clientFilter !== "all" || statusFilter !== "all"
                ? "Try clearing filters or search criteria to see your projects."
                : "Get started by adding your first client and creating a project workspace."}
            </p>
          </div>
          {!hideCost && (
            <Button size="sm" asChild className="rounded-xl text-xs font-semibold gap-1.5 mt-2">
              <Link href="/dashboard/projects/new">
                <Plus className="h-3.5 w-3.5" /> Create Project
              </Link>
            </Button>
          )}
        </div>
      ) : viewMode === "list" ? (
        <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-2xs">
          {/* List Table Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50/80 dark:bg-neutral-900/80 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <span className="flex-1">Project & Client</span>
            <span className="hidden md:block w-32">Task Progress</span>
            <span className="hidden sm:block w-20 text-center">Team</span>
            <span className="hidden lg:block w-28">Deadline</span>
            {!hideCost && <span className="hidden xl:block w-24 text-right">Retainer</span>}
            <span className="w-20 text-right">Actions</span>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
            {filtered.map((p) => (
              <ProjectFolderCard
                key={p.id}
                id={p.id}
                clientId={p.clientId}
                clientName={p.clientName}
                name={p.name}
                status={p.status}
                endDate={p.endDate}
                totalMonths={p.totalMonths}
                monthlyRecurringCost={hideCost ? 0 : p.monthlyRecurringCost}
                hideCost={hideCost}
                assignedMembers={p.assignedMembers}
                taskTotal={p.taskTotal}
                taskDone={p.taskDone}
                isPinned={p.isPinned}
                isPinnedToSidebar={p.isPinnedToSidebar}
                isPublic={p.isPublic}
                publicSlug={p.publicSlug}
                variant="list"
                onTogglePublic={() => togglePublic(p.id)}
                onEdit={() => router.push(`/dashboard/projects/clients/${p.clientId}/projects/${p.id}`)}
                onDelete={() => setDeleteId(p.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectFolderCard
              key={p.id}
              id={p.id}
              clientId={p.clientId}
              clientName={p.clientName}
              name={p.name}
              status={p.status}
              endDate={p.endDate}
              totalMonths={p.totalMonths}
              monthlyRecurringCost={hideCost ? 0 : p.monthlyRecurringCost}
              hideCost={hideCost}
              assignedMembers={p.assignedMembers}
              taskTotal={p.taskTotal}
              taskDone={p.taskDone}
              isPinned={p.isPinned}
              isPinnedToSidebar={p.isPinnedToSidebar}
              isPublic={p.isPublic}
              publicSlug={p.publicSlug}
              variant="card"
              onTogglePublic={() => togglePublic(p.id)}
              onEdit={() => router.push(`/dashboard/projects/clients/${p.clientId}/projects/${p.id}`)}
              onDelete={() => setDeleteId(p.id)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Project?"
        description="Are you sure you want to permanently delete this project? All associated tasks and documents will be affected."
        confirmLabel={isDeleting ? "Deleting…" : "Delete Project"}
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!deleteId) return;
          setIsDeleting(true);
          try {
            const res = await fetch(`/api/projects/${deleteId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete project");
            toast.success("Project deleted successfully");
            setProjects((prev) => prev.filter((p) => p.id !== deleteId));
            router.refresh();
          } catch (err) {
            toast.error("Failed to delete project");
          } finally {
            setIsDeleting(false);
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
