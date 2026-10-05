"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Loader2,
  MoreHorizontal,
  Plus,
  X,
  MessageSquare,
  ArrowUpDown,
  CalendarDays,
  LayoutGrid,
  CheckCircle2,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Send,
  Reply,
  CornerDownRight,
  Zap,
  Pencil,
  Trash2,
  AlertTriangle,
  Users,
  Columns3,
  GripVertical,
  Settings2,
  Target,
  RotateCcw,
  Flag,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { TodayGoalsSection } from "@/components/today-goals-section";
import { CreateGoalModal } from "@/components/create-goal-modal";
import { CreateRoutineModal } from "@/components/create-routine-modal";
import { ConvertTaskToRoutineModal } from "@/components/convert-task-to-routine-modal";
import { PerformanceReportsView } from "@/components/performance-reports-view";
import { RoutinesView } from "@/components/routines-view";
import { TeamPerformanceView } from "@/components/team-performance-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────
type Assignee = { id: string; name: string; email: string; avatarUrl?: string | null };
type SprintOption = { id: string; name: string; startDate: string | null; endDate: string | null; status: "planned" | "active" | "completed" };
type Comment = {
  id: string;
  taskId: string;
  parentId: string | null;
  authorEmail: string;
  authorName: string;
  body: string;
  createdAt: string;
};
type Task = {
  id: string;
  project?: string | null;
  board?: string | null;
  sprint?: string | null;
  parentTask?: string | null;
  title: string;
  description: string;
  type: "task" | "bug" | "social_media_planner";
  status: string;
  assignee: Assignee | null;
  assignees: Assignee[];
  reporter?: Assignee | null;
  startDate?: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  label?: string | null;
  order: number;
  projectName?: string;
  reportingManager?: { id: string; name: string; email: string } | null;
  commentCount?: number;
  socialMediaPlanner?: SocialMediaPlannerData | null;
  history?: {
    field: string;
    oldValue: string | null;
    newValue: string | null;
    updatedBy: string;
    updatedAt: string;
  }[];
  isMilestone?: boolean;
};
type ProjectOption = { id: string; name: string };
type BoardOption = { id: string; name: string; type: string; order: number; isTaskManager: boolean; labels: string[] };
type Employee = { id: string; name: string; email: string; avatarUrl?: string | null };
type SocialMediaProgressStatus =
  | "content_planning"
  | "script_ready"
  | "design_ready"
  | "scheduled"
  | "posted"
  | "performance_tracking"
  | "completed";
type SocialMediaPlannerData = {
  platforms: string[];
  pagesAccounts: string[];
  linkedProjectIds: string[];
  postTypes: string[];
  goalTargets?: {
    targetViews?: number | null;
    targetLikes?: number | null;
    targetComments?: number | null;
    targetShares?: number | null;
    targetFollowersGain?: number | null;
  };
  contentPlan?: {
    richText?: string;
    captionIdea?: string;
    hook?: string;
    hashtags?: string;
    callToAction?: string;
  };
  postingDate?: string | null;
  postingTime?: string | null;
  progressStatus?: SocialMediaProgressStatus;
};
type SocialMediaPlannerFormState = {
  platforms: string[];
  pagesAccounts: string[];
  linkedProjectIds: string[];
  postTypes: string[];
  targetViews: string;
  targetLikes: string;
  targetComments: string;
  targetShares: string;
  targetFollowersGain: string;
  contentPlanRichText: string;
  captionIdea: string;
  hook: string;
  hashtags: string;
  callToAction: string;
  postDate: string;
  postTime: string;
  progressStatus: SocialMediaProgressStatus;
};

// ── Constants ──────────────────────────────────────
const STATUSES: { id: Task["status"]; label: string; dot: string; bg: string; border: string }[] = [
  { id: "backlog", label: "Backlog", dot: "bg-gray-400", bg: "bg-gray-50", border: "border-gray-200" },
  { id: "in_progress", label: "Inprogress", dot: "bg-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
  { id: "hold", label: "Hold", dot: "bg-orange-500", bg: "bg-orange-50", border: "border-orange-200" },
  { id: "in_review", label: "Inreview", dot: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-200" },
  { id: "done", label: "Completed", dot: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" },
  { id: "rejected", label: "Rejected", dot: "bg-rose-500", bg: "bg-rose-50", border: "border-rose-200" },
];

const PRIORITIES = [
  { id: "low", label: "Low", pillClass: "bg-slate-100 text-slate-700" },
  { id: "medium", label: "Normal", pillClass: "bg-blue-100 text-blue-700" },
  { id: "high", label: "High", pillClass: "bg-amber-100 text-amber-700" },
  { id: "urgent", label: "Urgent", pillClass: "bg-red-100 text-red-700" },
] as const;

const TASK_TYPES = [
  { id: "task", label: "Task", pillClass: "bg-slate-100 text-slate-700" },
  { id: "bug", label: "Bug", pillClass: "bg-rose-100 text-rose-700" },
  { id: "social_media_planner", label: "Social Media Planner", pillClass: "bg-violet-100 text-violet-700" },
] as const;

const SOCIAL_PLATFORM_OPTIONS = [
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "twitter_x", label: "Twitter/X" },
  { id: "facebook", label: "Facebook" },
  { id: "multiple", label: "Multiple" },
] as const;

const SOCIAL_POST_TYPE_OPTIONS = [
  { id: "reel", label: "Reel" },
  { id: "carousel", label: "Carousel" },
  { id: "image_post", label: "Image Post" },
  { id: "story", label: "Story" },
  { id: "video", label: "Video" },
  { id: "thread", label: "Thread" },
] as const;

const SOCIAL_PROGRESS_STATUS_OPTIONS: Array<{ id: SocialMediaProgressStatus; label: string }> = [
  { id: "content_planning", label: "Content Planning" },
  { id: "script_ready", label: "Script Ready" },
  { id: "design_ready", label: "Design Ready" },
  { id: "scheduled", label: "Scheduled" },
  { id: "posted", label: "Posted" },
  { id: "performance_tracking", label: "Performance Tracking" },
  { id: "completed", label: "Completed" },
];

function getTaskTicket(taskId: string) {
  return `KLP-${taskId.slice(-6).toUpperCase()}`;
}

const DEFAULT_BOARD_COLUMNS = [
  { id: "backlog",     key: "backlog",     label: "Backlog",     color: "#9ca3af", order: 0 },
  { id: "todo",        key: "todo",        label: "Todo",        color: "#9ca3af", order: 1 },
  { id: "in_progress", key: "in_progress", label: "Inprogress",  color: "#3b82f6", order: 2 },
  { id: "hold",        key: "hold",        label: "Hold",        color: "#f97316", order: 3 },
  { id: "in_review",   key: "in_review",   label: "Inreview",    color: "#f59e0b", order: 4 },
  { id: "done",        key: "done",        label: "Completed",   color: "#10b981", order: 5 },
  { id: "rejected",    key: "rejected",    label: "Rejected",    color: "#f43f5e", order: 6 },
];

function getStatusStyles(color: string) {
  const hex = color.startsWith("#") ? color : "#9ca3af";
  return {
    dot: hex,
    bg: hex + "10",
    border: hex + "20"
  };
}

function normalizeBoardStatus(status: string, availableKeys?: string[]): string {
  if (availableKeys && availableKeys.includes(status)) return status;
  if (status === "todo") return "backlog";
  if (status === "staging" || status === "production" || status === "code_review" || status === "qa") return "in_review";
  if (status === "done") return "done";
  return status;
}

function getDefaultSocialMediaPlannerState(): SocialMediaPlannerFormState {
  return {
    platforms: [],
    pagesAccounts: [],
    linkedProjectIds: [],
    postTypes: [],
    targetViews: "",
    targetLikes: "",
    targetComments: "",
    targetShares: "",
    targetFollowersGain: "",
    contentPlanRichText: "",
    captionIdea: "",
    hook: "",
    hashtags: "",
    callToAction: "",
    postDate: "",
    postTime: "",
    progressStatus: "content_planning",
  };
}

function toStringNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function fromTaskSocialMediaPlanner(data?: SocialMediaPlannerData | null): SocialMediaPlannerFormState {
  const initial = getDefaultSocialMediaPlannerState();
  if (!data) return initial;
  return {
    platforms: Array.isArray(data.platforms) ? data.platforms : [],
    pagesAccounts: Array.isArray(data.pagesAccounts) ? data.pagesAccounts : [],
    linkedProjectIds: Array.isArray(data.linkedProjectIds) ? data.linkedProjectIds : [],
    postTypes: Array.isArray(data.postTypes) ? data.postTypes : [],
    targetViews: toStringNumber(data.goalTargets?.targetViews),
    targetLikes: toStringNumber(data.goalTargets?.targetLikes),
    targetComments: toStringNumber(data.goalTargets?.targetComments),
    targetShares: toStringNumber(data.goalTargets?.targetShares),
    targetFollowersGain: toStringNumber(data.goalTargets?.targetFollowersGain),
    contentPlanRichText: data.contentPlan?.richText || "",
    captionIdea: data.contentPlan?.captionIdea || "",
    hook: data.contentPlan?.hook || "",
    hashtags: data.contentPlan?.hashtags || "",
    callToAction: data.contentPlan?.callToAction || "",
    postDate: data.postingDate ? new Date(data.postingDate).toISOString().slice(0, 10) : "",
    postTime: data.postingTime || "",
    progressStatus: data.progressStatus || "content_planning",
  };
}

function toNullableNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

function toPayloadSocialMediaPlanner(state: SocialMediaPlannerFormState) {
  return {
    platforms: state.platforms,
    pagesAccounts: state.pagesAccounts,
    linkedProjectIds: state.linkedProjectIds,
    postTypes: state.postTypes,
    goalTargets: {
      targetViews: toNullableNumber(state.targetViews),
      targetLikes: toNullableNumber(state.targetLikes),
      targetComments: toNullableNumber(state.targetComments),
      targetShares: toNullableNumber(state.targetShares),
      targetFollowersGain: toNullableNumber(state.targetFollowersGain),
    },
    contentPlan: {
      richText: state.contentPlanRichText,
      captionIdea: state.captionIdea,
      hook: state.hook,
      hashtags: state.hashtags,
      callToAction: state.callToAction,
    },
    postingDate: state.postDate || null,
    postingTime: state.postTime || null,
    progressStatus: state.progressStatus,
  };
}

// ── Work type tabs ─────────────────────────────────
type WorkType = "tasks" | "goals" | "routines" | "reports";
const WORK_TYPE_TABS: { id: WorkType; label: string; icon: React.ReactNode }[] = [
  { id: "tasks",     label: "Tasks",      icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { id: "goals",     label: "Goals & KPIs", icon: <Target className="h-3.5 w-3.5" /> },
  { id: "routines",  label: "Routines",   icon: <RotateCcw className="h-3.5 w-3.5" /> },
  { id: "reports",   label: "Reports & Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
];

// ── Main Component ─────────────────────────────────
export function OrgTodoClient({ userRole }: { userRole: "admin" | "employee" }) {
  const isAdmin = userRole === "admin";
  const router = useRouter();
  const searchParams = useSearchParams();

  // Work type tab state — synced with ?tab= query param
  const tabParam = searchParams?.get("tab") as WorkType | null;
  const [activeWorkType, setActiveWorkType] = useState<WorkType>(
    tabParam && ["tasks", "goals", "routines", "reports"].includes(tabParam)
      ? tabParam
      : "tasks"
  );
  const [createGoalOpen, setCreateGoalOpen] = useState(false);
  const [createRoutineOpen, setCreateRoutineOpen] = useState(false);
  const [addTypeOpen, setAddTypeOpen] = useState(false);

  // Tab change handler that updates state and pushes new URL query param without full page reload
  const handleSwitchTab = useCallback((tabId: WorkType) => {
    setActiveWorkType(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      window.history.pushState(null, "", url.toString());
    }
  }, []);

  // Keep activeWorkType in sync when the URL ?tab= changes (e.g. sidebar navigation or browser back/forward)
  useEffect(() => {
    const t = searchParams?.get("tab");
    if (t && ["tasks", "goals", "routines", "reports"].includes(t)) {
      setActiveWorkType(t as WorkType);
    } else if (t === "milestones") {
      setActiveWorkType("tasks");
      router.replace("/dashboard/todo?tab=tasks");
    }
  }, [router, searchParams]);

  // Data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [boardColumns, setBoardColumns] = useState<Array<{ id: string; key: string; label: string; color: string; order: number }>>([]);
  const [loading, setLoading] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState<"board" | "calendar" | "list" | "delayed">("board");

  // Filters
  const [filterProject, setFilterProject] = useState("__all__");
  const [filterPriority, setFilterPriority] = useState("__all__");
  const [filterMember, setFilterMember] = useState("__all__");
  const [filterBoard, setFilterBoard] = useState("__all__");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "date" | "priority">("default");
  const [currentUser, setCurrentUser] = useState<{ userId: string; email: string; role: string; isManager?: boolean } | null>(null);
  const canManageTeam = isAdmin || Boolean(currentUser?.isManager);

  // Drag state
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<Task["status"] | null>(null);

  // Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultStatus, setAddDefaultStatus] = useState<Task["status"]>("backlog");

  const [editTask, setEditTask] = useState<Task | null>(null);
  const [convertTask, setConvertTask] = useState<Task | null>(null);
  const [editInitialTab, setEditInitialTab] = useState<"details" | "comments" | "subtasks">("details");
  const [editViewMode, setEditViewMode] = useState<"modal" | "full">("modal");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [boardManagerOpen, setBoardManagerOpen] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);

  // Track whether initial meta (projects, employees) has been loaded
  const [metaLoaded, setMetaLoaded] = useState(false);

  // Fetch user info on mount
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("org_todo_active_tab");
    if (saved === "details" || saved === "comments" || saved === "subtasks") {
      setEditInitialTab(saved);
    }
  }, []);

  const setTicketInUrl = useCallback((ticket: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (ticket) params.set("ticket", ticket);
    else params.delete("ticket");
    const query = params.toString();
    router.replace(query ? `/dashboard/todo?${query}` : "/dashboard/todo", { scroll: false });
  }, [router, searchParams]);

  const selectBoard = useCallback((boardId: string) => {
    setFilterBoard(boardId);
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (boardId === "__all__") {
      params.delete("board");
    } else {
      const board = boards.find((item) => item.id === boardId);
      if (board) params.set("board", board.name);
    }
    const query = params.toString();
    router.replace(query ? `/dashboard/todo?${query}` : "/dashboard/todo", { scroll: false });
  }, [boards, router, searchParams]);

  useEffect(() => {
    if (boards.length === 0) return;
    const boardName = searchParams?.get("board");
    if (!boardName) {
      setFilterBoard("__all__");
      return;
    }
    const matchingBoard = boards.find((board) => board.name.toLocaleLowerCase() === boardName.toLocaleLowerCase());
    setFilterBoard(matchingBoard?.id || "__all__");
  }, [boards, searchParams]);

  const openEditTaskModal = useCallback((task: Task, tab: "details" | "comments" | "subtasks" = editInitialTab) => {
    // setViewTask(null); removed
    setEditTask(task);
    setEditInitialTab(tab);
    setEditViewMode("modal");
    setTicketInUrl(null);
  }, [editInitialTab, setTicketInUrl]);

  // ── Load tasks (+ meta on first call) ───────────
  const refreshTasks = useCallback(async (includeMeta = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject !== "__all__") params.set("projectId", filterProject);
      if (filterMember === "__me__") params.set("assigneeId", "__me__");
      else if (filterMember !== "__all__") params.set("assigneeId", filterMember);
      if (filterPriority !== "__all__") params.set("priority", filterPriority);
      if (filterBoard !== "__all__") params.set("boardId", filterBoard);
      if (includeMeta) params.set("include", "meta");

      const res = await fetch(`/api/org-tasks?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "Failed to load tasks");
        return;
      }
      const data = await res.json();
      setTasks(data.tasks || []);

      // Populate filter options from the same response
      if (data.projects) setProjects(data.projects);
      if (data.employees) setEmployees(data.employees);
      if (data.boards) setBoards(data.boards);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterPriority, filterMember, filterBoard]);

  // Initial load: fetch tasks + meta in one call
  useEffect(() => {
    if (!metaLoaded) {
      refreshTasks(true).then(() => setMetaLoaded(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subsequent filter changes: fetch only tasks
  useEffect(() => {
    if (metaLoaded) {
      refreshTasks(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProject, filterPriority, filterMember, filterBoard]);

  useEffect(() => {
    if (filterBoard !== "__all__") {
      fetch(`/api/boards/${filterBoard}/columns`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.columns) setBoardColumns(data.columns);
        })
        .catch(() => {});
    } else {
      setBoardColumns(DEFAULT_BOARD_COLUMNS);
    }
  }, [filterBoard]);

  useEffect(() => {
    const ticket = searchParams?.get("ticket");
    if (!ticket || tasks.length === 0) return;
    const match = tasks.find((t) => getTaskTicket(t.id) === ticket);
    if (match) {
      const tabParam = searchParams?.get("tab");
      const nextTab =
        tabParam === "comments" || tabParam === "subtasks" ? tabParam : "details";
      setEditTask(match);
      setEditInitialTab(nextTab);
      setEditViewMode("full");
    }
  }, [searchParams, tasks]);

  const openTaskInNewTab = useCallback(
    (task: Task, tab: "details" | "comments" | "subtasks" = "details") => {
      const params = new URLSearchParams();
      params.set("ticket", getTaskTicket(task.id));
      if (tab !== "details") params.set("tab", tab);
      window.open(`/dashboard/todo?${params.toString()}`, "_blank", "noopener,noreferrer");
    },
    []
  );

  // ── Filtered & sorted tasks ──────────────────────
  const filteredTasks = tasks.filter((t) => {
    // Exclude milestones from task board / calendar / list
    if ((t as any).isMilestone || (t as any).type === "milestone" || t.title?.toLowerCase().startsWith("[milestone]")) {
      return false;
    }
    if (!search.trim()) return true;
    const descText = t.description ? t.description.replace(/<[^>]+>/g, " ") : "";
    return (
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      descText.toLowerCase().includes(search.toLowerCase())
    );
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "date") {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return da - db;
    }
    if (sortBy === "priority") {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    }
    return (a.order ?? 0) - (b.order ?? 0);
  });

  const subtaskStatsByParent = useMemo(() => {
    return sortedTasks.reduce<Record<string, { total: number; completed: number }>>((acc, t) => {
      if (!t.parentTask) return acc;
      if (!acc[t.parentTask]) acc[t.parentTask] = { total: 0, completed: 0 };
      acc[t.parentTask].total += 1;
      if (t.status === "done") acc[t.parentTask].completed += 1;
      return acc;
    }, {});
  }, [sortedTasks]);

  const activeColumns = useMemo(() => {
    if (filterBoard === "__all__") return DEFAULT_BOARD_COLUMNS;
    return boardColumns;
  }, [filterBoard, boardColumns]);

  const tasksByStatus = activeColumns.map((col) => ({
    ...col,
    id: col.key, // compatibility alias
    tasks: sortedTasks.filter((t) => {
      const normStatus = normalizeBoardStatus(t.status || "backlog", activeColumns.map(c => c.key));
      return normStatus === col.key && !t.parentTask;
    }),
  }));

  // ── Task actions ─────────────────────────────────
  async function handleUpdateStatus(taskId: string, newStatus: Task["status"]) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { toast.error("Failed to update"); return; }
      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...data.task } : t)));
    } catch { toast.error("Failed to update"); }
  }

  async function handleAddTask(form: any) {
    setSaving(true);
    try {
      const res = await fetch("/api/org-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: form.projectId || undefined,
          sprintId: form.sprintId || undefined,
          title: form.title.trim(),
          description: form.description?.trim() || undefined,
          type: form.type || "task",
          status: form.status || "backlog",
          assigneeIds: form.assigneeIds || [],
          reporterId: form.reporterId || undefined,
          startDate: form.startDate || null,
          dueDate: form.dueDate || null,
          priority: form.priority || "medium",
          label: form.label || null,
          socialMediaPlanner:
            form.type === "social_media_planner" ? form.socialMediaPlanner : undefined,
          boardId: filterBoard !== "__all__" ? filterBoard : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to create task"); return; }
      toast.success("Task created");
      setAddOpen(false);
      refreshTasks();
    } catch { toast.error("Failed to create task"); }
    finally { setSaving(false); }
  }

  async function handleSaveEdit(form: any) {
    if (!editTask) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${editTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description?.trim() || undefined,
          type: form.type || "task",
          status: form.status,
          assigneeIds: form.assigneeIds || [],
          reporterId: form.reporterId || null,
          startDate: form.startDate || null,
          dueDate: form.dueDate || null,
          priority: form.priority,
          label: form.label || null,
          projectId: form.projectId || null,
          sprintId: form.sprintId || null,
          boardId: form.boardId || null,
          socialMediaPlanner:
            form.type === "social_media_planner" ? form.socialMediaPlanner : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to update"); return; }
      toast.success("Task updated");
      setEditTask(null);
      setTasks((prev) => prev.map((t) => (t.id === editTask.id ? { ...t, ...data.task } : t)));
      refreshTasks();
    } catch { toast.error("Failed to update"); }
    finally { setSaving(false); }
  }

  async function confirmDeleteTask() {
    if (!deleteTaskId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${deleteTaskId}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete"); return; }
      setEditTask(null);
      setTasks((prev) => prev.filter((t) => t.id !== deleteTaskId));
      toast.success("Task deleted");
    } catch { toast.error("Failed to delete"); }
    finally { setIsDeleting(false); setDeleteTaskId(null); }
  }

  // ── Drag handlers ────────────────────────────────
  function handleDragStart(e: React.DragEvent, task: Task) {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
    (e.target as HTMLElement).style.opacity = "0.5";
  }
  function handleDragEnd(e: React.DragEvent) {
    setDraggedTask(null); setDragOverStatus(null);
    (e.target as HTMLElement).style.opacity = "1";
  }
  function handleDragOver(e: React.DragEvent, status: Task["status"]) {
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverStatus(status);
  }
  function handleDrop(e: React.DragEvent, newStatus: Task["status"]) {
    e.preventDefault(); setDragOverStatus(null);
    const taskId = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) handleUpdateStatus(taskId, newStatus);
  }

  // ── Active filter count (Only Mine doesn't count since it's a toggle) ──
  const activeFilterCount = [
    filterProject !== "__all__",
    filterPriority !== "__all__",
    filterMember !== "__all__" && filterMember !== "__me__",
  ].filter(Boolean).length;

  // ── Render ───────────────────────────────────────
  const showTasksView = activeWorkType === "tasks";
  const showGoalsSection = activeWorkType === "goals";

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden -m-2">
      {/* Create Goal Modal */}
      <CreateGoalModal
        open={createGoalOpen}
        onClose={() => setCreateGoalOpen(false)}
        employees={employees}
        onCreated={() => {}}
      />

      {/* Create Routine Modal */}
      <CreateRoutineModal
        open={createRoutineOpen}
        onClose={() => setCreateRoutineOpen(false)}
        employees={employees}
        onCreated={() => {}}
      />

      {/* Convert Task to Routine Modal */}
      <ConvertTaskToRoutineModal
        open={!!convertTask}
        onClose={() => setConvertTask(null)}
        task={convertTask}
        employees={employees}
        onConverted={() => {
          refreshTasks(false);
        }}
      />

      {/* Header — Jira Inspired Clean Layout */}
      <div className="shrink-0 px-4 pt-2 pb-2 space-y-3 bg-white border-b border-neutral-200/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                  Organisation Workspace
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold font-mono">
                  {tasks.length} tasks
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Jira-style board · Tasks, Goals &amp; Routines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            {showTasksView && (
              <div className="flex rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50/80 p-0.5">
                <button
                  className={cn("px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all", viewMode === "board" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800")}
                  onClick={() => setViewMode("board")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Board
                </button>
                <button
                  className={cn("px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all", viewMode === "list" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800")}
                  onClick={() => setViewMode("list")}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  List
                </button>
                <button
                  className={cn("px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all", viewMode === "calendar" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800")}
                  onClick={() => setViewMode("calendar")}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Calendar
                </button>
                <button
                  className={cn("px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all", viewMode === "delayed" ? "bg-red-500 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-800")}
                  onClick={() => setViewMode("delayed")}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Delayed
                </button>
              </div>
            )}

            {/* Add Dropdown */}
            <DropdownMenu open={addTypeOpen} onOpenChange={setAddTypeOpen}>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-xl gap-1.5 bg-violet-600 hover:bg-violet-700 shadow-sm h-8 text-xs px-3">
                  <Plus className="h-3.5 w-3.5" />
                  Add Work
                  <ChevronRight className="h-3 w-3 -rotate-90 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl w-56 p-1.5">
                <DropdownMenuItem
                  className="gap-2.5 cursor-pointer rounded-lg p-2"
                  onClick={() => {
                    setAddTypeOpen(false);
                    setAddDefaultStatus(activeColumns[0]?.key || "backlog");
                    setAddOpen(true);
                  }}
                >
                  <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-800">Task</p>
                    <p className="text-[10px] text-neutral-500">One-time project task</p>
                  </div>
                </DropdownMenuItem>
                {canManageTeam && (
                  <DropdownMenuItem
                    className="gap-2.5 cursor-pointer rounded-lg p-2"
                    onClick={() => { setAddTypeOpen(false); setCreateGoalOpen(true); }}
                  >
                    <div className="h-7 w-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-800">Goal / KPI</p>
                      <p className="text-[10px] text-neutral-500">Recurring KPI target</p>
                    </div>
                  </DropdownMenuItem>
                )}
                {canManageTeam && (
                  <DropdownMenuItem
                    className="gap-2.5 cursor-pointer rounded-lg p-2"
                    onClick={() => { setAddTypeOpen(false); setCreateRoutineOpen(true); }}
                  >
                    <div className="h-7 w-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-800">Routine</p>
                      <p className="text-[10px] text-neutral-500">Daily job responsibility</p>
                    </div>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Work type tabs — Jira Style */}
        <div className="flex items-center gap-1 border-b border-neutral-100 -mb-2">
          {WORK_TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSwitchTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 -mb-px",
                activeWorkType === tab.id
                  ? "border-violet-600 text-violet-700 bg-violet-50/50"
                  : "border-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Filters row (only for task boards) */}
        {showTasksView && (
          <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl border-neutral-200 bg-white"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>

          {/* Project filter */}
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[180px] h-9 rounded-xl border-neutral-200 text-sm">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority filter (tasks view only) */}
          {showTasksView && (
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[150px] h-9 rounded-xl border-neutral-200 text-sm">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Priorities</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Manage boards (admin, tasks view only) */}
          {showTasksView && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl gap-1.5 border-neutral-200 shrink-0"
              onClick={() => setBoardManagerOpen(true)}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Boards
            </Button>
          )}

          {/* Manage board columns (admin, tasks view only) */}
          {showTasksView && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl gap-1.5 border-neutral-200 shrink-0"
              onClick={() => setColumnManagerOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Columns
            </Button>
          )}

          {/* Team member filter ~ organization-wide task visibility */}
          {employees.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterMember("__all__")}
                className={cn(
                  "h-8 rounded-xl px-2.5 text-xs font-medium transition-all duration-150 border",
                  filterMember === "__all__" ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                )}
              >
                All
              </button>
              <div className="flex items-center -space-x-1.5">
                {employees.slice(0, 5).map((e) => (
                  <button
                    key={e.id}
                    title={e.name}
                    onClick={() => setFilterMember(filterMember === e.id ? "__all__" : e.id)}
                    className={cn(
                      "relative h-8 w-8 rounded-full border-2 transition-all duration-150 hover:z-10 hover:scale-110 focus:outline-none",
                      filterMember === e.id ? "border-primary ring-2 ring-primary/30 z-10 scale-110" : "border-white hover:border-neutral-200"
                    )}
                  >
                    {e.avatarUrl ? (
                      <img src={e.avatarUrl} alt={e.name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <span className={cn(
                        "h-full w-full rounded-full flex items-center justify-center text-[10px] font-bold",
                        filterMember === e.id ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-violet-500 to-blue-500 text-white"
                      )}>
                        {e.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </button>
                ))}
                {employees.length > 5 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        title={`+${employees.length - 5} more`}
                        className="relative h-8 w-8 rounded-full border-2 border-white bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-600 hover:bg-neutral-200 transition-colors hover:z-10 outline-none"
                      >
                        +{employees.length - 5}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl w-48 max-h-64 overflow-y-auto">
                      {employees.slice(5).map((e) => (
                        <DropdownMenuItem
                          key={e.id}
                          onClick={() => setFilterMember(filterMember === e.id ? "__all__" : e.id)}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer",
                            filterMember === e.id && "bg-primary/10 text-primary font-medium"
                          )}
                        >
                          {e.avatarUrl ? (
                            <img src={e.avatarUrl} alt={e.name} className="h-5 w-5 rounded-full object-cover shrink-0" />
                          ) : (
                            <span className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                              {e.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <span className="truncate">{e.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )}

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5 border-neutral-200">
                <ArrowUpDown className="h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-48">
              <DropdownMenuItem onClick={() => setSortBy("default")}>Default</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("date")}>Due date</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("priority")}>Priority</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => { setFilterProject("__all__"); setFilterPriority("__all__"); setFilterMember("__all__"); }}
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
        )}
      </div>

      {/* ── Board Tabs (only relevant for task view) ── */}
      {showTasksView && boards.length > 0 && (
        <div className="shrink-0 px-4 pb-2">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => selectBoard("__all__")}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border",
                filterBoard === "__all__"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
              )}
            >
              All Boards
            </button>
            {boards.map((b) => (
              <button
                key={b.id}
                onClick={() => selectBoard(b.id)}
                className={cn(
                  "shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border",
                  filterBoard === b.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                )}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today's Goals horizontal strip (shown above task board in 'all' or 'goals' tabs) */}
      {showGoalsSection && (
        <div className="shrink-0 px-4 pt-2">
          <TodayGoalsSection
            isAdmin={canManageTeam}
            onCreateGoal={() => setCreateGoalOpen(true)}
            filterOwnerId={filterMember !== "__all__" && filterMember !== "__me__" ? filterMember : undefined}
          />
        </div>
      )}

      {/* Routines View */}
      {activeWorkType === "routines" ? (
        <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-2">
          <RoutinesView isAdmin={canManageTeam} onCreateRoutine={() => setCreateRoutineOpen(true)} />
        </div>
      ) : activeWorkType === "reports" ? (
        <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-2">
          <PerformanceReportsView isAdmin={canManageTeam} />
        </div>
      ) : activeWorkType === "goals" ? null : (
        /* Board / Calendar / List for Tasks */
        loading ? (
        <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-none min-h-0 px-4">
          <div className="flex gap-4 h-full min-w-max pb-2">
            {activeColumns.map((col) => {
              const styles = getStatusStyles(col.color);
              return (
                <div key={col.id} className="flex-shrink-0 w-[336px] rounded-2xl border border-neutral-200 bg-neutral-50/50 flex flex-col">
                  <div
                    className="px-4 py-3 border-b flex items-center justify-between gap-2 shrink-0 rounded-t-2xl border-solid border-neutral-200"
                    style={{
                      backgroundColor: styles.bg,
                      borderColor: styles.border
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: styles.dot }} />
                      <div className="h-4 w-20 rounded-full bg-neutral-200 animate-pulse" />
                      <div className="h-4 w-6 rounded-full bg-white/60 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1 p-3 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-xl border border-neutral-100 bg-white p-3.5 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-12 rounded-full bg-neutral-100 animate-pulse" />
                          <div className="h-4 w-16 rounded-full bg-neutral-100 animate-pulse" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-full rounded-full bg-neutral-100 animate-pulse" />
                          <div className="h-3.5 w-3/4 rounded-full bg-neutral-100 animate-pulse" />
                        </div>
                        <div className="h-1 rounded-full bg-neutral-100 overflow-hidden">
                          <div className="h-full w-1/2 rounded-full bg-neutral-200 animate-pulse" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex -space-x-1.5">
                            <div className="h-5 w-5 rounded-full bg-neutral-100 animate-pulse border-2 border-white" />
                            <div className="h-5 w-5 rounded-full bg-neutral-100 animate-pulse border-2 border-white" />
                          </div>
                          <div className="h-3 w-16 rounded-full bg-neutral-100 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === "calendar" ? (
        <div className="flex-1 overflow-auto scrollbar-none min-h-0 px-4">
          <TaskCalendarView
            tasks={sortedTasks}
            onEditTask={(task) => setEditTask(task)}
            onAddTask={(date) => {
              setAddDefaultStatus(activeColumns[0]?.key || "backlog");
              setAddOpen(true);
            }}
          />
        </div>
      ) : viewMode === "board" ? (
        <div className="flex-1 w-full overflow-x-auto overflow-y-hidden scrollbar-none min-h-0 px-4">
          <div className="flex gap-4 h-full min-w-max pb-2">
            {tasksByStatus.map((col) => {
              const styles = getStatusStyles(col.color);
              return (
                <div
                  key={col.id}
                  className={cn(
                    "flex-shrink-0 w-[336px] rounded-2xl border flex flex-col transition-all duration-200",
                    dragOverStatus === col.id
                      ? "border-primary bg-primary/5 border-2 shadow-lg shadow-primary/10"
                      : "border-neutral-200 bg-neutral-50/50"
                  )}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={() => setDragOverStatus(null)}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  {/* Column header */}
                  <div
                    className="px-4 py-3 border-b flex items-center justify-between gap-2 shrink-0 rounded-t-2xl border-solid border-neutral-200"
                    style={{
                      backgroundColor: styles.bg,
                      borderColor: styles.border
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: styles.dot }} />
                      <span className="font-semibold text-sm text-neutral-800">{col.label}</span>
                      <span className="rounded-full bg-white/80 border border-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600 tabular-nums">
                        {col.tasks.length}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg shrink-0 hover:bg-white/60"
                      onClick={() => { setAddDefaultStatus(col.id); setAddOpen(true); }}
                    >
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Scrollable tasks */}
                  <div className="flex-1 overflow-y-auto scrollbar-none min-h-0 p-3">
                    <div className="space-y-3">
                      {col.tasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                          <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center mb-2">
                            <Plus className="h-4 w-4" />
                          </div>
                          <p className="text-xs">No tasks yet</p>
                        </div>
                      )}
                      {col.tasks.map((task) => (
                        <OrgTaskCard
                          key={task.id}
                          task={task}
                          subtaskStats={subtaskStatsByParent[task.id]}
                          onMove={(status) => handleUpdateStatus(task.id, status)}
                          onView={() => {
                            openEditTaskModal(task);
                          }}
                          onEdit={() => {
                            openEditTaskModal(task);
                          }}
                          onOpenSubtasks={() => {
                            openEditTaskModal(task, "subtasks");
                          }}
                          onOpenFullPage={() => {
                            openTaskInNewTab(task, "details");
                          }}
                          onConvertToRoutine={() => setConvertTask(task)}
                          onDelete={() => setDeleteTaskId(task.id)}
                          canDelete={canManageTeam}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          isDragging={draggedTask?.id === task.id}
                          activeColumns={activeColumns}
                          isReminderBoard={boards.find((board) => board.id === task.board)?.isTaskManager === false}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Fixed add button */}
                  <div className="px-3 py-2.5 border-t border-neutral-200 shrink-0 bg-white/80 backdrop-blur-sm rounded-b-2xl">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center gap-2 text-muted-foreground hover:text-neutral-900 hover:bg-neutral-100 rounded-xl h-9"
                      onClick={() => { setAddDefaultStatus(col.id); setAddOpen(true); }}
                    >
                      <Plus className="h-4 w-4" />
                      Add task
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === "list" ? (
        <div className="flex-1 overflow-y-auto scrollbar-none min-h-0 px-4">
          <div className="space-y-1">
            {activeColumns.map((col) => {
              const colTasks = sortedTasks.filter((t) => {
                const normStatus = normalizeBoardStatus(t.status || "backlog", activeColumns.map(c => c.key));
                return normStatus === col.key && !t.parentTask;
              });
              if (colTasks.length === 0) return null;
              const styles = getStatusStyles(col.color);
              return (
                <div key={col.id} className="mb-4">
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1 border border-solid border-neutral-100"
                    style={{
                      backgroundColor: styles.bg,
                      borderColor: styles.border
                    }}
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: styles.dot }} />
                    <span className="text-xs font-semibold text-neutral-700">{col.label}</span>
                    <span className="ml-auto text-xs text-neutral-500 tabular-nums">{colTasks.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {colTasks.map((task) => {
                      const priority = PRIORITIES.find((p) => p.id === task.priority);
                      const isReminderBoard = boards.find((board) => board.id === task.board)?.isTaskManager === false;
                      const subtaskStats = subtaskStatsByParent[task.id];
                      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                      const isOverdue = dueDate && dueDate < new Date() && task.status !== "done" && task.status !== "rejected";
                      const dueLabel = dueDate
                        ? dueDate.toLocaleDateString("en-US", { day: "numeric", month: "short" })
                        : null;
                      return (
                        <div
                          key={task.id}
                          onClick={() => openEditTaskModal(task)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl border hover:bg-white cursor-pointer group transition-all duration-150",
                            isOverdue ? "border-red-200 bg-red-50/50" : "border-transparent hover:border-neutral-200"
                          )}
                        >
                          {/* Status dot */}
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: styles.dot }} />
                          {/* Overdue alert */}
                          {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                          {/* Title */}
                          <span className={cn("flex-1 min-w-0 text-sm font-medium truncate flex items-center gap-1.5", task.status === "done" && "line-through text-neutral-400")}>
                            {(task.isMilestone || task.title?.toLowerCase().includes("[milestone]")) && (
                              <span className="rounded-md bg-violet-100 text-violet-800 border border-violet-200 px-1.5 py-0.5 text-[9px] font-bold shrink-0 inline-flex items-center gap-0.5">
                                <Flag className="h-2.5 w-2.5" /> Milestone
                              </span>
                            )}
                            <span className="truncate">{task.title}</span>
                          </span>
                          {/* Ticket */}
                          <span className="text-[10px] text-neutral-400 font-mono shrink-0 hidden sm:inline">{getTaskTicket(task.id)}</span>
                          {/* Priority */}
                          {!isReminderBoard && priority && (
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 hidden md:inline-flex", priority.pillClass)}>
                              {priority.label}
                            </span>
                          )}
                          {isReminderBoard && task.label && (
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                              {task.label}
                            </span>
                          )}
                          {/* Subtask progress */}
                          {subtaskStats && subtaskStats.total > 0 && (
                            <span className="text-[10px] text-neutral-500 shrink-0 hidden lg:inline">
                              {subtaskStats.completed}/{subtaskStats.total} subtasks
                            </span>
                          )}
                          {/* Assignees */}
                          {task.assignees?.length > 0 && (
                            <div className="flex -space-x-1 shrink-0 hidden sm:flex">
                              {task.assignees.slice(0, 3).map((a) => (
                                <Avatar key={a.id} className="h-5 w-5 border-2 border-white" title={a.name}>
                                  {a.avatarUrl ? <AvatarImage src={a.avatarUrl} alt={a.name} /> : null}
                                  <AvatarFallback className="text-[9px] bg-gradient-to-br from-violet-500 to-blue-500 text-white">
                                    {a.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          )}
                          {/* Due date */}
                          {!isReminderBoard && dueLabel && (
                            <span className={cn("text-[10px] flex items-center gap-1 shrink-0", isOverdue ? "text-red-600 font-semibold" : "text-neutral-500")}>
                              {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                              {dueLabel}
                              {isOverdue && " • Overdue"}
                            </span>
                          )}
                          {/* Comment count */}
                          {(task.commentCount || 0) > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-neutral-400 shrink-0">
                              <MessageSquare className="h-3 w-3" />
                              {task.commentCount}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === "delayed" ? (
        <DelayedTasksView
          tasks={sortedTasks}
          employees={employees}
          onEditTask={(task) => openEditTaskModal(task)}
        />
      ) : null)}

      {/* Add Task Dialog */}
      <OrgAddTaskDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultStatus={addDefaultStatus}
        employees={employees}
        projects={projects}
        onAdd={handleAddTask}
        saving={saving}
        currentUser={currentUser}
        requiresTaskDetails={
          filterBoard === "__all__" || boards.find((board) => board.id === filterBoard)?.isTaskManager !== false
        }
        labelOptions={boards.find((board) => board.id === filterBoard)?.labels || []}
      />

      {/* Edit Task Dialog */}
      {editTask && (
        <OrgEditTaskDialog
          task={editTask}
          allTasks={tasks}
          employees={employees}
          projects={projects}
          boards={boards}
          initialTab={editInitialTab}
          viewMode={editViewMode}
          open={!!editTask}
          onOpenChange={(open) => {
            if (!open) {
              setEditTask(null);
              setEditViewMode("modal");
              setTicketInUrl(null);
              // Refresh to update comment counts on cards
              refreshTasks(false);
            }
          }}
          onSave={handleSaveEdit}
          onTaskMutated={() => refreshTasks(false)}
          onOpenTaskFullPage={(selectedTask, tab = "details") => {
            openTaskInNewTab(selectedTask, tab);
          }}
          onTabChange={(tab) => {
            setEditInitialTab(tab);
            if (typeof window !== "undefined") {
              window.localStorage.setItem("org_todo_active_tab", tab);
            }
          }}
          onDelete={() => setDeleteTaskId(editTask.id)}
          onConvertToRoutine={() => setConvertTask(editTask)}
          canDelete={canManageTeam}
          saving={saving}
          onCreateGoal={() => setCreateGoalOpen(true)}
          onCreateRoutine={() => setCreateRoutineOpen(true)}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTaskId}
        onOpenChange={(open) => !open && setDeleteTaskId(null)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        onConfirm={confirmDeleteTask}
        isLoading={isDeleting}
      />

      {/* Column management dialog (admin) */}
      {isAdmin && (
        <ColumnManagerDialog
          open={columnManagerOpen}
          onOpenChange={setColumnManagerOpen}
          boards={boards}
          activeBoardId={filterBoard}
          onColumnsChange={(updated) => setBoardColumns(updated)}
        />
      )}

      {/* Board management dialog (admin) */}
      {isAdmin && (
        <BoardManagerDialog
          open={boardManagerOpen}
          onOpenChange={setBoardManagerOpen}
          boards={boards}
          onBoardsChange={(updated) => setBoards(updated)}
        />
      )}
    </div>
  );
}

// ── Task Card (with project name badge) ────────────
function OrgTaskCard({
  task,
  subtaskStats,
  onMove,
  onView,
  onEdit,
  onOpenSubtasks,
  onOpenFullPage,
  onConvertToRoutine,
  onDelete,
  canDelete,
  onDragStart,
  onDragEnd,
  isDragging,
  activeColumns,
  isReminderBoard = false,
}: {
  task: Task;
  subtaskStats?: { total: number; completed: number };
  onMove: (status: Task["status"]) => void;
  onView: () => void;
  onEdit: () => void;
  onOpenSubtasks: () => void;
  onOpenFullPage: () => void;
  onConvertToRoutine?: () => void;
  onDelete: () => void;
  canDelete?: boolean;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  activeColumns?: Array<{ id: string; key: string; label: string; color: string; order: number }>;
  isReminderBoard?: boolean;
}) {
  const priority = PRIORITIES.find((p) => p.id === task.priority);
  const taskType = TASK_TYPES.find((t) => t.id === (task.type ?? "task"));
  const hasSubtasks = !!subtaskStats && subtaskStats.total > 0;
  const progressPct = hasSubtasks
    ? Math.round((subtaskStats.completed / Math.max(1, subtaskStats.total)) * 100)
    : task.status === "done"
      ? 100
      : task.status === "in_review"
        ? 75
        : task.status === "in_progress"
          ? 50
          : 5;
  const dueLabel = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", { day: "numeric", month: "long" })
    : null;
  const isOverdue = !!task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done" && task.status !== "rejected";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, task)}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(e) => e.key === "Enter" && onView()}
      className={cn(
        "rounded-xl border bg-white p-3.5 text-left shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2 group",
        isOverdue ? "border-red-300 bg-red-50/40 shadow-red-100" : "border-neutral-200",
        isDragging && "opacity-50 scale-105 shadow-xl duration-75",
        "will-change-transform"
      )}
    >
      {/* Overdue banner */}
      {!isReminderBoard && isOverdue && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg bg-red-100 border border-red-200">
          <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
          <span className="text-[10px] font-semibold text-red-700">Overdue</span>
        </div>
      )}
      {/* Top row: priority + project */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {!isReminderBoard && taskType && (
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0", taskType.pillClass)}>
              {taskType.label}
            </span>
          )}
          {!isReminderBoard && priority && (
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0", priority.pillClass)}>
              {priority.label}
            </span>
          )}
          {!isReminderBoard && task.projectName && task.projectName !== "~" && (
            <span className="rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 text-[10px] font-medium truncate max-w-[120px]">
              {task.projectName}
            </span>
          )}
          {isReminderBoard && task.label && (
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
              {task.label}
            </span>
          )}
          {(task.isMilestone || task.title?.toLowerCase().includes("[milestone]")) && (
            <span className="rounded-full bg-violet-100 text-violet-800 border border-violet-300 px-2 py-0.5 text-[10px] font-bold shrink-0 flex items-center gap-1">
              <Flag className="h-2.5 w-2.5" /> Milestone
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl w-48">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>View</DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>Edit</DropdownMenuItem>
            {onConvertToRoutine && (
              <DropdownMenuItem
                className="text-orange-700 focus:text-orange-800 focus:bg-orange-50 cursor-pointer gap-2"
                onClick={(e) => { e.stopPropagation(); onConvertToRoutine(); }}
              >
                <RotateCcw className="h-3.5 w-3.5 text-orange-600" />
                Convert to Routine
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {STATUSES.map((s) =>
              s.id !== task.status ? (
                <DropdownMenuItem key={s.id} onClick={(e) => { e.stopPropagation(); onMove(s.id); }}>
                  Move to {s.label}
                </DropdownMenuItem>
              ) : null
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <p
        className={cn(
          "font-semibold text-sm text-neutral-900 line-clamp-2 mb-1",
          task.status === "done" && "line-through opacity-50"
        )}
      >
        {task.title}
      </p>
      <div className="mb-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenFullPage();
          }}
          className="text-[10px] text-primary hover:underline"
        >
          {getTaskTicket(task.id)}
        </button>
      </div>

      {/* Description preview */}
      {task.description && task.description !== "<p></p>" && (
        <div
          className="text-xs text-muted-foreground line-clamp-2 mb-3 [&_a]:text-primary [&_a]:underline [&_img]:max-h-[150px] [&_img]:w-auto [&_img]:object-contain [&_img]:rounded-md [&_img]:my-2"
          dangerouslySetInnerHTML={{
            __html: task.description.includes("<") ? task.description : `<p>${task.description}</p>`,
          }}
        />
      )}

      {hasSubtasks && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSubtasks();
          }}
          className="text-xs font-medium text-primary hover:underline mb-2"
        >
          {subtaskStats.completed}/{subtaskStats.total}
        </button>
      )}

      {/* Progress bar */}
      {!isReminderBoard && <div className="h-1 rounded-full bg-neutral-100 overflow-hidden mb-3">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            task.status === "done" ? "bg-emerald-500" :
              task.status === "in_review" ? "bg-amber-500" :
                task.status === "in_progress" ? "bg-blue-500" : "bg-neutral-200"
          )}
          style={{
            width: `${progressPct}%`,
          }}
        />
      </div>}

      {/* Footer: assignees + meta */}
      <div className="flex items-center justify-between gap-2">
        {(task.assignees?.length > 0) ? (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 3).map((a) => (
                <Avatar key={a.id} className="h-5 w-5 border-2 border-white" title={a.name}>
                  {a.avatarUrl ? <AvatarImage src={a.avatarUrl} alt={a.name} /> : null}
                  <AvatarFallback className="text-[9px] bg-neutral-200 text-neutral-700">
                    {a.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {task.assignees.length > 3 && (
              <span className="text-[10px] text-muted-foreground ml-1">+{task.assignees.length - 3}</span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">Unassigned</span>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          {dueLabel && (
            <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-red-600 font-semibold" : "")}>
              {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
              {dueLabel}
            </span>
          )}
          <span className="flex items-center gap-0.5 text-[10px]"><MessageSquare className="h-3 w-3" /> {task.commentCount || 0}</span>
        </div>
      </div>
    </div>
  );
}



// ── Delayed Tasks View ─────────────────────────────
function DelayedTasksView({
  tasks,
  employees,
  onEditTask,
}: {
  tasks: Task[];
  employees: Employee[];
  onEditTask: (task: Task) => void;
}) {
  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done" && t.status !== "rejected" && !t.parentTask
  );

  // Group by assignee
  type EmpGroup = { emp: Employee | null; tasks: Task[] };
  const grouped = new Map<string, EmpGroup>();

  for (const task of overdueTasks) {
    const assignees = task.assignees?.length > 0 ? task.assignees : [{ id: "__unassigned__", name: "Unassigned", email: "" }];
    for (const a of assignees) {
      const key = a.id;
      if (!grouped.has(key)) {
        const emp = employees.find((e) => e.id === key) ?? null;
        grouped.set(key, { emp: a.id === "__unassigned__" ? null : (emp ?? { id: a.id, name: a.name, email: a.email }), tasks: [] });
      }
      grouped.get(key)!.tasks.push(task);
    }
  }

  const groups = Array.from(grouped.values()).sort((a, b) => b.tasks.length - a.tasks.length);

  if (overdueTasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-base font-semibold text-neutral-800">No delayed tasks!</h3>
          <p className="text-sm text-muted-foreground mt-1">All tasks are on track. Great work!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-none min-h-0 px-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="text-sm font-semibold text-red-700">{overdueTasks.length} delayed task{overdueTasks.length !== 1 ? "s" : ""}</span>
        </div>
        <span className="text-xs text-muted-foreground">across {groups.length} employee{groups.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((group) => {
          const initials = group.emp ? group.emp.name.slice(0, 2).toUpperCase() : "??";
          return (
            <div key={group.emp?.id ?? "__unassigned__"} className="rounded-2xl border border-red-200 bg-white shadow-sm overflow-hidden">
              {/* Employee header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-b border-red-100">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-red-400 to-rose-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">{group.emp?.name ?? "Unassigned"}</p>
                  {group.emp?.email && <p className="text-[11px] text-neutral-500 truncate">{group.emp.email}</p>}
                </div>
                <span className="shrink-0 h-6 min-w-6 px-2 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                  {group.tasks.length}
                </span>
              </div>
              {/* Task list */}
              <div className="divide-y divide-neutral-100">
                {group.tasks.map((task) => {
                  const daysOverdue = task.dueDate
                    ? Math.floor((now.getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                  const priority = PRIORITIES.find((p) => p.id === task.priority);
                  return (
                    <button
                      key={task.id}
                      onClick={() => onEditTask(task)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {priority && (
                            <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", priority.pillClass)}>
                              {priority.label}
                            </span>
                          )}
                          <span className="text-[10px] text-red-600 font-medium">
                            {daysOverdue === 0 ? "Due today" : `${daysOverdue}d overdue`}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Multi-select Assignees Component ───────────────
function AssigneeMultiSelect({
  employees,
  selected,
  onChange,
}: {
  employees: Employee[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = employees.filter(
    (e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search team members..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="rounded-xl h-8 text-sm"
      />
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const emp = employees.find((e) => e.id === id);
            return emp ? (
              <Badge
                key={id}
                variant="secondary"
                className="gap-1 pr-1 rounded-lg text-xs cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors"
                onClick={() => toggle(id)}
              >
                {emp.name}
                <X className="h-3 w-3" />
              </Badge>
            ) : null;
          })}
        </div>
      )}
      <div className="max-h-[160px] overflow-y-auto border rounded-xl divide-y">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No members found</p>
        )}
        {filtered.map((e) => (
          <button
            key={e.id}
            type="button"
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors",
              selected.includes(e.id) && "bg-primary/5"
            )}
            onClick={() => toggle(e.id)}
          >
            <div className={cn(
              "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
              selected.includes(e.id) ? "bg-primary border-primary text-white" : "border-neutral-300"
            )}>
              {selected.includes(e.id) && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <Avatar className="h-5 w-5">
              {e.avatarUrl ? <AvatarImage src={e.avatarUrl} alt={e.name} /> : null}
              <AvatarFallback className="text-[9px] bg-neutral-200 text-neutral-700">{e.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="block truncate font-medium text-sm">{e.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{e.email}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function OptionMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Search...",
}: {
  options: Array<{ id: string; label: string }>;
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="rounded-xl h-8 text-sm"
      />
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const selectedOption = options.find((option) => option.id === id);
            return selectedOption ? (
              <Badge
                key={id}
                variant="secondary"
                className="gap-1 pr-1 rounded-lg text-xs cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors"
                onClick={() => toggle(id)}
              >
                {selectedOption.label}
                <X className="h-3 w-3" />
              </Badge>
            ) : null;
          })}
        </div>
      )}
      <div className="max-h-[160px] overflow-y-auto border rounded-xl divide-y">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No options found</p>
        )}
        {filtered.map((option) => (
          <button
            key={option.id}
            type="button"
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors",
              selected.includes(option.id) && "bg-primary/5"
            )}
            onClick={() => toggle(option.id)}
          >
            <div className={cn(
              "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
              selected.includes(option.id) ? "bg-primary border-primary text-white" : "border-neutral-300"
            )}>
              {selected.includes(option.id) && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StringTagInput({
  value,
  onChange,
  placeholder = "Add and press Enter",
}: {
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const next = input.trim();
    if (!next) return;
    if (!value.includes(next)) onChange([...value, next]);
    setInput("");
  };

  const removeTag = (tag: string) => onChange(value.filter((item) => item !== tag));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="rounded-xl"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
        />
        <Button type="button" variant="outline" className="rounded-xl" onClick={addTag}>
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="gap-1 pr-1 rounded-lg text-xs cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors"
              onClick={() => removeTag(item)}
            >
              {item}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function OrgAddTaskDialog({
  open,
  onOpenChange,
  defaultStatus,
  employees,
  projects,
  sprints = [],
  onAdd,
  saving,
  currentUser,
  requiresTaskDetails,
  labelOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus: Task["status"];
  employees: Employee[];
  projects: ProjectOption[];
  sprints?: SprintOption[];
  onAdd: (form: any) => void;
  saving: boolean;
  currentUser: { userId: string; email: string; role: string } | null;
  requiresTaskDetails: boolean;
  labelOptions: string[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Task["type"]>("task");
  const [status, setStatus] = useState(defaultStatus);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [reporterId, setReporterId] = useState("__none__");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [label, setLabel] = useState("__none__");
  const [projectId, setProjectId] = useState("__none__");
  const [sprintId, setSprintId] = useState("__none__");
  const [socialMediaPlanner, setSocialMediaPlanner] = useState<SocialMediaPlannerFormState>(
    getDefaultSocialMediaPlannerState()
  );

  useEffect(() => {
    if (open) {
      setStatus(defaultStatus);

      const me = employees.find(
        (e) => e.id === currentUser?.userId || e.email === currentUser?.email
      );
      if (requiresTaskDetails && me) {
        setAssigneeIds([me.id]);
        setReporterId(me.id);
      } else {
        setAssigneeIds([]);
        setReporterId("__none__");
      }

      setStartDate(requiresTaskDetails ? new Date().toISOString().slice(0, 10) : "");
      setDueDate(requiresTaskDetails ? new Date().toISOString().slice(0, 10) : "");

      setProjectId("__none__");
      setPriority("medium");
      setLabel("__none__");
      setSprintId("__none__");
      setSocialMediaPlanner(getDefaultSocialMediaPlannerState());
    }
  }, [open, defaultStatus, currentUser, employees, requiresTaskDetails]);

  function submit() {
    if (!title.trim()) { toast.error("Task name is required"); return; }
    if (requiresTaskDetails && assigneeIds.length === 0) { toast.error("At least one assignee is required"); return; }
    if (requiresTaskDetails && type !== "social_media_planner") {
      if (!startDate) { toast.error("Start date is required"); return; }
      if (!dueDate) { toast.error("End date is required"); return; }
      if (projectId === "__none__") { toast.error("Project is required"); return; }
    }
    onAdd({
      title, description, type, status, assigneeIds,
      reporterId: reporterId !== "__none__" ? reporterId : undefined,
      startDate, dueDate, priority, label: label !== "__none__" ? label : null,
      projectId: projectId !== "__none__" ? projectId : undefined,
      sprintId: sprintId !== "__none__" ? sprintId : undefined,
      socialMediaPlanner:
        type === "social_media_planner"
          ? toPayloadSocialMediaPlanner(socialMediaPlanner)
          : undefined,
    });
    setTitle(""); setDescription(""); setType("task"); setStatus(defaultStatus);
    setAssigneeIds([]); setStartDate(""); setDueDate("");
    setReporterId("__none__");
    setPriority("medium"); setLabel("__none__"); setProjectId("__none__"); setSprintId("__none__");
    setSocialMediaPlanner(getDefaultSocialMediaPlannerState());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          {!requiresTaskDetails && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
              Simple reminder board — only the task name is required.
            </div>
          )}
          <div className="grid gap-2">
            <Label>Task name <span className="text-red-500">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" className="rounded-xl" />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <RichTextEditor value={description} onChange={setDescription} placeholder="Add details, links, formatting..." minHeight="120px" contentHeight="240px" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {!requiresTaskDetails && (
              <div className="grid gap-2">
                <Label>Label</Label>
                <Select value={label} onValueChange={setLabel}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select label" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No label</SelectItem>
                    {labelOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {requiresTaskDetails && <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Task["type"])}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>}
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Task["status"])}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {requiresTaskDetails && <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>}
            {requiresTaskDetails && type !== "social_media_planner" && (
              <div className="grid gap-2">
                <Label>Project {requiresTaskDetails && <span className="text-red-500">*</span>}</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No project</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Sprint</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No sprint</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.status === "active" ? "bg-emerald-500" : s.status === "planned" ? "bg-blue-400" : "bg-neutral-300")} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {requiresTaskDetails && type !== "social_media_planner" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start date {requiresTaskDetails && <span className="text-red-500">*</span>}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl" required={requiresTaskDetails} />
              </div>
              <div className="grid gap-2">
                <Label>End date {requiresTaskDetails && <span className="text-red-500">*</span>}</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-xl" required={requiresTaskDetails} />
              </div>
            </div>
          )}
          {type === "social_media_planner" && (
            <div className="rounded-xl border p-4 space-y-4 bg-violet-50/30">
              <h3 className="text-sm font-semibold">Social Media Planner Fields</h3>

              <div className="grid gap-2">
                <Label>Platform</Label>
                <OptionMultiSelect
                  options={SOCIAL_PLATFORM_OPTIONS.map((p) => ({ id: p.id, label: p.label }))}
                  selected={socialMediaPlanner.platforms}
                  onChange={(platforms) => setSocialMediaPlanner((prev) => ({ ...prev, platforms }))}
                  placeholder="Search platforms..."
                />
              </div>

              <div className="grid gap-2">
                <Label>Pages / Accounts</Label>
                <StringTagInput
                  value={socialMediaPlanner.pagesAccounts}
                  onChange={(pagesAccounts) => setSocialMediaPlanner((prev) => ({ ...prev, pagesAccounts }))}
                  placeholder="Add account/page name"
                />
              </div>

              <div className="grid gap-2">
                <Label>Projects</Label>
                <OptionMultiSelect
                  options={projects.map((p) => ({ id: p.id, label: p.name }))}
                  selected={socialMediaPlanner.linkedProjectIds}
                  onChange={(linkedProjectIds) => setSocialMediaPlanner((prev) => ({ ...prev, linkedProjectIds }))}
                  placeholder="Search projects..."
                />
              </div>

              <div className="grid gap-2">
                <Label>Post Type</Label>
                <OptionMultiSelect
                  options={SOCIAL_POST_TYPE_OPTIONS.map((p) => ({ id: p.id, label: p.label }))}
                  selected={socialMediaPlanner.postTypes}
                  onChange={(postTypes) => setSocialMediaPlanner((prev) => ({ ...prev, postTypes }))}
                  placeholder="Search post types..."
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="grid gap-1.5">
                  <Label>Target Views</Label>
                  <Input
                    type="number"
                    min={0}
                    value={socialMediaPlanner.targetViews}
                    onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, targetViews: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Target Likes</Label>
                  <Input
                    type="number"
                    min={0}
                    value={socialMediaPlanner.targetLikes}
                    onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, targetLikes: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Target Comments</Label>
                  <Input
                    type="number"
                    min={0}
                    value={socialMediaPlanner.targetComments}
                    onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, targetComments: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Target Shares</Label>
                  <Input
                    type="number"
                    min={0}
                    value={socialMediaPlanner.targetShares}
                    onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, targetShares: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Followers Gain</Label>
                  <Input
                    type="number"
                    min={0}
                    value={socialMediaPlanner.targetFollowersGain}
                    onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, targetFollowersGain: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Content Plan</Label>
                <RichTextEditor
                  value={socialMediaPlanner.contentPlanRichText}
                  onChange={(contentPlanRichText) => setSocialMediaPlanner((prev) => ({ ...prev, contentPlanRichText }))}
                  placeholder="Write content plan..."
                  minHeight="120px"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Caption Idea</Label>
                  <Input
                    value={socialMediaPlanner.captionIdea}
                    onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, captionIdea: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Hook</Label>
                  <Input
                    value={socialMediaPlanner.hook}
                    onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, hook: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Hashtags</Label>
                  <Input
                    value={socialMediaPlanner.hashtags}
                    onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, hashtags: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Call To Action</Label>
                  <Input
                    value={socialMediaPlanner.callToAction}
                    onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, callToAction: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label>Post Date</Label>
                  <Input
                    type="date"
                    value={socialMediaPlanner.postDate}
                    onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, postDate: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Post Time</Label>
                  <Input
                    type="time"
                    value={socialMediaPlanner.postTime}
                    onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, postTime: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <Select
                    value={socialMediaPlanner.progressStatus}
                    onValueChange={(progressStatus) =>
                      setSocialMediaPlanner((prev) => ({ ...prev, progressStatus: progressStatus as SocialMediaProgressStatus }))
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOCIAL_PROGRESS_STATUS_OPTIONS.map((statusOption) => (
                        <SelectItem key={statusOption.id} value={statusOption.id}>
                          {statusOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Assignees {requiresTaskDetails && <span className="text-red-500">*</span>}</Label>
            <AssigneeMultiSelect employees={employees} selected={assigneeIds} onChange={setAssigneeIds} />
          </div>
          <div className="grid gap-2">
            <Label>Reporter</Label>
            <Select value={reporterId} onValueChange={setReporterId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={`add-reporter-${e.id}`} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
          <Button onClick={submit} disabled={saving} className="rounded-xl">{saving ? "Creating…" : "Create Task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Task Dialog ───────────────────────────────
function OrgEditTaskDialog({
  task,
  allTasks,
  employees,
  projects,
  boards,
  sprints = [],
  initialTab,
  viewMode,
  open,
  onOpenChange,
  onSave,
  onTaskMutated,
  onOpenTaskFullPage,
  onTabChange,
  onDelete,
  onConvertToRoutine,
  canDelete,
  saving,
  onCreateGoal,
  onCreateRoutine,
}: {
  task: Task;
  allTasks: Task[];
  employees: Employee[];
  projects: ProjectOption[];
  boards: BoardOption[];
  sprints?: SprintOption[];
  initialTab: "details" | "comments" | "subtasks";
  viewMode: "modal" | "full";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (form: any) => void;
  onTaskMutated: () => void;
  onOpenTaskFullPage: (task: Task, tab?: "details" | "comments" | "subtasks") => void;
  onTabChange: (tab: "details" | "comments" | "subtasks") => void;
  onDelete: () => void;
  onConvertToRoutine?: () => void;
  canDelete?: boolean;
  saving: boolean;
  onCreateGoal?: () => void;
  onCreateRoutine?: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [type, setType] = useState<Task["type"]>(task.type ?? "task");
  const [status, setStatus] = useState(normalizeBoardStatus(task.status));
  const [reporterId, setReporterId] = useState(task.reporter?.id ?? "__none__");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    (task.assignees?.length > 0) ? task.assignees.map((a) => a.id) : (task.assignee ? [task.assignee.id] : [])
  );
  const [startDate, setStartDate] = useState(task.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "");
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
  const [priority, setPriority] = useState<string>(task.priority);
  const [label, setLabel] = useState(task.label ?? "__none__");
  const [projectId, setProjectId] = useState(task.project ?? "__none__");
  const [boardId, setBoardId] = useState(task.board ?? "__none__");
  const requiresTaskDetails = boards.find((board) => board.id === boardId)?.isTaskManager !== false;
  const [sprintId, setSprintId] = useState(task.sprint ?? "__none__");
  const [socialMediaPlanner, setSocialMediaPlanner] = useState<SocialMediaPlannerFormState>(
    fromTaskSocialMediaPlanner(task.socialMediaPlanner)
  );

  // Tab: details or comments
  const [activeTab, setActiveTab] = useState<"details" | "comments" | "subtasks" | "history">("details");
  const [inlineDueDateSaving, setInlineDueDateSaving] = useState(false);
  const [inlineDueDate, setInlineDueDate] = useState(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [previewSubtask, setPreviewSubtask] = useState<Task | null>(null);
  const [sidebarMode, setSidebarMode] = useState<"overview" | "edit">("overview");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDescription, setSubtaskDescription] = useState("");
  const [subtaskType, setSubtaskType] = useState<Task["type"]>("task");
  const [subtaskStatus, setSubtaskStatus] = useState<Task["status"]>("backlog");
  const [subtaskPriority, setSubtaskPriority] = useState<Task["priority"]>("medium");
  const [subtaskProjectId, setSubtaskProjectId] = useState("__none__");
  const [subtaskSprintId, setSubtaskSprintId] = useState("__none__");
  const [subtaskStartDate, setSubtaskStartDate] = useState(
    task.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : ""
  );
  const [subtaskDueDate, setSubtaskDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
  );
  const [subtaskAssigneeIds, setSubtaskAssigneeIds] = useState<string[]>(
    task.assignees?.length ? task.assignees.map((a) => a.id) : task.assignee ? [task.assignee.id] : []
  );
  const [childReporterId, setChildReporterId] = useState("__none__");
  const [subtaskSaving, setSubtaskSaving] = useState(false);
  const childTasks = allTasks
    .filter((t) => t.parentTask === task.id)
    .sort((a, b) => Number(a.status === "done") - Number(b.status === "done"));

  // Work Connections: Goals and Routines
  const [createdGoals, setCreatedGoals] = useState<any[]>([]);
  const [createdRoutines, setCreatedRoutines] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetch("/api/goal-instances")
        .then((res) => (res.ok ? res.json() : { instances: [] }))
        .then((data) => setCreatedGoals(data.instances || []))
        .catch(() => {});

      fetch("/api/routines")
        .then((res) => (res.ok ? res.json() : { routines: [] }))
        .then((data) => setCreatedRoutines(data.routines || []))
        .catch(() => {});
    }
  }, [open, task.id]);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      onTabChange(initialTab);
      setSidebarMode("overview");
      setInlineDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
    }
  }, [open, initialTab, task.id, onTabChange, task.dueDate]);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setType(task.type ?? "task");
    setStatus(normalizeBoardStatus(task.status));
    setReporterId(task.reporter?.id ?? "__none__");
    setAssigneeIds(
      task.assignees?.length > 0
        ? task.assignees.map((a) => a.id)
        : task.assignee
          ? [task.assignee.id]
          : []
    );
    setStartDate(task.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "");
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
    setInlineDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
    setPriority(task.priority);
    setLabel(task.label ?? "__none__");
    setProjectId(task.project ?? "__none__");
    setBoardId(task.board ?? "__none__");
    setSprintId(task.sprint ?? "__none__");
    setSocialMediaPlanner(fromTaskSocialMediaPlanner(task.socialMediaPlanner));
  }, [
    task.id,
    task.title,
    task.description,
    task.type,
    task.status,
    task.reporter,
    task.assignees,
    task.assignee,
    task.startDate,
    task.dueDate,
    task.priority,
    task.label,
    task.project,
    task.board,
    task.sprint,
    task.socialMediaPlanner
  ]);

  function submit() {
    if (!title.trim()) { toast.error("Task name is required"); return; }
    if (requiresTaskDetails && assigneeIds.length === 0) { toast.error("At least one assignee is required"); return; }
    if (requiresTaskDetails && type !== "social_media_planner") {
      if (!startDate) { toast.error("Start date is required"); return; }
      if (!dueDate) { toast.error("End date is required"); return; }
      if (projectId === "__none__") { toast.error("Project is required"); return; }
    }
    onSave({
      title, description, type, status, assigneeIds,
      reporterId: reporterId !== "__none__" ? reporterId : null,
      startDate, dueDate, priority, label: label !== "__none__" ? label : null,
      projectId: projectId !== "__none__" ? projectId : null,
      boardId: boardId !== "__none__" ? boardId : null,
      sprintId: sprintId !== "__none__" ? sprintId : null,
      socialMediaPlanner:
        type === "social_media_planner"
          ? toPayloadSocialMediaPlanner(socialMediaPlanner)
          : null,
    });
  }

  async function saveInlineDueDate(newDate: string) {
    if (newDate === (task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "")) return;
    setInlineDueDateSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: newDate || null }),
      });
      if (!res.ok) { toast.error("Failed to update due date"); return; }
      toast.success("Due date updated");
      setDueDate(newDate);
      onTaskMutated();
    } catch {
      toast.error("Failed to update due date");
    } finally {
      setInlineDueDateSaving(false);
    }
  }

  function openSubtaskDialog(subtask?: Task) {
    if (subtask) {
      setEditingSubtaskId(subtask.id);
      setSubtaskTitle(subtask.title || "");
      setSubtaskDescription(subtask.description || "");
      setSubtaskType(subtask.type || "task");
      setSubtaskStatus(normalizeBoardStatus(subtask.status || "backlog"));
      setSubtaskPriority(subtask.priority || "medium");
      setSubtaskProjectId(subtask.project || "__none__");
      setSubtaskSprintId(subtask.sprint || "__none__");
      setSubtaskStartDate(subtask.startDate ? new Date(subtask.startDate).toISOString().slice(0, 10) : "");
      setSubtaskDueDate(subtask.dueDate ? new Date(subtask.dueDate).toISOString().slice(0, 10) : "");
      setSubtaskAssigneeIds(
        subtask.assignees?.length ? subtask.assignees.map((a) => a.id) : subtask.assignee ? [subtask.assignee.id] : []
      );
      setChildReporterId(subtask.reporter?.id ?? "__none__");
    } else {
      setEditingSubtaskId(null);
      setSubtaskTitle("");
      setSubtaskDescription("");
      setSubtaskType("task");
      setSubtaskStatus("backlog");
      setSubtaskPriority("medium");
      setSubtaskProjectId(projectId || "__none__");
      setSubtaskSprintId(sprintId || "__none__");
      setSubtaskStartDate(task.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "");
      setSubtaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
      setSubtaskAssigneeIds(
        task.assignees?.length ? task.assignees.map((a) => a.id) : task.assignee ? [task.assignee.id] : []
      );
      setChildReporterId(task.reporter?.id ?? "__none__");
    }
    setSubtaskDialogOpen(true);
  }

  async function saveSubtask() {
    if (!subtaskTitle.trim()) {
      toast.error("Subtask title is required");
      return;
    }
    if (requiresTaskDetails && subtaskAssigneeIds.length === 0) {
      toast.error("Select at least one assignee");
      return;
    }
    if (requiresTaskDetails && (!subtaskStartDate || !subtaskDueDate)) {
      toast.error("Start and end date are required");
      return;
    }
    setSubtaskSaving(true);
    try {
      const isEdit = !!editingSubtaskId;
      const res = await fetch(isEdit ? `/api/tasks/${editingSubtaskId}` : "/api/org-tasks", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? {
              title: subtaskTitle.trim(),
              description: subtaskDescription.trim(),
              type: subtaskType,
              status: subtaskStatus,
              priority: subtaskPriority,
              assigneeIds: subtaskAssigneeIds,
              reporterId: childReporterId !== "__none__" ? childReporterId : null,
              startDate: subtaskStartDate,
              dueDate: subtaskDueDate,
              projectId: subtaskProjectId !== "__none__" ? subtaskProjectId : null,
              sprintId: subtaskSprintId !== "__none__" ? subtaskSprintId : null,
            }
            : {
              title: subtaskTitle.trim(),
              description: subtaskDescription.trim(),
              type: subtaskType,
              status: subtaskStatus,
              assigneeIds: subtaskAssigneeIds,
              reporterId: childReporterId !== "__none__" ? childReporterId : null,
              startDate: subtaskStartDate,
              dueDate: subtaskDueDate,
              priority: subtaskPriority,
              projectId: subtaskProjectId !== "__none__" ? subtaskProjectId : null,
              sprintId: subtaskSprintId !== "__none__" ? subtaskSprintId : null,
              parentTaskId: task.id,
              boardId: task.board || undefined,
            }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to save subtask");
        return;
      }
      toast.success(isEdit ? "Subtask updated" : "Subtask created");
      setSubtaskDialogOpen(false);
      onTaskMutated();
    } catch {
      toast.error("Failed to save subtask");
    } finally {
      setSubtaskSaving(false);
    }
  }

  async function deleteSubtask(subtaskId: string) {
    setSubtaskSaving(true);
    try {
      const res = await fetch(`/api/tasks/${subtaskId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete subtask");
        return;
      }
      toast.success("Subtask deleted");
      onTaskMutated();
    } catch {
      toast.error("Failed to delete subtask");
    } finally {
      setSubtaskSaving(false);
    }
  }

  async function toggleSubtaskDone(subtask: Task) {
    const nextStatus = subtask.status === "done" ? "in_progress" : "done";
    setSubtaskSaving(true);
    try {
      const res = await fetch(`/api/tasks/${subtask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        toast.error("Failed to update subtask");
        return;
      }
      onTaskMutated();
    } catch {
      toast.error("Failed to update subtask");
    } finally {
      setSubtaskSaving(false);
    }
  }

  async function shareSubtask(subtask: Task) {
    const url = `${window.location.origin}/dashboard/todo?ticket=${getTaskTicket(subtask.id)}&tab=subtasks`;
    try {
      if (navigator.share) {
        await navigator.share({ title: subtask.title, text: `Subtask: ${subtask.title}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Subtask link copied");
      }
    } catch {
      // noop
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex flex-col p-0 gap-0 overflow-hidden",
          viewMode === "full"
            ? "w-[100vw] sm:max-w-none"
            : "w-full sm:max-w-[50vw]"
        )}
      >
        {/* ── Sidebar Header ── */}
        <div className="shrink-0 border-b bg-white">
          {/* Top bar: breadcrumb + actions */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2 gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <button
                type="button"
                className="hover:text-foreground hover:underline transition-colors"
                onClick={() => {
                  setActiveTab("details");
                  onTabChange("details");
                }}
              >
                Tasks
              </button>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="font-medium text-foreground truncate">{getTaskTicket(task.id)}</span>
            </div>
            {/* Action icons */}
            <div className="flex items-center gap-1 shrink-0">
              {activeTab === "details" && sidebarMode === "overview" && (
                <button
                  type="button"
                  title="Edit details"
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
                  onClick={() => setSidebarMode("edit")}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              {onConvertToRoutine && (
                <button
                  type="button"
                  title="Convert Task to Routine"
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-orange-50 hover:text-orange-600 transition-colors"
                  onClick={onConvertToRoutine}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                title="Open in new tab"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
                onClick={() => onOpenTaskFullPage(task, activeTab === "history" ? "details" : activeTab)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              {canDelete && (
                <button
                  type="button"
                  title="Delete task"
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                title="Close"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Task title */}
          <div className="px-5 pb-3">
            <SheetTitle className="text-xl font-bold text-neutral-900 leading-snug line-clamp-2">
              {title}
            </SheetTitle>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-0 px-5 border-t">
            <button
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === "details"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("details")}
            >
              Overview
            </button>
            <button
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
                activeTab === "subtasks"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setActiveTab("subtasks");
                onTabChange("subtasks");
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Subtasks
              {childTasks.length > 0 && (
                <span className="bg-neutral-100 text-neutral-600 text-[10px] font-semibold rounded-full px-1.5 py-0.5 tabular-nums">
                  {childTasks.filter((t) => t.status === "done").length}/{childTasks.length}
                </span>
              )}
            </button>
            <button
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
                activeTab === "comments"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setActiveTab("comments");
                onTabChange("comments");
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Comments
              {(task.commentCount || 0) > 0 && (
                <span className="bg-neutral-100 text-neutral-600 text-[10px] font-semibold rounded-full px-1.5 py-0.5 tabular-nums">
                  {task.commentCount}
                </span>
              )}
            </button>
            <button
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
                activeTab === "history"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("history")}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              History
              {(task.history?.filter(h => h.field === "dueDate").length || 0) > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-semibold rounded-full px-1.5 py-0.5 tabular-nums">
                  {task.history!.filter(h => h.field === "dueDate").length}
                </span>
              )}
            </button>
          </div>
        </div>
        {/* ── End Header ── */}

        <div className="flex-1 overflow-y-auto min-h-0 px-5">
          {activeTab === "details" ? (
            sidebarMode === "overview" ? (
              <div className="py-5 space-y-6">
                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Description</h4>
                  <div
                    className="text-sm text-neutral-700 bg-neutral-50/50 border border-neutral-100 rounded-xl p-4 min-h-[100px] prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline [&_img]:max-h-[300px] [&_img]:w-auto [&_img]:object-contain [&_img]:rounded-md [&_img]:my-3"
                    dangerouslySetInnerHTML={{
                      __html: description && description !== "<p></p>"
                        ? (description.includes("<") ? description : `<p>${description}</p>`)
                        : '<p class="text-neutral-400 italic">No description provided.</p>',
                    }}
                  />
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-b border-neutral-100 py-5">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Status</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", STATUSES.find((s) => s.id === status)?.dot || "bg-neutral-400")} />
                      <span className="text-sm font-semibold text-neutral-800">
                        {STATUSES.find((s) => s.id === status)?.label || status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Priority</span>
                    <div>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold inline-flex capitalize", PRIORITIES.find((p) => p.id === priority)?.pillClass || "bg-neutral-100 text-neutral-800")}>
                        {PRIORITIES.find((p) => p.id === priority)?.label || priority}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Type</span>
                    <div>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold inline-flex capitalize", TASK_TYPES.find((t) => t.id === type)?.pillClass || "bg-neutral-100 text-neutral-800")}>
                        {TASK_TYPES.find((t) => t.id === type)?.label || type}
                      </span>
                    </div>
                  </div>

                  {type !== "social_media_planner" && (
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Project</span>
                      <div className="text-sm font-semibold text-neutral-800">
                        {projects.find((p) => p.id === projectId)?.name || <span className="text-neutral-400">~</span>}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Sprint</span>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
                      {sprintId !== "__none__" ? (
                        <>
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", sprints.find((s) => s.id === sprintId)?.status === "active" ? "bg-emerald-500" : sprints.find((s) => s.id === sprintId)?.status === "planned" ? "bg-blue-400" : "bg-neutral-300")} />
                          {sprints.find((s) => s.id === sprintId)?.name}
                        </>
                      ) : (
                        <span className="text-neutral-400">~</span>
                      )}
                    </div>
                  </div>

                  {type !== "social_media_planner" && (
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Timeline</span>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
                        <CalendarDays className="h-4 w-4 text-neutral-400" />
                        {startDate ? new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "~"}
                        <span className="text-neutral-400 mx-1">→</span>
                        {dueDate ? new Date(dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "~"}
                      </div>
                    </div>
                  )}

                  {/* Inline due date editor */}
                  {type !== "social_media_planner" && (
                    <div className="space-y-1 col-span-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Change Due Date</span>
                        {inlineDueDateSaving && <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />}
                      </div>
                      <input
                        type="date"
                        value={inlineDueDate}
                        onChange={(e) => setInlineDueDate(e.target.value)}
                        onBlur={(e) => void saveInlineDueDate(e.target.value)}
                        className="block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors hover:border-neutral-300"
                      />
                      {task.history && task.history.filter(h => h.field === "dueDate").length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Recent Changes</p>
                          {task.history.filter(h => h.field === "dueDate").slice(-3).reverse().map((h, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                              <CalendarDays className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <span className="text-neutral-700">
                                <span className="font-semibold">{h.updatedBy}</span> changed from{" "}
                                <span className="font-semibold text-neutral-600">{h.oldValue ? new Date(h.oldValue).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "None"}</span>
                                {" → "}
                                <span className="font-semibold text-neutral-800">{h.newValue ? new Date(h.newValue).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "None"}</span>
                                <span className="text-neutral-400 ml-1">· {new Date(h.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Social Media Planner Section if type matches */}
                {type === "social_media_planner" && (
                  <div className="rounded-2xl border border-violet-100 p-5 space-y-5 bg-gradient-to-br from-violet-50/20 to-fuchsia-50/20">
                    <div className="flex items-center justify-between border-b border-violet-100 pb-2">
                      <h3 className="text-sm font-bold text-violet-950 flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-violet-500" />
                        Social Media Plan Details
                      </h3>
                      {socialMediaPlanner.progressStatus && (
                        <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full capitalize">
                          {SOCIAL_PROGRESS_STATUS_OPTIONS.find((o) => o.id === socialMediaPlanner.progressStatus)?.label || socialMediaPlanner.progressStatus}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Platforms</span>
                        <div className="flex flex-wrap gap-1.5">
                          {socialMediaPlanner.platforms.length === 0 ? (
                            <span className="text-sm text-neutral-400">~</span>
                          ) : (
                            socialMediaPlanner.platforms.map((p) => (
                              <span key={p} className="text-xs font-semibold bg-white border border-neutral-100 px-2.5 py-0.5 rounded-lg capitalize">
                                {SOCIAL_PLATFORM_OPTIONS.find((o) => o.id === p)?.label || p}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Pages / Accounts</span>
                        <div className="flex flex-wrap gap-1.5">
                          {socialMediaPlanner.pagesAccounts.length === 0 ? (
                            <span className="text-sm text-neutral-400">~</span>
                          ) : (
                            socialMediaPlanner.pagesAccounts.map((pa) => (
                              <span key={pa} className="text-xs font-semibold bg-white border border-neutral-100 px-2.5 py-0.5 rounded-lg">
                                {pa}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Linked Projects</span>
                        <div className="flex flex-wrap gap-1.5">
                          {socialMediaPlanner.linkedProjectIds.length === 0 ? (
                            <span className="text-sm text-neutral-400">~</span>
                          ) : (
                            socialMediaPlanner.linkedProjectIds.map((pid) => (
                              <span key={pid} className="text-xs font-semibold bg-white border border-neutral-100 px-2.5 py-0.5 rounded-lg">
                                {projects.find((pr) => pr.id === pid)?.name || pid}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Post Types</span>
                        <div className="flex flex-wrap gap-1.5">
                          {socialMediaPlanner.postTypes.length === 0 ? (
                            <span className="text-sm text-neutral-400">~</span>
                          ) : (
                            socialMediaPlanner.postTypes.map((pt) => (
                              <span key={pt} className="text-xs font-semibold bg-white border border-neutral-100 px-2.5 py-0.5 rounded-lg capitalize">
                                {SOCIAL_POST_TYPE_OPTIONS.find((o) => o.id === pt)?.label || pt}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-violet-100/50 pt-4">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2">Target Metrics</span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-white border border-neutral-100 rounded-xl p-3 text-center">
                          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Views</div>
                          <div className="text-sm font-bold text-neutral-800 mt-1">{socialMediaPlanner.targetViews || "0"}</div>
                        </div>
                        <div className="bg-white border border-neutral-100 rounded-xl p-3 text-center">
                          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Likes</div>
                          <div className="text-sm font-bold text-neutral-800 mt-1">{socialMediaPlanner.targetLikes || "0"}</div>
                        </div>
                        <div className="bg-white border border-neutral-100 rounded-xl p-3 text-center">
                          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Comments</div>
                          <div className="text-sm font-bold text-neutral-800 mt-1">{socialMediaPlanner.targetComments || "0"}</div>
                        </div>
                        <div className="bg-white border border-neutral-100 rounded-xl p-3 text-center">
                          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Shares</div>
                          <div className="text-sm font-bold text-neutral-800 mt-1">{socialMediaPlanner.targetShares || "0"}</div>
                        </div>
                        <div className="bg-white border border-neutral-100 rounded-xl p-3 text-center">
                          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Followers</div>
                          <div className="text-sm font-bold text-neutral-800 mt-1">{socialMediaPlanner.targetFollowersGain || "0"}</div>
                        </div>
                      </div>
                    </div>

                    {(socialMediaPlanner.postDate || socialMediaPlanner.postTime) && (
                      <div className="border-t border-violet-100/50 pt-4 flex gap-6 text-sm font-medium text-neutral-700">
                        {socialMediaPlanner.postDate && (
                          <div>
                            <span className="text-xs text-neutral-400 block font-bold uppercase tracking-wider mb-0.5">Post Date</span>
                            <span>{new Date(socialMediaPlanner.postDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                        )}
                        {socialMediaPlanner.postTime && (
                          <div>
                            <span className="text-xs text-neutral-400 block font-bold uppercase tracking-wider mb-0.5">Post Time</span>
                            <span>{socialMediaPlanner.postTime}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {socialMediaPlanner.contentPlanRichText && socialMediaPlanner.contentPlanRichText !== "<p></p>" && (
                      <div className="border-t border-violet-100/50 pt-4 space-y-1">
                        <span className="text-xs text-neutral-400 block font-bold uppercase tracking-wider">Content Plan</span>
                        <div
                          className="text-sm text-neutral-700 bg-white border border-neutral-100 rounded-xl p-4 prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline"
                          dangerouslySetInnerHTML={{ __html: socialMediaPlanner.contentPlanRichText }}
                        />
                      </div>
                    )}

                    {(socialMediaPlanner.captionIdea || socialMediaPlanner.hook || socialMediaPlanner.hashtags || socialMediaPlanner.callToAction) && (
                      <div className="border-t border-violet-100/50 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {socialMediaPlanner.captionIdea && (
                          <div className="bg-white border border-neutral-100 rounded-xl p-3">
                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Caption Idea</span>
                            <p className="text-xs text-neutral-800 font-semibold mt-1">{socialMediaPlanner.captionIdea}</p>
                          </div>
                        )}
                        {socialMediaPlanner.hook && (
                          <div className="bg-white border border-neutral-100 rounded-xl p-3">
                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Hook</span>
                            <p className="text-xs text-neutral-800 font-semibold mt-1">{socialMediaPlanner.hook}</p>
                          </div>
                        )}
                        {socialMediaPlanner.hashtags && (
                          <div className="bg-white border border-neutral-100 rounded-xl p-3">
                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Hashtags</span>
                            <p className="text-xs text-neutral-800 font-semibold mt-1">{socialMediaPlanner.hashtags}</p>
                          </div>
                        )}
                        {socialMediaPlanner.callToAction && (
                          <div className="bg-white border border-neutral-100 rounded-xl p-3">
                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Call to Action</span>
                            <p className="text-xs text-neutral-800 font-semibold mt-1">{socialMediaPlanner.callToAction}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* People (Assignees & Reporter) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Assignees</span>
                    <div className="flex flex-wrap gap-2">
                      {assigneeIds.length === 0 ? (
                        <span className="text-sm text-neutral-400">No assignees</span>
                      ) : (
                        assigneeIds.map((id) => {
                          const emp = employees.find((e) => e.id === id);
                          if (!emp) return null;
                          return (
                            <div key={`overview-assignee-${id}`} className="flex items-center gap-2 bg-neutral-50 border border-neutral-100 rounded-full pl-1.5 pr-3 py-1">
                              <Avatar className="h-6 w-6">
                                {emp.avatarUrl ? <AvatarImage src={emp.avatarUrl} alt={emp.name} /> : null}
                                <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-blue-500 text-white font-semibold">
                                  {emp.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="text-xs font-semibold text-neutral-700 leading-none">{emp.name}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Reporter</span>
                    <div>
                      {reporterId === "__none__" ? (
                        <span className="text-sm text-neutral-400">No reporter</span>
                      ) : (() => {
                        const emp = employees.find((e) => e.id === reporterId);
                        if (!emp) return <span className="text-sm text-neutral-400">~</span>;
                        return (
                          <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-100 rounded-full pl-1.5 pr-3 py-1 inline-flex">
                            <Avatar className="h-6 w-6">
                              {emp.avatarUrl ? <AvatarImage src={emp.avatarUrl} alt={emp.name} /> : null}
                              <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-blue-500 text-white font-semibold">
                                {emp.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-xs font-semibold text-neutral-700 leading-none">{emp.name}</div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* ── Work Connections & Associated Work (Goals and Routines) ── */}
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 space-y-3.5 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                        Work Associations &amp; Relations
                      </h4>
                    </div>
                    <span className="text-[11px] text-neutral-500 font-medium">Goals · Routines</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Goals & KPIs */}
                    <div className="bg-white border border-neutral-200/80 rounded-xl p-3 space-y-2 flex flex-col justify-between hover:border-violet-200 transition-colors shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                            <Target className="h-3.5 w-3.5 text-violet-600" /> Goal / KPI
                          </span>
                          {createdGoals.length > 0 && (
                            <span className="text-[10px] font-bold font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">
                              {createdGoals.length} Active
                            </span>
                          )}
                        </div>
                        {createdGoals.length > 0 ? (
                          <div className="space-y-1 mt-1">
                            {createdGoals.slice(0, 2).map((g: any) => (
                              <p key={g.id} className="text-xs font-semibold text-neutral-800 truncate">
                                • {g.template?.title || "Daily KPI Target"} ({g.overallScore || 0}%)
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-neutral-500">Track measurable targets &amp; progress score.</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onCreateGoal?.()}
                        className="w-full h-7 text-xs font-semibold rounded-lg text-violet-700 border-violet-200 hover:bg-violet-50 gap-1 mt-1"
                      >
                        <Plus className="h-3 w-3" /> Add Goal
                      </Button>
                    </div>

                    {/* 2. Routine Checklist */}
                    <div className="bg-white border border-neutral-200/80 rounded-xl p-3 space-y-2 flex flex-col justify-between hover:border-orange-200 transition-colors shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                            <RotateCcw className="h-3.5 w-3.5 text-orange-600" /> Routine
                          </span>
                          {createdRoutines.length > 0 && (
                            <span className="text-[10px] font-bold font-mono text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                              {createdRoutines.length} Active
                            </span>
                          )}
                        </div>
                        {createdRoutines.length > 0 ? (
                          <div className="space-y-1 mt-1">
                            {createdRoutines.slice(0, 2).map((r: any) => (
                              <p key={r.id} className="text-xs font-semibold text-neutral-800 truncate">
                                • {r.title} ({r.streak || 0}d streak)
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-neutral-500">Recurring daily checklists &amp; responsibilities.</p>
                        )}
                      </div>
                      <div className="flex gap-1.5 mt-1">
                        {onConvertToRoutine && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onConvertToRoutine()}
                            className="flex-1 h-7 text-xs font-semibold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-xs gap-1"
                          >
                            <RotateCcw className="h-3 w-3" /> Convert to Routine
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onCreateRoutine?.()}
                          className="h-7 text-xs font-semibold rounded-lg text-orange-700 border-orange-200 hover:bg-orange-50 gap-1 shrink-0"
                          title="Create blank routine"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 py-5">
                <div className="grid gap-2">
                  <Label>Task name</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <RichTextEditor value={description} onChange={setDescription} placeholder="Description..." minHeight="120px" contentHeight="240px" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {!requiresTaskDetails && (
                    <div className="grid gap-2">
                      <Label>Label</Label>
                      <Select value={label} onValueChange={setLabel}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select label" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No label</SelectItem>
                          {(boards.find((board) => board.id === boardId)?.labels || []).map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {requiresTaskDetails && <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={(v) => setType(v as Task["type"])}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>}
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as Task["status"])}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {requiresTaskDetails && <div className="grid gap-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>}
                  {requiresTaskDetails && type !== "social_media_planner" && (
                    <div className="grid gap-2">
                      <Label>Project <span className="text-red-500">*</span></Label>
                      <Select value={projectId} onValueChange={setProjectId}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label>Board</Label>
                    <Select value={boardId} onValueChange={setBoardId}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select board" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">General board</SelectItem>
                        {boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {boardId !== (task.board ?? "__none__") && childTasks.length > 0 && (
                      <p className="text-[11px] text-violet-700">All {childTasks.length} subtasks will move with this task.</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>Sprint</Label>
                    <Select value={sprintId} onValueChange={setSprintId}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {sprints.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-1.5">
                              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.status === "active" ? "bg-emerald-500" : s.status === "planned" ? "bg-blue-400" : "bg-neutral-300")} />
                              {s.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {requiresTaskDetails && (task.projectName || task.reportingManager) && (
                  <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                    {task.projectName && task.projectName !== "~" && (
                      <div><span className="text-muted-foreground">Project</span><div className="font-medium">{task.projectName}</div></div>
                    )}
                    {task.reportingManager && (
                      <div><span className="text-muted-foreground">Manager</span><div className="font-medium">{task.reportingManager.name}</div></div>
                    )}
                  </div>
                )}
                {requiresTaskDetails && type !== "social_media_planner" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Start date <span className="text-red-500">*</span></Label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="grid gap-2">
                      <Label>End date <span className="text-red-500">*</span></Label>
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-xl" />
                      {task.history && task.history.filter(h => h.field === "dueDate").length > 0 && (
                        <div className="mt-1 p-2 bg-neutral-50 border rounded-lg text-[10px] text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                          <p className="font-semibold text-neutral-600 mb-1">End Date History</p>
                          {task.history.filter(h => h.field === "dueDate").map((h, i) => (
                            <div key={i}>
                              <span className="font-medium text-neutral-700">{h.updatedBy}</span> changed to{" "}
                              <span className="font-medium">{h.newValue ? new Date(h.newValue).toLocaleDateString("en-IN") : "None"}</span> on {new Date(h.updatedAt).toLocaleDateString("en-IN")}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {type === "social_media_planner" && (
                  <div className="rounded-xl border p-4 space-y-4 bg-violet-50/30">
                    <h3 className="text-sm font-semibold">Social Media Planner Fields</h3>

                    <div className="grid gap-2">
                      <Label>Platform</Label>
                      <OptionMultiSelect
                        options={SOCIAL_PLATFORM_OPTIONS.map((p) => ({ id: p.id, label: p.label }))}
                        selected={socialMediaPlanner.platforms}
                        onChange={(platforms) => setSocialMediaPlanner((prev) => ({ ...prev, platforms }))}
                        placeholder="Search platforms..."
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Pages / Accounts</Label>
                      <StringTagInput
                        value={socialMediaPlanner.pagesAccounts}
                        onChange={(pagesAccounts) => setSocialMediaPlanner((prev) => ({ ...prev, pagesAccounts }))}
                        placeholder="Add account/page name"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Projects</Label>
                      <OptionMultiSelect
                        options={projects.map((p) => ({ id: p.id, label: p.name }))}
                        selected={socialMediaPlanner.linkedProjectIds}
                        onChange={(linkedProjectIds) => setSocialMediaPlanner((prev) => ({ ...prev, linkedProjectIds }))}
                        placeholder="Search projects..."
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Post Type</Label>
                      <OptionMultiSelect
                        options={SOCIAL_POST_TYPE_OPTIONS.map((p) => ({ id: p.id, label: p.label }))}
                        selected={socialMediaPlanner.postTypes}
                        onChange={(postTypes) => setSocialMediaPlanner((prev) => ({ ...prev, postTypes }))}
                        placeholder="Search post types..."
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="grid gap-1.5">
                        <Label>Target Views</Label>
                        <Input
                          type="number"
                          min={0}
                          value={socialMediaPlanner.targetViews}
                          onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, targetViews: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Target Likes</Label>
                        <Input
                          type="number"
                          min={0}
                          value={socialMediaPlanner.targetLikes}
                          onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, targetLikes: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Target Comments</Label>
                        <Input
                          type="number"
                          min={0}
                          value={socialMediaPlanner.targetComments}
                          onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, targetComments: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Target Shares</Label>
                        <Input
                          type="number"
                          min={0}
                          value={socialMediaPlanner.targetShares}
                          onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, targetShares: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Followers Gain</Label>
                        <Input
                          type="number"
                          min={0}
                          value={socialMediaPlanner.targetFollowersGain}
                          onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, targetFollowersGain: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Content Plan</Label>
                      <RichTextEditor
                        value={socialMediaPlanner.contentPlanRichText}
                        onChange={(contentPlanRichText) => setSocialMediaPlanner((prev) => ({ ...prev, contentPlanRichText }))}
                        placeholder="Write content plan..."
                        minHeight="120px"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label>Caption Idea</Label>
                        <Input
                          value={socialMediaPlanner.captionIdea}
                          onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, captionIdea: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Hook</Label>
                        <Input
                          value={socialMediaPlanner.hook}
                          onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, hook: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Hashtags</Label>
                        <Input
                          value={socialMediaPlanner.hashtags}
                          onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, hashtags: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Call To Action</Label>
                        <Input
                          value={socialMediaPlanner.callToAction}
                          onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, callToAction: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="grid gap-1.5">
                        <Label>Post Date</Label>
                        <Input
                          type="date"
                          value={socialMediaPlanner.postDate}
                          onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, postDate: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Post Time</Label>
                        <Input
                          type="time"
                          value={socialMediaPlanner.postTime}
                          onChange={(e) => setSocialMediaPlanner((prev) => ({ ...prev, postTime: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Status</Label>
                        <Select
                          value={socialMediaPlanner.progressStatus}
                          onValueChange={(progressStatus) =>
                            setSocialMediaPlanner((prev) => ({ ...prev, progressStatus: progressStatus as SocialMediaProgressStatus }))
                          }
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SOCIAL_PROGRESS_STATUS_OPTIONS.map((statusOption) => (
                              <SelectItem key={statusOption.id} value={statusOption.id}>
                                {statusOption.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>Assignees</Label>
                  <AssigneeMultiSelect employees={employees} selected={assigneeIds} onChange={setAssigneeIds} />
                </div>
                <div className="grid gap-2">
                  <Label>Reporter</Label>
                  <Select value={reporterId} onValueChange={setReporterId}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={`reporter-${e.id}`} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )
          ) : activeTab === "comments" ? (
            <TaskCommentThread taskId={task.id} />
          ) : activeTab === "history" ? (
            <div className="py-5 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-neutral-800">Due Date Change History</h3>
              </div>
              {(!task.history || task.history.filter(h => h.field === "dueDate").length === 0) ? (
                <div className="text-center py-10">
                  <CalendarDays className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
                  <p className="text-sm text-neutral-400">No due date changes recorded yet.</p>
                  <p className="text-xs text-neutral-300 mt-1">When anyone changes the due date, it will appear here.</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-neutral-100" />
                  <div className="space-y-3 pl-10">
                    {task.history.filter(h => h.field === "dueDate").slice().reverse().map((h, i) => (
                      <div key={i} className="relative">
                        {/* Circle on timeline */}
                        <div className="absolute -left-[2.15rem] top-3.5 h-3 w-3 rounded-full border-2 border-amber-400 bg-white" />
                        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Due Date Changed</span>
                            <span className="text-xs text-neutral-400 ml-auto">
                              {new Date(h.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              {" at "}
                              {new Date(h.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex-1 text-center bg-red-50 border border-red-100 rounded-lg py-2 px-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Before</p>
                              <p className="font-semibold text-red-700 text-xs">
                                {h.oldValue ? new Date(h.oldValue).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "~"}
                              </p>
                            </div>
                            <span className="text-neutral-400 shrink-0">→</span>
                            <div className="flex-1 text-center bg-emerald-50 border border-emerald-100 rounded-lg py-2 px-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">After</p>
                              <p className="font-semibold text-emerald-700 text-xs">
                                {h.newValue ? new Date(h.newValue).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "~"}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-neutral-500">
                            Changed by{" "}
                            <span className="font-semibold text-neutral-700">{h.updatedBy}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Subtasks</h3>
                <Button onClick={() => openSubtaskDialog()} className="rounded-xl" size="sm">
                  Add new sub-task
                </Button>
              </div>

              {/* Beautiful Progress Bar */}
              {childTasks.length > 0 && (() => {
                const doneCount = childTasks.filter((t) => t.status === "done").length;
                const percentage = Math.round((doneCount / childTasks.length) * 100);
                return (
                  <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      <span>Progress</span>
                      <span className="text-neutral-700">{doneCount} of {childTasks.length} completed ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2.5">
                {childTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No subtasks yet.</p>
                ) : (
                  childTasks.map((subtask) => {
                    const leftBorderClass = subtask.priority === "urgent"
                      ? "border-l-4 border-l-red-500"
                      : subtask.priority === "high"
                        ? "border-l-4 border-l-amber-500"
                        : subtask.priority === "medium"
                          ? "border-l-4 border-l-blue-500"
                          : "border-l-4 border-l-slate-300";

                    const isCompleted = subtask.status === "done";

                    return (
                      <div
                        key={subtask.id}
                        className={cn(
                          "rounded-xl border border-neutral-100 bg-white shadow-sm p-4 hover:shadow-md cursor-pointer hover:bg-neutral-50/50 transition-all duration-200 flex items-start gap-4",
                          leftBorderClass,
                          isCompleted && "bg-neutral-50/30 opacity-75"
                        )}
                        onClick={() => setPreviewSubtask(subtask)}
                      >
                        {/* Checkbox circle on left */}
                        <button
                          type="button"
                          className="mt-0.5 shrink-0 flex items-center justify-center h-5 w-5 rounded-full border border-neutral-300 hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleSubtaskDone(subtask);
                          }}
                          disabled={subtaskSaving}
                        >
                          {isCompleted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-emerald-500 fill-current" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l5-5z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <span className="h-2.5 w-2.5 rounded-full bg-transparent hover:bg-emerald-500/20" />
                          )}
                        </button>

                        {/* Content container */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className={cn("font-bold text-neutral-800 text-sm leading-snug truncate", isCompleted && "line-through text-neutral-400 font-normal")}>
                              {subtask.title}
                            </h4>
                            <span className="text-[10px] text-neutral-400 font-mono shrink-0 select-all">{getTaskTicket(subtask.id)}</span>
                          </div>

                          {subtask.description && subtask.description !== "<p></p>" && (
                            <p className={cn("text-xs text-neutral-500 line-clamp-2", isCompleted && "text-neutral-400")}>
                              {subtask.description.replace(/<[^>]+>/g, " ").trim() || "~"}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-50 pt-2">
                            {/* Dates */}
                            <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 font-medium">
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                              {subtask.startDate ? new Date(subtask.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "~"}
                              <span>→</span>
                              {subtask.dueDate ? new Date(subtask.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "~"}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Assignees */}
                              {subtask.assignees?.length > 0 && (
                                <div className="flex -space-x-1.5">
                                  {subtask.assignees.slice(0, 3).map((a) => (
                                    <Avatar key={a.id} className="h-6 w-6 border border-white shrink-0" title={a.name}>
                                      {a.avatarUrl ? <AvatarImage src={a.avatarUrl} alt={a.name} /> : null}
                                      <AvatarFallback className="text-[8px] bg-gradient-to-br from-violet-500 to-blue-500 text-white font-semibold">
                                        {a.name.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {subtask.assignees.length > 3 && (
                                    <span className="h-6 w-6 rounded-full bg-neutral-100 border border-white text-[8px] font-bold text-neutral-500 flex items-center justify-center shrink-0">
                                      +{subtask.assignees.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Action menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg hover:bg-neutral-100"
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={subtaskSaving}
                                  >
                                    <MoreHorizontal className="h-4.5 w-4.5 text-neutral-400 hover:text-neutral-600" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl w-36">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void shareSubtask(subtask);
                                    }}
                                  >
                                    Share Link
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openSubtaskDialog(subtask);
                                    }}
                                  >
                                    Edit Subtask
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-red-600 focus:text-red-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void deleteSubtask(subtask.id);
                                        }}
                                      >
                                        Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <Dialog open={subtaskDialogOpen} onOpenChange={setSubtaskDialogOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingSubtaskId ? "Edit sub-task" : "Add new sub-task"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label>Subtask name</Label>
                <Input
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  placeholder="Enter subtask title"
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <RichTextEditor
                  value={subtaskDescription}
                  onChange={setSubtaskDescription}
                  placeholder="Add subtask description"
                  minHeight="120px"
                  contentHeight="240px"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="grid gap-1.5">
                  <Label>Type</Label>
                  <Select value={subtaskType} onValueChange={(v) => setSubtaskType(v as Task["type"])}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={`st-type-${t.id}`} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <Select value={subtaskStatus} onValueChange={(v) => setSubtaskStatus(v as Task["status"])}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={`st-status-${s.id}`} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Priority</Label>
                  <Select value={subtaskPriority} onValueChange={(v) => setSubtaskPriority(v as Task["priority"])}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map((p) => <SelectItem key={`st-pri-${p.id}`} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Project</Label>
                  <Select value={subtaskProjectId} onValueChange={setSubtaskProjectId}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {projects.map((p) => <SelectItem key={`st-proj-${p.id}`} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Sprint</Label>
                  <Select value={subtaskSprintId} onValueChange={setSubtaskSprintId}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {sprints.map((s) => <SelectItem key={`st-sprint-${s.id}`} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Start date</Label>
                  <Input type="date" value={subtaskStartDate} onChange={(e) => setSubtaskStartDate(e.target.value)} className="rounded-xl" />
                </div>
                <div className="grid gap-1.5">
                  <Label>End date</Label>
                  <Input type="date" value={subtaskDueDate} onChange={(e) => setSubtaskDueDate(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Assignees</Label>
                <AssigneeMultiSelect
                  employees={employees}
                  selected={subtaskAssigneeIds}
                  onChange={setSubtaskAssigneeIds}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Reporter</Label>
                <Select value={childReporterId} onValueChange={setChildReporterId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={`child-reporter-${e.id}`} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setSubtaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveSubtask} disabled={subtaskSaving} className="rounded-xl">
                {subtaskSaving ? "Saving..." : editingSubtaskId ? "Update sub-task" : "Create sub-task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!previewSubtask} onOpenChange={(next) => !next && setPreviewSubtask(null)}>
          <DialogContent className="max-w-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle>Subtask preview</DialogTitle>
            </DialogHeader>
            {previewSubtask && (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => setPreviewSubtask(null)}
                  >
                    {getTaskTicket(task.id)}
                  </button>
                  {" / "}
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => setPreviewSubtask(null)}
                  >
                    Subtasks
                  </button>
                  {" / "}
                  <span>{getTaskTicket(previewSubtask.id)}</span>
                </div>
                <h3 className="text-lg font-bold">{previewSubtask.title}</h3>
                <div
                  className="text-sm text-neutral-700 bg-neutral-50/50 border border-neutral-100 rounded-xl p-4 min-h-[100px] prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline"
                  dangerouslySetInnerHTML={{
                    __html: previewSubtask.description && previewSubtask.description !== "<p></p>"
                      ? (previewSubtask.description.includes("<") ? previewSubtask.description : `<p>${previewSubtask.description}</p>`)
                      : '<p class="text-neutral-400 italic">No description</p>',
                  }}
                />
                <div className="flex justify-between border-t pt-3">
                  <Button variant="outline" className="rounded-xl" onClick={() => setPreviewSubtask(null)}>
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        onOpenTaskFullPage(previewSubtask, "subtasks");
                        setPreviewSubtask(null);
                      }}
                    >
                      Open full page
                    </Button>
                    <Button
                      className="rounded-xl"
                      onClick={() => {
                        openSubtaskDialog(previewSubtask);
                        setPreviewSubtask(null);
                      }}
                    >
                      Edit subtask
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {activeTab === "details" && (
          <div className="shrink-0 border-t bg-white px-5 py-3 flex items-center justify-end gap-2">
            {sidebarMode === "overview" ? (
              <Button onClick={() => setSidebarMode("edit")} className="rounded-xl w-full sm:w-auto">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setSidebarMode("overview")} className="rounded-xl">Cancel</Button>
                <Button onClick={submit} disabled={saving} className="rounded-xl">{saving ? "Saving…" : "Save changes"}</Button>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Comment Thread ────────────────────────────────
function TaskCommentThread({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);

  // Fetch comments
  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleSend() {
    const text = newComment.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text,
          parentId: replyTo?.id || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "Failed to post comment");
        return;
      }
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
      setReplyTo(null);
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSending(false);
    }
  }

  // Build thread tree: top-level comments + replies grouped under parent
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesMap = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parentId) {
      if (!repliesMap.has(c.parentId)) repliesMap.set(c.parentId, []);
      repliesMap.get(c.parentId)!.push(c);
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function CommentBubble({ comment, isReply }: { comment: Comment; isReply?: boolean }) {
    const initials = comment.authorName.slice(0, 2).toUpperCase();
    return (
      <div className={cn("flex gap-2.5", isReply && "ml-10")}>
        {isReply && <CornerDownRight className="h-3.5 w-3.5 text-neutral-300 shrink-0 mt-2" />}
        <Avatar className={cn("shrink-0", isReply ? "h-6 w-6" : "h-8 w-8")}>
          <AvatarFallback className={cn("text-neutral-700 bg-neutral-200", isReply ? "text-[9px]" : "text-[10px]")}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn("font-semibold truncate", isReply ? "text-xs" : "text-sm")}>{comment.authorName}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(comment.createdAt)}</span>
          </div>
          <div className={cn("rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words", isReply ? "bg-neutral-50 border border-neutral-100" : "bg-neutral-100")}>
            {comment.body}
          </div>
          {!isReply && (
            <button
              className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setReplyTo(comment)}
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full py-4">
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 mb-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs mt-0.5">Be the first to comment on this task</p>
          </div>
        ) : (
          topLevel.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <CommentBubble comment={comment} />
              {(repliesMap.get(comment.id) || []).map((reply) => (
                <CommentBubble key={reply.id} comment={reply} isReply />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl mb-2 text-xs shrink-0">
          <Reply className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="text-blue-700 truncate">
            Replying to <strong>{replyTo.authorName}</strong>
          </span>
          <button
            className="ml-auto text-blue-400 hover:text-blue-600"
            onClick={() => setReplyTo(null)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Comment input */}
      <div className="flex gap-2 shrink-0">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={replyTo ? `Reply to ${replyTo.authorName}...` : "Write a comment..."}
          className="rounded-xl flex-1"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button
          size="icon"
          className="rounded-xl shrink-0 h-10 w-10"
          onClick={handleSend}
          disabled={sending || !newComment.trim()}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// ── Calendar View ─────────────────────────────────
const STATUS_DOT_COLORS: Record<string, string> = {
  backlog: "bg-slate-400",
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  hold: "bg-orange-500",
  staging: "bg-amber-500",
  production: "bg-amber-500",
  in_review: "bg-amber-500",
  done: "bg-emerald-500",
  rejected: "bg-rose-500",
};

const PRIORITY_BORDER: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-amber-500",
  medium: "border-l-blue-400",
  low: "border-l-slate-300",
};

function TaskCalendarView({
  tasks,
  onEditTask,
  onAddTask,
}: {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onAddTask: (date: Date) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay(); // 0=Sun
  const daysInMonth = lastDayOfMonth.getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Build task map by date (using dueDate, fallback to startDate)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const d = t.dueDate || t.startDate;
      if (!d) continue;
      const dt = new Date(d);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  // Tasks without any date
  const undatedTasks = useMemo(() => tasks.filter((t) => !t.dueDate && !t.startDate), [tasks]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }
  function goToday() {
    setCurrentDate(new Date());
  }

  // Build calendar grid (6 weeks max)
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const monthLabel = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Calendar header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{monthLabel}</h3>
          <Button variant="outline" size="sm" className="h-7 rounded-lg text-xs" onClick={goToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px shrink-0">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px flex-1 border rounded-xl overflow-hidden bg-neutral-200">
        {weeks.flat().map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="bg-neutral-50/80 min-h-[100px]" />;
          }
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTasks = tasksByDate.get(dateStr) || [];
          const isToday = dateStr === todayStr;
          const isWeekend = i % 7 === 0 || i % 7 === 6;

          return (
            <div
              key={dateStr}
              className={cn(
                "bg-white min-h-[100px] p-1.5 flex flex-col group relative",
                isWeekend && "bg-neutral-50/50",
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1 shrink-0">
                <span
                  className={cn(
                    "text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full",
                    isToday ? "bg-primary text-primary-foreground" : "text-neutral-600"
                  )}
                >
                  {day}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[9px] text-muted-foreground font-medium">{dayTasks.length}</span>
                )}
              </div>

              {/* Tasks in this day */}
              <div className="flex-1 space-y-0.5 overflow-y-auto max-h-[80px]">
                {dayTasks.slice(0, 4).map((task) => (
                  <button
                    key={task.id}
                    className={cn(
                      "w-full text-left rounded px-1.5 py-0.5 text-[10px] leading-tight truncate border-l-2 transition-colors hover:bg-muted/60",
                      PRIORITY_BORDER[task.priority] || "border-l-neutral-300",
                      task.status === "done" ? "bg-emerald-50/60 line-through text-muted-foreground" : "bg-white"
                    )}
                    onClick={() => onEditTask(task)}
                    title={task.title}
                  >
                    <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle", STATUS_DOT_COLORS[task.status] || "bg-slate-400")} />
                    {task.title}
                  </button>
                ))}
                {dayTasks.length > 4 && (
                  <p className="text-[9px] text-muted-foreground text-center font-medium">
                    +{dayTasks.length - 4} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Undated tasks */}
      {undatedTasks.length > 0 && (
        <div className="shrink-0 rounded-xl border bg-neutral-50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">No date set</span>
            <span className="text-xs text-muted-foreground">({undatedTasks.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {undatedTasks.slice(0, 12).map((task) => (
              <button
                key={task.id}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs truncate max-w-[200px] hover:bg-white transition-colors border-l-2",
                  PRIORITY_BORDER[task.priority] || "border-l-neutral-300",
                  task.status === "done" ? "line-through text-muted-foreground" : ""
                )}
                onClick={() => onEditTask(task)}
              >
                <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle", STATUS_DOT_COLORS[task.status])} />
                {task.title}
              </button>
            ))}
            {undatedTasks.length > 12 && (
              <span className="text-xs text-muted-foreground self-center ml-1">+{undatedTasks.length - 12} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sprint Manager Dialog ───────────────────────────
function SprintManagerDialog({
  open,
  onOpenChange,
  sprints,
  onSprintsChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sprints: SprintOption[];
  onSprintsChange: (s: SprintOption[]) => void;
}) {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingSprint, setEditingSprint] = useState<SprintOption | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<string>("planned");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setStartDate("");
    setEndDate("");
    setStatus("planned");
    setEditingSprint(null);
  }

  function openCreate() {
    resetForm();
    setMode("create");
  }

  function openEdit(s: SprintOption) {
    setEditingSprint(s);
    setName(s.name);
    setStartDate(s.startDate ? s.startDate.slice(0, 10) : "");
    setEndDate(s.endDate ? s.endDate.slice(0, 10) : "");
    setStatus(s.status);
    setMode("edit");
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Sprint name is required"); return; }
    setSaving(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/sprints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), startDate: startDate || null, endDate: endDate || null, status }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || "Failed to create sprint"); }
        const { sprint } = await res.json();
        onSprintsChange([...sprints, sprint]);
        toast.success("Sprint created");
      } else if (mode === "edit" && editingSprint) {
        const res = await fetch("/api/sprints", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingSprint.id, name: name.trim(), startDate: startDate || null, endDate: endDate || null, status }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || "Failed to update sprint"); }
        const { sprint } = await res.json();
        onSprintsChange(sprints.map((s) => (s.id === sprint.id ? sprint : s)));
        toast.success("Sprint updated");
      }
      resetForm();
      setMode("list");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/sprints?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete sprint");
      onSprintsChange(sprints.filter((s) => s.id !== id));
      toast.success("Sprint deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete sprint");
    } finally {
      setDeletingId(null);
    }
  }

  const statusColors: Record<string, string> = {
    planned: "bg-blue-100 text-blue-700",
    active: "bg-emerald-100 text-emerald-700",
    completed: "bg-neutral-100 text-neutral-600",
  };

  const statusDotColors: Record<string, string> = {
    planned: "bg-blue-400",
    active: "bg-emerald-500",
    completed: "bg-neutral-400",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setMode("list"); resetForm(); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {mode === "list" ? "Manage Sprints" : mode === "create" ? "Create Sprint" : "Edit Sprint"}
          </DialogTitle>
        </DialogHeader>

        {mode === "list" ? (
          <div className="space-y-3">
            {sprints.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No sprints yet. Create one to organize tasks.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {sprints.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full shrink-0", statusDotColors[s.status] || "bg-neutral-300")} />
                        <span className="font-medium text-sm truncate">{s.name}</span>
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", statusColors[s.status])}>
                          {s.status}
                        </Badge>
                      </div>
                      {(s.startDate || s.endDate) && (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-4">
                          {s.startDate ? new Date(s.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "~"}
                          {" → "}
                          {s.endDate ? new Date(s.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "~"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                      >
                        {deletingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Close</Button>
              <Button className="rounded-xl gap-1.5" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New Sprint
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sprint Name *</Label>
              <Input
                placeholder="e.g. Sprint 1 – Launch prep"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                      Planned
                    </div>
                  </SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-neutral-400" />
                      Completed
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => { resetForm(); setMode("list"); }}>
                Back
              </Button>
              <Button className="rounded-xl gap-1.5" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create Sprint" : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Board Manager Dialog ─────────────────────────────
function BoardManagerDialog({
  open,
  onOpenChange,
  boards,
  onBoardsChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  boards: BoardOption[];
  onBoardsChange: (b: BoardOption[]) => void;
}) {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingBoard, setEditingBoard] = useState<BoardOption | null>(null);
  const [name, setName] = useState("");
  const [isTaskManager, setIsTaskManager] = useState(true);
  const [labelsText, setLabelsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localBoards, setLocalBoards] = useState<BoardOption[]>(boards);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Sync localBoards when boards prop changes
  useEffect(() => {
    setLocalBoards(boards);
  }, [boards]);

  function resetForm() {
    setName("");
    setIsTaskManager(true);
    setLabelsText("");
    setEditingBoard(null);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type: "General", isTaskManager, labels: labelsText.split(",").map((item) => item.trim()).filter(Boolean) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to create board"); return; }
      const updated = [...localBoards, data.board];
      setLocalBoards(updated);
      onBoardsChange(updated);
      resetForm();
      setMode("list");
      toast.success("Board created");
    } catch { toast.error("Failed to create board"); }
    finally { setSaving(false); }
  }

  async function handleEdit() {
    if (!editingBoard || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/boards/${editingBoard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), isTaskManager, labels: labelsText.split(",").map((item) => item.trim()).filter(Boolean) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to update board"); return; }
      const labels = labelsText.split(",").map((item) => item.trim()).filter(Boolean);
      const updated = localBoards.map((b) => b.id === editingBoard.id ? { ...b, name: name.trim(), isTaskManager, labels } : b);
      setLocalBoards(updated);
      onBoardsChange(updated);
      resetForm();
      setMode("list");
      toast.success("Board updated");
    } catch { toast.error("Failed to update board"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/boards/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to delete board");
        return;
      }
      const updated = localBoards.filter((b) => b.id !== id);
      setLocalBoards(updated);
      onBoardsChange(updated);
      toast.success("Board deleted");
    } catch { toast.error("Failed to delete board"); }
    finally { setDeletingId(null); }
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  async function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...localBoards];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    const withOrder = reordered.map((b, i) => ({ ...b, order: i }));
    setLocalBoards(withOrder);
    onBoardsChange(withOrder);
    setDragIdx(null);
    setDragOverIdx(null);
    // Persist order
    try {
      await fetch("/api/boards/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: withOrder.map((b) => b.id) }),
      });
    } catch { /* silent */ }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { resetForm(); setMode("list"); } }}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Columns3 className="h-4 w-4 text-primary" />
            Manage Boards
          </DialogTitle>
        </DialogHeader>

        {mode === "list" ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Boards help you organise tasks into separate workspaces. Drag to reorder.
            </p>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {localBoards.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No boards yet. Create one below.</p>
              )}
              {localBoards.map((b, idx) => (
                <div
                  key={b.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-white transition-all cursor-grab active:cursor-grabbing",
                    dragOverIdx === idx ? "border-primary bg-primary/5 shadow-md" : "border-neutral-200 hover:border-neutral-300"
                  )}
                >
                  <GripVertical className="h-4 w-4 text-neutral-300 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-neutral-800 truncate">{b.name}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {b.isTaskManager !== false ? "Task manager" : "Reminder"}
                  </Badge>
                  <span className="text-[10px] text-neutral-400 font-mono shrink-0">#{idx + 1}</span>
                  <button
                    onClick={() => { setEditingBoard(b); setName(b.name); setIsTaskManager(b.isTaskManager !== false); setLabelsText((b.labels || []).join(", ")); setMode("edit"); }}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    disabled={deletingId === b.id}
                    className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === b.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button className="rounded-xl gap-1.5" onClick={() => { resetForm(); setMode("create"); }}>
                <Plus className="h-4 w-4" />
                New Board
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-700 font-semibold text-xs">Board Name</Label>
              <Input
                placeholder="e.g. Design, Engineering, QA..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (mode === "create" ? handleCreate() : handleEdit())}
                className="rounded-xl"
                autoFocus
              />
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isTaskManager}
              onClick={() => setIsTaskManager((value) => !value)}
              className="flex w-full items-center justify-between gap-4 rounded-xl border border-neutral-200 p-3 text-left"
            >
              <span>
                <span className="block text-sm font-semibold text-neutral-800">Behave as task manager</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Turn off for a simple reminder board. Assignee, project, dates, reporter and other details become optional.
                </span>
              </span>
              <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", isTaskManager ? "bg-primary" : "bg-neutral-300")}>
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", isTaskManager ? "translate-x-5" : "translate-x-0.5")} />
              </span>
            </button>

            {!isTaskManager && (
              <div className="space-y-1.5">
                <Label className="text-zinc-700 font-semibold text-xs">Custom labels</Label>
                <Input
                  value={labelsText}
                  onChange={(event) => setLabelsText(event.target.value)}
                  placeholder="Personal, Idea, Follow up"
                  className="rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">Separate labels with commas. They appear in the reminder label dropdown.</p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => { resetForm(); setMode("list"); }}>
                Back
              </Button>
              <Button className="rounded-xl gap-1.5" onClick={mode === "create" ? handleCreate : handleEdit} disabled={saving || !name.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create Board" : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Column Manager Dialog (Admin column management per board) ────────────────
const PRESET_COLORS = ["#9ca3af", "#3b82f6", "#f97316", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#ec4899"];

function ColumnManagerDialog({
  open,
  onOpenChange,
  boards,
  activeBoardId,
  onColumnsChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boards: BoardOption[];
  activeBoardId: string;
  onColumnsChange?: (cols: Array<{ id: string; key: string; label: string; color: string; order: number }>) => void;
}) {
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [columns, setColumns] = useState<Array<{ id: string; key: string; label: string; color: string; order: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [editingCol, setEditingCol] = useState<{ id: string; key: string; label: string; color: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Drag & drop state for column reordering
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      const initialId = activeBoardId !== "__all__" ? activeBoardId : boards[0]?.id || "";
      setSelectedBoardId(initialId);
    }
  }, [open, activeBoardId, boards]);

  useEffect(() => {
    if (!open || !selectedBoardId) return;
    setLoading(true);
    fetch(`/api/boards/${selectedBoardId}/columns`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.columns) {
          setColumns(data.columns);
          if (selectedBoardId === activeBoardId && onColumnsChange) {
            onColumnsChange(data.columns);
          }
        }
      })
      .catch(() => toast.error("Failed to load columns"))
      .finally(() => setLoading(false));
  }, [open, selectedBoardId, activeBoardId, onColumnsChange]);

  function resetForm() {
    setLabel("");
    setColor("#3b82f6");
    setEditingCol(null);
  }

  async function handleCreate() {
    if (!selectedBoardId || !label.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/boards/${selectedBoardId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), color }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to create column");
        return;
      }
      const updated = [...columns, data.column];
      setColumns(updated);
      if (selectedBoardId === activeBoardId && onColumnsChange) onColumnsChange(updated);
      resetForm();
      setMode("list");
      toast.success("Column created");
    } catch {
      toast.error("Failed to create column");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!selectedBoardId || !editingCol || !label.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/boards/${selectedBoardId}/columns/${editingCol.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), color }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to update column");
        return;
      }
      const updated = columns.map((c) => (c.id === editingCol.id ? { ...c, label: label.trim(), color } : c));
      setColumns(updated);
      if (selectedBoardId === activeBoardId && onColumnsChange) onColumnsChange(updated);
      resetForm();
      setMode("list");
      toast.success("Column updated");
    } catch {
      toast.error("Failed to update column");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!selectedBoardId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/boards/${selectedBoardId}/columns/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to delete column");
        return;
      }
      const updated = columns.filter((c) => c.id !== id);
      setColumns(updated);
      if (selectedBoardId === activeBoardId && onColumnsChange) onColumnsChange(updated);
      toast.success("Column deleted");
    } catch {
      toast.error("Failed to delete column");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx || !selectedBoardId) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const reordered = [...columns];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    const withOrder = reordered.map((c, i) => ({ ...c, order: i }));
    setColumns(withOrder);
    if (selectedBoardId === activeBoardId && onColumnsChange) onColumnsChange(withOrder);
    setDragIdx(null);
    setDragOverIdx(null);
    try {
      await fetch(`/api/boards/${selectedBoardId}/columns/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: withOrder.map((c) => c.id) }),
      });
    } catch {
      /* silent catch */
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { resetForm(); setMode("list"); } }}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Manage Board Columns
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Select Board to Edit Columns For */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-neutral-600">Select Board</Label>
            <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
              <SelectTrigger className="h-9 rounded-xl border-neutral-200 text-sm">
                <SelectValue placeholder="Choose board..." />
              </SelectTrigger>
              <SelectContent>
                {boards.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "list" ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Customize the Kanban status columns for this board (e.g., Todo, Rejected, Completed, In Review). Drag to reorder.
              </p>

              {loading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {columns.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">No columns yet. Select a board or add one.</p>
                  )}
                  {columns.map((col, idx) => (
                    <div
                      key={col.id}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-white transition-all cursor-grab active:cursor-grabbing",
                        dragOverIdx === idx ? "border-primary bg-primary/5 shadow-md" : "border-neutral-200 hover:border-neutral-300"
                      )}
                    >
                      <GripVertical className="h-4 w-4 text-neutral-300 shrink-0" />
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color || "#9ca3af" }} />
                      <span className="flex-1 text-sm font-medium text-neutral-800 truncate">{col.label}</span>
                      <span className="text-[10px] text-neutral-400 font-mono shrink-0">#{idx + 1}</span>
                      <button
                        onClick={() => { setEditingCol(col); setLabel(col.label); setColor(col.color || "#3b82f6"); setMode("edit"); }}
                        className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                        title="Edit Column"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(col.id)}
                        disabled={deletingId === col.id}
                        className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete Column"
                      >
                        {deletingId === col.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button className="rounded-xl gap-1.5" disabled={!selectedBoardId} onClick={() => { resetForm(); setMode("create"); }}>
                  <Plus className="h-4 w-4" />
                  New Column
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-700 font-semibold text-xs">Column Name</Label>
                <Input
                  placeholder="e.g. Todo, Rejected, Completed, In Review..."
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (mode === "create" ? handleCreate() : handleEdit())}
                  className="rounded-xl"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-700 font-semibold text-xs">Column Badge Color</Label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        "h-6 w-6 rounded-full border transition-all",
                        color === c ? "ring-2 ring-primary ring-offset-1 scale-110" : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <Input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-7 w-9 p-0 border border-neutral-200 rounded cursor-pointer"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => { resetForm(); setMode("list"); }}>
                  Back
                </Button>
                <Button className="rounded-xl gap-1.5" onClick={mode === "create" ? handleCreate : handleEdit} disabled={saving || !label.trim()}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "create" ? "Add Column" : "Save Changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
