"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Target, CheckCircle2, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { GoalInstanceData, KpiResult } from "@/components/goal-card";

type LogKpiModalProps = {
  open: boolean;
  onClose: () => void;
  instance: GoalInstanceData | null;
  onUpdated: () => void;
};

export function LogKpiModal({ open, onClose, instance, onUpdated }: LogKpiModalProps) {
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (instance) {
      const initial: Record<string, string> = {};
      instance.results.forEach((r) => {
        initial[r.metricId] = String(r.actual);
      });
      setMetricValues(initial);
      setNotes("");
    }
  }, [instance]);

  if (!instance) return null;

  function calculatePreviewScore() {
    if (!instance) return 0;
    let totalScore = 0;
    let totalWeight = 0;

    instance.results.forEach((r) => {
      const val = parseFloat(metricValues[r.metricId] || "0") || 0;
      let ach = 0;
      if (r.direction === "lower_is_better") {
        ach = val <= r.target ? 100 : Math.max(0, Math.round((r.target / val) * 100));
      } else {
        ach = r.target > 0 ? Math.round((val / r.target) * 100) : 0;
      }
      totalScore += ach * (r.weight || 1);
      totalWeight += r.weight || 1;
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  const previewScore = calculatePreviewScore();

  async function handleSave() {
    setSaving(true);
    try {
      // Save all updated metrics in parallel
      const updatePromises = instance!.results.map((r) => {
        const val = parseFloat(metricValues[r.metricId] || "0") || 0;
        return fetch("/api/metric-results", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goalInstanceId: instance!.id,
            metricId: r.metricId,
            actual: val,
            note: notes.trim() || undefined,
          }),
        });
      });

      const responses = await Promise.all(updatePromises);
      const allOk = responses.every((res) => res.ok);

      if (!allOk) {
        toast.error("Some metric updates failed");
      } else {
        toast.success("Progress logged successfully! 🎯");
      }
      onUpdated();
      onClose();
    } catch {
      toast.error("Failed to submit data");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl rounded-2xl p-6 bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-neutral-900">
                Log KPI Progress &amp; Submit Data
              </DialogTitle>
              <p className="text-xs text-neutral-500 mt-0.5">
                {instance.template?.title || "Goal"} &bull; {instance.owner?.name}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Live Score Banner */}
        <div className="rounded-xl p-3.5 bg-gradient-to-r from-violet-50 via-purple-50 to-blue-50 border border-violet-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600 animate-pulse" />
            <span className="text-xs font-semibold text-neutral-700">Estimated Goal Score:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-lg font-black tabular-nums",
              previewScore >= 80 ? "text-emerald-600" : previewScore >= 60 ? "text-amber-600" : "text-red-600"
            )}>
              {previewScore}%
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white font-semibold text-neutral-600 border shadow-2xs">
              Expected: {instance.expectedProgress}%
            </span>
          </div>
        </div>

        {/* Metric inputs */}
        <div className="space-y-4 py-2">
          <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
            Enter Today's Actual Metric Numbers
          </p>

          {instance.results.map((r) => {
            const currentVal = parseFloat(metricValues[r.metricId] || "0") || 0;
            let ach = 0;
            if (r.direction === "lower_is_better") {
              ach = currentVal <= r.target ? 100 : Math.max(0, Math.round((r.target / currentVal) * 100));
            } else {
              ach = r.target > 0 ? Math.round((currentVal / r.target) * 100) : 0;
            }

            return (
              <div key={r.metricId} className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-white hover:border-violet-200 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-neutral-800">{r.metricName}</span>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                      <span>Target: <strong className="text-neutral-700 font-mono">{r.target}{r.unit}</strong></span>
                      &bull;
                      <span>Weight: <strong>{r.weight || 1}</strong></span>
                      &bull;
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-700">
                        {r.direction === "higher_is_better" ? "Higher is better" : "Lower is better"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={cn(
                      "text-xs font-bold tabular-nums px-2 py-0.5 rounded-full border",
                      ach >= 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : ach >= 75 ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : ach >= 60 ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-red-50 text-red-700 border-red-200"
                    )}>
                      {ach}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={metricValues[r.metricId] ?? ""}
                      onChange={(e) =>
                        setMetricValues((prev) => ({ ...prev, [r.metricId]: e.target.value }))
                      }
                      placeholder={`Enter actual ${r.unit || "number"}`}
                      className="h-10 rounded-xl font-mono text-sm bg-white"
                    />
                  </div>
                  {r.unit && (
                    <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2.5 py-2 rounded-lg shrink-0">
                      {r.unit}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Submission Note */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-medium text-neutral-600">Note / Reason (Optional)</Label>
            <Textarea
              placeholder="e.g. Completed 12 client calls, 3 new merchant signups onboarded today."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-xs rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} className="rounded-xl">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Submit Data &amp; Update Score
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
