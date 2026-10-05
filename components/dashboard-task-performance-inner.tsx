"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Loader2,
  Trophy,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type StatusCounts = {
  total: number;
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
  overdue: number;
};

type EmployeePerf = {
  id: string;
  name: string;
  email: string;
  completed: number;
  overdue: number;
  total: number;
  completionRate: number;
};

type PerformanceData = {
  statusCounts: StatusCounts;
  byPriority: { low: number; medium: number; high: number; urgent: number };
  leaderboard: EmployeePerf[];
  overdueLeaderboard: EmployeePerf[];
};

const PIE_COLORS = [
  { key: "todo", label: "To Do", color: "#94a3b8" },
  { key: "inProgress", label: "In Progress", color: "#3b82f6" },
  { key: "inReview", label: "In Review", color: "#f59e0b" },
  { key: "done", label: "Completed", color: "#10b981" },
];

const RADIAN = Math.PI / 180;

function renderCustomizedLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function DashboardTaskPerformanceInner() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks/performance", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground min-h-[200px] flex items-center justify-center">
        Unable to load task performance data.
      </div>
    );
  }

  const { statusCounts, leaderboard, overdueLeaderboard } = data;

  const pieData = PIE_COLORS.map((c) => ({
    name: c.label,
    value: (statusCounts as any)[c.key] || 0,
    color: c.color,
  })).filter((d) => d.value > 0);

  const topPerformer = leaderboard[0] || null;

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      {/* Left: Pie Chart + Status Summary */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Task Overview</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {statusCounts.total} total tasks across all projects
        </p>

        {statusCounts.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <ClipboardList className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">No tasks yet</p>
          </div>
        ) : (
          <>
            <div className="h-[220px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={90}
                    innerRadius={45}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e5e5e5",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                    formatter={(value, name) => [`${value} tasks`, name]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Status number cards */}
            <div className="grid grid-cols-5 gap-2 mt-4">
              <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-lg font-bold tabular-nums text-slate-600">{statusCounts.todo}</p>
                <p className="text-[10px] text-muted-foreground font-medium">To Do</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-lg font-bold tabular-nums text-blue-600">{statusCounts.inProgress}</p>
                <p className="text-[10px] text-muted-foreground font-medium">In Progress</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-lg font-bold tabular-nums text-amber-600">{statusCounts.inReview}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Review</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-lg font-bold tabular-nums text-emerald-600">{statusCounts.done}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Done</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50 border border-red-100">
                <p className="text-lg font-bold tabular-nums text-red-600">{statusCounts.overdue}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Overdue</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right: Performance Overview */}
      <div className="rounded-xl border bg-card p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Performance Overview</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Team productivity & task completion
        </p>

        {/* Top performer card */}
        {topPerformer && (
          <div className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10 border-2 border-amber-300">
                  <AvatarFallback className="text-sm bg-amber-200 text-amber-800 font-bold">
                    {topPerformer.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Trophy className="h-4 w-4 text-amber-500 absolute -top-1 -right-1" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{topPerformer.name}</p>
                <p className="text-[11px] text-muted-foreground">Top performer this period</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-emerald-600 tabular-nums">{topPerformer.completed}</p>
                <p className="text-[10px] text-muted-foreground">completed</p>
              </div>
            </div>
          </div>
        )}

        {/* Most completed leaderboard */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Most Completed</span>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No completed tasks yet.</p>
          ) : (
            <div className="space-y-1.5">
              {leaderboard.slice(0, 5).map((emp, i) => (
                <div key={emp.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className={cn(
                    "text-xs font-bold w-5 text-center shrink-0 tabular-nums",
                    i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[9px] bg-neutral-200 text-neutral-700">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1 min-w-0">{emp.name}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-semibold text-emerald-600 tabular-nums">{emp.completed}</span>
                    <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${emp.completionRate}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{emp.completionRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue leaderboard */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Overdue Tasks</span>
          </div>
          {overdueLeaderboard.length === 0 ? (
            <div className="flex items-center gap-2 py-3 px-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="text-xs text-emerald-700 font-medium">No overdue tasks ~ great work!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {overdueLeaderboard.slice(0, 5).map((emp) => (
                <div key={emp.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-red-50/50 transition-colors">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[9px] bg-red-100 text-red-700">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1 min-w-0">{emp.name}</span>
                  <span className="text-xs font-semibold text-red-600 tabular-nums shrink-0">
                    {emp.overdue} overdue
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
