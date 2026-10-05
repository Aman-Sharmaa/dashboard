"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardMonitorUpDown() {
  const [up, setUp] = useState<number | null>(null);
  const [down, setDown] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/monitor-groups?withStatus=1");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data.groups)) return;
        let upCount = 0;
        let downCount = 0;
        for (const g of data.groups) {
          for (const m of g.monitors || []) {
            if (m.enabled === false) continue;
            if (m.isUp === false) downCount++;
            else upCount++;
          }
        }
        setUp(upCount);
        setDown(downCount);
      } catch {
        if (!cancelled) {
          setUp(0);
          setDown(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Link href="/dashboard/monitor">
        <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Monitor
            </span>
            <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />
          </div>
          <p className="text-2xl font-bold tabular-nums text-muted-foreground">~</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Loading…</p>
        </div>
      </Link>
    );
  }

  const total = (up ?? 0) + (down ?? 0);

  return (
    <Link href="/dashboard/monitor">
      <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Monitor
          </span>
          <Activity className="h-4 w-4 text-violet-500" />
        </div>
        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {up ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">up</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className={cn(
              "text-xl font-bold tabular-nums",
              (down ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
            )}>
              {down ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">down</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          {total} service{total !== 1 ? "s" : ""} total
        </p>
      </div>
    </Link>
  );
}
