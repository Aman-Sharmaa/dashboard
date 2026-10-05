"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, CheckCircle2, AlertTriangle, Zap } from "lucide-react";

type PerformanceRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  title?: string | null;
  total: number;
  done: number;
  overdue: number;
  highPriority: number;
  completionRate: number;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function EmployeePerformanceSection() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [performance, setPerformance] = useState<PerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/employees/performance?month=${selectedMonth}`)
      .then((r) => r.json())
      .then((data) => {
        setPerformance(data.performance || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedMonth]);

  // Build month options
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function monthLabel(m: string) {
    const [y, mo] = m.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  const colors = [
    "bg-indigo-500",
    "bg-violet-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-emerald-500",
    "bg-amber-500",
  ];

  return (
    <Card className="rounded-2xl border shadow-sm overflow-hidden bg-white">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Employee Performance
            </h3>
            <p className="text-xs text-muted-foreground">Task completion rate by employee</p>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs h-8 rounded-xl border border-neutral-200 bg-white px-3 focus:outline-none focus:ring-1 focus:ring-primary/20"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : performance.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No data available for this period.
          </p>
        ) : (
          <div className="space-y-4">
            {performance.filter((p) => p.total > 0).slice(0, 10).map((emp, i) => (
              <div key={emp.id} className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback
                      className={`text-white text-[10px] font-bold ${colors[i % colors.length]}`}
                    >
                      {getInitials(emp.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-800 truncate">
                        {emp.name}
                      </span>
                      <span className="text-xs font-bold text-neutral-700 shrink-0">
                        {emp.completionRate}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {emp.done}/{emp.total} done
                      </div>
                      {emp.overdue > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          {emp.overdue} overdue
                        </div>
                      )}
                      {emp.highPriority > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600">
                          <Zap className="h-3 w-3" />
                          {emp.highPriority} high priority
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Progress value={emp.completionRate} className="h-1.5 rounded-full" />
              </div>
            ))}
            {performance.filter((p) => p.total === 0).length > 0 && (
              <p className="text-[10px] text-muted-foreground text-center pt-2">
                +{performance.filter((p) => p.total === 0).length} employees with no tasks this month
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
