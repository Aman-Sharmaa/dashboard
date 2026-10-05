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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RotateCcw, Clock, CheckCircle2, Loader2, Users, ArrowRight } from "lucide-react";

type Employee = { id: string; name: string; email: string; avatarUrl?: string | null };

type TaskSummary = {
  id: string;
  title: string;
  description?: string;
  assignees?: { id: string; name: string; avatarUrl?: string | null }[];
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null;
  dueDate?: string | Date | null;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ConvertTaskToRoutineModal({
  open,
  onClose,
  task,
  employees,
  onConverted,
}: {
  open: boolean;
  onClose: () => void;
  task: TaskSummary | null;
  employees: Employee[];
  onConverted: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dueTime, setDueTime] = useState("18:00");
  const [deleteOriginalTask, setDeleteOriginalTask] = useState(false);

  useEffect(() => {
    if (open && task) {
      setTitle(task.title || "");
      setDescription(task.description || "");

      // Pre-select task assignees
      let empIds: string[] = [];
      if (task.assignees && task.assignees.length > 0) {
        empIds = task.assignees.map((a) => a.id);
      } else if (task.assignee?.id) {
        empIds = [task.assignee.id];
      } else if (employees.length > 0) {
        empIds = [employees[0].id];
      }
      setSelectedEmpIds(empIds);

      // Determine default due time from task due date
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        if (`${hh}:${mm}` !== "00:00") {
          setDueTime(`${hh}:${mm}`);
        } else {
          setDueTime("18:00");
        }
      } else {
        setDueTime("18:00");
      }

      setFrequency("daily");
      setWorkingDays([1, 2, 3, 4, 5]);
      setDeleteOriginalTask(false);
    }
  }, [open, task, employees]);

  function toggleDay(d: number) {
    setWorkingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  function toggleEmployee(empId: string) {
    setSelectedEmpIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  }

  async function handleConvert() {
    if (!task) return;
    if (!title.trim()) {
      toast.error("Routine title is required");
      return;
    }
    if (selectedEmpIds.length === 0) {
      toast.error("Please select at least one assigned employee");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/convert-to-routine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          frequency,
          workingDays,
          dueTime,
          assignedEmployeeIds: selectedEmpIds,
          deleteOriginalTask,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to convert task");

      toast.success(
        selectedEmpIds.length > 1
          ? `Created ${selectedEmpIds.length} separate routines for assigned team members! 🔁`
          : "Converted task into daily routine! 🔁"
      );
      onConverted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to convert task to routine");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg rounded-2xl p-6 bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-neutral-900">
                Convert Task to Daily Routine
              </DialogTitle>
              <p className="text-xs text-neutral-500">
                Turns this one-off task into recurring daily / weekly job checklist(s).
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Multiple Assignees Info Banner */}
          {selectedEmpIds.length > 1 && (
            <div className="rounded-xl p-3 bg-orange-50/80 border border-orange-200/80 flex items-start gap-2.5">
              <Users className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-xs text-orange-950 space-y-0.5">
                <p className="font-semibold">Multiple Assignees Detected</p>
                <p className="text-orange-800 text-[11px]">
                  A <strong>separate independent routine</strong> will be created for each of the{" "}
                  <strong>{selectedEmpIds.length}</strong> selected employees.
                </p>
              </div>
            </div>
          )}

          {/* Routine Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-700">Routine Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Routine Title"
              className="rounded-xl text-sm"
            />
          </div>

          {/* Assignees Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-neutral-500" />
                Assign Routine To ({selectedEmpIds.length} Selected)
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmpIds(employees.map((e) => e.id))}
                  className="text-[11px] text-orange-600 hover:underline font-semibold"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEmpIds([])}
                  className="text-[11px] text-neutral-400 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto rounded-xl border border-neutral-200 p-2 space-y-1.5 bg-neutral-50/50">
              {employees.map((emp) => {
                const isSelected = selectedEmpIds.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id)}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs",
                      isSelected
                        ? "bg-orange-100/70 border border-orange-200 text-orange-950 font-medium"
                        : "hover:bg-white text-neutral-700 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleEmployee(emp.id)}
                        className="rounded"
                      />
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={emp.avatarUrl || undefined} />
                        <AvatarFallback className="text-[9px] bg-gradient-to-br from-violet-500 to-blue-500 text-white">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{emp.name}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 truncate max-w-[150px]">{emp.email}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Due Time & Frequency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Expected Due Time</Label>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="rounded-xl text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Frequency</Label>
              <div className="flex gap-1.5 pt-0.5">
                {(["daily", "weekly"] as const).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setFrequency(freq)}
                    className={cn(
                      "flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all",
                      frequency === freq
                        ? "bg-orange-600 text-white border-orange-600 shadow-2xs"
                        : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                    )}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-700">Checklist / Instructions</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Instructions for executing this routine..."
              className="rounded-xl text-xs"
            />
          </div>

          {/* Working Days */}
          <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2">
            <Label className="text-xs font-semibold text-neutral-800">Active Days of Week</Label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((day, idx) => {
                const selected = workingDays.includes(idx);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={cn(
                      "h-7 w-9 rounded-lg text-xs font-bold transition-all",
                      selected
                        ? "bg-orange-600 text-white shadow-2xs"
                        : "bg-white text-neutral-400 border border-neutral-200"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delete Original Task Checkbox */}
          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="deleteOriginal"
              checked={deleteOriginalTask}
              onCheckedChange={(c) => setDeleteOriginalTask(!!c)}
            />
            <label
              htmlFor="deleteOriginal"
              className="text-xs text-neutral-600 cursor-pointer select-none"
            >
              Delete original task after creating routine(s)
            </label>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} className="rounded-xl">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConvert}
            disabled={saving || selectedEmpIds.length === 0}
            className="rounded-xl gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Convert into {selectedEmpIds.length} Routine{selectedEmpIds.length > 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
