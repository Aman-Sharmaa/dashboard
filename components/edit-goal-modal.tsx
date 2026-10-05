"use client";

import { useState, useEffect } from "react";
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
import { Plus, Trash2, Target, Loader2, AlertTriangle, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type Employee = { id: string; name: string; email: string; avatarUrl?: string | null };

type MetricEditRow = {
  id?: string;
  metricName: string;
  target: number;
  unit: string;
  weight: number;
  direction: "higher_is_better" | "lower_is_better";
  dataSource?: string;
  isNew?: boolean;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function EditGoalModal({
  open,
  onClose,
  templateId,
  employees,
  onUpdated,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  templateId: string | null;
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
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [metrics, setMetrics] = useState<MetricEditRow[]>([]);
  const [deletedMetricIds, setDeletedMetricIds] = useState<string[]>([]);
  const [projectsList, setProjectsList] = useState<Array<{ id: string; name: string }>>([]);
  const [departmentsList, setDepartmentsList] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (open) {
      fetch("/api/projects")
        .then((res) => (res.ok ? res.json() : { projects: [] }))
        .then((data) => setProjectsList(data.projects || []))
        .catch(() => {});

      fetch("/api/departments")
        .then((res) => (res.ok ? res.json() : { departments: [] }))
        .then((data) => setDepartmentsList(data.departments || []))
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (open && templateId) {
      setLoading(true);
      setConfirmDelete(false);
      setDeletedMetricIds([]);
      fetch(`/api/goal-templates/${templateId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.template) {
            const t = data.template;
            setTitle(t.title || "");
            setDescription(t.description || "");
            const owners = Array.isArray(t.ownerIds) && t.ownerIds.length > 0
              ? t.ownerIds.map(String)
              : t.ownerId ? [String(t.ownerId)] : [];
            setSelectedOwnerIds(owners);
            setBusinessId(t.businessId || "");
            setTeamId(t.teamId || "");
            setFrequency(t.frequency || "daily");
            setWorkingDays(t.workingDays || [1, 2, 3, 4, 5]);
            setMetrics(
              (t.metrics || []).map((m: any) => ({
                id: m.id || m._id,
                metricName: m.metricName,
                target: m.target,
                unit: m.unit || "",
                weight: m.weight || 1,
                direction: m.direction || "higher_is_better",
                dataSource: m.dataSource || "manual",
              }))
            );
          }
        })
        .catch(() => toast.error("Failed to load goal details"))
        .finally(() => setLoading(false));
    }
  }, [open, templateId]);

  function toggleOwner(id: string) {
    setSelectedOwnerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleDay(d: number) {
    setWorkingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  function addMetric() {
    setMetrics((prev) => [
      ...prev,
      {
        metricName: "",
        target: 10,
        unit: "",
        weight: 1,
        direction: "higher_is_better",
        isNew: true,
      },
    ]);
  }

  function removeMetric(idx: number) {
    const item = metrics[idx];
    if (item.id && !item.isNew) {
      setDeletedMetricIds((prev) => [...prev, item.id!]);
    }
    setMetrics((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateMetricField(idx: number, field: keyof MetricEditRow, val: any) {
    setMetrics((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: val } : m))
    );
  }

  async function handleSave() {
    if (!title.trim() || selectedOwnerIds.length === 0) {
      toast.error("Please provide a title and assign at least one owner");
      return;
    }

    if (metrics.length === 0) {
      toast.error("At least one metric is required");
      return;
    }

    setSaving(true);
    try {
      // 1. Update Template metadata
      const res = await fetch(`/api/goal-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          ownerId: selectedOwnerIds[0],
          ownerIds: selectedOwnerIds,
          businessId: businessId || undefined,
          teamId: teamId || undefined,
          frequency,
          workingDays,
        }),
      });

      if (!res.ok) throw new Error("Failed to update goal template");

      // 2. Delete removed metrics
      for (const mId of deletedMetricIds) {
        await fetch(`/api/goal-templates/${templateId}/metrics?metricId=${mId}`, {
          method: "DELETE",
        });
      }

      // 3. Update existing or create new metrics
      for (const m of metrics) {
        if (m.isNew) {
          await fetch(`/api/goal-templates/${templateId}/metrics`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              metricName: m.metricName,
              target: Number(m.target) || 0,
              unit: m.unit,
              weight: Number(m.weight) || 1,
              direction: m.direction,
              dataSource: m.dataSource || "manual",
            }),
          });
        } else if (m.id) {
          await fetch(`/api/goal-templates/${templateId}/metrics`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              metricId: m.id,
              metricName: m.metricName,
              target: Number(m.target) || 0,
              unit: m.unit,
              weight: Number(m.weight) || 1,
              direction: m.direction,
            }),
          });
        }
      }

      toast.success("Goal updated successfully! 🎉");
      onUpdated();
      onClose();
    } catch {
      toast.error("Failed to save goal changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/goal-templates/${templateId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Goal archived and deleted successfully");
      onDeleted();
      onClose();
    } catch {
      toast.error("Failed to delete goal");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl rounded-2xl p-6 bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-neutral-900">
                  Edit Goal / KPI Template
                </DialogTitle>
                <p className="text-xs text-neutral-500">
                  Modify target numbers, frequency, weights, or assignees.
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
              Delete Goal
            </Button>
          </div>
        </DialogHeader>

        {confirmDelete && (
          <div className="rounded-xl p-3.5 bg-red-50 border border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-800 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <span>Are you sure you want to delete / archive this goal?</span>
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
            <p className="text-xs text-neutral-500">Loading goal details...</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Title & Assigned Employees */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Goal Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Restaurant Onboarding & Sales"
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-neutral-700">
                    Assigned Employees * ({selectedOwnerIds.length} Selected)
                  </Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOwnerIds(employees.map((e) => e.id))}
                      className="text-[11px] text-violet-600 hover:underline font-semibold"
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
                            ? "bg-violet-100/70 border border-violet-200 text-violet-950 font-medium"
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
              </div>
            </div>

            {/* Business / Project & Team / Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Business / Project</Label>
                <Select
                  value={businessId || "__none__"}
                  onValueChange={(val) => setBusinessId(val === "__none__" ? "" : val)}
                >
                  <SelectTrigger className="rounded-xl text-sm">
                    <SelectValue placeholder="Select Project (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">General / Company Wide</SelectItem>
                    {projectsList.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Team / Department</Label>
                <Select
                  value={teamId || "__none__"}
                  onValueChange={(val) => setTeamId(val === "__none__" ? "" : val)}
                >
                  <SelectTrigger className="rounded-xl text-sm">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">General / All Teams</SelectItem>
                    {departmentsList.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What responsibilities does this goal cover?"
                className="rounded-xl text-xs"
              />
            </div>

            {/* Frequency & Working Days */}
            <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-neutral-800">Tracking Frequency</Label>
                <div className="flex items-center gap-1.5">
                  {(["daily", "weekly", "monthly"] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFrequency(freq)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all",
                        frequency === freq
                          ? "bg-violet-600 text-white shadow-2xs"
                          : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100"
                      )}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              {frequency === "daily" && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-neutral-600">Active Working Days:</span>
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
                              ? "bg-violet-600 text-white"
                              : "bg-white text-neutral-400 border border-neutral-200"
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Metrics List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    KPI Metrics &amp; Targets
                  </Label>
                  <p className="text-[11px] text-neutral-500">
                    Define measurable target numbers, units, and weights.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMetric}
                  className="rounded-xl text-xs gap-1 border-violet-200 text-violet-700 hover:bg-violet-50 h-7"
                >
                  <Plus className="h-3 w-3" />
                  Add Metric
                </Button>
              </div>

              <div className="space-y-2.5">
                {metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-neutral-200 bg-white shadow-2xs space-y-2"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                      <div className="md:col-span-5">
                        <Input
                          placeholder="Metric Name (e.g. Sales Calls)"
                          value={m.metricName}
                          onChange={(e) => updateMetricField(idx, "metricName", e.target.value)}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          type="number"
                          placeholder="Target"
                          value={m.target}
                          onChange={(e) => updateMetricField(idx, "target", parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          placeholder="Unit (e.g. calls)"
                          value={m.unit}
                          onChange={(e) => updateMetricField(idx, "unit", e.target.value)}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Select
                          value={m.direction}
                          onValueChange={(val: any) => updateMetricField(idx, "direction", val)}
                        >
                          <SelectTrigger className="h-8 text-[11px] rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="higher_is_better">Higher is better</SelectItem>
                            <SelectItem value="lower_is_better">Lower is better</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeMetric(idx)}
                          className="text-neutral-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
            className="rounded-xl gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
