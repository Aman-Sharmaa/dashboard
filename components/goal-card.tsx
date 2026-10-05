"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ChevronDown, ChevronUp, Pencil, MoreVertical, Edit2, Trash2, PlusCircle, CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type KpiResult = {
  metricId: string;
  metricName: string;
  target: number;
  actual: number;
  unit: string;
  weight: number;
  direction: "higher_is_better" | "lower_is_better";
  achievement: number;
};

export type GoalInstanceData = {
  id: string;
  goalId: string;
  ownerId: string;
  template: {
    id: string;
    title: string;
    frequency: string;
    workType: string;
    businessId?: string;
    teamId?: string;
  } | null;
  overallScore: number;
  expectedProgress: number;
  status: string;
  results: KpiResult[];
  owner: {
    id: string;
    name: string;
    title?: string;
    avatarUrl?: string;
  } | null;
};

function getScoreColor(score: number, expectedProgress: number) {
  if (score === 0 && expectedProgress === 0) return "text-neutral-500";
  if (score >= expectedProgress * 1.1) return "text-emerald-600";
  if (score >= expectedProgress * 0.9) return "text-emerald-600";
  if (score >= expectedProgress * 0.7) return "text-amber-600";
  return "text-red-600";
}

function getStatusBadge(score: number, expectedProgress: number) {
  const diff = score - expectedProgress;
  if (score >= 90) return { label: "Excellent", dot: "🟢", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (diff >= -10) return { label: "On Track", dot: "🟢", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (diff >= -25) return { label: "Needs Attention", dot: "🟡", bg: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Behind", dot: "🔴", bg: "bg-red-50 text-red-700 border-red-200" };
}

function getProgressBarColor(achievement: number, direction: string) {
  if (achievement >= 100) return "bg-emerald-500";
  if (achievement >= 75) return "bg-emerald-400";
  if (achievement >= 60) return "bg-amber-400";
  return "bg-red-400";
}

type GoalCardProps = {
  instance: GoalInstanceData;
  onUpdateKpi?: (instanceId: string, metricId: string, actual: number) => Promise<void>;
  onLogProgress?: (instance: GoalInstanceData) => void;
  onEditGoal?: (templateId: string) => void;
  onDeleteGoal?: (templateId: string) => void;
  isAdmin?: boolean;
  compact?: boolean;
};

export function GoalCard({
  instance,
  onUpdateKpi,
  onLogProgress,
  onEditGoal,
  onDeleteGoal,
  isAdmin = false,
  compact = false,
}: GoalCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [updating, setUpdating] = useState(false);

  const score = instance.overallScore || 0;
  const expected = instance.expectedProgress || 0;
  const badge = getStatusBadge(score, expected);

  const freqLabel =
    instance.template?.frequency === "daily" ? "🔁 Daily"
    : instance.template?.frequency === "weekly" ? "📅 Weekly"
    : instance.template?.frequency === "monthly" ? "🗓️ Monthly"
    : "🔁 Recurring";

  async function saveKpi(metricId: string) {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) { toast.error("Enter a valid number"); return; }
    if (!onUpdateKpi) return;
    setUpdating(true);
    try {
      await onUpdateKpi(instance.id, metricId, val);
      setEditingMetric(null);
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdating(false);
    }
  }

  const templateId = instance.template?.id || instance.goalId;

  return (
    <div className={cn(
      "rounded-2xl border bg-white shadow-sm overflow-hidden transition-all hover:shadow-md flex flex-col justify-between",
      compact ? "w-80 shrink-0" : "w-full"
    )}>
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-100">
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Owner avatar + name */}
          <div className="flex items-center gap-2.5 min-w-0">
            {instance.owner?.avatarUrl ? (
              <img
                src={instance.owner.avatarUrl}
                alt={instance.owner.name}
                className="h-8 w-8 rounded-full object-cover shrink-0 border border-neutral-200"
              />
            ) : (
              <span className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                {(instance.owner?.name || "?").slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-800 truncate">{instance.owner?.name || "—"}</p>
              {instance.owner?.title && (
                <p className="text-[11px] text-neutral-500 truncate">{instance.owner.title}</p>
              )}
            </div>
          </div>

          {/* Action menu + Score badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex flex-col items-end gap-0.5">
              <span className={cn(
                "text-xl font-black tabular-nums",
                getScoreColor(score, expected)
              )}>
                {score}%
              </span>
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                badge.bg
              )}>
                {badge.dot} {badge.label}
              </span>
            </div>

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors ml-1">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl w-44 p-1">
                {onLogProgress && (
                  <DropdownMenuItem
                    onClick={() => onLogProgress(instance)}
                    className="gap-2 text-xs font-semibold cursor-pointer rounded-lg text-violet-700 focus:text-violet-800 focus:bg-violet-50"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Log Progress Data
                  </DropdownMenuItem>
                )}
                {isAdmin && onEditGoal && templateId && (
                  <DropdownMenuItem
                    onClick={() => onEditGoal(templateId)}
                    className="gap-2 text-xs cursor-pointer rounded-lg text-neutral-700"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Goal Template
                  </DropdownMenuItem>
                )}
                {isAdmin && onDeleteGoal && templateId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteGoal(templateId)}
                      className="gap-2 text-xs cursor-pointer rounded-lg text-red-600 focus:text-red-700 focus:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Goal
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Goal title */}
        <p className="text-xs font-semibold text-neutral-800 mb-2 truncate" title={instance.template?.title}>
          {instance.template?.title || "Goal"}
        </p>

        {/* Main progress bar */}
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden relative">
            {/* Expected progress ghost bar */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-neutral-200 transition-all"
              style={{ width: `${Math.min(100, expected)}%` }}
            />
            {/* Actual progress */}
            <div
              className={cn(
                "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
                score >= 100 ? "bg-emerald-500" : score >= 75 ? "bg-emerald-400" : score >= 60 ? "bg-amber-400" : "bg-red-400"
              )}
              style={{ width: `${Math.min(100, score)}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400">
              Expected {expected}%
            </span>
            <span className="text-[10px] font-semibold text-neutral-600">
              Actual {score}%
            </span>
          </div>
        </div>
      </div>

      {/* KPI breakdown */}
      <div className="px-4 py-3 space-y-2 flex-1">
        {(expanded ? instance.results : instance.results.slice(0, 3)).map((r) => (
          <div key={r.metricId} className="flex items-center gap-2">
            {/* Mini progress bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-neutral-600 truncate">{r.metricName}</span>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {editingMetric === r.metricId ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className="w-16 h-5 rounded px-1 text-xs border border-violet-300 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveKpi(r.metricId);
                          if (e.key === "Escape") setEditingMetric(null);
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => saveKpi(r.metricId)}
                        disabled={updating}
                        className="text-[10px] font-bold text-violet-600 hover:text-violet-800 disabled:opacity-50"
                      >
                        {updating ? "..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingMetric(null)}
                        className="text-[10px] text-neutral-400 hover:text-neutral-600"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group">
                      <span className="text-xs font-mono font-semibold text-neutral-800">
                        {r.actual} / {r.target}{r.unit}
                      </span>
                      {onUpdateKpi && (
                        <button
                          onClick={() => {
                            setEditingMetric(r.metricId);
                            setEditValue(String(r.actual));
                          }}
                          title="Quick Edit"
                          className="opacity-0 group-hover:opacity-100 h-4 w-4 rounded flex items-center justify-center text-neutral-400 hover:text-violet-600 hover:bg-violet-50 transition-all"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", getProgressBarColor(r.achievement, r.direction))}
                  style={{ width: `${Math.min(100, r.achievement)}%` }}
                />
              </div>
            </div>
            {/* Achievement % */}
            <span className={cn(
              "text-[10px] font-bold tabular-nums shrink-0 w-8 text-right",
              r.achievement >= 100 ? "text-emerald-600"
              : r.achievement >= 75 ? "text-emerald-500"
              : r.achievement >= 60 ? "text-amber-500"
              : "text-red-500"
            )}>
              {r.achievement}%
            </span>
          </div>
        ))}

        {/* Show more / less */}
        {instance.results.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors w-full justify-center pt-1"
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3" /> Show less</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> +{instance.results.length - 3} more metrics</>
            )}
          </button>
        )}
      </div>

      {/* Footer with Submit / Log Button */}
      <div className="px-4 py-2.5 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">{freqLabel}</span>
        {onLogProgress && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onLogProgress(instance)}
            className="h-7 text-xs font-semibold px-2.5 rounded-lg text-violet-700 hover:text-violet-800 hover:bg-violet-100/60 gap-1"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Submit Data
          </Button>
        )}
      </div>
    </div>
  );
}
