"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, CheckCircle2, XCircle, ExternalLink, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type MonitorItem = {
  _id: string;
  name: string;
  url: string;
  enabled?: boolean;
  isUp?: boolean;
  lastStatusCode?: number;
};

type GroupItem = {
  _id: string;
  name: string;
  slug: string;
  monitors: MonitorItem[];
};

export function DashboardMonitorOverview() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/monitor-groups?withStatus=1");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.groups)) setGroups(data.groups);
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const totalMonitors = groups.reduce((acc, g) => acc + g.monitors.length, 0);
  const downCount = groups.reduce(
    (acc, g) => acc + g.monitors.filter((m) => m.enabled !== false && m.isUp === false).length,
    0
  );
  const allUp = totalMonitors > 0 && downCount === 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Monitor overview</h3>
        <div className="rounded-2xl border bg-card/50 p-8 flex items-center justify-center text-muted-foreground">
          <Activity className="h-5 w-5 animate-pulse mr-2" />
          Loading services…
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Monitor overview</h3>
        <Link href="/dashboard/monitor">
          <div className="group p-6 rounded-2xl border bg-card/50 hover:bg-card hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No monitors configured</p>
                  <p className="text-sm text-muted-foreground">Add groups and URLs in Monitor to track service status.</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Monitor overview</h3>
        <Link
          href="/dashboard/monitor"
          className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
        >
          Manage monitors
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="rounded-2xl border bg-card/50 overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
            {groups.length} group{groups.length !== 1 ? "s" : ""} · {totalMonitors} service{totalMonitors !== 1 ? "s" : ""}
          </span>
          <span
            className={cn(
              "text-xs font-semibold px-2 py-1 rounded-full",
              allUp ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-destructive/15 text-destructive"
            )}
          >
            {allUp ? "All operational" : `${downCount} down`}
          </span>
        </div>
        <ul className="divide-y divide-border">
          {groups.map((group) =>
            group.monitors.map((mon) => {
              const isDown = mon.enabled !== false && mon.isUp === false;
              return (
                <li key={mon._id}>
                  <Link
                    href="/dashboard/monitor"
                    className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors group"
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center",
                        isDown ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {isDown ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{mon.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{group.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isDown ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {isDown ? "Down" : "Operational"}
                      </span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
        <p className="text-[11px] text-muted-foreground px-4 py-3 border-t bg-muted/20">
          Alerts when a service is down are sent to the webhook configured in{" "}
          <Link href="/dashboard/settings" className="text-primary hover:underline">
            Settings → Apps
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
