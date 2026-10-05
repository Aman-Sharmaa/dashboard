"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Target,
  Users,
  Printer,
  RefreshCw,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type PerformanceReportsViewProps = {
  isAdmin?: boolean;
};

export function PerformanceReportsView({ isAdmin = true }: PerformanceReportsViewProps) {
  const [period, setPeriod] = useState<string>("this_month");
  const [employeeId, setEmployeeId] = useState<string>("__all__");
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState<any[]>([]);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom") {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      }
      if (employeeId !== "__all__") params.set("employeeId", employeeId);
      const res = await fetch(`/api/reports/performance?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load reports");
      const json = await res.json();
      setData(json);
      if (Array.isArray(json.employees)) setEmployees(json.employees);
    } catch {
      toast.error("Failed to load performance report");
    } finally {
      setLoading(false);
    }
  }, [period, employeeId, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Export CSV Function
  function handleDownloadCSV() {
    if (!data || !data.leaderboard) return;

    const headers = [
      "Employee Name",
      "Email",
      "Department",
      "Overall Score (%)",
      "Goals & KPI Score (%)",
      "Tasks Completed",
      "Total Tasks",
      "Task Completion Rate (%)",
      "Tasks Overdue",
      "Routine Max Streak (Days)",
      "Status",
    ];

    const rows = data.leaderboard.map((l: any) => [
      `"${l.name}"`,
      `"${l.email}"`,
      `"${l.department}"`,
      l.overallScore,
      l.avgGoalScore,
      l.tasksDone,
      l.tasksTotal,
      `${l.taskCompletionRate}%`,
      l.tasksOverdue,
      l.routinesStreak,
      `"${l.status}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Performance_Report_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Performance report downloaded as CSV! 📊");
  }

  function handlePrintReport() {
    window.print();
  }

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-violet-600" />
            Performance &amp; KPI Analytics Reports
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Evaluate employee goals, project task velocity, and routine streaks across 30 days, 3 months, or quarterly.
          </p>
        </div>

        {/* Filters & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Filter */}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-auto min-w-[180px] h-9 px-3 rounded-xl text-xs bg-white border-neutral-200 font-semibold gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month (30 Days)</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="3_months">Last 3 Months (Quarter)</SelectItem>
              <SelectItem value="6_months">Last 6 Months</SelectItem>
              <SelectItem value="year">Full Year (2026)</SelectItem>
              <SelectItem value="custom">Custom Date Range</SelectItem>
            </SelectContent>
          </Select>

          {period === "custom" && (
            <>
              <Input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} className="w-[145px] h-9 rounded-xl text-xs" />
              <Input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="w-[145px] h-9 rounded-xl text-xs" />
            </>
          )}

          {/* Employee Filter */}
          {isAdmin && (
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-auto min-w-[190px] h-9 px-3 rounded-xl text-xs bg-white border-neutral-200 font-medium gap-1.5">
                <Users className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                <SelectValue placeholder="All Team Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Team Members</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="h-9 px-2.5 rounded-xl border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            title="Refresh Data"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>

          {/* Download CSV */}
          <Button
            size="sm"
            onClick={handleDownloadCSV}
            disabled={loading || !data}
            className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Download CSV
          </Button>

          {/* Print PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintReport}
            className="h-9 rounded-xl gap-1.5 border-neutral-200 text-neutral-700 text-xs hover:bg-neutral-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>

      {loading || !data ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-violet-600 animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 font-medium">Aggregating performance metrics &amp; chart trends...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stat KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Overall Performance */}
            <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Overall Score</span>
                <Award className="h-4 w-4 text-violet-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-neutral-900 tabular-nums">
                  {data.summary.overallPerformanceScore}%
                </span>
                <span className="text-[11px] font-semibold text-emerald-600">Weighted Index</span>
              </div>
              <p className="text-[11px] text-neutral-400">70% Goals + 30% Task Execution</p>
            </div>

            {/* Card 2: Goal Achievement */}
            <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Goals &amp; KPIs Avg</span>
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-neutral-900 tabular-nums">
                  {data.summary.avgGoalScore}%
                </span>
                <span className="text-[11px] font-semibold text-blue-600">Target Achievement</span>
              </div>
              <p className="text-[11px] text-neutral-400">Average across all assigned KPIs</p>
            </div>

            {/* Card 3: Task Velocity */}
            <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Task Completion</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-neutral-900 tabular-nums">
                  {data.summary.avgTaskScore}%
                </span>
                <span className="text-[11px] font-semibold text-neutral-500">
                  ({data.summary.totalTasksDone}/{data.summary.totalTasks} tasks)
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {data.summary.totalTasksOverdue > 0 ? (
                  <span className="text-amber-600 font-semibold">{data.summary.totalTasksOverdue} delayed/overdue</span>
                ) : (
                  <span className="text-emerald-600 font-semibold">0 overdue tasks</span>
                )}
              </p>
            </div>

            {/* Card 4: Daily Routines Active */}
            <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Daily Routines</span>
                <Flame className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-neutral-900 tabular-nums">
                  {data.summary.activeRoutinesCount}
                </span>
                <span className="text-[11px] font-semibold text-orange-600">Active Checklists</span>
              </div>
              <p className="text-[11px] text-neutral-400">Tracked for {data.summary.employeesCount} team members</p>
            </div>
          </div>

          {/* Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Performance Trajectory Area Chart */}
            <div className="p-5 rounded-2xl border border-neutral-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-800">Performance Trajectory Trend</h3>
                  <p className="text-[11px] text-neutral-500">Goal Achievement % &amp; Overall Score over time</p>
                </div>
                <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                  {period.replace("_", " ").toUpperCase()}
                </span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chartTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="goalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="overallGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", fontSize: "12px", border: "1px solid #e2e8f0" }}
                      formatter={(val: any) => [`${val}%`, ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Area
                      type="monotone"
                      dataKey="goalScore"
                      name="Goal / KPI Score (%)"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#goalGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="overallScore"
                      name="Overall Score (%)"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#overallGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Task Execution Velocity Bar Chart */}
            <div className="p-5 rounded-2xl border border-neutral-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-800">Task Velocity &amp; Execution</h3>
                  <p className="text-[11px] text-neutral-500">Tasks Created vs Completed per timeframe</p>
                </div>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  TASKS
                </span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", fontSize: "12px", border: "1px solid #e2e8f0" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar dataKey="tasksCreated" name="Tasks Created" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tasksDone" name="Tasks Completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Team Performance Leaderboard Table */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b"><h3 className="text-sm font-bold">Completed Tasks</h3><p className="text-xs text-neutral-500">Tasks completed in the selected date range.</p></div>
              <div className="max-h-80 overflow-y-auto divide-y">
                {data.activity?.completedTasks?.length ? data.activity.completedTasks.map((task: any) => (
                  <div key={`${task.id}-${task.employeeId}`} className="px-5 py-3 flex items-center justify-between gap-3 text-xs">
                    <div><p className="font-semibold text-neutral-800">{task.title}</p><p className="text-neutral-500">{task.employeeName}</p></div>
                    <span className="text-neutral-500 shrink-0">{new Date(task.completedAt).toLocaleString("en-IN")}</span>
                  </div>
                )) : <p className="p-5 text-xs text-neutral-500">No completed tasks for this selection.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b"><h3 className="text-sm font-bold">Routine Attendance</h3><p className="text-xs text-neutral-500">Completed and missed routines by date.</p></div>
              <div className="max-h-80 overflow-y-auto divide-y">
                {data.activity?.routines?.length ? data.activity.routines.map((routine: any) => (
                  <div key={`${routine.routineId}-${routine.employeeId}-${routine.date}`} className="px-5 py-3 flex items-center justify-between gap-3 text-xs">
                    <div><p className="font-semibold text-neutral-800">{routine.title}</p><p className="text-neutral-500">{routine.employeeName} · {new Date(`${routine.date}T00:00:00`).toLocaleDateString("en-IN")}</p></div>
                    <span className={cn("rounded-full px-2 py-1 font-semibold capitalize", routine.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>{routine.status}</span>
                  </div>
                )) : <p className="p-5 text-xs text-neutral-500">No scheduled routines for this selection.</p>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Team Performance &amp; KPI Breakdown ({data.leaderboard.length} Employees)
                </h3>
                <p className="text-xs text-neutral-500">
                  Ranked by overall composite score across Goals (70%) and Task Velocity (30%).
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCSV}
                className="h-8 rounded-xl text-xs gap-1.5 border-neutral-200"
              >
                <Download className="h-3 w-3" />
                Export CSV
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/75 text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">
                    <th className="py-3 px-4 text-left">Rank &amp; Employee</th>
                    <th className="py-3 px-3 text-left">Department</th>
                    <th className="py-3 px-3 text-right">Goal Score</th>
                    <th className="py-3 px-3 text-right">Tasks Done</th>
                    <th className="py-3 px-3 text-right">Task Rate</th>
                    <th className="py-3 px-3 text-right">Routine Streak</th>
                    <th className="py-3 px-4 text-right">Overall Score</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.leaderboard.map((emp: any, idx: number) => (
                    <tr key={emp.id} className="hover:bg-neutral-50/60 transition-colors">
                      {/* Rank & Employee */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0",
                            idx === 0 ? "bg-amber-100 text-amber-800"
                            : idx === 1 ? "bg-slate-200 text-slate-700"
                            : idx === 2 ? "bg-amber-50 text-amber-700"
                            : "text-neutral-400"
                          )}>
                            {idx + 1}
                          </span>
                          {emp.avatarUrl ? (
                            <img src={emp.avatarUrl} alt={emp.name} className="h-7 w-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <span className="h-7 w-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {emp.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-800 truncate">{emp.name}</p>
                            <p className="text-[10px] text-neutral-400 truncate">{emp.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3 text-neutral-600">{emp.department || "General"}</td>

                      {/* Goal Score */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-violet-700">
                        {emp.avgGoalScore}%
                      </td>

                      {/* Tasks Done */}
                      <td className="py-3 px-3 text-right font-mono text-neutral-700">
                        {emp.tasksDone} <span className="text-neutral-400">/ {emp.tasksTotal}</span>
                      </td>

                      {/* Task Rate */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600">
                        {emp.taskCompletionRate}%
                      </td>

                      {/* Routine Streak */}
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center gap-1 font-mono font-semibold text-orange-600">
                          <Flame className="h-3 w-3" />
                          {emp.routinesStreak}d
                        </span>
                      </td>

                      {/* Overall Score */}
                      <td className="py-3 px-4 text-right">
                        <span className={cn(
                          "font-mono font-black text-sm",
                          emp.overallScore >= 80 ? "text-emerald-600"
                          : emp.overallScore >= 65 ? "text-amber-600"
                          : "text-red-600"
                        )}>
                          {emp.overallScore}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                          emp.status === "On Track" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : emp.status === "Needs Attention" ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-red-50 text-red-700 border-red-200"
                        )}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
