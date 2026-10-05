"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Flag,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  MoreVertical,
  Trash2,
  Edit2,
  ArrowUpDown,
  FolderGit2,
  CheckCircle,
  Circle,
  ArrowDown,
  ArrowUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EditMilestoneModal } from "@/components/edit-milestone-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Milestone = {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "in_review" | "done" | "completed" | "hold" | "backlog";
  project?: {
    id: string;
    _id?: string;
    name: string;
  } | null;
  projectName?: string;
  assignee?: {
    id: string;
    _id?: string;
    name: string;
    email: string;
    avatarUrl?: string;
  } | null;
  assignees?: Array<{
    id: string;
    _id?: string;
    name: string;
    email: string;
    avatarUrl?: string;
  }>;
  createdAt?: string;
};

type MilestonesViewProps = {
  isAdmin: boolean;
  onCreateMilestone?: () => void;
  onRefreshTasks?: () => void;
};

type FilterStatus = "all" | "todo" | "active" | "completed" | "overdue";
type SortBy = "dueDate" | "priority" | "createdAt" | "status";

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; border: string }> = {
  todo: { label: "To Do", dot: "bg-neutral-400", bg: "bg-neutral-50", border: "border-neutral-200" },
  backlog: { label: "Backlog", dot: "bg-neutral-400", bg: "bg-neutral-50", border: "border-neutral-200" },
  in_progress: { label: "In Progress", dot: "bg-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
  in_review: { label: "In Review", dot: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-200" },
  hold: { label: "On Hold", dot: "bg-orange-500", bg: "bg-orange-50", border: "border-orange-200" },
  done: { label: "Completed", dot: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" },
  completed: { label: "Completed", dot: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" },
};

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function MilestonesView({
  isAdmin,
  onCreateMilestone,
  onRefreshTasks,
}: MilestonesViewProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortBy>("dueDate");
  const [sortAsc, setSortAsc] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Delete state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit state
  const [editMilestoneId, setEditMilestoneId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks?type=milestone&scope=all");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const allTasks: any[] = data.tasks || [];

      // Map tasks to milestones
      const msList: Milestone[] = allTasks.map((t) => ({
        ...t,
        id: String(t._id || t.id),
        title: t.title || "",
        description: t.description || "",
        status: t.status || "todo",
        priority: t.priority || "medium",
        project: t.project && typeof t.project === "object" ? t.project : null,
        projectName: t.projectName || null,
      }));

      setMilestones(msList);
    } catch {
      toast.error("Failed to load milestones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMilestones();
    // Load employees and projects for the edit modal
    fetch("/api/employees")
      .then((res) => (res.ok ? res.json() : { employees: [] }))
      .then((data) => setEmployees(data.employees || []))
      .catch(() => {});
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : { projects: [] }))
      .then((data) => setProjects(data.projects || []))
      .catch(() => {});

    const handleRefresh = () => loadMilestones();
    window.addEventListener("refresh-milestones", handleRefresh);
    return () => window.removeEventListener("refresh-milestones", handleRefresh);
  }, [loadMilestones]);

  async function handleToggleStatus(m: Milestone) {
    const isDone = m.status === "done" || m.status === "completed";
    const nextStatus = isDone ? "in_progress" : "done";
    setTogglingId(m.id);

    try {
      const res = await fetch(`/api/tasks/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(
        nextStatus === "done" ? "Milestone marked as Completed! 🏆" : "Milestone reopened"
      );

      setMilestones((prev) =>
        prev.map((item) => (item.id === m.id ? { ...item, status: nextStatus } : item))
      );

      if (onRefreshTasks) onRefreshTasks();
    } catch {
      toast.error("Failed to update milestone status");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleUpdateStatus(mId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/tasks/${mId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Status updated");
      setMilestones((prev) =>
        prev.map((item) => (item.id === mId ? { ...item, status: newStatus as any } : item))
      );
      if (onRefreshTasks) onRefreshTasks();
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function executeDeleteMilestone() {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${deleteTargetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Milestone removed");
      setMilestones((prev) => prev.filter((m) => m.id !== deleteTargetId));
      setDeleteTargetId(null);
      if (onRefreshTasks) onRefreshTasks();
    } catch {
      toast.error("Failed to delete milestone");
    } finally {
      setDeleting(false);
    }
  }

  // ── Computed stats ──
  const now = new Date();
  const completedCount = milestones.filter(
    (m) => m.status === "done" || m.status === "completed"
  ).length;
  const todoCount = milestones.filter(
    (m) => m.status === "todo" || m.status === "backlog"
  ).length;
  const inProgressCount = milestones.filter(
    (m) => m.status === "in_progress" || m.status === "in_review"
  ).length;
  const overdueCount = milestones.filter((m) => {
    const isDone = m.status === "done" || m.status === "completed";
    return !isDone && m.dueDate && new Date(m.dueDate) < now;
  }).length;
  const activeCount = milestones.length - completedCount;
  const completionPercentage =
    milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  // ── Filtering ──
  const filteredMilestones = useMemo(() => {
    return milestones.filter((m) => {
      const isDone = m.status === "done" || m.status === "completed";
      const isOverdue = !isDone && m.dueDate && new Date(m.dueDate) < now;
      const isTodo = m.status === "todo" || m.status === "backlog";

      switch (filterStatus) {
        case "todo": return isTodo;
        case "active": return !isDone && !isTodo;
        case "completed": return isDone;
        case "overdue": return !!isOverdue;
        default: return true;
      }
    });
  }, [milestones, filterStatus]);

  // ── Sorting ──
  const sortedMilestones = useMemo(() => {
    const sorted = [...filteredMilestones].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "dueDate": {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          cmp = da - db;
          break;
        }
        case "priority": {
          cmp = (PRIORITY_ORDER[a.priority || "medium"] ?? 2) - (PRIORITY_ORDER[b.priority || "medium"] ?? 2);
          break;
        }
        case "createdAt": {
          const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          cmp = ca - cb;
          break;
        }
        case "status": {
          const statusOrder: Record<string, number> = { todo: 0, backlog: 0, in_progress: 1, in_review: 2, hold: 3, done: 4, completed: 4 };
          cmp = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
          break;
        }
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [filteredMilestones, sortBy, sortAsc]);

  const filterTabs: { id: FilterStatus; label: string; count: number }[] = [
    { id: "all", label: "All", count: milestones.length },
    { id: "todo", label: "To Do", count: todoCount },
    { id: "active", label: "In Progress", count: inProgressCount },
    { id: "completed", label: "Completed", count: completedCount },
    { id: "overdue", label: "Overdue", count: overdueCount },
  ];

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Delete Milestone Confirmation */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
        title="Delete Milestone?"
        description="Are you sure you want to delete this milestone? This deliverable will be removed from your roadmap."
        confirmLabel={deleting ? "Deleting..." : "Delete Milestone"}
        variant="destructive"
        isLoading={deleting}
        onConfirm={executeDeleteMilestone}
      />

      {/* Edit Milestone Modal */}
      <EditMilestoneModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditMilestoneId(null); }}
        milestoneId={editMilestoneId}
        employees={employees}
        projects={projects}
        onUpdated={() => { loadMilestones(); }}
        onDeleted={() => { loadMilestones(); }}
      />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Flag className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-neutral-900 tracking-tight">
              Major Milestones &amp; Deliverables
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Track high-impact strategic outcomes, quarterly deliverables, and release targets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadMilestones}
            className="h-8 w-8 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>

          {isAdmin && onCreateMilestone && (
            <Button
              size="sm"
              onClick={onCreateMilestone}
              className="h-8 rounded-xl gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white shadow-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              New Milestone
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary Progress Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl border border-neutral-200/80 bg-white space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Total
          </span>
          <p className="text-2xl font-black text-neutral-900 font-mono">{milestones.length}</p>
          <span className="text-[10px] text-neutral-500">Planned deliverables</span>
        </div>

        <div className="p-4 rounded-2xl border border-neutral-200/80 bg-white space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            To Do
          </span>
          <p className="text-2xl font-black text-neutral-600 font-mono">{todoCount}</p>
          <span className="text-[10px] text-neutral-500">Not yet started</span>
        </div>

        <div className="p-4 rounded-2xl border border-neutral-200/80 bg-white space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            In Progress
          </span>
          <p className="text-2xl font-black text-blue-600 font-mono">{inProgressCount}</p>
          <span className="text-[10px] text-neutral-500">Active execution</span>
        </div>

        <div className="p-4 rounded-2xl border border-neutral-200/80 bg-white space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Completed
            </span>
            <span className="text-xs font-bold text-emerald-600 font-mono">
              {completionPercentage}%
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600 font-mono">{completedCount}</p>
          <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden mt-1">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-neutral-200/80 bg-white space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Overdue
          </span>
          <p
            className={cn(
              "text-2xl font-black font-mono",
              overdueCount > 0 ? "text-red-600" : "text-neutral-400"
            )}
          >
            {overdueCount}
          </p>
          <span className="text-[10px] text-neutral-500">Past target date</span>
        </div>
      </div>

      {/* ── Filters & Sort ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 bg-neutral-100/80 p-1 rounded-xl w-fit border border-neutral-200/60">
          {filterTabs.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                filterStatus === f.id
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-white/50"
              )}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-neutral-400">Sort:</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="h-7 w-32 rounded-lg text-xs border-neutral-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="createdAt">Created Date</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="h-7 w-7 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 transition-colors"
            title={sortAsc ? "Ascending" : "Descending"}
          >
            {sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* ── Milestones List ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl border bg-white animate-pulse" />
          ))}
        </div>
      ) : sortedMilestones.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-12 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
            <Flag className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-neutral-900">
              {filterStatus === "all" ? "No milestones found" : `No ${filterTabs.find(f => f.id === filterStatus)?.label || ""} milestones`}
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {filterStatus === "all"
                ? "Create major project milestones and key deliverables to track progress toward strategic goals."
                : "Try selecting a different filter to see milestones."}
            </p>
          </div>
          {isAdmin && onCreateMilestone && filterStatus === "all" && (
            <Button
              onClick={onCreateMilestone}
              size="sm"
              className="rounded-xl gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              Create First Milestone
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMilestones.map((m) => {
            const isDone = m.status === "done" || m.status === "completed";
            const cleanTitle = m.title.replace(/^\[Milestone\]\s*/i, "");
            const dueDateObj = m.dueDate ? new Date(m.dueDate) : null;
            const isOverdue = !isDone && dueDateObj && dueDateObj < now;
            const statusConf = STATUS_CONFIG[m.status] || STATUS_CONFIG.todo;

            let daysDiffText = "";
            if (dueDateObj) {
              const diffMs = dueDateObj.getTime() - now.getTime();
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              if (isDone) {
                daysDiffText = `Target: ${dueDateObj.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`;
              } else if (diffDays < 0) {
                daysDiffText = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
              } else if (diffDays === 0) {
                daysDiffText = "Due today";
              } else {
                daysDiffText = `In ${diffDays} day${diffDays === 1 ? "" : "s"}`;
              }
            }

            const assignee = m.assignee || (m.assignees && m.assignees[0]);

            return (
              <div
                key={m.id}
                className={cn(
                  "p-4 sm:p-5 rounded-2xl border bg-white transition-all space-y-3 group",
                  isDone
                    ? "border-emerald-200/80 bg-emerald-50/20"
                    : isOverdue
                    ? "border-red-200/80 bg-red-50/10 hover:border-red-300"
                    : "border-neutral-200/80 hover:border-violet-200 hover:shadow-xs"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Checkbox and title */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggleStatus(m)}
                      disabled={togglingId === m.id}
                      className={cn(
                        "mt-0.5 h-5 w-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                        isDone
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-neutral-300 text-transparent hover:border-emerald-500 hover:text-emerald-500"
                      )}
                      title={isDone ? "Mark in progress" : "Mark completed"}
                    >
                      {togglingId === m.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5 stroke-[3]" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-md text-[10px] font-bold px-1.5 py-0.5",
                            isDone
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-violet-100 text-violet-800 border-violet-200"
                          )}
                        >
                          Milestone
                        </Badge>

                        {/* Status badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-md text-[10px] font-semibold px-1.5 py-0.5 gap-1",
                            statusConf.bg, statusConf.border
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", statusConf.dot)} />
                          {statusConf.label}
                        </Badge>

                        {(m.project?.name || m.projectName) && (
                          <Badge
                            variant="outline"
                            className="rounded-md text-[10px] font-semibold px-1.5 py-0.5 bg-neutral-50 text-neutral-600 border-neutral-200 gap-1"
                          >
                            <FolderGit2 className="h-3 w-3" />
                            {m.project?.name || m.projectName}
                          </Badge>
                        )}

                        {m.priority && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-md text-[10px] font-bold px-1.5 py-0.5 uppercase",
                              m.priority === "urgent"
                                ? "bg-red-100 text-red-700 border-red-200"
                                : m.priority === "high"
                                ? "bg-amber-100 text-amber-700 border-amber-200"
                                : m.priority === "medium"
                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                : "bg-neutral-100 text-neutral-600 border-neutral-200"
                            )}
                          >
                            {m.priority}
                          </Badge>
                        )}
                      </div>

                      <h4
                        className={cn(
                          "text-sm font-bold text-neutral-900 leading-snug",
                          isDone && "line-through text-neutral-500"
                        )}
                      >
                        {cleanTitle}
                      </h4>

                      {m.description && (
                        <p className="text-xs text-neutral-600 line-clamp-2">{m.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl w-44 p-1">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditMilestoneId(m.id);
                              setEditModalOpen(true);
                            }}
                            className="text-xs gap-2 cursor-pointer rounded-lg"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-violet-600" />
                            Edit Milestone
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />

                          {/* Status quick-change submenu */}
                          {Object.entries(STATUS_CONFIG)
                            .filter(([key]) => key !== "completed" && key !== m.status)
                            .map(([key, conf]) => (
                              <DropdownMenuItem
                                key={key}
                                onClick={() => handleUpdateStatus(m.id, key)}
                                className="text-xs gap-2 cursor-pointer rounded-lg"
                              >
                                <span className={cn("h-2 w-2 rounded-full", conf.dot)} />
                                Move to {conf.label}
                              </DropdownMenuItem>
                            ))}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTargetId(m.id)}
                            className="text-xs gap-2 cursor-pointer rounded-lg text-red-600 focus:text-red-700 focus:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Footer details: Date & Assignee */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-neutral-100 text-xs">
                  <div className="flex items-center gap-4 text-neutral-500">
                    {dueDateObj && (
                      <div
                        className={cn(
                          "flex items-center gap-1.5 font-medium",
                          isOverdue ? "text-red-600 font-semibold" : "text-neutral-600"
                        )}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {dueDateObj.toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {daysDiffText && (
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                              isDone
                                ? "bg-emerald-100 text-emerald-700"
                                : isOverdue
                                ? "bg-red-100 text-red-700"
                                : "bg-neutral-100 text-neutral-600"
                            )}
                          >
                            {daysDiffText}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {assignee && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-neutral-400">Assigned to:</span>
                      <div className="flex items-center gap-1.5">
                        {assignee.avatarUrl ? (
                          <img
                            src={assignee.avatarUrl}
                            alt={assignee.name}
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        ) : (
                          <span className="h-5 w-5 rounded-full bg-violet-100 text-violet-700 font-bold text-[9px] flex items-center justify-center">
                            {assignee.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-neutral-800">
                          {assignee.name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
