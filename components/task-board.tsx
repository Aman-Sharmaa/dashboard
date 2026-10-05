"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, MoreHorizontal, Filter, ArrowUpDown, Loader2,
  Reply, Send, X, ChevronDown, ChevronRight, Bug, Bookmark,
  Link2, AlertCircle, Clock, Flag, User as UserIcon, Circle,
  CheckCircle2, Zap, RotateCcw, AlignLeft, CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";

// ── Types ─────────────────────────────────────────────────────────────────────
type TaskStatus = "backlog" | "todo" | "in_progress" | "hold" | "code_review" | "qa" | "staging" | "production" | "in_review" | "done" | "rejected";
type BoardColumnStatus = "backlog" | "in_progress" | "hold" | "in_review" | "done" | "rejected";

const STATUSES: { id: BoardColumnStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { id: "backlog",     label: "To Do",       color: "text-[#42526e] bg-[#f4f5f7] border-[#dfe1e6]",      icon: <Circle className="h-3 w-3" /> },
  { id: "in_progress",label: "In Progress",  color: "text-[#0052cc] bg-[#deebff] border-[#b3d4ff]",      icon: <Zap className="h-3 w-3" /> },
  { id: "hold",       label: "Hold",         color: "text-[#974f0c] bg-[#fff0b3] border-[#ffe380]",      icon: <RotateCcw className="h-3 w-3" /> },
  { id: "in_review",  label: "In Review",    color: "text-[#403294] bg-[#eae6ff] border-[#c0b6f2]",      icon: <AlertCircle className="h-3 w-3" /> },
  { id: "done",       label: "Done",         color: "text-[#006644] bg-[#e3fcef] border-[#abf5d1]",      icon: <CheckCircle2 className="h-3 w-3" /> },
  { id: "rejected",   label: "Rejected",     color: "text-[#bf2600] bg-[#ffebe6] border-[#ffbdad]",      icon: <X className="h-3 w-3" /> },
];

const PRIORITIES: { id: string; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "urgent", label: "Urgent",   icon: <Flag className="h-3 w-3 fill-red-500 text-red-500" />,    color: "text-red-600" },
  { id: "high",   label: "High",     icon: <Flag className="h-3 w-3 fill-orange-500 text-orange-500" />, color: "text-orange-600" },
  { id: "medium", label: "Medium",   icon: <Flag className="h-3 w-3 fill-yellow-400 text-yellow-400" />, color: "text-yellow-500" },
  { id: "low",    label: "Low",      icon: <Flag className="h-3 w-3 fill-blue-400 text-blue-400" />,   color: "text-blue-500" },
];

const TASK_TYPES: { id: string; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "task", label: "Task", icon: <CheckSquare className="h-3 w-3" />, color: "text-blue-600 bg-blue-100" },
  { id: "bug",  label: "Bug",  icon: <Bug className="h-3 w-3" />,         color: "text-red-600 bg-red-100" },
  { id: "story",label: "Story",icon: <Bookmark className="h-3 w-3" />,    color: "text-green-600 bg-green-100" },
];

type TaskAssignee = { id: string; name: string; email: string };
type Task = {
  id: string;
  project?: string | null;
  parentTask?: string | null;
  reporter?: TaskAssignee | null;
  title: string;
  description: string;
  type: "task" | "bug" | "story";
  status: TaskStatus;
  assignee: TaskAssignee | null;
  assignees?: TaskAssignee[];
  startDate?: string | null;
  dueDate: string | null;
  timeEstimateMinutes?: number | null;
  priority: "low" | "medium" | "high" | "urgent";
  order: number;
  createdAt?: string | Date | null;
  projectName?: string;
  reportingManager?: { id: string; name: string; email: string } | null;
};
type ProjectOption = { id: string; name: string };
type Comment = {
  id: string; taskId: string; parentId: string | null;
  authorEmail: string; authorName: string; body: string; createdAt: string;
};

function normalizeStatus(status: TaskStatus): BoardColumnStatus {
  if (status === "todo" || status === "backlog") return "backlog";
  if (status === "in_progress") return "in_progress";
  if (status === "hold") return "hold";
  if (status === "in_review" || status === "code_review" || status === "qa" || status === "staging" || status === "production") return "in_review";
  if (status === "done") return "done";
  if (status === "rejected") return "rejected";
  return "backlog";
}

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  projectId?: string;
  boardId?: string;
  tasks: Task[];
  employees: { id: string; name: string; email: string }[];
  onTasksChange: (tasks: Task[]) => void;
  onRefresh: () => void;
  assigneeFilter?: string;
  hideAddInColumns?: boolean;
  projects?: ProjectOption[];
  canDeleteTask?: boolean;
};

// ── Column header config ───────────────────────────────────────────────────────
const COL_HEADER: Record<BoardColumnStatus, { dot: string; bg: string }> = {
  backlog:     { dot: "bg-[#42526e]", bg: "bg-[#f4f5f7]" },
  in_progress: { dot: "bg-[#0052cc]", bg: "bg-[#deebff]" },
  hold:        { dot: "bg-[#ff991f]", bg: "bg-[#fff0b3]" },
  in_review:   { dot: "bg-[#6554c0]", bg: "bg-[#eae6ff]" },
  done:        { dot: "bg-[#00875a]", bg: "bg-[#e3fcef]" },
  rejected:    { dot: "bg-[#de350b]", bg: "bg-[#ffebe6]" },
};

// ══════════════════════════════════════════════════════════════════════════════
// Main TaskBoard
// ══════════════════════════════════════════════════════════════════════════════
export function TaskBoard({
  projectId, boardId, tasks, employees, onTasksChange, onRefresh,
  hideAddInColumns = false, projects = [], canDeleteTask = false,
}: Props) {
  const contextId = projectId || boardId;
  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultStatus, setAddDefaultStatus] = useState<BoardColumnStatus>("backlog");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"created_desc" | "date" | "priority">("created_desc");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterType, setFilterType] = useState("");
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<BoardColumnStatus | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = tasks.filter((t) => {
    if ((t as any).isMilestone || (t as any).type === "milestone" || t.title?.toLowerCase().startsWith("[milestone]")) return false;
    const descText = t.description?.replace(/<[^>]+>/g, " ") ?? "";
    if (search.trim() && !t.title.toLowerCase().includes(search.toLowerCase()) && !descText.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterType && (t.type ?? "task") !== filterType) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "date") return (a.dueDate ? new Date(a.dueDate).getTime() : 0) - (b.dueDate ? new Date(b.dueDate).getTime() : 0);
    if (sortBy === "priority") { const o = { urgent: 0, high: 1, medium: 2, low: 3 }; return (o[a.priority] ?? 2) - (o[b.priority] ?? 2); }
    return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
  });

  const subtaskMap = sorted.reduce<Record<string, Task[]>>((acc, t) => {
    if (t.parentTask) { if (!acc[t.parentTask]) acc[t.parentTask] = []; acc[t.parentTask].push(t); }
    return acc;
  }, {});

  const subtaskStats = sorted.reduce<Record<string, { total: number; done: number }>>((acc, t) => {
    if (!t.parentTask) return acc;
    const pid = String(t.parentTask);
    if (!acc[pid]) acc[pid] = { total: 0, done: 0 };
    acc[pid].total++;
    if (t.status === "done") acc[pid].done++;
    return acc;
  }, {});

  const columns = STATUSES.map((s) => {
    const inStatus = sorted.filter((t) => normalizeStatus(t.status) === s.id);
    const roots = inStatus.filter((t) => !t.parentTask);
    const rootIds = new Set(roots.map((t) => t.id));
    const flat: Task[] = [];
    for (const root of roots) {
      flat.push(root);
      (subtaskMap[root.id] || []).filter((c) => normalizeStatus(c.status) === s.id).forEach((c) => flat.push(c));
    }
    inStatus.filter((t) => t.parentTask && !rootIds.has(String(t.parentTask))).forEach((t) => flat.push(t));
    return { ...s, tasks: flat };
  });

  // ── drag ─────────────────────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, task: Task) {
    setDraggedTask(task); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", task.id);
    (e.target as HTMLElement).style.opacity = "0.4";
  }
  function handleDragEnd(e: React.DragEvent) {
    setDraggedTask(null); setDragOverStatus(null); (e.target as HTMLElement).style.opacity = "1";
  }
  function handleDrop(e: React.DragEvent, newStatus: BoardColumnStatus) {
    e.preventDefault(); setDragOverStatus(null);
    const id = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === id);
    if (task && normalizeStatus(task.status) !== newStatus) handleUpdateStatus(id, newStatus);
  }

  // ── API ───────────────────────────────────────────────────────────────────
  async function handleUpdateStatus(taskId: string, newStatus: BoardColumnStatus) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) { toast.error("Failed to update"); return; }
      const data = await res.json();
      onTasksChange(tasks.map((t) => (t.id === taskId ? { ...t, ...data.task } : t)));
    } catch { toast.error("Failed to update"); }
  }

  async function handleAddTask(form: any) {
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(projectId ? { projectId } : {}), ...(boardId ? { boardId } : {}), ...form }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to create task"); return; }
      toast.success("Task created"); setAddOpen(false);
      if (data.task?.id) onTasksChange([...tasks, { ...data.task, id: data.task.id }]);
      onRefresh();
    } catch { toast.error("Failed to create task"); } finally { setSaving(false); }
  }

  async function handleSaveEdit(form: any) {
    if (!editTask) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${editTask.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to update"); return; }
      toast.success("Task updated"); setEditTask(null);
      onTasksChange(tasks.map((t) => (t.id === editTask.id ? { ...t, ...data.task } : t)));
      onRefresh();
    } catch { toast.error("Failed to update"); } finally { setSaving(false); }
  }

  async function handleAddChildIssue(parentTaskId: string, form: any) {
    if (!editTask?.project) { toast.error("Select a project for this task before adding subtasks"); return; }
    await handleAddTask({ ...form, parentTaskId, projectId: editTask.project });
  }

  async function confirmDeleteTask() {
    if (!deleteTaskId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${deleteTaskId}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete"); return; }
      setEditTask(null); onTasksChange(tasks.filter((t) => t.id !== deleteTaskId)); onRefresh(); toast.success("Task deleted");
    } catch { toast.error("Failed to delete"); } finally { setIsDeleting(false); setDeleteTaskId(null); }
  }

  // ── Generate issue key ─────────────────────────────────────────────────────
  function issueKey(task: Task) {
    const proj = task.projectName?.slice(0, 3).toUpperCase() || "KAN";
    const idx = tasks.findIndex((t) => t.id === task.id) + 1;
    return `${proj}-${idx}`;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[600px]">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4 shrink-0">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6b778c]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <Input placeholder="Search issues…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-52 text-sm border-[#dfe1e6] bg-[#fafbfc] rounded focus:bg-white" />
        </div>

        {/* Assignee avatars filter row (visual) */}
        <div className="flex -space-x-1.5">
          {employees.slice(0, 5).map((e) => (
            <Avatar key={e.id} className="h-7 w-7 border-2 border-white cursor-pointer hover:z-10 hover:scale-110 transition-transform" title={e.name}>
              <AvatarFallback className="text-[10px] bg-[#dfe1e6] text-[#42526e]">{getInitials(e.name)}</AvatarFallback>
            </Avatar>
          ))}
        </div>

        {/* Priority filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs border-[#dfe1e6] text-[#42526e] hover:bg-[#ebecf0]", filterPriority && "border-blue-500 text-blue-600 bg-blue-50")}>
              <Flag className="h-3.5 w-3.5" /> Priority {filterPriority && `· ${PRIORITIES.find(p => p.id === filterPriority)?.label}`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40 text-sm">
            <DropdownMenuItem onClick={() => setFilterPriority("")} className="text-xs text-muted-foreground">All priorities</DropdownMenuItem>
            <DropdownMenuSeparator />
            {PRIORITIES.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => setFilterPriority(p.id)} className="gap-2 text-xs">
                {p.icon} {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Type filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs border-[#dfe1e6] text-[#42526e] hover:bg-[#ebecf0]", filterType && "border-blue-500 text-blue-600 bg-blue-50")}>
              <Filter className="h-3.5 w-3.5" /> Type {filterType && `· ${TASK_TYPES.find(t => t.id === filterType)?.label}`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40 text-sm">
            <DropdownMenuItem onClick={() => setFilterType("")} className="text-xs text-muted-foreground">All types</DropdownMenuItem>
            <DropdownMenuSeparator />
            {TASK_TYPES.map((t) => (
              <DropdownMenuItem key={t.id} onClick={() => setFilterType(t.id)} className="gap-2 text-xs">
                <span className={cn("p-0.5 rounded", t.color)}>{t.icon}</span> {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-[#dfe1e6] text-[#42526e] hover:bg-[#ebecf0]">
              <ArrowUpDown className="h-3.5 w-3.5" /> Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44 text-sm">
            <DropdownMenuItem onClick={() => setSortBy("created_desc")} className={cn("text-xs", sortBy === "created_desc" && "font-semibold text-primary")}>Created (latest)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("date")} className={cn("text-xs", sortBy === "date" && "font-semibold text-primary")}>Due date</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("priority")} className={cn("text-xs", sortBy === "priority" && "font-semibold text-primary")}>Priority</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {(filterPriority || filterType || search) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => { setFilterPriority(""); setFilterType(""); setSearch(""); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}

        <Button size="sm" className="h-8 ml-auto gap-1.5 text-xs bg-[#0052cc] hover:bg-[#0065ff] text-white" onClick={() => { setAddDefaultStatus("backlog"); setAddOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> Create
        </Button>
      </div>

      {/* ── Board ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        <div className="flex gap-3 h-full min-w-max">
          {columns.map((col) => {
            const hdr = COL_HEADER[col.id];
            return (
              <div
                key={col.id}
                className={cn(
                  "flex-shrink-0 w-[272px] rounded-[3px] flex flex-col bg-[#f4f5f7] transition-all duration-150",
                  dragOverStatus === col.id && "ring-2 ring-[#0052cc] ring-inset bg-[#deebff]/40"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOverStatus(col.id); }}
                onDragLeave={() => setDragOverStatus(null)}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column header */}
                <div className="px-3 py-2.5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-sm shrink-0", hdr.dot)} />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#42526e]">{col.label}</span>
                    <span className="text-[11px] text-[#6b778c] font-medium">{col.tasks.length}</span>
                  </div>
                  {!hideAddInColumns && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-[#6b778c] hover:bg-[#ebecf0] hover:text-[#172b4d]" onClick={() => { setAddDefaultStatus(col.id); setAddOpen(true); }}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-2 space-y-2">
                  {col.tasks.map((task) => (
                    <JiraCard
                      key={task.id}
                      task={task}
                      issueKey={issueKey(task)}
                      isSubtask={!!task.parentTask}
                      subtaskTotal={subtaskStats[task.id]?.total ?? 0}
                      subtaskDone={subtaskStats[task.id]?.done ?? 0}
                      onClick={() => setEditTask(task)}
                      onMove={(s) => handleUpdateStatus(task.id, s)}
                      onDelete={() => setDeleteTaskId(task.id)}
                      canDelete={canDeleteTask}
                      statuses={STATUSES}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedTask?.id === task.id}
                    />
                  ))}
                  {col.tasks.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-[#6b778c] text-xs">No issues</div>
                  )}
                </div>

                {/* "+ Create" bottom */}
                {!hideAddInColumns && (
                  <div className="px-2 pb-2 shrink-0">
                    <button
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-[3px] text-[#42526e] text-xs hover:bg-[#ebecf0] transition-colors"
                      onClick={() => { setAddDefaultStatus(col.id); setAddOpen(true); }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Create issue
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add column placeholder */}
          <div className="flex-shrink-0 w-10 flex items-start pt-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#6b778c] hover:bg-[#ebecf0]">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <AddTaskDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultStatus={addDefaultStatus}
        contextProjectId={projectId}
        employees={employees}
        projects={projects}
        onAdd={handleAddTask}
        saving={saving}
      />

      {editTask && (
        <JiraTaskDetail
          task={editTask}
          allTasks={tasks}
          employees={employees}
          projects={projects}
          open={!!editTask}
          onOpenChange={(o) => !o && setEditTask(null)}
          onSave={handleSaveEdit}
          onAddChildIssue={handleAddChildIssue}
          onDelete={() => setDeleteTaskId(editTask.id)}
          canDelete={canDeleteTask}
          saving={saving}
          issueKey={issueKey(editTask)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTaskId}
        onOpenChange={(o) => !o && setDeleteTaskId(null)}
        title="Delete Issue"
        description="Are you sure you want to delete this issue? This action cannot be undone."
        onConfirm={confirmDeleteTask}
        isLoading={isDeleting}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Jira Card  (exactly like Jira board card)
// ══════════════════════════════════════════════════════════════════════════════
function JiraCard({
  task, issueKey, isSubtask, subtaskTotal, subtaskDone,
  onClick, onMove, onDelete, canDelete, statuses,
  onDragStart, onDragEnd, isDragging,
}: {
  task: Task; issueKey: string; isSubtask?: boolean;
  subtaskTotal?: number; subtaskDone?: number;
  onClick: () => void;
  onMove: (s: BoardColumnStatus) => void;
  onDelete: () => void; canDelete?: boolean;
  statuses: typeof STATUSES;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}) {
  const typeConf = TASK_TYPES.find((t) => t.id === (task.type ?? "task")) ?? TASK_TYPES[0];
  const prioConf = PRIORITIES.find((p) => p.id === task.priority) ?? PRIORITIES[2];
  const overdue = isOverdue(task.dueDate);
  const hasSubs = (subtaskTotal ?? 0) > 0;
  const subPct = hasSubs ? Math.round(((subtaskDone ?? 0) / (subtaskTotal ?? 1)) * 100) : 0;
  const assignee = task.assignees?.[0] ?? task.assignee;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, task)}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "group rounded-[3px] bg-white border border-[#dfe1e6] p-3 text-left cursor-pointer",
        "shadow-sm hover:shadow-[0_1px_8px_rgba(9,30,66,0.15)] hover:bg-white transition-shadow",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4c9aff]",
        isSubtask && "ml-3 border-l-2 border-l-[#6554c0]",
        isDragging && "opacity-40"
      )}
    >
      {/* Title */}
      <p className="text-sm text-[#172b4d] font-medium leading-snug line-clamp-3 mb-3">{task.title}</p>

      {/* Due date */}
      {task.dueDate && (
        <div className={cn("flex items-center gap-1 text-[10px] font-medium mb-2 w-fit px-1.5 py-0.5 rounded-[3px] border", overdue ? "bg-[#ffebe6] text-[#de350b] border-[#ffbdad]" : "bg-[#f4f5f7] text-[#6b778c] border-[#dfe1e6]")}>
          <AlertCircle className="h-2.5 w-2.5" />
          {fmtDate(task.dueDate)}
        </div>
      )}

      {/* Subtask progress */}
      {hasSubs && (
        <div className="mb-2">
          <div className="h-1 bg-[#dfe1e6] rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", subPct === 100 ? "bg-[#00875a]" : "bg-[#0052cc]")} style={{ width: `${subPct}%` }} />
          </div>
          <p className="text-[10px] text-[#6b778c] mt-0.5">{subtaskDone}/{subtaskTotal} subtasks</p>
        </div>
      )}

      {/* Footer: type icon, priority, issue key, assignee */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("p-0.5 rounded-[3px]", typeConf.color)} title={typeConf.label}>
            {typeConf.icon}
          </span>
          <span title={prioConf.label}>{prioConf.icon}</span>
          <span className="text-[10px] text-[#6b778c] font-medium font-mono">{issueKey}</span>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity text-[#6b778c] hover:bg-[#ebecf0]">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-sm">
              <DropdownMenuItem onClick={onClick} className="text-xs">Open issue</DropdownMenuItem>
              <DropdownMenuSeparator />
              {statuses.map((s) => normalizeStatus(task.status) !== s.id && (
                <DropdownMenuItem key={s.id} onClick={() => onMove(s.id)} className="text-xs gap-2">
                  {s.icon} Move to {s.label}
                </DropdownMenuItem>
              ))}
              {canDelete && <><DropdownMenuSeparator /><DropdownMenuItem className="text-red-600 text-xs" onClick={onDelete}>Delete</DropdownMenuItem></>}
            </DropdownMenuContent>
          </DropdownMenu>
          {assignee ? (
            <Avatar className="h-6 w-6 border border-white" title={assignee.name}>
              <AvatarFallback className="text-[9px] bg-[#0052cc] text-white">{getInitials(assignee.name)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-6 w-6 rounded-full border border-dashed border-[#6b778c] flex items-center justify-center" title="Unassigned">
              <UserIcon className="h-3 w-3 text-[#6b778c]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Jira Task Detail Dialog (Jira split-panel style)
// ══════════════════════════════════════════════════════════════════════════════
function JiraTaskDetail({
  task, allTasks, employees, projects, open, onOpenChange,
  onSave, onAddChildIssue, onDelete, canDelete, saving, issueKey,
}: {
  task: Task; allTasks: Task[]; employees: { id: string; name: string; email: string }[];
  projects: ProjectOption[]; open: boolean; onOpenChange: (o: boolean) => void;
  onSave: (form: any) => void;
  onAddChildIssue: (parentId: string, form: any) => Promise<void>;
  onDelete: () => void; canDelete?: boolean; saving: boolean; issueKey: string;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [type, setType] = useState<Task["type"]>(task.type ?? "task");
  const [status, setStatus] = useState<BoardColumnStatus>(normalizeStatus(task.status));
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id ?? "__unassigned__");
  const [reporterId, setReporterId] = useState(task.reporter?.id ?? "__none__");
  const [startDate, setStartDate] = useState(task.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "");
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
  const [timeEst, setTimeEst] = useState(task.timeEstimateMinutes != null ? String(task.timeEstimateMinutes) : "");
  const [priority, setPriority] = useState<Task["priority"]>(task.priority);
  const [projectId, setProjectId] = useState(task.project ?? "__none__");
  const [parentTaskId, setParentTaskId] = useState(task.parentTask ?? "__none__");

  const [showChildForm, setShowChildForm] = useState(false);
  const [childTitle, setChildTitle] = useState("");
  const [childAssigneeId, setChildAssigneeId] = useState("__unassigned__");
  const [childPriority, setChildPriority] = useState<Task["priority"]>("medium");
  const [childDueDate, setChildDueDate] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"desc" | "subtasks" | "comments">("desc");

  useEffect(() => {
    setTitle(task.title); setDescription(task.description); setType(task.type ?? "task");
    setStatus(normalizeStatus(task.status)); setAssigneeId(task.assignee?.id ?? "__unassigned__");
    setReporterId(task.reporter?.id ?? "__none__");
    setStartDate(task.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "");
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
    setTimeEst(task.timeEstimateMinutes != null ? String(task.timeEstimateMinutes) : "");
    setPriority(task.priority); setProjectId(task.project ?? "__none__"); setParentTaskId(task.parentTask ?? "__none__");
  }, [task]);

  const childIssues = allTasks.filter((t) => t.parentTask === task.id);
  const parentOptions = allTasks.filter((t) => t.id !== task.id && !t.parentTask);

  const typeConf = TASK_TYPES.find((t) => t.id === type) ?? TASK_TYPES[0];
  const statusConf = STATUSES.find((s) => s.id === status) ?? STATUSES[0];
  const prioConf = PRIORITIES.find((p) => p.id === priority) ?? PRIORITIES[2];
  const assigneeObj = employees.find((e) => e.id === assigneeId);
  const reporterObj = employees.find((e) => e.id === reporterId);

  function submit() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    onSave({
      title: title.trim(), description, type, status,
      assigneeId: assigneeId !== "__unassigned__" ? assigneeId : null,
      reporterId: reporterId !== "__none__" ? reporterId : null,
      startDate: startDate || undefined, dueDate: dueDate || undefined,
      timeEstimateMinutes: timeEst ? Number(timeEst) : null,
      priority, parentTaskId: parentTaskId !== "__none__" ? parentTaskId : null,
      projectId: projectId !== "__none__" ? projectId : null,
    });
  }

  async function addChildIssue() {
    if (!childTitle.trim()) { toast.error("Subtask title required"); return; }
    await onAddChildIssue(task.id, {
      title: childTitle.trim(), type: "task", status: "backlog",
      assigneeId: childAssigneeId !== "__unassigned__" ? childAssigneeId : undefined,
      dueDate: childDueDate || undefined, priority: childPriority,
    });
    setChildTitle(""); setChildAssigneeId("__unassigned__"); setChildPriority("medium"); setChildDueDate(""); setShowChildForm(false);
  }

  const subPct = childIssues.length > 0
    ? Math.round(childIssues.filter((c) => c.status === "done").length / childIssues.length * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[92vh] p-0 overflow-hidden rounded-[3px] gap-0 shadow-xl border border-[#dfe1e6]">
        {/* Breadcrumb bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#ebecf0] bg-[#fafbfc] shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[#6b778c]">
            <span className={cn("p-0.5 rounded-[3px]", typeConf.color)}>{typeConf.icon}</span>
            <span className="font-mono font-medium text-[#0052cc] hover:underline cursor-pointer">{issueKey}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {canDelete && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:bg-red-50" onClick={onDelete}>Delete</Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* ── LEFT: title + description + subtasks + comments ─────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 border-r border-[#ebecf0]">
            {/* Title */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-[22px] font-semibold border-none shadow-none px-0 focus-visible:ring-0 text-[#172b4d] placeholder:text-[#a5adba]"
              placeholder="Issue title"
            />

            {/* Description */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlignLeft className="h-3.5 w-3.5 text-[#6b778c]" />
                <span className="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Description</span>
              </div>
              <RichTextEditor value={description} onChange={setDescription} placeholder="Add a description…" minHeight="100px" contentHeight="240px" />
            </div>

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-[#6b778c]" />
                  <span className="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Subtasks</span>
                  {childIssues.length > 0 && (
                    <span className="text-[10px] text-[#6b778c]">· {subPct}% Done</span>
                  )}
                </div>
                <Button size="sm" variant="ghost" className="h-6 text-xs text-[#0052cc] hover:bg-[#deebff]" onClick={() => setShowChildForm((v) => !v)}>
                  <Plus className="h-3 w-3 mr-1" /> Add subtask
                </Button>
              </div>

              {childIssues.length > 0 && (
                <div className="mb-2">
                  <div className="h-1 bg-[#dfe1e6] rounded-full overflow-hidden mb-1">
                    <div className={cn("h-full rounded-full", subPct === 100 ? "bg-[#00875a]" : "bg-[#0052cc]")} style={{ width: `${subPct}%` }} />
                  </div>
                </div>
              )}

              {childIssues.length > 0 && (
                <div className="rounded-[3px] border border-[#dfe1e6] overflow-hidden divide-y divide-[#ebecf0]">
                  <div className="grid grid-cols-[1fr_80px_80px_100px] bg-[#f4f5f7] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6b778c]">
                    <span>Work</span><span>Priority</span><span>Assignee</span><span>Status</span>
                  </div>
                  {childIssues.map((child) => {
                    const cType = TASK_TYPES.find((t) => t.id === (child.type ?? "task")) ?? TASK_TYPES[0];
                    const cPrio = PRIORITIES.find((p) => p.id === child.priority) ?? PRIORITIES[2];
                    const cStatus = STATUSES.find((s) => s.id === normalizeStatus(child.status)) ?? STATUSES[0];
                    const cAssignee = child.assignees?.[0] ?? child.assignee;
                    return (
                      <div key={child.id} className="grid grid-cols-[1fr_80px_80px_100px] px-3 py-2 items-center text-xs hover:bg-[#f4f5f7] transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("p-0.5 rounded-[3px] shrink-0", cType.color)}>{cType.icon}</span>
                          <span className="text-[#0052cc] font-mono text-[10px] shrink-0">{child.id.slice(-4)}</span>
                          <span className="truncate text-[#172b4d]">{child.title}</span>
                        </div>
                        <div>{cPrio.icon}</div>
                        <div>
                          {cAssignee ? (
                            <Avatar className="h-5 w-5" title={cAssignee.name}>
                              <AvatarFallback className="text-[8px] bg-[#0052cc] text-white">{getInitials(cAssignee.name)}</AvatarFallback>
                            </Avatar>
                          ) : <UserIcon className="h-4 w-4 text-[#6b778c]" />}
                        </div>
                        <div>
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-[3px] border", cStatus.color)}>
                            {cStatus.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {showChildForm && (
                <div className="mt-2 rounded-[3px] border border-[#0052cc] bg-white p-3 space-y-2.5">
                  <Input
                    value={childTitle}
                    onChange={(e) => setChildTitle(e.target.value)}
                    placeholder="Subtask title"
                    className="h-8 text-sm border-[#dfe1e6]"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && addChildIssue()}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Select value={childPriority} onValueChange={(v) => setChildPriority(v as Task["priority"])}>
                      <SelectTrigger className="h-7 w-28 text-xs border-[#dfe1e6]"><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={childAssigneeId} onValueChange={setChildAssigneeId}>
                      <SelectTrigger className="h-7 w-36 text-xs border-[#dfe1e6]"><SelectValue placeholder="Assignee" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned__" className="text-xs">Unassigned</SelectItem>
                        {employees.map((e) => <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={childDueDate} onChange={(e) => setChildDueDate(e.target.value)} className="h-7 text-xs border-[#dfe1e6] w-36" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowChildForm(false)}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs bg-[#0052cc] hover:bg-[#0065ff] text-white" onClick={addChildIssue} disabled={saving}>
                      {saving ? "Creating…" : "Create subtask"}
                    </Button>
                  </div>
                </div>
              )}

              {childIssues.length === 0 && !showChildForm && (
                <p className="text-xs text-[#6b778c] italic">No subtasks yet.</p>
              )}
            </div>

            {/* Comments */}
            <TaskCommentThread taskId={task.id} />
          </div>

          {/* ── RIGHT: status + details ──────────────────────────────────── */}
          <div className="w-[260px] shrink-0 overflow-y-auto bg-[#fafbfc] px-4 py-4 space-y-4">
            {/* Status pill */}
            <div>
              <Select value={status} onValueChange={(v) => setStatus(v as BoardColumnStatus)}>
                <SelectTrigger className={cn("h-8 border font-semibold text-xs rounded-[3px]", statusConf.color)}>
                  <div className="flex items-center gap-1.5">{statusConf.icon}<SelectValue /></div>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      <div className="flex items-center gap-1.5">{s.icon}{s.label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Details section */}
            <div>
              <button
                className="flex items-center gap-1 text-xs font-semibold text-[#172b4d] mb-3 w-full"
                onClick={() => setDetailsOpen((v) => !v)}
              >
                {detailsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Details
              </button>
              {detailsOpen && (
                <div className="space-y-3">
                  {/* Assignee */}
                  <DetailRow label="Assignee">
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                      <SelectTrigger className="h-7 border-none bg-transparent text-xs p-0 shadow-none focus:ring-0 hover:bg-[#ebecf0] rounded-[3px] px-1">
                        <div className="flex items-center gap-1.5">
                          {assigneeObj ? (
                            <><Avatar className="h-4 w-4"><AvatarFallback className="text-[8px] bg-[#0052cc] text-white">{getInitials(assigneeObj.name)}</AvatarFallback></Avatar><span>{assigneeObj.name}</span></>
                          ) : <><UserIcon className="h-3.5 w-3.5 text-[#6b778c]" /><span className="text-[#6b778c]">Unassigned</span></>}
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned__" className="text-xs">Unassigned</SelectItem>
                        {employees.map((e) => <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </DetailRow>

                  {/* Priority */}
                  <DetailRow label="Priority">
                    <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
                      <SelectTrigger className="h-7 border-none bg-transparent text-xs p-0 shadow-none focus:ring-0 hover:bg-[#ebecf0] rounded-[3px] px-1">
                        <div className="flex items-center gap-1.5">{prioConf.icon}<span>{prioConf.label}</span></div>
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs"><div className="flex items-center gap-1.5">{p.icon}{p.label}</div></SelectItem>)}
                      </SelectContent>
                    </Select>
                  </DetailRow>

                  {/* Type */}
                  <DetailRow label="Type">
                    <Select value={type} onValueChange={(v) => setType(v as Task["type"])}>
                      <SelectTrigger className="h-7 border-none bg-transparent text-xs p-0 shadow-none focus:ring-0 hover:bg-[#ebecf0] rounded-[3px] px-1">
                        <div className="flex items-center gap-1.5"><span className={cn("p-0.5 rounded-[3px]", typeConf.color)}>{typeConf.icon}</span><span>{typeConf.label}</span></div>
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_TYPES.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs"><div className="flex items-center gap-1.5"><span className={cn("p-0.5 rounded-[3px]", t.color)}>{t.icon}</span>{t.label}</div></SelectItem>)}
                      </SelectContent>
                    </Select>
                  </DetailRow>

                  {/* Parent */}
                  <DetailRow label="Parent">
                    <Select value={parentTaskId} onValueChange={setParentTaskId}>
                      <SelectTrigger className="h-7 border-none bg-transparent text-xs p-0 shadow-none focus:ring-0 hover:bg-[#ebecf0] rounded-[3px] px-1">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs">None</SelectItem>
                        {parentOptions.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs truncate">{p.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </DetailRow>

                  {/* Due date */}
                  <DetailRow label="Due date">
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                      disabled={assigneeId !== "__unassigned__"}
                      className={cn("h-7 border-none bg-transparent text-xs p-1 shadow-none focus:ring-0 hover:bg-[#ebecf0] rounded-[3px] disabled:opacity-50 disabled:cursor-not-allowed", isOverdue(dueDate) && "text-[#de350b] font-semibold")}
                    />
                  </DetailRow>

                  {/* Start date */}
                  <DetailRow label="Start date">
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="h-7 border-none bg-transparent text-xs p-1 shadow-none focus:ring-0 hover:bg-[#ebecf0] rounded-[3px]"
                    />
                  </DetailRow>

                  {/* Reporter */}
                  <DetailRow label="Reporter">
                    <Select value={reporterId} onValueChange={setReporterId}>
                      <SelectTrigger className="h-7 border-none bg-transparent text-xs p-0 shadow-none focus:ring-0 hover:bg-[#ebecf0] rounded-[3px] px-1">
                        <div className="flex items-center gap-1.5">
                          {reporterObj ? (
                            <><Avatar className="h-4 w-4"><AvatarFallback className="text-[8px] bg-[#6554c0] text-white">{getInitials(reporterObj.name)}</AvatarFallback></Avatar><span>{reporterObj.name}</span></>
                          ) : <span className="text-[#6b778c]">None</span>}
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs">None</SelectItem>
                        {employees.map((e) => <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </DetailRow>

                  {/* Project */}
                  <DetailRow label="Project">
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger className="h-7 border-none bg-transparent text-xs p-0 shadow-none focus:ring-0 hover:bg-[#ebecf0] rounded-[3px] px-1">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs">None</SelectItem>
                        {projects.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </DetailRow>

                  {/* Time estimate */}
                  <DetailRow label="Estimate">
                    <Input type="number" min={0} value={timeEst} onChange={(e) => setTimeEst(e.target.value)} placeholder="minutes"
                      className="h-7 border-none bg-transparent text-xs p-1 shadow-none focus:ring-0 hover:bg-[#ebecf0] rounded-[3px] w-24"
                    />
                  </DetailRow>
                </div>
              )}
            </div>

            {/* Timestamps */}
            {task.createdAt && (
              <div className="text-[10px] text-[#6b778c] border-t border-[#ebecf0] pt-3 space-y-0.5">
                <p>Created {fmtDate(String(task.createdAt))}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] text-[#6b778c] font-medium min-w-[72px] pt-1.5">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Add Task Dialog (quick create, Jira style)
// ══════════════════════════════════════════════════════════════════════════════
function AddTaskDialog({
  open, onOpenChange, defaultStatus, contextProjectId,
  employees, projects, onAdd, saving,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  defaultStatus: BoardColumnStatus; contextProjectId?: string;
  employees: { id: string; name: string; email: string }[];
  projects: ProjectOption[]; onAdd: (form: any) => void; saving: boolean;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<Task["type"]>("task");
  const [status, setStatus] = useState<BoardColumnStatus>(defaultStatus);
  const [assigneeId, setAssigneeId] = useState("__unassigned__");
  const [priority, setPriority] = useState("medium");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "__none__");

  useEffect(() => { if (open) { setStatus(defaultStatus); if (!projectId || projectId === "__none__") setProjectId(projects[0]?.id ?? "__none__"); } }, [open, defaultStatus]);

  function submit() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (assigneeId === "__unassigned__") { toast.error("Assignee is required"); return; }
    if (!startDate) { toast.error("Start date is required"); return; }
    if (!dueDate) { toast.error("Due date is required"); return; }
    const pid = contextProjectId || (projectId !== "__none__" ? projectId : "");
    if (!pid) { toast.error("Project is required"); return; }
    onAdd({ title: title.trim(), type, status, assigneeId, priority, startDate, dueDate, projectId: pid });
    setTitle(""); setType("task"); setAssigneeId("__unassigned__"); setPriority("medium"); setStartDate(""); setDueDate("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[3px] gap-0 p-0 border-[#dfe1e6]">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#ebecf0]">
          <DialogTitle className="text-base font-semibold text-[#172b4d]">Create issue</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4 space-y-4">
          {/* Issue type */}
          <div className="flex items-center gap-3">
            {TASK_TYPES.map((t) => (
              <button key={t.id} onClick={() => setType(t.id as Task["type"])}
                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] text-xs font-medium border transition-colors",
                  type === t.id ? `${t.color} border-current` : "border-[#dfe1e6] text-[#42526e] hover:bg-[#f4f5f7]")}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <div>
            <Label className="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Summary <span className="text-red-500">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?"
              className="mt-1 h-9 text-sm border-[#dfe1e6] rounded-[3px] focus:border-[#4c9aff]" autoFocus
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Status */}
            <div>
              <Label className="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as BoardColumnStatus)}>
                <SelectTrigger className="mt-1 h-8 text-xs border-[#dfe1e6] rounded-[3px]"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {/* Priority */}
            <div>
              <Label className="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1 h-8 text-xs border-[#dfe1e6] rounded-[3px]"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs"><div className="flex items-center gap-1.5">{p.icon}{p.label}</div></SelectItem>)}</SelectContent>
              </Select>
            </div>
            {/* Assignee */}
            <div>
              <Label className="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Assignee <span className="text-red-500">*</span></Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="mt-1 h-8 text-xs border-[#dfe1e6] rounded-[3px]"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__" disabled className="text-xs">Select</SelectItem>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Start date <span className="text-red-500">*</span></Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 h-8 text-xs border-[#dfe1e6] rounded-[3px]" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Due date <span className="text-red-500">*</span></Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={assigneeId !== "__unassigned__"} className="mt-1 h-8 text-xs border-[#dfe1e6] rounded-[3px] disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
          </div>

          {!contextProjectId && (
            <div>
              <Label className="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Project <span className="text-red-500">*</span></Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="mt-1 h-8 text-xs border-[#dfe1e6] rounded-[3px]"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled className="text-xs">Select project</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="px-5 pb-5 pt-0 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-[3px] border-[#dfe1e6]" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs rounded-[3px] bg-[#0052cc] hover:bg-[#0065ff] text-white" onClick={submit} disabled={saving}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Creating…</> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Comments thread
// ══════════════════════════════════════════════════════════════════════════════
function TaskCommentThread({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let m = true;
    fetch(`/api/tasks/${taskId}/comments`).then((r) => r.json()).then((d) => { if (m) setComments(d.comments || []); }).finally(() => { if (m) setLoading(false); });
    return () => { m = false; };
  }, [taskId]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text.trim(), parentId: replyTo?.id || null }) });
      if (!res.ok) { toast.error("Failed to post"); return; }
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]); setText(""); setReplyTo(null);
    } catch { toast.error("Failed to post"); } finally { setSending(false); }
  }

  const topLevel = comments.filter((c) => !c.parentId);
  const repMap = new Map<string, Comment[]>();
  for (const c of comments) { if (!c.parentId) continue; if (!repMap.has(c.parentId)) repMap.set(c.parentId, []); repMap.get(c.parentId)!.push(c); }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <svg className="h-3.5 w-3.5 text-[#6b778c]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 16V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h11l4 4v-4z" /></svg>
        <span className="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Activity</span>
      </div>

      {/* Comment input */}
      <div className="flex gap-2 items-start">
        <div className="h-7 w-7 rounded-full bg-[#0052cc] flex items-center justify-center shrink-0 mt-0.5">
          <UserIcon className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex-1">
          {replyTo && (
            <div className="mb-1 flex items-center gap-1.5 text-[10px] text-[#0052cc] bg-[#deebff] px-2 py-0.5 rounded-[3px]">
              Replying to {replyTo.authorName}
              <button onClick={() => setReplyTo(null)}><X className="h-3 w-3" /></button>
            </div>
          )}
          <Input
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.authorName}…` : "Add a comment…"}
            className="h-8 text-xs border-[#dfe1e6] rounded-[3px]"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          />
          {text.trim() && (
            <div className="flex gap-1.5 mt-1.5">
              <Button size="sm" className="h-6 text-[10px] bg-[#0052cc] hover:bg-[#0065ff] text-white rounded-[3px] px-2" onClick={send} disabled={sending}>
                {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] rounded-[3px] px-2" onClick={() => { setText(""); setReplyTo(null); }}>Cancel</Button>
            </div>
          )}
        </div>
      </div>

      {/* Comment list */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-[#6b778c]" /></div>
      ) : topLevel.length === 0 ? (
        <p className="text-xs text-[#6b778c] italic">No activity yet.</p>
      ) : (
        <div className="space-y-3">
          {topLevel.map((c) => (
            <div key={c.id} className="space-y-2">
              <div className="flex gap-2 items-start">
                <div className="h-7 w-7 rounded-full bg-[#6554c0] flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold text-white">
                  {getInitials(c.authorName)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-[#172b4d]">{c.authorName}</span>
                    <span className="text-[10px] text-[#6b778c]">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-xs text-[#42526e] whitespace-pre-wrap">{c.body}</p>
                  <button onClick={() => setReplyTo(c)} className="mt-1 text-[10px] text-[#6b778c] hover:text-[#0052cc] hover:underline flex items-center gap-1">
                    <Reply className="h-3 w-3" /> Reply
                  </button>
                </div>
              </div>
              {(repMap.get(c.id) || []).map((reply) => (
                <div key={reply.id} className="ml-9 flex gap-2 items-start">
                  <div className="h-6 w-6 rounded-full bg-[#dfe1e6] flex items-center justify-center shrink-0 text-[8px] font-bold text-[#42526e]">
                    {getInitials(reply.authorName)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-[#172b4d]">{reply.authorName}</span>
                      <span className="text-[10px] text-[#6b778c]">{timeAgo(reply.createdAt)}</span>
                    </div>
                    <p className="text-xs text-[#42526e] whitespace-pre-wrap">{reply.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
