"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Clock,
  FolderKanban,
  Plus,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Clock3,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TeamPerformanceView } from "@/components/team-performance-view";
import { TodayGoalsSection } from "@/components/today-goals-section";

type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  projectName: string;
  priority?: string;
  assignees?: { id: string; name: string; avatarUrl?: string }[];
  commentCount?: number;
};

type ProjectRow = {
  id: string;
  clientId: string;
  name: string;
  clientName: string;
  status: string;
  progressPct: number;
  tasksDone: number;
  tasksTotal: number;
};

type EmployeeDashboardProps = {
  userName: string;
  userEmail: string;
  assignedTasks: Task[];
  assignedProjectsCount: number;
  projectRows: ProjectRow[];
  casualBalance: number;
  casualTotal: number;
  sickBalance: number;
  sickTotal: number;
  employees: { id: string; name: string; email: string; avatarUrl?: string }[];
};

export function EmployeeDashboardPremium({
  userName,
  userEmail,
  assignedTasks: initialTasks,
  assignedProjectsCount,
  projectRows,
  casualBalance,
  casualTotal,
  sickBalance,
  sickTotal,
  employees,
}: EmployeeDashboardProps) {
  // Dynamic Date
  const [currentDateString, setCurrentDateString] = useState("");
  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    setCurrentDateString(new Date().toLocaleDateString("en-US", options));
  }, []);

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const overdueTasksCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done"
  ).length;

  async function handleToggleTaskStatus(task: Task) {
    const newStatus = task.status === "done" ? "in_progress" : "done";
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      toast.success(newStatus === "done" ? "Task completed!" : "Task reopened");
    } catch {
      toast.error("Failed to update task status");
    }
  }

  // Attendance & Time Logic
  const [attendance, setAttendance] = useState<{ checkInAt?: string; checkOutAt?: string; id?: string } | null>(null);
  const [attLoading, setAttLoading] = useState(true);
  const [submittingAtt, setSubmittingAtt] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  async function loadAttendance() {
    setAttLoading(true);
    try {
      const res = await fetch("/api/attendance");
      if (res.ok) {
        const data = await res.json();
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayRecord = (data.attendance || []).find(
          (r: any) => new Date(r.date).toISOString().slice(0, 10) === todayStr
        );
        setAttendance(todayRecord || null);
      }
    } catch {
      // Ignore errors
    } finally {
      setAttLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, []);

  // Stopwatch timer
  useEffect(() => {
    if (!attendance?.checkInAt || attendance?.checkOutAt) {
      setElapsedTime("00:00:00");
      return;
    }
    const checkInTime = new Date(attendance.checkInAt).getTime();
    const interval = setInterval(() => {
      const diff = Date.now() - checkInTime;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsedTime(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [attendance]);

  async function handleAttendanceAction() {
    setSubmittingAtt(true);
    const nowIso = new Date().toISOString();
    const isCheckIn = !attendance?.checkInAt;
    try {
      let res;
      if (isCheckIn) {
        res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: new Date().toISOString().slice(0, 10),
            status: "present",
            checkInAt: nowIso,
          }),
        });
      } else {
        res = await fetch(`/api/attendance/${attendance?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkOutAt: nowIso,
          }),
        });
      }
      if (res.ok) {
        toast.success(isCheckIn ? "Checked In successfully" : "Checked Out successfully");
        loadAttendance();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to submit attendance");
      }
    } catch {
      toast.error("Failed to submit attendance");
    } finally {
      setSubmittingAtt(false);
    }
  }

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Leave totals
  const totalLeaveBalance = casualBalance + sickBalance;
  const totalLeaveTotal = casualTotal + sickTotal;

  return (
    <div className="space-y-6">
      {/* ─── Header Gradient Card ─── */}
      <div className="relative rounded-3xl p-8 bg-gradient-to-r from-[#FFF5ED] via-[#FFF2FE] to-[#F1F3FF] border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-200/20 to-pink-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
              {currentDateString || "Today"}
            </span>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-800 flex items-center gap-2">
              {getGreeting()}, {userName || "Team Member"} 👋
            </h1>
            <p className="text-sm text-neutral-600 font-medium">
              {overdueTasksCount > 0
                ? `You have ${overdueTasksCount} overdue task${overdueTasksCount > 1 ? "s" : ""} and ${tasks.filter(t => t.status !== "done").length} total pending.`
                : tasks.filter(t => t.status !== "done").length > 0
                  ? `You have ${tasks.filter(t => t.status !== "done").length} pending task${tasks.filter(t => t.status !== "done").length > 1 ? "s" : ""} today.`
                  : "All caught up! No pending tasks."
              }
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 bg-white/40 p-2 rounded-2xl border border-white/50 backdrop-blur-md">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                loadAttendance();
                toast.success("Dashboard refreshed");
              }}
              className="h-10 w-10 rounded-xl bg-white border-neutral-100 hover:bg-neutral-50"
            >
              <RefreshCw className="h-4.5 w-4.5 text-neutral-500" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Team Members ─── */}
      {employees.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Team</span>
          <div className="flex -space-x-2">
            {employees.slice(0, 8).map((e) => (
              <div key={e.id} className="relative" title={e.name}>
                <Avatar className="h-7 w-7 border-2 border-white">
                  {e.avatarUrl && <AvatarImage src={e.avatarUrl} alt={e.name} />}
                  <AvatarFallback className="text-[9px] bg-indigo-500 text-white font-bold">
                    {e.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            ))}
            {employees.length > 8 && (
              <Link href="/dashboard/people">
                <div className="h-7 w-7 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-neutral-600 hover:bg-neutral-200 transition-colors cursor-pointer">
                  +{employees.length - 8}
                </div>
              </Link>
            )}
          </div>
          <Link href="/dashboard/people" className="text-[11px] text-indigo-600 font-semibold hover:underline ml-auto">
            View all →
          </Link>
        </div>
      )}

      {/* ─── Today's Goals Section ─── */}
      <div className="rounded-3xl border border-neutral-150/60 shadow-sm bg-white p-6">
        <TodayGoalsSection isAdmin={false} onCreateGoal={() => {}} />
      </div>

      {/* ─── Team Performance Dashboard Section ─── */}
      <div className="rounded-3xl border border-neutral-150/60 shadow-sm bg-white p-6">
        <TeamPerformanceView />
      </div>

      {/* ─── 2 Column Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Column */}
        <div className="space-y-6">
          {/* Your Tasks Card */}
          <Card className="rounded-3xl border border-neutral-150/60 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
                    <Clock3 className="h-4.5 w-4.5 text-neutral-500" />
                    Your tasks
                  </h3>
                  <p className="text-xs text-muted-foreground">{tasks.filter(t => t.status !== "done").length} pending tasks</p>
                </div>
                <Link href="/dashboard/todo">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-neutral-50">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No tasks assigned to you.</p>
                ) : (
                  tasks.slice(0, 5).map((task) => {
                    const isDone = task.status === "done";
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-start gap-3 p-3.5 rounded-2xl border transition-all duration-200",
                          isDone ? "bg-neutral-50/60 border-neutral-100 opacity-60" :
                          isOverdue ? "bg-red-50/30 border-red-100" : "bg-white border-neutral-100 hover:border-neutral-200"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => handleToggleTaskStatus(task)}
                          className="mt-1 h-4.5 w-4.5 rounded-md border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs font-semibold text-neutral-800 truncate", isDone && "line-through text-neutral-400")}>
                            {task.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {task.priority && (
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                                task.priority === "high" ? "bg-red-55 text-red-700" :
                                task.priority === "medium" ? "bg-amber-50 text-amber-700" :
                                "bg-emerald-50 text-emerald-700"
                              )}>
                                {task.priority.toUpperCase()}
                              </span>
                            )}
                            {task.projectName && (
                              <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[9px] font-bold truncate max-w-[80px]">
                                {task.projectName}
                              </span>
                            )}
                            {isOverdue && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-600 bg-red-100/50 px-1.5 py-0.5 rounded-full">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Overdue
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href="/dashboard/todo">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-neutral-400 hover:text-neutral-700">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>

              {tasks.length > 5 && (
                <Link href="/dashboard/todo" className="block text-center text-xs font-semibold text-indigo-600 hover:underline pt-2">
                  View all {tasks.length} tasks →
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Projects in progress */}
          <Card className="rounded-3xl border border-neutral-150/60 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
                    <FolderKanban className="h-4.5 w-4.5 text-neutral-500" />
                    Projects in progress
                  </h3>
                  <p className="text-xs text-muted-foreground">{assignedProjectsCount} projects active</p>
                </div>
                <Link href="/dashboard/projects">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-neutral-50">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {projectRows.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No projects assigned.</p>
                ) : (
                  projectRows.slice(0, 4).map((p) => (
                    <Link key={p.id} href={`/dashboard/projects`}>
                      <div className="p-4 rounded-2xl border border-neutral-100 bg-white hover:border-neutral-200 transition-all group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                              <FolderKanban className="h-4.5 w-4.5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-neutral-800 truncate">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{p.clientName}</p>
                            </div>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0",
                            p.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                            p.status === "maintenance" ? "bg-blue-50 text-blue-700" :
                            "bg-amber-50 text-amber-700"
                          )}>
                            {p.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        
                        <div className="mt-3.5 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-neutral-500">
                            <span>Task Progress ({p.tasksDone}/{p.tasksTotal})</span>
                            <span className="font-semibold">{p.progressPct}%</span>
                          </div>
                          <Progress value={p.progressPct} className="h-1 bg-neutral-100" />
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Clock In / Out */}
          <Card className="rounded-3xl border border-neutral-150/60 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span className="flex items-center gap-1 font-medium">
                  Clock in: <strong className="text-neutral-700">{attendance?.checkInAt ? new Date(attendance.checkInAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</strong>
                </span>
                <span className="flex items-center gap-1 font-medium">
                  Clock out: <strong className="text-neutral-700">{attendance?.checkOutAt ? new Date(attendance.checkOutAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</strong>
                </span>
              </div>

              <div className="text-center py-3">
                <p className="text-3xl font-extrabold tracking-wider font-mono text-indigo-900 animate-pulse">
                  {elapsedTime}
                </p>
                <p className="text-[11px] text-neutral-500 mt-1">Elapsed Shift Time</p>
              </div>

              <Button
                onClick={handleAttendanceAction}
                disabled={submittingAtt || !!attendance?.checkOutAt}
                className={cn(
                  "w-full h-11 rounded-2xl font-semibold shadow-sm transition-all duration-200",
                  attendance?.checkInAt && !attendance?.checkOutAt
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : attendance?.checkOutAt
                      ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                )}
              >
                {submittingAtt ? "Processing..." : attendance?.checkOutAt ? "Shift completed ✓" : attendance?.checkInAt ? "Clock out" : "Clock in"}
              </Button>
            </CardContent>
          </Card>

          {/* Leave Balances Dials */}
          <Card className="rounded-3xl border border-neutral-150/60 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-800">Leave balances</h3>
                <Link href="/dashboard/attendance">
                  <Button variant="ghost" size="sm" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                    Apply leave
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                {/* Casual Leave */}
                <div className="space-y-1.5 flex flex-col items-center">
                  <div className="relative h-14 w-14 flex items-center justify-center">
                    <svg className="absolute h-full w-full transform -rotate-90">
                      <circle cx="28" cy="28" r="22" className="stroke-neutral-100 fill-none" strokeWidth="4" />
                      <circle cx="28" cy="28" r="22" className="stroke-indigo-600 fill-none" strokeWidth="4" strokeDasharray="138" strokeDashoffset={138 - (138 * casualBalance) / Math.max(1, casualTotal)} />
                    </svg>
                    <span className="text-[11px] font-extrabold text-indigo-950 leading-none">{casualBalance}d</span>
                  </div>
                  <span className="text-[10px] font-semibold text-neutral-600">Casual ({casualBalance}/{casualTotal})</span>
                </div>
                {/* Sick Leave */}
                <div className="space-y-1.5 flex flex-col items-center">
                  <div className="relative h-14 w-14 flex items-center justify-center">
                    <svg className="absolute h-full w-full transform -rotate-90">
                      <circle cx="28" cy="28" r="22" className="stroke-neutral-100 fill-none" strokeWidth="4" />
                      <circle cx="28" cy="28" r="22" className="stroke-purple-600 fill-none" strokeWidth="4" strokeDasharray="138" strokeDashoffset={138 - (138 * sickBalance) / Math.max(1, sickTotal)} />
                    </svg>
                    <span className="text-[11px] font-extrabold text-purple-950 leading-none">{sickBalance}d</span>
                  </div>
                  <span className="text-[10px] font-semibold text-neutral-600">Sick ({sickBalance}/{sickTotal})</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* ─── Task Overview Section ─── */}
      <EmployeeTaskOverview />
    </div>
  );
}

// ─── Inline Task Overview Component ───
function EmployeeTaskOverview() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [overview, setOverview] = useState<{
    counts: { total: number; done: number; inProgress: number; todo: number; backlog: number; overdue: number };
    recentTasks: { id: string; title: string; status: string; priority: string; dueDate: string | null; type: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tasks/my-overview?month=${selectedMonth}`)
      .then((r) => r.json())
      .then((data) => {
        setOverview(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedMonth]);

  // Generate months list (last 12)
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function monthLabel(m: string) {
    const [y, mo] = m.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  }

  const statusColor: Record<string, string> = {
    done: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    todo: "bg-amber-100 text-amber-800",
    backlog: "bg-neutral-100 text-neutral-700",
    hold: "bg-orange-100 text-orange-800",
    in_review: "bg-purple-100 text-purple-800",
    rejected: "bg-red-100 text-red-700",
  };

  const priorityColor: Record<string, string> = {
    low: "bg-emerald-50 text-emerald-700",
    medium: "bg-amber-50 text-amber-700",
    high: "bg-red-50 text-red-700",
    urgent: "bg-red-100 text-red-900 font-bold",
  };

  return (
    <Card className="rounded-3xl border border-neutral-150/60 shadow-sm overflow-hidden bg-white mt-6">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
              <FolderKanban className="h-4 w-4 text-neutral-500" />
              Task Overview
            </h3>
            <p className="text-xs text-muted-foreground">Monthly breakdown of your tasks</p>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs h-8 rounded-xl border border-neutral-200 bg-white px-3 focus:outline-none focus:ring-1 focus:ring-primary/20"
          >
            {months.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : overview ? (
          <>
            {/* Count pills */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: "Total", value: overview.counts.total, color: "bg-neutral-50 border-neutral-200 text-neutral-800" },
                { label: "Done", value: overview.counts.done, color: "bg-green-50 border-green-200 text-green-800" },
                { label: "In Progress", value: overview.counts.inProgress, color: "bg-blue-50 border-blue-200 text-blue-800" },
                { label: "To Do", value: overview.counts.todo, color: "bg-amber-50 border-amber-200 text-amber-800" },
                { label: "Backlog", value: overview.counts.backlog, color: "bg-slate-50 border-slate-200 text-slate-700" },
                { label: "Overdue", value: overview.counts.overdue, color: "bg-red-50 border-red-200 text-red-800" },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-2xl border p-3 flex flex-col items-center gap-0.5 ${color}`}>
                  <span className="text-xl font-bold leading-none">{value}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {overview.counts.total > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                  <span>Completion</span>
                  <span>{Math.round((overview.counts.done / overview.counts.total) * 100)}%</span>
                </div>
                <Progress value={Math.round((overview.counts.done / overview.counts.total) * 100)} className="h-2 rounded-full" />
              </div>
            )}

            {/* Recent Tasks */}
            {overview.recentTasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-neutral-700">Recent Tasks</p>
                <div className="space-y-2">
                  {overview.recentTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                      <span className="text-xs font-medium text-neutral-800 truncate flex-1">{t.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${priorityColor[t.priority] || "bg-neutral-100 text-neutral-600"}`}>
                          {t.priority?.toUpperCase()}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${statusColor[t.status] || "bg-neutral-100 text-neutral-600"}`}>
                          {t.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">No task data available for this period.</p>
        )}
      </CardContent>
    </Card>
  );
}
