"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RefreshCw, ChevronDown, ChevronRight, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type KpiDetail = {
  metricName: string;
  target: number;
  actual: number;
  unit: string;
  achievement: number;
  direction: string;
};

type GoalDetail = {
  instanceId: string;
  goalId: string;
  score: number;
  kpiBreakdown: KpiDetail[];
};

type EmployeePerformance = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  title: string;
  department: string;
  manager: string;
  goalScore: number | null;
  goalStatus: { label: string; color: string; emoji: string } | null;
  tasks: { total: number; done: number };
  overallScore: number | null;
  overallStatus: { label: string; color: string; emoji: string } | null;
  goalDetails: GoalDetail[];
  hasGoals: boolean;
};

type AttentionItem = {
  id: string;
  name: string;
  goalScore: number | null;
  status: { label: string; color: string; emoji: string } | null;
};

function ScoreBadge({ score, status }: { score: number | null; status: { emoji: string; label: string } | null }) {
  if (score === null || status === null) {
    return <span className="text-xs text-neutral-400">—</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        "text-sm font-black tabular-nums",
        score >= 90 ? "text-emerald-600"
        : score >= 75 ? "text-emerald-500"
        : score >= 60 ? "text-amber-500"
        : "text-red-500"
      )}>
        {score}%
      </span>
      <span className="text-xs">{status.emoji}</span>
    </div>
  );
}

function KpiDetailRow({ kpi }: { kpi: KpiDetail }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-neutral-50 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn(
          "text-[10px] font-bold",
          kpi.direction === "lower_is_better" ? "text-blue-500" : "text-neutral-400"
        )}>
          {kpi.direction === "lower_is_better" ? "↓" : "↑"}
        </span>
        <span className="text-xs text-neutral-700 truncate">{kpi.metricName}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs font-mono text-neutral-600">
          {kpi.actual} / {kpi.target}{kpi.unit}
        </span>
        <span className={cn(
          "text-xs font-bold tabular-nums w-10 text-right",
          kpi.achievement >= 100 ? "text-emerald-600"
          : kpi.achievement >= 75 ? "text-emerald-500"
          : kpi.achievement >= 60 ? "text-amber-500"
          : "text-red-500"
        )}>
          {kpi.achievement}%
        </span>
      </div>
    </div>
  );
}

export function TeamPerformanceView() {
  const [team, setTeam] = useState<EmployeePerformance[]>([]);
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/goals/team-performance");
      if (!res.ok) { toast.error("Failed to load team performance"); return; }
      const data = await res.json();
      setTeam(data.teamPerformance || []);
      setAttention(data.attentionRequired || []);
    } catch {
      toast.error("Failed to load performance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-xl border bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "short", year: "numeric"
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-600" />
            Team Performance
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">{today}</p>
        </div>
        <button
          onClick={load}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Attention Required */}
      {attention.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Attention Required</span>
          </div>
          <div className="space-y-1.5">
            {attention.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-800">{item.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600 font-semibold">{item.goalScore}% goals</span>
                  <span>{item.status?.emoji}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance table */}
      <div className="rounded-2xl border border-neutral-200 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
          {["Employee", "Role", "Daily Goals", "Tasks", "Overall"].map((h) => (
            <span key={h} className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-neutral-100">
          {team.length === 0 && (
            <div className="text-center py-10 text-sm text-neutral-400">
              No employee data yet
            </div>
          )}
          {team.map((emp) => (
            <div key={emp.id}>
              {/* Main row */}
              <div
                className={cn(
                  "grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-neutral-50 transition-colors",
                  expandedRow === emp.id && "bg-violet-50/30"
                )}
                onClick={() => setExpandedRow(expandedRow === emp.id ? null : emp.id)}
              >
                {/* Employee */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {emp.avatarUrl ? (
                    <img src={emp.avatarUrl} alt={emp.name} className="h-7 w-7 rounded-full object-cover shrink-0 border border-neutral-200" />
                  ) : (
                    <span className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 truncate">{emp.name}</p>
                    {emp.department && <p className="text-[10px] text-neutral-400 truncate">{emp.department}</p>}
                  </div>
                </div>

                {/* Role / Title */}
                <div className="min-w-0">
                  <p className="text-xs text-neutral-600 truncate">{emp.title || "—"}</p>
                </div>

                {/* Daily Goals */}
                <div>
                  {emp.hasGoals ? (
                    <ScoreBadge score={emp.goalScore} status={emp.goalStatus} />
                  ) : (
                    <span className="text-xs text-neutral-300">No goals</span>
                  )}
                </div>

                {/* Tasks */}
                <div>
                  <span className="text-sm font-semibold text-neutral-700 tabular-nums">
                    {emp.tasks.done}/{emp.tasks.total}
                  </span>
                </div>

                {/* Overall */}
                <div className="flex items-center justify-between">
                  <ScoreBadge score={emp.overallScore} status={emp.overallStatus} />
                  {emp.hasGoals && (
                    expandedRow === emp.id
                      ? <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                      : <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
                  )}
                </div>
              </div>

              {/* Expanded KPI detail */}
              {expandedRow === emp.id && emp.goalDetails.length > 0 && (
                <div className="px-4 pb-4 bg-violet-50/20 border-t border-violet-100">
                  <div className="mt-3 space-y-4">
                    {emp.goalDetails.map((goal) => (
                      <div key={goal.instanceId} className="rounded-xl border border-neutral-200 bg-white p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
                            Goal KPIs
                          </span>
                          <span className={cn(
                            "text-xs font-black",
                            goal.score >= 90 ? "text-emerald-600"
                            : goal.score >= 75 ? "text-emerald-500"
                            : goal.score >= 60 ? "text-amber-500"
                            : "text-red-500"
                          )}>
                            {goal.score}%
                          </span>
                        </div>
                        <div className="space-y-0">
                          {goal.kpiBreakdown.map((kpi, i) => (
                            <KpiDetailRow key={i} kpi={kpi} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
