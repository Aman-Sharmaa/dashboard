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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Target, ChevronRight, ChevronLeft, RotateCcw, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type Employee = { id: string; name: string; email: string; avatarUrl?: string | null };

type MetricRow = {
  metricName: string;
  target: string;
  unit: string;
  weight: string;
  direction: "higher_is_better" | "lower_is_better";
  dataSource: "manual" | "auto_task" | "auto_crm";
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri

function emptyMetric(): MetricRow {
  return { metricName: "", target: "", unit: "", weight: "", direction: "higher_is_better", dataSource: "manual" };
}

export function CreateGoalModal({
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
  const [step, setStep] = useState(0); // 0=basic, 1=frequency, 2=metrics
  const [saving, setSaving] = useState(false);

  // Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [managerId, setManagerId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [teamId, setTeamId] = useState("");

  // Frequency
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [workingDays, setWorkingDays] = useState<number[]>(DEFAULT_WORKING_DAYS);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [noEndDate, setNoEndDate] = useState(true);
  const [endDate, setEndDate] = useState("");

  // Metrics
  const [metrics, setMetrics] = useState<MetricRow[]>([emptyMetric()]);

  // Project and Department options
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

  function reset() {
    setStep(0);
    setTitle(""); setDescription(""); setSelectedOwnerIds([]); setManagerId("");
    setBusinessId(""); setTeamId("");
    setFrequency("daily"); setWorkingDays(DEFAULT_WORKING_DAYS);
    setStartDate(new Date().toISOString().slice(0, 10)); setNoEndDate(true); setEndDate("");
    setMetrics([emptyMetric()]);
  }

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
    setMetrics((prev) => [...prev, emptyMetric()]);
  }

  function removeMetric(i: number) {
    setMetrics((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateMetric(i: number, field: keyof MetricRow, value: string) {
    setMetrics((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  }

  const totalWeight = metrics.reduce((s, m) => s + (parseFloat(m.weight) || 0), 0);

  async function handleSubmit() {
    if (!title.trim() || selectedOwnerIds.length === 0 || !startDate) {
      toast.error("Title, at least one assigned employee, and start date are required"); return;
    }
    if (step < 2) { setStep(step + 1); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/goal-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          ownerId: selectedOwnerIds[0],
          ownerIds: selectedOwnerIds,
          managerId: managerId || undefined,
          businessId: businessId.trim() || undefined,
          teamId: teamId.trim() || undefined,
          workType: "goal",
          frequency,
          workingDays,
          startDate,
          endDate: noEndDate ? undefined : endDate || undefined,
          noEndDate,
          metrics: metrics
            .filter((m) => m.metricName.trim() && m.target)
            .map((m) => ({
              metricName: m.metricName.trim(),
              target: parseFloat(m.target) || 0,
              unit: m.unit.trim(),
              weight: parseFloat(m.weight) || 0,
              direction: m.direction,
              dataSource: m.dataSource,
            })),
        }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to create goal"); return; }
      toast.success("Goal created successfully");
      reset();
      onCreated();
      onClose();
    } catch {
      toast.error("Failed to create goal");
    } finally {
      setSaving(false);
    }
  }

  const STEPS = ["Basic Info", "Frequency", "Metrics"];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-violet-600" />
            Create Goal / KPI
          </DialogTitle>

          {/* Step indicators */}
          <div className="flex items-center gap-1 mt-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <button
                  onClick={() => i <= step && setStep(i)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all",
                    i === step
                      ? "bg-violet-600 text-white shadow-sm"
                      : i < step
                      ? "bg-violet-100 text-violet-700 cursor-pointer hover:bg-violet-200"
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  )}
                >
                  <span className={cn(
                    "h-4 w-4 rounded-full text-[10px] font-bold flex items-center justify-center",
                    i === step ? "bg-white/30" : i < step ? "bg-violet-200" : "bg-neutral-200"
                  )}>
                    {i + 1}
                  </span>
                  {s}
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-neutral-300 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ─── Step 0: Basic Info ─── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Title */}
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Goal Name *</Label>
                  <Input
                    className="mt-1.5 rounded-xl"
                    placeholder="e.g. Restaurant Sales Performance"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Description</Label>
                  <Textarea
                    className="mt-1.5 rounded-xl resize-none"
                    rows={2}
                    placeholder="What does this goal track?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Assigned Employees */}
                <div className="col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
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
                  {selectedOwnerIds.length > 1 && (
                    <p className="text-[11px] text-violet-700 font-medium pt-0.5">
                      ✓ An independent KPI goal instance will be tracked and submitted separately for each assigned employee.
                    </p>
                  )}
                </div>

                {/* Manager */}
                <div>
                  <Label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Manager (optional)</Label>
                  <Select value={managerId} onValueChange={setManagerId}>
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Business / Project */}
                <div>
                  <Label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Business / Project</Label>
                  <Select
                    value={businessId || "__none__"}
                    onValueChange={(val) => setBusinessId(val === "__none__" ? "" : val)}
                  >
                    <SelectTrigger className="mt-1.5 rounded-xl">
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

                {/* Team / Department */}
                <div>
                  <Label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Team / Department</Label>
                  <Select
                    value={teamId || "__none__"}
                    onValueChange={(val) => setTeamId(val === "__none__" ? "" : val)}
                  >
                    <SelectTrigger className="mt-1.5 rounded-xl">
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
            </div>
          )}

          {/* ─── Step 1: Frequency ─── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Frequency selector */}
              <div>
                <Label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Frequency</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(["daily", "weekly", "monthly"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFrequency(f)}
                      className={cn(
                        "py-3 rounded-xl border text-sm font-semibold transition-all capitalize",
                        frequency === f
                          ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                      )}
                    >
                      {f === "daily" ? "🔁 Daily" : f === "weekly" ? "📅 Weekly" : "🗓️ Monthly"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Working days (for daily/weekly) */}
              {(frequency === "daily" || frequency === "weekly") && (
                <div>
                  <Label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Working Days</Label>
                  <div className="flex gap-2 mt-2">
                    {DAY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        onClick={() => toggleDay(i)}
                        className={cn(
                          "flex-1 py-2 rounded-xl border text-xs font-bold transition-all",
                          workingDays.includes(i)
                            ? "bg-violet-600 text-white border-violet-600"
                            : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Start Date *</Label>
                  <Input
                    type="date"
                    className="mt-1.5 rounded-xl"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">End Date</Label>
                  <div className="mt-1.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="noEndDate"
                        checked={noEndDate}
                        onChange={(e) => setNoEndDate(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="noEndDate" className="text-sm text-neutral-600">No end date</label>
                    </div>
                    {!noEndDate && (
                      <Input
                        type="date"
                        className="rounded-xl"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 2: Metrics / KPIs ─── */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-800">KPI Metrics</p>
                  <p className="text-xs text-neutral-500">Define the measurable targets. Weights should sum to 100%.</p>
                </div>
                <div className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-full",
                  Math.abs(totalWeight - 100) < 0.1 && totalWeight > 0
                    ? "bg-emerald-100 text-emerald-700"
                    : totalWeight > 100
                    ? "bg-red-100 text-red-700"
                    : "bg-neutral-100 text-neutral-600"
                )}>
                  Weight: {Math.round(totalWeight)}%
                </div>
              </div>

              {/* Header row */}
              <div className="grid grid-cols-[1fr_80px_60px_60px_120px_32px] gap-2 px-1">
                {["Metric Name", "Target", "Unit", "Weight", "Direction", ""].map((h) => (
                  <span key={h} className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">{h}</span>
                ))}
              </div>

              {/* Metric rows */}
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {metrics.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_60px_60px_120px_32px] gap-2 items-center">
                    <Input
                      className="rounded-lg h-8 text-sm"
                      placeholder="e.g. Onboardings"
                      value={m.metricName}
                      onChange={(e) => updateMetric(i, "metricName", e.target.value)}
                    />
                    <Input
                      className="rounded-lg h-8 text-sm"
                      type="number"
                      placeholder="10"
                      value={m.target}
                      onChange={(e) => updateMetric(i, "target", e.target.value)}
                    />
                    <Input
                      className="rounded-lg h-8 text-sm"
                      placeholder="%"
                      value={m.unit}
                      onChange={(e) => updateMetric(i, "unit", e.target.value)}
                    />
                    <Input
                      className="rounded-lg h-8 text-sm"
                      type="number"
                      placeholder="35"
                      value={m.weight}
                      onChange={(e) => updateMetric(i, "weight", e.target.value)}
                    />
                    <Select
                      value={m.direction}
                      onValueChange={(v) => updateMetric(i, "direction", v)}
                    >
                      <SelectTrigger className="rounded-lg h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="higher_is_better">↑ Higher better</SelectItem>
                        <SelectItem value="lower_is_better">↓ Lower better</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => removeMetric(i)}
                      disabled={metrics.length === 1}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl border-dashed h-9 gap-2 text-neutral-500 hover:text-neutral-900"
                onClick={addMetric}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Metric
              </Button>

              {/* Preview card */}
              {metrics.some((m) => m.metricName) && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-2">
                  <p className="text-xs font-bold text-violet-700 uppercase tracking-wide">Preview</p>
                  <p className="font-semibold text-sm text-neutral-800">{title || "Goal Name"}</p>
                  <div className="space-y-1.5">
                    {metrics.filter((m) => m.metricName).map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-neutral-700">{m.metricName}</span>
                        <span className="font-mono font-semibold text-neutral-800">
                          {m.direction === "lower_is_better" ? "≤" : "≥"} {m.target}{m.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-violet-600 hover:bg-violet-700 gap-1.5 min-w-[100px]"
              onClick={handleSubmit}
              disabled={saving}
            >
              {step < 2 ? (
                <>Next <ChevronRight className="h-4 w-4" /></>
              ) : saving ? (
                "Creating..."
              ) : (
                <>
                  <Target className="h-4 w-4" />
                  Create Goal
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
