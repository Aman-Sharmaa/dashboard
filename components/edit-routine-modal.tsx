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
import { RotateCcw, Clock, CheckCircle2, Loader2, Trash2, AlertTriangle } from "lucide-react";

type Employee = { id: string; name: string; email: string; avatarUrl?: string | null };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function EditRoutineModal({
  open,
  onClose,
  routineId,
  employees,
  onUpdated,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  routineId: string | null;
  employees: Employee[];
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dueTime, setDueTime] = useState("18:00");

  useEffect(() => {
    if (open && routineId) {
      setLoading(true);
      setConfirmDelete(false);
      fetch(`/api/routines/${routineId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.routine) {
            const r = data.routine;
            setTitle(r.title || "");
            setDescription(r.description || "");
            setOwnerId(r.ownerId || (r.owner?.id ? r.owner.id : ""));
            setFrequency(r.frequency || "daily");
            setWorkingDays(r.workingDays || [1, 2, 3, 4, 5]);
            setDueTime(r.dueTime || "18:00");
          }
        })
        .catch(() => toast.error("Failed to load routine details"))
        .finally(() => setLoading(false));
    }
  }, [open, routineId]);

  function toggleDay(d: number) {
    setWorkingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  async function handleSave() {
    if (!title.trim() || !ownerId) {
      toast.error("Please provide routine title and assign an employee");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/routines/${routineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          ownerId,
          frequency,
          workingDays,
          dueTime: dueTime || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to update routine");
      toast.success("Routine updated successfully! 🔁");
      onUpdated();
      onClose();
    } catch {
      toast.error("Failed to save routine changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/routines/${routineId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Routine deleted successfully");
      onDeleted();
      onClose();
    } catch {
      toast.error("Failed to delete routine");
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
              <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-neutral-900">
                  Edit Daily Routine
                </DialogTitle>
                <p className="text-xs text-neutral-500">
                  Modify checklist title, schedule, or assigned team member.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(!confirmDelete)}
              className="text-red-600 border-red-200 hover:bg-red-50 text-xs rounded-xl gap-1 shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Routine
            </Button>
          </div>
        </DialogHeader>

        {confirmDelete && (
          <div className="rounded-xl p-3.5 bg-red-50 border border-red-200 flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-red-800 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <span>Are you sure you want to delete this routine?</span>
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
            <Loader2 className="h-8 w-8 animate-spin text-orange-600 mb-2" />
            <p className="text-xs text-neutral-500">Loading routine details...</p>
          </div>
        ) : (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Assigned Employee *</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger className="rounded-xl text-sm">
                    <SelectValue placeholder="Select Employee" />
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
        )}

        <DialogFooter className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} className="rounded-xl">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-xl gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
