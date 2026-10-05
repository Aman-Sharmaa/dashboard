"use client";

import { useEffect, useState } from "react";
import { Activity, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

type StatusBar = { up: boolean; hasData: boolean; ts: number };

type MonitorItem = {
  _id: string;
  name: string;
  url: string;
  type: string;
  isUp?: boolean;
  lastChecked?: string;
  lastStatusCode?: number;
  lastResponseTimeMs?: number;
  statusBars24h: StatusBar[];
};

type StatusData = {
  group: { _id: string; name: string; slug: string };
  monitors: MonitorItem[];
};

export function StatusPageClient({
  groupSlug,
  initialGroupName,
}: {
  groupSlug: string;
  initialGroupName: string;
}) {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/status/${groupSlug}`);
        if (!res.ok) {
          if (res.status === 404) setData(null);
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupSlug]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const groupName = data?.group?.name ?? initialGroupName;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">Status page not found</h1>
          <p className="mt-2 text-muted-foreground">This group may not exist or the link is invalid.</p>
        </div>
      </div>
    );
  }

  const allUp = data.monitors.length > 0 && data.monitors.every((m) => m.isUp === true);
  const anyDown = data.monitors.some((m) => m.isUp === false);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${allUp ? "bg-emerald-500/15" : anyDown ? "bg-amber-500/15" : "bg-muted"
              }`}
          >
            <Activity
              className={`h-5 w-5 ${allUp ? "text-emerald-600" : anyDown ? "text-amber-600" : "text-muted-foreground"
                }`}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {groupName}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {allUp
                ? "All systems operational"
                : anyDown
                  ? "Some services are experiencing issues"
                  : "Checking status..."}
            </p>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Services
        </h2>
        {!data.monitors?.length ? (
          <div className="rounded-2xl border bg-card/50 p-8 text-center text-muted-foreground">
            No services configured for this status page.
          </div>
        ) : (
          data.monitors.map((mon) => {
            const isOpen = openIds.has(mon._id);
            return (
              <div
                key={mon._id}
                className="rounded-2xl border bg-card/80 shadow-sm overflow-hidden backdrop-blur-sm"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/40 transition-colors"
                  onClick={() => toggle(mon._id)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/80">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{mon.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{mon.url}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${mon.isUp === true
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : mon.isUp === false
                          ? "bg-red-500/15 text-red-700 dark:text-red-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {mon.isUp === true ? "Operational" : mon.isUp === false ? "Down" : "Checking..."}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t bg-muted/20 px-4 pb-4 pt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Last 24 hours</p>
                    <div className="flex gap-px h-8 rounded-lg overflow-hidden bg-muted/50">
                      {(mon.statusBars24h || []).map((b, i) => (
                        <div
                          key={i}
                          className="flex-1 min-w-0 rounded-sm"
                          title={
                            b.hasData
                              ? `${new Date(b.ts).toLocaleString()} ~ ${b.up ? "Up" : "Down"}`
                              : "No data"
                          }
                          style={{
                            backgroundColor: !b.hasData
                              ? "var(--muted)"
                              : b.up
                                ? "hsl(var(--chart-2))"
                                : "hsl(var(--destructive))",
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {mon.lastChecked && (
                        <span>Last checked: {new Date(mon.lastChecked).toLocaleString()}</span>
                      )}
                      {mon.lastStatusCode != null && (
                        <span>Status: {mon.lastStatusCode}</span>
                      )}
                      {mon.lastResponseTimeMs != null && (
                        <span>Response: {mon.lastResponseTimeMs}ms</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      <footer className="mt-16 text-center text-xs text-muted-foreground">
        Powered by Kalp Monitor · Status updates every few minutes
      </footer>
    </div>
  );
}
