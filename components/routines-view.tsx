"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  RefreshCw,
  Plus,
  RotateCcw,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EditRoutineModal } from "@/components/edit-routine-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Routine = {
  id: string;
  groupId?: string | null;
  title: string;
  description?: string;
  frequency: "daily" | "weekly";
  workingDays: number[];
  dueTime?: string;
  streak: number;
  completedToday: boolean;
  isWorkingDay: boolean;
  status: string;
  owner: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    title?: string;
  } | null;
};

type RoutinesViewProps = {
  isAdmin: boolean;
  onCreateRoutine?: () => void;
  filterOwnerId?: string;
};

export function RoutinesView({ isAdmin, onCreateRoutine, filterOwnerId }: RoutinesViewProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  // Edit Routine Modal
  const [editRoutineId, setEditRoutineId] = useState<string | null>(null);
  const [editRoutineModalOpen, setEditRoutineModalOpen] = useState(false);

  // Delete Routine Dialog
  const [deleteRoutineTargetId, setDeleteRoutineTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter: all, pending, completed
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterOwnerId
        ? `/api/routines?ownerId=${encodeURIComponent(filterOwnerId)}`
        : "/api/routines";
      const res = await fetch(url);
      if (res.ok) {
        const rData = await res.json();
        setRoutines(rData.routines || []);
      } else {
        toast.error("Failed to load routines");
      }
    } catch {
      toast.error("Failed to load routines");
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

  async function executeDeleteRoutine() {
    if (!deleteRoutineTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/routines/${deleteRoutineTargetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Routine deleted successfully");
      setDeleteRoutineTargetId(null);
      load();
    } catch {
      toast.error("Failed to delete routine");
    } finally {
      setDeleting(false);
    }
  }

  function handleDeleteRoutine(routineId: string) {
    setDeleteRoutineTargetId(routineId);
  }

  async function handleComplete(id: string) {
    setCompleting(id);
    try {
      const res = await fetch(`/api/routines/${id}/complete`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to complete routine");
        return;
      }
      toast.success("Routine marked complete! 🔥");
      setRoutines((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, completedToday: true, streak: data.streak ?? (r.streak + 1) } : r
        )
      );
    } catch {
      toast.error("Failed to complete routine");
    } finally {
      setCompleting(null);
    }
  }

  // Filter routines by working day
  const todayRoutines = routines.filter((r) => r.isWorkingDay);
  const completed = todayRoutines.filter((r) => r.completedToday);
  const pending = todayRoutines.filter((r) => !r.completedToday);

  // Filter according to status filter
  const displayedRoutines = todayRoutines.filter((r) => {
    if (statusFilter === "completed") return r.completedToday;
    if (statusFilter === "pending") return !r.completedToday;
    return true;
  });

  const totalCount = todayRoutines.length;
  const doneCount = completed.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-3 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl border bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Delete Routine Dialog */}
      <ConfirmDialog
        open={!!deleteRoutineTargetId}
        onOpenChange={(open) => { if (!open) setDeleteRoutineTargetId(null); }}
        title="Delete Routine?"
        description="Are you sure you want to delete this routine? This action cannot be undone."
        confirmLabel={deleting ? "Deleting..." : "Delete Routine"}
        variant="destructive"
        isLoading={deleting}
        onConfirm={executeDeleteRoutine}
      />

      {/* Edit Routine Modal */}
      <EditRoutineModal
        open={editRoutineModalOpen}
        onClose={() => {
          setEditRoutineModalOpen(false);
          setEditRoutineId(null);
        }}
        routineId={editRoutineId}
        employees={employees}
        onUpdated={load}
        onDeleted={load}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-orange-600" />
            Daily Routines &amp; Job Responsibilities
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Recurring checklist routines scheduled for today across team members.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-filters */}
          <div className="flex items-center rounded-xl bg-neutral-100 p-1 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all",
                statusFilter === "all"
                  ? "bg-white text-neutral-900 shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-800"
              )}
            >
              All ({todayRoutines.length})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all",
                statusFilter === "pending"
                  ? "bg-white text-amber-700 shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-800"
              )}
            >
              Pending ({pending.length})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all",
                statusFilter === "completed"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-800"
              )}
            >
              Done ({completed.length})
            </button>
          </div>

          <button
            onClick={load}
            className="h-8 w-8 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
            title="Refresh Routines"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          {isAdmin && onCreateRoutine && (
            <Button
              size="sm"
              className="h-8 rounded-xl gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white shadow-xs"
              onClick={onCreateRoutine}
            >
              <Plus className="h-3.5 w-3.5" />
              New Routine
            </Button>
          )}
        </div>
      </div>

      {/* Progress banner */}
      {totalCount > 0 && (
        <div className="p-4 rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-50/60 via-amber-50/30 to-emerald-50/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-orange-600" />
              Today's Routine Completion
            </span>
            <span className="text-xs font-mono font-bold text-neutral-700">
              {doneCount} of {totalCount} Completed ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/80 overflow-hidden border border-orange-200/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Recurring Routine Checklist Cards */}
      {todayRoutines.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50">
          <RotateCcw className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-neutral-700">No checklist routines scheduled for today</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Routines matching today's working schedule will appear here.
          </p>
          {isAdmin && onCreateRoutine && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-8 rounded-xl text-xs text-orange-700 border-orange-200 hover:bg-orange-50"
              onClick={onCreateRoutine}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create First Routine
            </Button>
          )}
        </div>
      ) : displayedRoutines.length === 0 ? (
        <div className="text-center py-8 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/30">
          <p className="text-xs text-neutral-500">No routines match the selected filter ({statusFilter}).</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {Object.values(
            displayedRoutines.reduce<
              Record<
                string,
                {
                  key: string;
                  title: string;
                  description?: string;
                  dueTime?: string;
                  workingDays: number[];
                  frequency: string;
                  items: Routine[];
                }
              >
            >((acc, r) => {
              const key = r.groupId || `${r.title}_${r.dueTime || ""}_${r.workingDays.join(",")}`;
              if (!acc[key]) {
                acc[key] = {
                  key,
                  title: r.title,
                  description: r.description,
                  dueTime: r.dueTime,
                  workingDays: r.workingDays,
                  frequency: r.frequency,
                  items: [],
                };
              }
              acc[key].items.push(r);
              return acc;
            }, {})
          ).map((group) => {
            const groupCompletedCount = group.items.filter((r) => r.completedToday).length;
            const isAllCompleted = groupCompletedCount === group.items.length;

            return (
              <div
                key={group.key}
                className={cn(
                  "rounded-2xl border bg-white shadow-2xs overflow-hidden transition-all",
                  isAllCompleted
                    ? "border-emerald-200 bg-emerald-50/10"
                    : "border-neutral-200 hover:border-neutral-300"
                )}
              >
                {/* Parent Routine Header */}
                <div className="p-3.5 border-b border-neutral-100 flex items-center justify-between gap-3 bg-neutral-50/50">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-neutral-900 truncate">
                        {group.title}
                      </span>
                      {group.dueTime && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md font-semibold">
                          <Clock className="h-2.5 w-2.5" /> Due {group.dueTime}
                        </span>
                      )}
                      {group.items.length > 1 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                          {group.items.length} Assignees
                        </span>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-[11px] text-neutral-500 truncate">
                        {group.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                        isAllCompleted
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-neutral-100 text-neutral-600 border-neutral-200"
                      )}
                    >
                      {groupCompletedCount}/{group.items.length} Checked Off
                    </span>
                  </div>
                </div>

                {/* Child Assignee Checklists */}
                <div className="p-2 space-y-1 divide-y divide-neutral-100">
                  {group.items.map((routine) => (
                    <div
                      key={routine.id}
                      className={cn(
                        "flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all",
                        routine.completedToday
                          ? "bg-emerald-50/20 text-neutral-400"
                          : "hover:bg-neutral-50 text-neutral-800"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Complete Button */}
                        <button
                          onClick={
                            routine.completedToday
                              ? undefined
                              : () => handleComplete(routine.id)
                          }
                          disabled={routine.completedToday || completing === routine.id}
                          className={cn(
                            "h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                            routine.completedToday
                              ? "border-emerald-500 bg-emerald-500 text-white cursor-default"
                              : "border-neutral-300 hover:border-emerald-500 hover:bg-emerald-50 text-neutral-400 hover:text-emerald-600"
                          )}
                        >
                          {completing === routine.id ? (
                            <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          ) : routine.completedToday ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {/* Owner Avatar & Name */}
                        <div className="flex items-center gap-2 min-w-0">
                          {routine.owner?.avatarUrl ? (
                            <img
                              src={routine.owner.avatarUrl}
                              alt={routine.owner.name}
                              className="h-6 w-6 rounded-full object-cover shrink-0 border border-neutral-200"
                            />
                          ) : (
                            <span className="h-6 w-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-[9px] shrink-0">
                              {(routine.owner?.name || "?").slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "text-xs font-semibold truncate",
                                routine.completedToday
                                  ? "line-through text-neutral-400"
                                  : "text-neutral-800"
                              )}
                            >
                              {routine.owner?.name || "Assignee"}
                            </p>
                            {routine.owner?.title && (
                              <p className="text-[10px] text-neutral-400 truncate">
                                {routine.owner.title}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* Streak Badge */}
                        <span
                          className="flex items-center gap-0.5 text-xs font-bold text-orange-600 font-mono bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100"
                          title={`${routine.streak || 0} days streak`}
                        >
                          <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
                          {routine.streak || 0}
                        </span>

                        {/* Status Label */}
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-md",
                            routine.completedToday
                              ? "text-emerald-700 bg-emerald-50"
                              : "text-neutral-500 bg-neutral-100"
                          )}
                        >
                          {routine.completedToday ? "Done" : "Pending"}
                        </span>

                        {/* Action Menu (Admin & Owner) */}
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="h-6 w-6 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl w-36 p-1">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditRoutineId(routine.id);
                                  setEditRoutineModalOpen(true);
                                }}
                                className="gap-2 text-xs cursor-pointer rounded-lg text-neutral-700"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit Routine
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteRoutine(routine.id)}
                                className="gap-2 text-xs cursor-pointer rounded-lg text-red-600 focus:text-red-700 focus:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Routine
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
