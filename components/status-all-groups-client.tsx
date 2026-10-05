"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ChevronDown, ChevronRight, Loader2, ExternalLink, ShieldCheck } from "lucide-react";

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

type GroupData = {
  group: { _id: string; name: string; slug: string };
  monitors: MonitorItem[];
};

export function StatusAllGroupsClient() {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [openMonitors, setOpenMonitors] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.groups) {
          setGroups(data.groups);
          setOpenGroups(new Set(data.groups.map((g: GroupData) => g.group._id)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleMonitor(id: string) {
    setOpenMonitors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-muted/30 to-background">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalMonitors = groups.reduce((acc, g) => acc + g.monitors.length, 0);
  const allUp = totalMonitors > 0 && groups.every((g) => g.monitors.every((m) => m.isUp === true));
  const anyDown = groups.some((g) => g.monitors.some((m) => m.isUp === false));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ~~~ Hero ~~~ */}


      {/* ~~~ All services ~~~ */}
      <section className="flex-1 mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Webwrite services

          </h2>

          <p className="mt-0 text-sm text-muted-foreground">
            <div
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${allUp
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : anyDown
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
                }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${allUp ? "bg-emerald-500" : anyDown ? "bg-amber-500 animate-pulse" : "bg-muted-foreground"
                  }`}
              />
              {allUp
                ? "All systems operational"
                : anyDown
                  ? "Some services experiencing issues"
                  : "Checking status..."}
            </div>

          </p>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
            <Activity className="mx-auto h-12 w-12 text-muted-foreground/60" />
            <p className="mt-4 font-medium text-foreground">No groups yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor groups will appear here once configured.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(({ group, monitors }) => {
              const isGroupOpen = openGroups.has(group._id);
              const groupAllUp = monitors.length > 0 && monitors.every((m) => m.isUp === true);
              const groupAnyDown = monitors.some((m) => m.isUp === false);

              return (
                <article
                  key={group._id}
                  className="rounded-2xl border bg-card shadow-sm overflow-hidden"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/40 transition-colors"
                    onClick={() => toggleGroup(group._id)}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80">
                      {isGroupOpen ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-foreground">{group.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {monitors.length} service{monitors.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${groupAllUp
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : groupAnyDown
                          ? "bg-red-500/15 text-red-700 dark:text-red-400"
                          : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {groupAllUp ? "Operational" : groupAnyDown ? "Issues" : "Checking..."}
                    </span>
                    <Link
                      href={`/status/${group.slug}`}
                      className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open page <ExternalLink className="h-3 w-3" />
                    </Link>
                  </button>

                  {isGroupOpen && (
                    <div className="border-t bg-muted/5">
                      {!monitors.length ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          No services in this group.
                        </div>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {monitors.map((mon) => {
                            const isMonOpen = openMonitors.has(mon._id);
                            return (
                              <div key={mon._id} className="first:border-t-0">
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors sm:pl-14"
                                  onClick={() => toggleMonitor(mon._id)}
                                >
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                                    {isMonOpen ? (
                                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-foreground text-sm truncate">
                                      {mon.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {mon.url}
                                    </p>
                                  </div>
                                  <span
                                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${mon.isUp === true
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                      : mon.isUp === false
                                        ? "bg-red-500/15 text-red-700 dark:text-red-400"
                                        : "bg-muted text-muted-foreground"
                                      }`}
                                  >
                                    {mon.isUp === true
                                      ? "Up"
                                      : mon.isUp === false
                                        ? "Down"
                                        : "~"}
                                  </span>
                                </button>
                                {isMonOpen && (
                                  <div className="px-4 pb-4 pt-1 sm:pl-14">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                      Last 24 hours
                                    </p>
                                    <div className="flex gap-px h-6 rounded-lg overflow-hidden bg-muted/50">
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
                                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                      {mon.lastChecked && (
                                        <span>
                                          Last checked: {new Date(mon.lastChecked).toLocaleString()}
                                        </span>
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
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ~~~ Footer ~~~ */}
      <footer className="mt-auto border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />    {totalMonitors > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {groups.length} group{groups.length !== 1 ? "s" : ""} · {totalMonitors} service
                  {totalMonitors !== 1 ? "s" : ""} monitored
                </p>
              )}

            </div>
            <p className="text-xs text-muted-foreground">
              Status checks run every few minutes · Last updated on page load
            </p>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground/80">
            © {new Date().getFullYear()} Webwrite · Service status page
          </p>
        </div>
      </footer>
    </div>
  );
}
