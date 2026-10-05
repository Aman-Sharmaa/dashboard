"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Target,
  Plus,
  BarChart3,
  Users,
  Flame,
  ShieldAlert,
  Award,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TodayGoalsSection } from "@/components/today-goals-section";
import { CreateGoalModal } from "@/components/create-goal-modal";
import { CreateRoutineModal } from "@/components/create-routine-modal";
import { EditGoalModal } from "@/components/edit-goal-modal";
import { RoutinesView } from "@/components/routines-view";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

type GoalTemplateItem = {
  id: string;
  title: string;
  description?: string;
  workType: "goal" | "routine" | "milestone";
  frequency: string;
  workingDays: number[];
  startDate: string;
  endDate?: string | null;
  noEndDate: boolean;
  status: string;
  businessId?: string | null;
  teamId?: string | null;
  owners: Array<{
    _id?: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  }>;
  metrics: Array<{
    id: string;
    metricName: string;
    target: number;
    unit: string;
    weight: number;
  }>;
  createdAt?: string;
};

/** Calculate when the next instance will be created for a goal template */
function getNextInstanceDate(template: GoalTemplateItem): { label: string; date: Date | null; isUpcoming: boolean } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const startDate = new Date(template.startDate);
  startDate.setHours(0, 0, 0, 0);

  // If not started yet
  if (startDate > now) {
    return { label: `Starts ${formatDateShort(startDate)}`, date: startDate, isUpcoming: true };
  }

  // If ended
  if (!template.noEndDate && template.endDate) {
    const endDate = new Date(template.endDate);
    endDate.setHours(0, 0, 0, 0);
    if (endDate < now) {
      return { label: `Ended ${formatDateShort(endDate)}`, date: null, isUpcoming: false };
    }
  }

  // Find next working day
  const workingDays = template.workingDays || [1, 2, 3, 4, 5];
  const todayDow = now.getDay();

  // Check if today is a working day
  if (workingDays.includes(todayDow)) {
    return { label: "Active today", date: now, isUpcoming: false };
  }

  // Find next working day
  for (let i = 1; i <= 7; i++) {
    const nextDow = (todayDow + i) % 7;
    if (workingDays.includes(nextDow)) {
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + i);
      return { label: `Next: ${DAY_LABELS[nextDow]} ${formatDateShort(nextDate)}`, date: nextDate, isUpcoming: false };
    }
  }

  return { label: "No working days set", date: null, isUpcoming: false };
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function GoalsDashboardClient({ userRole }: { userRole: "admin" | "employee" }) {
  const isAdmin = userRole === "admin";
  const [createGoalOpen, setCreateGoalOpen] = useState(false);
  const [createRoutineOpen, setCreateRoutineOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  // All templates state (admin only)
  const [templates, setTemplates] = useState<GoalTemplateItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(true);

  // Edit goal modal
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Delete goal dialog
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => (res.ok ? res.json() : { employees: [] }))
      .then((data) => setEmployees(data.employees || []))
      .catch(() => {});
  }, []);

  const loadTemplates = useCallback(async () => {
    if (!isAdmin) return;
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/goal-templates?status=active");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      toast.error("Failed to load goal templates");
    } finally {
      setTemplatesLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) loadTemplates();
  }, [isAdmin, loadTemplates]);

  async function executeDeleteGoal() {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/goal-templates/${deleteTargetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Goal deleted successfully");
      setDeleteTargetId(null);
      loadTemplates();
    } catch {
      toast.error("Failed to delete goal");
    } finally {
      setDeleting(false);
    }
  }

  // Separate templates into categories
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcomingTemplates = templates.filter((t) => {
    const start = new Date(t.startDate);
    start.setHours(0, 0, 0, 0);
    return start > now;
  });
  const activeTemplates = templates.filter((t) => {
    const start = new Date(t.startDate);
    start.setHours(0, 0, 0, 0);
    return start <= now;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <CreateGoalModal
        open={createGoalOpen}
        onClose={() => setCreateGoalOpen(false)}
        employees={employees}
        onCreated={() => { loadTemplates(); }}
      />

      <CreateRoutineModal
        open={createRoutineOpen}
        onClose={() => setCreateRoutineOpen(false)}
        employees={employees}
        onCreated={() => {}}
      />

      {/* Edit Goal Modal */}
      <EditGoalModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditTemplateId(null); }}
        templateId={editTemplateId}
        employees={employees}
        onUpdated={() => { loadTemplates(); }}
        onDeleted={() => { loadTemplates(); }}
      />

      {/* Delete Goal Confirm */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
        title="Delete Goal Template?"
        description="Are you sure you want to delete this goal template? All instances and metric data will be permanently removed."
        confirmLabel={deleting ? "Deleting..." : "Delete Goal"}
        variant="destructive"
        isLoading={deleting}
        onConfirm={executeDeleteGoal}
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-neutral-900">
            <Target className="h-6 w-6 text-violet-600" />
            Goals &amp; Performance Dashboard
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Track daily KPIs, recurring routines, and team performance metrics.
          </p>
        </div>
        {isAdmin && (
          <Button
            className="rounded-xl gap-2 bg-violet-600 hover:bg-violet-700 shadow-sm"
            onClick={() => setCreateGoalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create Goal
          </Button>
        )}
      </div>

      {/* Today's Goals Section */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <TodayGoalsSection
          isAdmin={isAdmin}
          onCreateGoal={() => setCreateGoalOpen(true)}
        />
      </div>

      {/* ── Admin: All Goal Templates ── */}
      {isAdmin && (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-neutral-900">
                  All Goal Templates
                  <span className="ml-2 text-xs font-normal text-neutral-500">
                    ({templates.length} total · {upcomingTemplates.length} upcoming)
                  </span>
                </h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  View and manage all active goal templates, including upcoming ones. Shows when each goal's next instance will be created.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadTemplates}
                className="h-8 w-8 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", templatesLoading && "animate-spin")} />
              </button>
              <button
                onClick={() => setShowAllTemplates(!showAllTemplates)}
                className="h-8 px-3 rounded-xl border border-neutral-200 flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                {showAllTemplates ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showAllTemplates ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {showAllTemplates && (
            <div className="p-5">
              {templatesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-2xl border bg-neutral-50 animate-pulse" />
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-10">
                  <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-3">
                    <Target className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-neutral-700">No goal templates created yet</p>
                  <p className="text-xs text-neutral-400 mt-1">Create your first goal to start tracking KPIs.</p>
                  <Button
                    size="sm"
                    className="mt-3 rounded-xl bg-violet-600 hover:bg-violet-700 gap-1.5 text-xs"
                    onClick={() => setCreateGoalOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create First Goal
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Upcoming Goals Section */}
                  {upcomingTemplates.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                          Upcoming Goals
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">
                          {upcomingTemplates.length}
                        </Badge>
                      </div>
                      <div className="space-y-2.5">
                        {upcomingTemplates.map((t) => (
                          <GoalTemplateCard
                            key={t.id}
                            template={t}
                            onEdit={(id) => { setEditTemplateId(id); setEditModalOpen(true); }}
                            onDelete={(id) => setDeleteTargetId(id)}
                            variant="upcoming"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Goals Section */}
                  {activeTemplates.length > 0 && (
                    <div className="space-y-3">
                      {upcomingTemplates.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                            Active Goals
                          </span>
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                            {activeTemplates.length}
                          </Badge>
                        </div>
                      )}
                      <div className="space-y-2.5">
                        {activeTemplates.map((t) => (
                          <GoalTemplateCard
                            key={t.id}
                            template={t}
                            onEdit={(id) => { setEditTemplateId(id); setEditModalOpen(true); }}
                            onDelete={(id) => setDeleteTargetId(id)}
                            variant="active"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Daily Routines */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <RoutinesView isAdmin={isAdmin} onCreateRoutine={() => setCreateRoutineOpen(true)} />
      </div>
    </div>
  );
}

/** Template card component */
function GoalTemplateCard({
  template,
  onEdit,
  onDelete,
  variant,
}: {
  template: GoalTemplateItem;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  variant: "upcoming" | "active";
}) {
  const nextInfo = getNextInstanceDate(template);
  const isUpcoming = variant === "upcoming";

  return (
    <div
      className={cn(
        "p-4 rounded-2xl border transition-all group",
        isUpcoming
          ? "border-amber-200/80 bg-amber-50/20 hover:border-amber-300"
          : "border-neutral-200/80 bg-white hover:border-violet-200 hover:shadow-xs"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-neutral-900">{template.title}</h4>
            <Badge
              variant="outline"
              className={cn(
                "rounded-md text-[10px] font-bold px-1.5 py-0.5",
                template.workType === "milestone"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-violet-100 text-violet-800 border-violet-200"
              )}
            >
              {template.workType === "milestone" ? "Milestone" : "Goal / KPI"}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-md text-[10px] font-semibold px-1.5 py-0.5 bg-neutral-50 text-neutral-600 border-neutral-200"
            >
              {template.frequency}
            </Badge>
          </div>

          {template.description && (
            <p className="text-xs text-neutral-500 line-clamp-1">{template.description}</p>
          )}

          {/* Details row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            {/* Working days */}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <div className="flex gap-0.5">
                {DAY_SHORT.map((d, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-4 w-4 rounded text-[9px] font-bold flex items-center justify-center",
                      template.workingDays.includes(i)
                        ? "bg-violet-600 text-white"
                        : "bg-neutral-100 text-neutral-300"
                    )}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Start date */}
            <span className="text-[11px] font-medium">
              Start: {new Date(template.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>

            {/* End date */}
            {template.noEndDate ? (
              <span className="text-[11px] text-neutral-400">No end date</span>
            ) : template.endDate ? (
              <span className="text-[11px] font-medium">
                End: {new Date(template.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            ) : null}

            {/* Metrics count */}
            {template.metrics.length > 0 && (
              <Badge variant="outline" className="text-[10px] bg-neutral-50 text-neutral-600 border-neutral-200 gap-1">
                {template.metrics.length} KPI{template.metrics.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {/* Assigned employees */}
          {template.owners.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-neutral-400 font-medium">Assigned:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {template.owners.slice(0, 5).map((o, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-700 bg-neutral-100 rounded-md px-1.5 py-0.5"
                  >
                    {o.avatarUrl ? (
                      <img src={o.avatarUrl} alt={o.name} className="h-3.5 w-3.5 rounded-full object-cover" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full bg-violet-200 text-violet-700 text-[8px] font-bold flex items-center justify-center">
                        {o.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    {o.name}
                  </span>
                ))}
                {template.owners.length > 5 && (
                  <span className="text-[10px] text-neutral-400 font-medium">
                    +{template.owners.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Next instance creation */}
          <div className="flex items-center gap-1.5 pt-1">
            <Clock className="h-3 w-3 text-neutral-400" />
            <span
              className={cn(
                "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                nextInfo.isUpcoming
                  ? "bg-amber-100 text-amber-700"
                  : nextInfo.label === "Active today"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-neutral-100 text-neutral-600"
              )}
            >
              {nextInfo.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl w-40 p-1">
            <DropdownMenuItem
              onClick={() => onEdit(template.id)}
              className="gap-2 text-xs cursor-pointer rounded-lg"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Goal
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(template.id)}
              className="gap-2 text-xs cursor-pointer rounded-lg text-red-600 focus:text-red-700 focus:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Goal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
