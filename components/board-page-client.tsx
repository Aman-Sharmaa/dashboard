"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TaskBoard } from "@/components/task-board";
import { toast } from "sonner";

type ProjectOption = { id: string; name: string };
type Task = {
  id: string;
  project?: string | null;
  title: string;
  description: string;
  type: "task" | "bug" | "story";
  status:
    | "backlog"
    | "todo"
    | "in_progress"
    | "hold"
    | "code_review"
    | "qa"
    | "staging"
    | "production"
    | "in_review"
    | "done"
    | "rejected";
  assignee: { id: string; name: string; email: string } | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  order: number;
};
type Employee = { id: string; name: string; email: string };
type BoardOption = { id: string; name: string; type: string; order: number };
type UserRole = "employee" | "admin" | "client" | "lead";

const ALL_PROJECTS = "__all__";
const ASSIGNEE_ME = "__me__";
const ASSIGNEE_ALL = "__all__";
const PRIORITY_ALL = "all";
const TYPE_ALL = "all";
const STATUS_ALL = "all";
const PRIORITY_OPTIONS = [
  { value: PRIORITY_ALL, label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];
const STATUS_OPTIONS = [
  { value: STATUS_ALL, label: "All statuses" },
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "hold", label: "Hold" },
  { value: "in_review", label: "In review" },
  { value: "done", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];
const TYPE_OPTIONS = [
  { value: TYPE_ALL, label: "All types" },
  { value: "task", label: "Task" },
  { value: "bug", label: "Bug" },
  { value: "story", label: "Story" },
];

function getBoardParams(searchParams: URLSearchParams | null) {
  return {
    project: searchParams?.get("project") || ALL_PROJECTS,
    assignee: searchParams?.get("assignee") === "all" ? ASSIGNEE_ALL : ASSIGNEE_ME,
    priority: searchParams?.get("priority") || PRIORITY_ALL,
    type: searchParams?.get("type") || TYPE_ALL,
    status: searchParams?.get("status") || STATUS_ALL,
  };
}

export function BoardPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isOutsider, setIsOutsider] = useState(false);
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardType, setNewBoardType] = useState("General");
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingBoardName, setEditingBoardName] = useState("");
  const [savingBoard, setSavingBoard] = useState(false);

  const { project: selectedProjectId, assignee: assigneeFilter, priority: priorityFilter, type: typeFilter, status: statusFilter } = useMemo(
    () => getBoardParams(searchParams),
    [searchParams]
  );

  const updateParam = useCallback(
    (key: "project" | "assignee" | "priority" | "type" | "status", value: string) => {
      const params = new URLSearchParams(searchParams?.toString());
      if (key === "project") params.set("project", value === ALL_PROJECTS ? "__all__" : value);
      else if (key === "assignee") params.set("assignee", value === ASSIGNEE_ALL ? "all" : "me");
      else if (key === "priority") {
        if (value && value !== PRIORITY_ALL) params.set("priority", value);
        else params.delete("priority");
      } else if (key === "type") {
        if (value && value !== TYPE_ALL) params.set("type", value);
        else params.delete("type");
      } else if (key === "status") {
        if (value && value !== STATUS_ALL) params.set("status", value);
        else params.delete("status");
      }
      router.replace(`/dashboard/board?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Load current user role so we can set sensible defaults
  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/me", { cache: "no-store", credentials: "same-origin" });
        const data = await res.json();
        if (res.ok && data.user?.role) {
          setUserRole(data.user.role as UserRole);
          if (data.user.isOutsider) setIsOutsider(true);
        } else {
          setUserRole("employee");
        }
      } catch {
        // Fallback to employee-like defaults
        setUserRole("employee");
      }
    }
    loadMe();
  }, []);

  // When landing on /dashboard/board from the sidebar with no filters,
  // set simple defaults:
  // - Admin/other: all projects, all assignees
  // - Employee: all projects, only "me"
  useEffect(() => {
    if (!userRole) return;
    const project = searchParams?.get("project");
    const assignee = searchParams?.get("assignee");
    const priority = searchParams?.get("priority");
    const type = searchParams?.get("type");
    const status = searchParams?.get("status");
    if (project === null && assignee === null && priority === null && type === null && status === null) {
      const isEmp = userRole === "employee";
      const base = "/dashboard/board?project=__all__";
      // Outsiders are always forced to "me" view
      const assigneeParam = (isEmp || isOutsider) ? "&assignee=me" : "&assignee=all";
      router.replace(`${base}${assigneeParam}`, { scroll: false });
    }
  }, [searchParams, router, userRole]);

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch("/api/projects", { cache: "no-store", credentials: "same-origin" });
        const data = await res.json();
        if (res.ok && Array.isArray(data.projects)) {
          const list = data.projects.map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          }));
          setProjects(list);
        }
      } catch {
        // ignore
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch("/api/employees", { cache: "no-store", credentials: "same-origin" });
        const data = await res.json();
        if (res.ok && data.employees?.length) {
          setEmployees(
            data.employees.map((e: { id: string; name: string; email: string }) => ({
              id: e.id,
              name: e.name,
              email: e.email,
            }))
          );
        }
      } catch {
        // ignore
      }
    }
    loadEmployees();
  }, []);

  const loadBoards = useCallback(async () => {
    try {
      const res = await fetch("/api/boards", { cache: "no-store", credentials: "same-origin" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.boards)) {
        setBoards(data.boards);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const refreshTasks = useCallback(async () => {
    setLoadingBoard(true);
    try {
      const projectParam =
        selectedProjectId === ALL_PROJECTS ? "projectId=__all__" : `projectId=${selectedProjectId}`;
      const assigneeParam = `assigneeId=${assigneeFilter}`;
      const scopeParam =
        selectedProjectId === ALL_PROJECTS && assigneeFilter === ASSIGNEE_ALL ? "&scope=all" : "";
      const priorityParam =
        priorityFilter && priorityFilter !== PRIORITY_ALL ? `&priority=${priorityFilter}` : "";
      const typeParam =
        typeFilter && typeFilter !== TYPE_ALL ? `&type=${typeFilter}` : "";
      const statusParam =
        statusFilter && statusFilter !== STATUS_ALL ? `&status=${statusFilter}` : "";
      const url = `/api/tasks?${projectParam}&${assigneeParam}${scopeParam}${priorityParam}${typeParam}${statusParam}`;
      const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
      const data = await res.json();
      if (res.ok && data.tasks) setTasks(data.tasks);
    } catch {
      // ignore
    } finally {
      setLoadingBoard(false);
    }
  }, [selectedProjectId, assigneeFilter, priorityFilter, typeFilter, statusFilter]);

  async function createBoardType() {
    if (!newBoardName.trim()) {
      toast.error("Board label is required");
      return;
    }
    setSavingBoard(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBoardName.trim(), type: newBoardType.trim() || "General" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to create board type");
        return;
      }
      setNewBoardName("");
      setNewBoardType("General");
      await loadBoards();
      toast.success("Board type created");
    } catch {
      toast.error("Failed to create board type");
    } finally {
      setSavingBoard(false);
    }
  }

  async function saveBoardLabel(boardId: string) {
    if (!editingBoardName.trim()) {
      toast.error("Label name is required");
      return;
    }
    setSavingBoard(true);
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingBoardName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to update label");
        return;
      }
      setEditingBoardId(null);
      setEditingBoardName("");
      await loadBoards();
      toast.success("Label updated");
    } catch {
      toast.error("Failed to update label");
    } finally {
      setSavingBoard(false);
    }
  }

  async function deleteBoardType(boardId: string) {
    setSavingBoard(true);
    try {
      const res = await fetch(`/api/boards/${boardId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to delete board type");
        return;
      }
      await loadBoards();
      toast.success("Board type deleted");
    } catch {
      toast.error("Failed to delete board type");
    } finally {
      setSavingBoard(false);
    }
  }

  useEffect(() => {
    refreshTasks();
  }, [selectedProjectId, assigneeFilter, refreshTasks]);

  if (loadingProjects) {
    return (
      <div className="rounded-xl border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Loading projects…
      </div>
    );
  }

  if (projects.length === 0 && selectedProjectId !== ALL_PROJECTS) {
    return (
      <div className="rounded-xl border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        No projects yet. Create a project from the Projects page to use the board.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Project</span>
          <Select value={selectedProjectId} onValueChange={(v) => updateParam("project", v)}>
            <SelectTrigger className="w-[240px] rounded-xl">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Assignee</span>
          <Select value={assigneeFilter} onValueChange={(v) => updateParam("assignee", v)}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ASSIGNEE_ME}>Me</SelectItem>
              {!isOutsider && <SelectItem value={ASSIGNEE_ALL}>All</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Priority</span>
          <Select value={priorityFilter} onValueChange={(v) => updateParam("priority", v)}>
            <SelectTrigger className="w-[160px] rounded-xl">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Type</span>
          <Select value={typeFilter} onValueChange={(v) => updateParam("type", v)}>
            <SelectTrigger className="w-[160px] rounded-xl">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Status</span>
          <Select value={statusFilter} onValueChange={(v) => updateParam("status", v)}>
            <SelectTrigger className="w-[160px] rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {userRole === "admin" && (
          <Button variant="outline" className="rounded-xl ml-auto" onClick={() => setBoardDialogOpen(true)}>
            Manage Board Types
          </Button>
        )}
      </div>

      <TaskBoard
        projectId={selectedProjectId === ALL_PROJECTS ? undefined : selectedProjectId}
        tasks={tasks}
        employees={employees}
        onTasksChange={setTasks}
        onRefresh={refreshTasks}
        projects={projects}
      />

      <Dialog open={boardDialogOpen} onOpenChange={setBoardDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Manage Board Types</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border p-3">
              <div className="sm:col-span-2 space-y-2">
                <Label>Board label</Label>
                <Input
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="e.g. Engineering Board"
                />
              </div>
              <div className="space-y-2">
                <Label>Board type</Label>
                <Input
                  value={newBoardType}
                  onChange={(e) => setNewBoardType(e.target.value)}
                  placeholder="General"
                />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <Button onClick={createBoardType} disabled={savingBoard} className="rounded-xl">
                  Create board type
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {boards.length === 0 ? (
                <p className="text-sm text-muted-foreground">No board types yet.</p>
              ) : (
                boards.map((board) => (
                  <div key={board.id} className="rounded-xl border p-3">
                    {editingBoardId === board.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingBoardName}
                          onChange={(e) => setEditingBoardName(e.target.value)}
                          placeholder="Label name"
                        />
                        <Button
                          size="sm"
                          onClick={() => saveBoardLabel(board.id)}
                          disabled={savingBoard}
                          className="rounded-lg"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingBoardId(null);
                            setEditingBoardName("");
                          }}
                          className="rounded-lg"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{board.name}</p>
                          <p className="text-xs text-muted-foreground">Type: {board.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingBoardId(board.id);
                              setEditingBoardName(board.name);
                            }}
                            className="rounded-lg"
                          >
                            Rename Label
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteBoardType(board.id)}
                            disabled={savingBoard}
                            className="rounded-lg"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBoardDialogOpen(false)} className="rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
