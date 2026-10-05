"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, RefreshCw, Target, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoalCard, GoalInstanceData } from "@/components/goal-card";
import { LogKpiModal } from "@/components/log-kpi-modal";
import { EditGoalModal } from "@/components/edit-goal-modal";

import { ConfirmDialog } from "@/components/confirm-dialog";

type TodayGoalsSectionProps = {
  isAdmin: boolean;
  onCreateGoal: () => void;
  filterOwnerId?: string;
};

export function TodayGoalsSection({ isAdmin, onCreateGoal, filterOwnerId }: TodayGoalsSectionProps) {
  const [instances, setInstances] = useState<GoalInstanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);

  // Modals
  const [selectedInstance, setSelectedInstance] = useState<GoalInstanceData | null>(null);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range: "today", ensureToday: "1" });
      if (filterOwnerId) params.set("ownerId", filterOwnerId);
      const res = await fetch(`/api/goal-instances?${params.toString()}`);
      if (!res.ok) { toast.error("Failed to load goals"); return; }
      const data = await res.json();
      setInstances(data.instances || []);
    } catch {
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [filterOwnerId]);

  useEffect(() => {
    load();
    fetch("/api/employees")
      .then((res) => (res.ok ? res.json() : { employees: [] }))
      .then((data) => setEmployees(data.employees || []))
      .catch(() => {});
  }, [load]);

  async function handleUpdateKpi(instanceId: string, metricId: string, actual: number) {
    const res = await fetch("/api/metric-results", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalInstanceId: instanceId, metricId, actual }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed");
    // Update local state
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instanceId) return inst;
        return {
          ...inst,
          overallScore: data.overallScore,
          results: inst.results.map((r) =>
            r.metricId === metricId
              ? { ...r, actual, achievement: Math.round((actual / r.target) * 100) }
              : r
          ),
        };
      })
    );
  }

  function handleOpenLogProgress(instance: GoalInstanceData) {
    setSelectedInstance(instance);
    setLogModalOpen(true);
  }

  function handleOpenEditGoal(templateId: string) {
    setEditTemplateId(templateId);
    setEditModalOpen(true);
  }

  async function executeDeleteGoal() {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/goal-templates/${deleteTargetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Goal deleted successfully");
      setDeleteTargetId(null);
      load();
    } catch {
      toast.error("Failed to delete goal");
    } finally {
      setDeleting(false);
    }
  }

  function handleDeleteGoal(templateId: string) {
    setDeleteTargetId(templateId);
  }

  if (loading) {
    return (
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 rounded-full bg-neutral-200 animate-pulse" />
          <div className="h-5 w-24 rounded-full bg-neutral-200 animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-80 shrink-0 rounded-2xl border bg-white h-52 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Delete Goal Dialog */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
        title="Delete Goal Template?"
        description="Are you sure you want to delete or archive this goal template? Daily tracking instances for this goal will be removed."
        confirmLabel={deleting ? "Deleting..." : "Delete Goal"}
        variant="destructive"
        isLoading={deleting}
        onConfirm={executeDeleteGoal}
      />

      {/* Log KPI Progress Modal */}
      <LogKpiModal
        open={logModalOpen}
        onClose={() => { setLogModalOpen(false); setSelectedInstance(null); }}
        instance={selectedInstance}
        onUpdated={load}
      />

      {/* Edit Goal Template Modal */}
      <EditGoalModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditTemplateId(null); }}
        templateId={editTemplateId}
        employees={employees}
        onUpdated={load}
        onDeleted={load}
      />

      {/* Section header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-bold text-neutral-800 uppercase tracking-wider">Today's Goals</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>{dateLabel}</span>
          </div>
          {instances.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
              {instances.length} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-xl gap-1.5 text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
              onClick={onCreateGoal}
            >
              <Plus className="h-3 w-3" />
              New Goal
            </Button>
          )}
        </div>
      </div>

      {/* Cards horizontal scroll */}
      {instances.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 py-8">
          <div className="text-center">
            <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-2">
              <Target className="h-5 w-5 text-violet-600" />
            </div>
            <p className="text-sm font-semibold text-neutral-700">No goals set for today</p>
            <p className="text-xs text-neutral-400 mt-1">
              {isAdmin ? "Create a goal to start tracking KPIs" : "Your manager hasn't set goals for today"}
            </p>
            {isAdmin && (
              <Button
                size="sm"
                className="mt-3 rounded-xl bg-violet-600 hover:bg-violet-700 gap-1.5 text-xs text-white"
                onClick={onCreateGoal}
              >
                <Plus className="h-3.5 w-3.5" />
                Create First Goal
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
          {instances.map((inst) => (
            <GoalCard
              key={inst.id}
              instance={inst}
              onUpdateKpi={handleUpdateKpi}
              onLogProgress={handleOpenLogProgress}
              onEditGoal={handleOpenEditGoal}
              onDeleteGoal={handleDeleteGoal}
              isAdmin={isAdmin}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
