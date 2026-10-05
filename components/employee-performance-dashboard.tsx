"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  TrendingUp,
  CalendarDays,
  Home,
  Activity,
  BarChart3,
  ListChecks,
  Target,
} from "lucide-react";

interface TaskStats {
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
  highPriority: number;
  completionRate: number;
}

interface LeaveData {
  casualUsed: number;
  casualTotal: number;
  casualBalance: number;
  sickUsed: number;
  sickTotal: number;
  sickBalance: number;
  unpaidLeave: number;
}

interface WfhData {
  usedThisMonth: number;
  allowedPerMonth: number;
  remainingThisMonth: number;
  history: { month: string; count: number }[];
}

interface RecentTask {
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string | null;
}

interface PerformanceData {
  tasks: {
    allTime: TaskStats;
    thisMonth: TaskStats;
    recent: RecentTask[];
  };
  leaves: LeaveData;
  wfh: WfhData;
}

const STATUS_COLORS: Record<string, string> = {
  done: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  todo: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  backlog: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  hold: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  code_review: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  qa: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  staging: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  production: "bg-green-500/10 text-green-600 border-green-500/20",
  in_review: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-600 border-red-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

function ProgressBar({
  value,
  max,
  colorClass = "bg-primary",
}: {
  value: number;
  max: number;
  colorClass?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border p-4 flex items-start gap-3 bg-card">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
          {label}
        </p>
        <p className="text-2xl font-black leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatMonth(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

export function EmployeePerformanceDashboard({
  employeeId,
}: {
  employeeId: string;
}) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/employees/${employeeId}/performance`)
      .then(async (res) => {
        const json = await res.json();
        if (!cancelled) {
          if (res.ok) setData(json);
          else setError(json.message || "Failed to load performance data");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Network error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Activity className="h-8 w-8 animate-pulse" />
          <p className="text-sm">Loading performance data…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-destructive">{error || "No data"}</p>
      </div>
    );
  }

  const { tasks, leaves, wfh } = data;
  const wfhPct =
    wfh.allowedPerMonth > 0
      ? Math.min(100, Math.round((wfh.usedThisMonth / wfh.allowedPerMonth) * 100))
      : 0;
  const maxWfh = Math.max(...wfh.history.map((h) => h.count), wfh.allowedPerMonth, 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">Performance Overview</h3>
      </div>

      {/* ─── Goal / KPI Performance ─── */}
      <Card className="shadow-sm border-violet-100 bg-violet-50/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-600" /> Goal &amp; KPI Performance
          </CardTitle>
          <CardDescription>Daily recurring targets vs actual achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <GoalPerformanceSubSection employeeId={employeeId} />
        </CardContent>
      </Card>

      {/* ─── Task Performance ─── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" /> Task Performance
          </CardTitle>
          <CardDescription>All-time and current month task metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* This Month */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              This Month
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard
                icon={<BarChart3 className="h-5 w-5 text-primary" />}
                label="Total"
                value={tasks.thisMonth.total}
              />
              <StatCard
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                label="Done"
                value={tasks.thisMonth.done}
              />
              <StatCard
                icon={<Clock className="h-5 w-5 text-blue-500" />}
                label="In Progress"
                value={tasks.thisMonth.inProgress}
              />
              <StatCard
                icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                label="Overdue"
                value={tasks.thisMonth.overdue}
              />
              <StatCard
                icon={<Flame className="h-5 w-5 text-orange-500" />}
                label="High Priority"
                value={tasks.thisMonth.highPriority}
              />
              <StatCard
                icon={<TrendingUp className="h-5 w-5 text-violet-500" />}
                label="Completion"
                value={`${tasks.thisMonth.completionRate}%`}
              />
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Completion rate</span>
                <span className="font-semibold">{tasks.thisMonth.completionRate}%</span>
              </div>
              <ProgressBar
                value={tasks.thisMonth.completionRate}
                max={100}
                colorClass={
                  tasks.thisMonth.completionRate >= 75
                    ? "bg-emerald-500"
                    : tasks.thisMonth.completionRate >= 50
                      ? "bg-amber-500"
                      : "bg-red-500"
                }
              />
            </div>
          </div>

          {/* All Time */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              All Time
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {[
                { label: "Total Tasks", value: tasks.allTime.total },
                { label: "Completed", value: tasks.allTime.done },
                { label: "Overdue", value: tasks.allTime.overdue },
                { label: "High Priority", value: tasks.allTime.highPriority },
                { label: "Completion Rate", value: `${tasks.allTime.completionRate}%` },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="font-bold text-base">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Leave Summary ─── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" /> Leave Summary
          </CardTitle>
          <CardDescription>Current financial year leave usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Casual */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Casual Leave</span>
                <span className="text-muted-foreground">
                  {leaves.casualUsed} / {leaves.casualTotal} used
                </span>
              </div>
              <ProgressBar
                value={leaves.casualUsed}
                max={leaves.casualTotal || 1}
                colorClass="bg-sky-500"
              />
              <p className="text-xs text-muted-foreground">{leaves.casualBalance} remaining</p>
            </div>
            {/* Sick */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Sick Leave</span>
                <span className="text-muted-foreground">
                  {leaves.sickUsed} / {leaves.sickTotal} used
                </span>
              </div>
              <ProgressBar
                value={leaves.sickUsed}
                max={leaves.sickTotal || 1}
                colorClass="bg-amber-500"
              />
              <p className="text-xs text-muted-foreground">{leaves.sickBalance} remaining</p>
            </div>
            {/* Unpaid */}
            <div className="rounded-xl border px-4 py-3 bg-muted/30 flex flex-col gap-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Unpaid Leaves Taken
              </p>
              <p className="text-2xl font-black">{leaves.unpaidLeave}</p>
              <p className="text-xs text-muted-foreground">days this year</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── WFH Usage ─── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" /> Work From Home
          </CardTitle>
          <CardDescription>Monthly WFH quota and usage history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Current month */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">This Month</span>
                <span className="text-muted-foreground">
                  {wfh.usedThisMonth} / {wfh.allowedPerMonth} days used
                </span>
              </div>
              <ProgressBar
                value={wfh.usedThisMonth}
                max={wfh.allowedPerMonth || 1}
                colorClass={
                  wfhPct >= 100
                    ? "bg-red-500"
                    : wfhPct >= 75
                      ? "bg-amber-500"
                      : "bg-indigo-500"
                }
              />
              <p className="text-xs text-muted-foreground">
                {wfh.remainingThisMonth > 0
                  ? `${wfh.remainingThisMonth} WFH day${wfh.remainingThisMonth > 1 ? "s" : ""} remaining this month`
                  : "WFH quota for this month is exhausted"}
              </p>
            </div>
            <div className="shrink-0 rounded-xl border px-5 py-3 bg-muted/30 text-center min-w-[110px]">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Quota
              </p>
              <p className="text-3xl font-black text-primary">{wfh.allowedPerMonth}</p>
              <p className="text-xs text-muted-foreground">days / month</p>
            </div>
          </div>

          {/* WFH bar chart ~ last 6 months */}
          {wfh.history.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Last 6 Months
              </p>
              <div className="flex items-end gap-2 h-24">
                {wfh.history.map((h) => {
                  const barPct = maxWfh > 0 ? (h.count / maxWfh) * 100 : 0;
                  return (
                    <div
                      key={h.month}
                      className="flex flex-col items-center gap-1 flex-1"
                    >
                      <span className="text-xs font-semibold text-muted-foreground">
                        {h.count}
                      </span>
                      <div
                        className="w-full flex items-end justify-center"
                        style={{ height: "64px" }}
                      >
                        <div
                          className="w-full rounded-t-md bg-indigo-500/70 transition-all duration-700"
                          style={{ height: `${Math.max(4, barPct)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center">
                        {formatMonth(h.month)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Recent Tasks ─── */}
      {tasks.recent.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" /> Recent Tasks
            </CardTitle>
            <CardDescription>Last 20 assigned tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Priority</th>
                    <th className="py-2 pr-3">Due</th>
                    <th className="py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.recent.map((t, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td
                        className="py-2 pr-3 max-w-[220px] truncate font-medium"
                        title={t.title}
                      >
                        {t.title}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge
                          variant="outline"
                          className={`capitalize text-[10px] px-2 py-0.5 ${STATUS_COLORS[t.status] || ""
                            }`}
                        >
                          {t.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge
                          variant="outline"
                          className={`capitalize text-[10px] px-2 py-0.5 ${PRIORITY_COLORS[t.priority] || ""
                            }`}
                        >
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                        {t.dueDate || "~"}
                      </td>
                      <td className="py-2 text-muted-foreground whitespace-nowrap">
                        {t.createdAt || "~"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GoalPerformanceSubSection({ employeeId }: { employeeId: string }) {
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/goal-instances?ownerId=${employeeId}&range=today&ensureToday=1`)
      .then((res) => (res.ok ? res.json() : { instances: [] }))
      .then((data) => setInstances(data.instances || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) {
    return <div className="py-4 text-xs text-muted-foreground animate-pulse">Loading goals…</div>;
  }

  if (instances.length === 0) {
    return (
      <div className="py-4 text-xs text-muted-foreground text-center">
        No active daily goals assigned for today.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {instances.map((inst) => (
        <div key={inst.id} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{inst.template?.title || "Goal"}</h4>
            <span className={`text-sm font-black ${inst.overallScore >= 90 ? "text-emerald-600" : inst.overallScore >= 75 ? "text-emerald-500" : inst.overallScore >= 60 ? "text-amber-500" : "text-red-500"}`}>
              {inst.overallScore}%
            </span>
          </div>

          <div className="space-y-2">
            {inst.results?.map((r: any) => (
              <div key={r.metricId} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{r.metricName}</span>
                <span className="font-mono font-semibold">
                  {r.actual} / {r.target} {r.unit} ({r.achievement}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

