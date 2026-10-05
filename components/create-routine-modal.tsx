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
import { cn } from "@/lib/utils";
import { RotateCcw, Clock, CheckCircle2, Loader2, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type Employee = { id: string; name: string; email: string; avatarUrl?: string | null };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CreateRoutineModal({
  open,
  onClose,
  employees,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dueTime, setDueTime] = useState("18:00");

  function toggleDay(d: number) {
    setWorkingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  function toggleOwner(id: string) {
    setSelectedOwnerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function reset() {
    setTitle("");
    setDescription("");
    setSelectedOwnerIds([]);
    setFrequency("daily");
    setWorkingDays([1, 2, 3, 4, 5]);
    setDueTime("18:00");
  }

  async function handleSubmit() {
    if (!title.trim() || selectedOwnerIds.length === 0) {
      toast.error("Please provide routine title and assign at least one employee");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          ownerId: selectedOwnerIds[0],
          ownerIds: selectedOwnerIds,
          frequency,
          workingDays,
          dueTime: dueTime || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to create routine");
      toast.success(
        selectedOwnerIds.length > 1
          ? `Created ${selectedOwnerIds.length} separate routines for assigned employees! 🔁`
          : "Daily routine created! 🔁"
      );
      reset();
      onCreated();
      onClose();
    } catch {
      toast.error("Failed to create routine");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg rounded-2xl p-6 bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-neutral-900">
                Create Daily Routine / Responsibility
              </DialogTitle>
              <p className="text-xs text-neutral-500">
                Regular job tasks that repeat daily or weekly without creating one-off tickets.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-700">Routine Title *</Label>
            <Input
              placeholder="e.g. Daily Standup & Merchant Support SLA Check"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl text-sm"
            />
          </div>

          {/* Assigned Employees */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-neutral-700">
                Assigned Employees * ({selectedOwnerIds.length} Selected)
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOwnerIds(employees.map((e) => e.id))}
                  className="text-[11px] text-orange-600 hover:underline font-semibold"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOwnerIds([])}
                  className="text-[11px] text-neutral-400 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-neutral-200 p-2 space-y-1.5 bg-neutral-50/50">
              {employees.map((emp) => {
                const isSelected = selectedOwnerIds.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleOwner(emp.id)}
                    className={cn(
                      "flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors text-xs",
                      isSelected
                        ? "bg-orange-100/70 border border-orange-200 text-orange-950 font-medium"
                        : "hover:bg-white text-neutral-700 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOwner(emp.id)}
                        className="rounded"
                      />
                      <span>{emp.name}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 truncate max-w-[150px]">{emp.email}</span>
                  </div>
                );
              })}
            </div>
            {selectedOwnerIds.length > 1 && (
              <p className="text-[11px] text-orange-800 font-medium pt-0.5">
                ✓ A separate independent checklist routine will be created for each assigned employee.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Expected Due Time</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="rounded-xl text-sm font-mono"
                />
              </div>
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

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-700">Description / Checklist</Label>
            <Textarea
              placeholder="Provide context or instructions for completing this daily routine..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-xl text-xs"
            />
          </div>

          {/* Working Days */}
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2">
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
        </div>

        <DialogFooter className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} className="rounded-xl">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Create Routine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
