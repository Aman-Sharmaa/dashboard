"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Flag,
  Loader2,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Calendar,
  User,
} from "lucide-react";

type Employee = { id: string; name: string; email: string; avatarUrl?: string | null };
type Project = { id: string; name: string };

const STATUS_OPTIONS = [
  { id: "todo", label: "To Do", color: "bg-neutral-400" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { id: "in_review", label: "In Review", color: "bg-amber-500" },
  { id: "hold", label: "On Hold", color: "bg-orange-500" },
  { id: "done", label: "Completed", color: "bg-emerald-500" },
];

const PRIORITY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Critical / Urgent" },
];

export function EditMilestoneModal({
  open,
  onClose,
  milestoneId,
  employees,
  projects,
  onUpdated,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  milestoneId: string | null;
  employees: Employee[];
  projects: Project[];
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [projectId, setProjectId] = useState("__none__");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("high");
  const [status, setStatus] = useState("todo");

  useEffect(() => {
    if (open && milestoneId) {
      setLoading(true);
      setConfirmDelete(false);
      fetch(`/api/tasks/${milestoneId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.task) {
            const t = data.task;
            // Remove [Milestone] prefix if present
            const cleanTitle = (t.title || "").replace(/^\[Milestone\]\s*/i, "");
            setTitle(cleanTitle);
            setDescription(t.description || "");
            setAssigneeId(
              t.assignee?.id ||
              (t.assignees && t.assignees[0]?.id) ||
              ""
            );
            setProjectId(t.project || "__none__");
            setDueDate(
              t.dueDate
                ? new Date(t.dueDate).toISOString().slice(0, 10)
                : ""
            );
            setPriority(t.priority || "high");
            setStatus(t.status || "todo");
          }
        })
        .catch(() => toast.error("Failed to load milestone"))
        .finally(() => setLoading(false));
    }
  }, [open, milestoneId]);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `[Milestone] ${title.trim()}`,
          description: description.trim(),
          assigneeIds: assigneeId ? [assigneeId] : [],
          projectId: projectId === "__none__" ? null : projectId,
          dueDate: dueDate || undefined,
          priority,
          status,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");
      toast.success("Milestone updated successfully! ✨");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-milestones"));
      }
      onUpdated();
      onClose();
    } catch {
      toast.error("Failed to update milestone");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${milestoneId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Milestone deleted");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-milestones"));
      }
      onDeleted();
      onClose();
    } catch {
      toast.error("Failed to delete milestone");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg rounded-2xl p-6 bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                <Flag className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-neutral-900">
                  Edit Milestone
                </DialogTitle>
                <p className="text-xs text-neutral-500">
                  Update milestone details, status, and assignment.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(!confirmDelete)}
              className="text-red-600 border-red-200 hover:bg-red-50 text-xs rounded-xl gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </DialogHeader>

        {confirmDelete && (
          <div className="rounded-xl p-3.5 bg-red-50 border border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-800 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <span>Delete this milestone permanently?</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="text-xs rounded-lg h-7">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg h-7"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600 mb-2" />
            <p className="text-xs text-neutral-500">Loading milestone details...</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Milestone Title *</Label>
              <Input
                placeholder="e.g. Beta Launch to First 50 Merchants"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", s.color)} />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignee & Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Assigned Lead</Label>
                <Select value={assigneeId || "__none__"} onValueChange={(v) => setAssigneeId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="rounded-xl text-sm">
                    <SelectValue placeholder="Select Lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Target Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-xl text-sm font-mono"
                />
              </div>
            </div>

            {/* Project */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Associated Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="rounded-xl text-sm">
                  <SelectValue placeholder="Optional Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">General / Company</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Deliverables / Scope</Label>
              <Textarea
                placeholder="List the key deliverables or success criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="rounded-xl text-xs"
              />
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} className="rounded-xl">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-xl gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
