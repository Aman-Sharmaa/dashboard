"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";

type ProjectOption = { id: string; name: string };
type EmployeeOption = { id: string; name: string; email: string };

type MeetingStat = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  createdById: string;
  createdByName: string;
  createdByEmail: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  attendees: string[];
};

type Props = {
  projects: ProjectOption[];
  employees: EmployeeOption[];
};

export function MeetingStatsClient({ projects, employees }: Props) {
  const [projectFilter, setProjectFilter] = useState<string>("__all__");
  const [employeeFilter, setEmployeeFilter] = useState<string>("__all__");
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    totalMinutes: number;
    totalHours: number;
    remainingMinutes: number;
    totalMeetings: number;
    meetings: MeetingStat[];
  } | null>(null);

  useEffect(() => {
    loadStats();
  }, [projectFilter, employeeFilter, monthFilter]);

  async function loadStats() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter !== "__all__") params.set("projectId", projectFilter);
      if (employeeFilter !== "__all__") params.set("employeeId", employeeFilter);
      if (monthFilter) params.set("month", monthFilter);

      const res = await fetch(`/api/meetings/stats?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(hours: number, minutes: number) {
    if (hours === 0) return `${minutes} minutes`;
    if (minutes === 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
    return `${hours}h ${minutes}m`;
  }

  // Generate month options (last 12 months)
  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    monthOptions.push(`${year}-${month}`);
  }

  return (
    <Card className="border bg-background/40">
      <CardHeader>
        <CardTitle className="text-base">Total Time Spent in Meetings</CardTitle>
        <CardDescription className="text-xs">
          View meeting time statistics with filters for project, employee, and month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Project</label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Employee</label>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All employees</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Month</label>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => {
                  const [year, monthNum] = month.split("-");
                  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
                  const monthName = date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                  return (
                    <SelectItem key={month} value={month}>
                      {monthName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Display */}
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Time</p>
                <p className="text-2xl font-bold">
                  {formatDuration(stats.totalHours, stats.remainingMinutes)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Minutes</p>
                <p className="text-2xl font-bold">{stats.totalMinutes}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Meetings</p>
                <p className="text-2xl font-bold">{stats.totalMeetings}</p>
              </div>
            </div>

            {/* Meeting List */}
            {stats.meetings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase">Meeting Details</h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {stats.meetings.map((m) => {
                    const hours = Math.floor(m.durationMinutes / 60);
                    const mins = m.durationMinutes % 60;
                    const start = new Date(m.startTime);
                    const end = new Date(m.endTime);

                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-lg border bg-muted/20 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{m.title}</p>
                            <p className="text-muted-foreground mt-0.5">
                              {m.projectName || "~"} · {m.createdByName || m.createdByEmail || "~"}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(hours, mins)}
                              </span>
                              <span>{m.attendees.length} attendee{m.attendees.length === 1 ? "" : "s"}</span>
                            </div>
                          </div>
                          <div className="text-muted-foreground shrink-0 text-right">
                            <div>{start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div>
                            <div className="text-[10px]">
                              {start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} - {end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {stats.meetings.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No meetings found for the selected filters
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">No data available</div>
        )}
      </CardContent>
    </Card>
  );
}
