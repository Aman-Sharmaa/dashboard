"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Flag, CheckCircle2, Loader2, Calendar } from "lucide-react";

type Employee = { id: string; name: string; email: string; avatarUrl?: string | null };
type Project = { id: string; name: string };

export function CreateMilestoneModal({
  open,
  onClose,
  employees,
  projects,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  projects: Project[];
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [projectId, setProjectId] = useState("__none__");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState("high");

  function reset() {
    setTitle("");
    setDescription("");
    setOwnerId("");
    setProjectId("__none__");
    setTargetDate("");
    setPriority("high");
  }

  async function handleSubmit() {
    if (!title.trim() || !ownerId || !targetDate) {
      toast.error("Please provide title, assignee, and target completion date");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `[Milestone] ${title.trim()}`,
          description: description.trim(),
          assigneeId: ownerId,
          assignedTo: ownerId,
          projectId: projectId === "__none__" ? undefined : projectId,
          dueDate: targetDate,
          priority: priority,
          status: "todo",
          type: "milestone",
          isMilestone: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to create milestone");
      toast.success("Milestone outcome created! 🚩");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-milestones"));
      }
      reset();
      onCreated();
      onClose();
    } catch {
      toast.error("Failed to create milestone");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg rounded-2xl p-6 bg-white">
        <DialogHeader className="pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-neutral-900">
                Create Major Milestone
              </DialogTitle>
              <p className="text-xs text-neutral-500">
                Key deliverable or major organizational outcome with a hard deadline.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-700">Milestone Title *</Label>
            <Input
              placeholder="e.g. Beta Launch to First 50 Merchants"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Assigned Lead *</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="rounded-xl text-sm">
                  <SelectValue placeholder="Select Lead" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Target Date *</Label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="rounded-xl text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Priority Level</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Critical / Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-700">Deliverables / Scope</Label>
            <Textarea
              placeholder="List the key deliverables or success criteria for this milestone..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-xl text-xs"
            />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} className="rounded-xl">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Create Milestone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
