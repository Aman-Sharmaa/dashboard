"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Loader2,
  Globe,
  CheckCircle2,
  XCircle,
  Percent,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/components/socket-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";

async function safeJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

type MonitorLogRow = {
  _id: string;
  checkedAt: string;
  isUp: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
};

type StatusBar = { up: boolean; hasData: boolean; ts: number };

type MonitorRow = {
  _id: string;
  name: string;
  url: string;
  type: "http" | "api";
  method?: string;
  requestBody?: string;
  upStatusCodes?: number[];
  intervalMinutes: number;
  enabled: boolean;
  isUp?: boolean;
  lastChecked?: string;
  lastStatusCode?: number;
  lastResponseTimeMs?: number;
  statusBars24h?: StatusBar[];
};

type GroupRow = {
  _id: string;
  name: string;
  slug: string;
  monitors: MonitorRow[];
};

const groupSchema = z.object({
  name: z.string().min(1, "Group name required"),
});

const monitorSchema = z.object({
  name: z.string().min(1, "Name required"),
  url: z.string().url("Valid URL required"),
  type: z.enum(["http", "api"]),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]),
  requestBody: z.string().optional(),
  upStatusCodes: z.string().optional(),
  intervalMinutes: z.number().min(1).max(60),
});

function StatusBarStrip({ bars }: { bars?: StatusBar[] }) {
  if (!bars?.length) return <div className="h-6 flex rounded bg-muted/50 gap-px" />;
  return (
    <div className="flex gap-px h-6 rounded overflow-hidden bg-muted/30">
      {bars.map((b, i) => (
        <div
          key={i}
          className="flex-1 min-w-0 rounded-sm"
          title={
            b.hasData
              ? `${new Date(b.ts).toLocaleString()} ~ ${b.up ? "Up" : "Down"}`
              : "No data"
          }
          style={{
            backgroundColor: !b.hasData ? "var(--muted)" : b.up ? "var(--chart-2)" : "var(--destructive)",
          }}
        />
      ))}
    </div>
  );
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const;

export function MonitorPageClient() {
  const searchParams = useSearchParams();
  const view = searchParams?.get("view") as "total-up" | "total-down" | "percentage" | null;

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [monitorDialogOpen, setMonitorDialogOpen] = useState(false);
  const [editingMonitorId, setEditingMonitorId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedMonitors, setExpandedMonitors] = useState<Set<string>>(new Set());
  const [monitorLogs, setMonitorLogs] = useState<Record<string, MonitorLogRow[]>>({});
  const [loadingLogs, setLoadingLogs] = useState<Record<string, boolean>>({});
  const [runningCheck, setRunningCheck] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deleteMonitorId, setDeleteMonitorId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  const { socket, connected: rawConnected } = useSocket();
  const loadRef = useRef(load);
  loadRef.current = load;

  const updateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the connected state to avoid flicker during brief reconnects
  const [liveConnected, setLiveConnected] = useState(false);
  const connectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (rawConnected) {
      if (connectedTimerRef.current) clearTimeout(connectedTimerRef.current);
      setLiveConnected(true);
    } else {
      connectedTimerRef.current = setTimeout(() => {
        setLiveConnected(false);
      }, 3000);
    }
    return () => {
      if (connectedTimerRef.current) clearTimeout(connectedTimerRef.current);
    };
  }, [rawConnected]);

  useEffect(() => {
    if (!socket) return;

    // Join the monitor room; re-join on reconnect
    socket.emit("join-monitor");

    const onReconnect = () => {
      socket.emit("join-monitor");
    };

    const onMonitorUpdate = (data: {
      timestamp: number;
      checked: number;
      downCount: number;
      upCount: number;
      downEvents?: { monitorName: string; groupName: string }[];
    }) => {
      setLastUpdate(data.timestamp);
      // Debounce the reload to avoid hammering on rapid consecutive updates
      if (updateDebounceRef.current) clearTimeout(updateDebounceRef.current);
      updateDebounceRef.current = setTimeout(() => {
        loadRef.current();
      }, 500);

      if (data.downCount > 0 && data.downEvents?.length) {
        const names = data.downEvents.map((e) => e.monitorName).join(", ");
        toast.error(`Monitor down: ${names}`);
      }
      if (data.upCount > 0) {
        toast.success(`${data.upCount} monitor(s) recovered`);
      }
    };

    socket.on("connect", onReconnect);
    socket.on("monitor-update", onMonitorUpdate);

    return () => {
      socket.emit("leave-monitor");
      socket.off("connect", onReconnect);
      socket.off("monitor-update", onMonitorUpdate);
    };
  }, [socket]);

  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setCurrentUser(data.user);
    } catch (e) {
      console.error("Failed to load user", e);
    }
  }

  const groupForm = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: "" },
  });

  const monitorForm = useForm<z.infer<typeof monitorSchema>>({
    resolver: zodResolver(monitorSchema),
    defaultValues: {
      name: "",
      url: "",
      type: "http",
      method: "GET",
      requestBody: "",
      upStatusCodes: "",
      intervalMinutes: 5,
    },
  });

  async function load() {
    setLoading(true);
    try {
      const groupsRes = await fetch("/api/monitor-groups?withStatus=1");
      const groupsData = await safeJson<{ groups?: GroupRow[]; message?: string }>(groupsRes);
      if (!groupsRes.ok) {
        const msg = groupsData.message || (groupsRes.status === 403 ? "Admin access required." : "Failed to load groups.");
        throw new Error(msg);
      }
      setGroups(groupsData.groups || []);
      if ((groupsData.groups?.length) && !expandedGroups.size) {
        setExpandedGroups(new Set(groupsData.groups.map((g: GroupRow) => g._id)));
      }
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadUser();
  }, []);

  async function fetchLogs(monitorId: string) {
    if (monitorLogs[monitorId]) return;
    setLoadingLogs((p) => ({ ...p, [monitorId]: true }));
    try {
      const res = await fetch(`/api/monitors/${monitorId}/logs?limit=100`);
      const data = await safeJson<{ logs?: MonitorLogRow[] }>(res);
      if (res.ok) setMonitorLogs((p) => ({ ...p, [monitorId]: data.logs || [] }));
    } finally {
      setLoadingLogs((p) => ({ ...p, [monitorId]: false }));
    }
  }

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleMonitor(id: string) {
    setExpandedMonitors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    fetchLogs(id);
  }

  async function onGroupSubmit(values: z.infer<typeof groupSchema>) {
    try {
      const url = editingGroupId
        ? `/api/monitor-groups/${editingGroupId}`
        : "/api/monitor-groups";
      const res = await fetch(url, {
        method: editingGroupId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name }),
      });
      const data = await safeJson<{ message?: string }>(res);
      if (!res.ok) throw new Error(data.message || "Failed to save");
      toast.success(editingGroupId ? "Group updated" : "Group created");
      setGroupDialogOpen(false);
      setEditingGroupId(null);
      groupForm.reset({ name: "" });
      load();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  async function onMonitorSubmit(values: z.infer<typeof monitorSchema>) {
    const groupId = selectedGroupId;
    if (!editingMonitorId && !groupId) return;
    try {
      let url: string;
      let method: string;
      if (editingMonitorId) {
        url = `/api/monitors/${editingMonitorId}`;
        method = "PUT";
      } else {
        url = `/api/monitor-groups/${groupId}/monitors`;
        method = "POST";
      }
      const body: Record<string, unknown> = {
        name: values.name,
        url: values.url,
        type: values.type,
        method: values.method,
        requestBody: values.requestBody || undefined,
        upStatusCodes: values.upStatusCodes?.trim() || undefined,
        intervalMinutes: values.intervalMinutes,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await safeJson<{ message?: string }>(res);
      if (!res.ok) throw new Error(data.message || "Failed to save");
      toast.success(editingMonitorId ? "Monitor updated" : "Monitor added");
      setMonitorDialogOpen(false);
      setEditingMonitorId(null);
      setSelectedGroupId(null);
      monitorForm.reset({
        name: "",
        url: "",
        type: "http",
        method: "GET",
        requestBody: "",
        upStatusCodes: "",
        intervalMinutes: 5,
      });
      load();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  async function deleteGroup(id: string) {
    setDeleteGroupId(id);
  }

  async function confirmDeleteGroup() {
    if (!deleteGroupId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/monitor-groups/${deleteGroupId}`, { method: "DELETE" });
      const delData = await safeJson<{ message?: string }>(res);
      if (!res.ok) throw new Error(delData.message || "Delete failed");
      toast.success("Group deleted");
      load();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setIsDeleting(false);
      setDeleteGroupId(null);
    }
  }

  async function deleteMonitor(id: string) {
    setDeleteMonitorId(id);
  }

  async function confirmDeleteMonitor() {
    if (!deleteMonitorId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/monitors/${deleteMonitorId}`, { method: "DELETE" });
      const delData = await safeJson<{ message?: string }>(res);
      if (!res.ok) throw new Error(delData.message || "Delete failed");
      toast.success("Monitor removed");
      load();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setIsDeleting(false);
      setDeleteMonitorId(null);
    }
  }

  async function setMonitorEnabled(monitorId: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/monitors/${monitorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Update failed");
      load();
    } catch (e: any) {
      toast.error("Failed to update");
    }
  }

  async function runCheck() {
    setRunningCheck(true);
    try {
      const res = await fetch("/api/monitors/run-check", { method: "POST" });
      const data = await safeJson<{ checked?: number; downCount?: number; message?: string }>(res);
      if (!res.ok) throw new Error(data.message || "Check failed");
      toast.success(`Checked ${data.checked ?? 0} monitors. ${data.downCount ?? 0} down.`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Check failed");
    } finally {
      setRunningCheck(false);
    }
  }

  function openEditGroup(g: GroupRow) {
    setEditingGroupId(g._id);
    groupForm.reset({ name: g.name });
    setGroupDialogOpen(true);
  }

  function openAddMonitor(groupId: string) {
    setEditingMonitorId(null);
    setSelectedGroupId(groupId);
    monitorForm.reset({
      name: "",
      url: "",
      type: "http",
      method: "GET",
      requestBody: "",
      upStatusCodes: "",
      intervalMinutes: 5,
    });
    setMonitorDialogOpen(true);
  }

  function openEditMonitor(m: MonitorRow, groupId: string) {
    setEditingMonitorId(m._id);
    setSelectedGroupId(groupId);
    const upStatusStr = m.upStatusCodes?.length
      ? m.upStatusCodes.join(", ")
      : "";
    monitorForm.reset({
      name: m.name,
      url: m.url,
      type: m.type,
      method: (m.method || "GET") as "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD",
      requestBody: m.requestBody || "",
      upStatusCodes: upStatusStr,
      intervalMinutes: m.intervalMinutes,
    });
    setMonitorDialogOpen(true);
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const { enabledMonitors, upCount, downCount, total, uptimePct } = useMemo(() => {
    const enabled = groups.flatMap((g) => (g.monitors || []).filter((m) => m.enabled !== false));
    const up = enabled.filter((m) => m.isUp === true).length;
    const down = enabled.filter((m) => m.isUp === false).length;
    const tot = up + down;
    const pct = tot > 0 ? Math.round((up / tot) * 100) : 0;
    return { enabledMonitors: enabled, upCount: up, downCount: down, total: tot, uptimePct: pct };
  }, [groups]);

  const filteredGroups = useMemo(() => {
    return view === "total-up"
      ? groups
        .map((g) => ({ ...g, monitors: (g.monitors || []).filter((m) => m.enabled !== false && m.isUp === true) }))
        .filter((g) => g.monitors.length > 0)
      : view === "total-down"
        ? groups
          .map((g) => ({ ...g, monitors: (g.monitors || []).filter((m) => m.enabled !== false && m.isUp === false) }))
          .filter((g) => g.monitors.length > 0)
        : groups;
  }, [groups, view]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function copyStatusUrl(slug: string) {
    const url = `${baseUrl}/status/${slug}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied")).catch(() => toast.error("Copy failed"));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {currentUser?.role === "admin" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs mr-2">
              {liveConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Offline</span>
                </>
              )}
              {lastUpdate && (
                <span className="text-muted-foreground ml-1">
                  · {new Date(lastUpdate).toLocaleTimeString()}
                </span>
              )}
            </div>
            <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingGroupId(null);
                    groupForm.reset({ name: "" });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingGroupId ? "Edit group" : "Create group"}</DialogTitle>
                  <DialogDescription>
                    Name your group (e.g. Production, APIs). Then add monitors (URLs) to this group. Share the public status page link to show if services are up or down.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={groupForm.handleSubmit(onGroupSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Group name</Label>
                    <Input
                      placeholder="e.g. Production"
                      {...groupForm.register("name")}
                    />
                    {groupForm.formState.errors.name && (
                      <p className="text-sm text-destructive">{groupForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="submit">{editingGroupId ? "Save" : "Create"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={runCheck} disabled={runningCheck}>
              {runningCheck ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="mr-2 h-4 w-4" />}
              Run check now
            </Button>
          </div>
        )}
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard/monitor"
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                !view ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted/50"
              )}
            >
              <Activity className="h-4 w-4" />
              <span>All</span>
            </a>
            <a
              href="/dashboard/monitor?view=total-up"
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                view === "total-up"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-border bg-card hover:bg-muted/50"
              )}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Total up</span>
              <span className="tabular-nums font-bold">{upCount}</span>
            </a>
            <a
              href="/dashboard/monitor?view=total-down"
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                view === "total-down"
                  ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                  : "border-border bg-card hover:bg-muted/50"
              )}
            >
              <XCircle className="h-4 w-4 text-red-500" />
              <span>Total down</span>
              <span className="tabular-nums font-bold">{downCount}</span>
            </a>
            <a
              href="/dashboard/monitor?view=percentage"
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                view === "percentage"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-muted/50"
              )}
            >
              <Percent className="h-4 w-4" />
              <span>Percentage of all combined</span>
              <span className="tabular-nums font-bold">{uptimePct}%</span>
            </a>
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No monitor groups yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Create a group to add websites or APIs to monitor.</p>
          </CardContent>
        </Card>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {view === "total-up" ? "No monitors are currently up." : view === "total-down" ? "No monitors are down. All are up." : "No monitors to show."}
            </p>
            <a href="/dashboard/monitor" className="text-sm text-primary hover:underline mt-2">
              View all monitors →
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <Card key={group._id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={() => toggleGroup(group._id)}
                    >
                      {expandedGroups.has(group._id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{group.name}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-muted-foreground">Public status page:</span>
                        <a
                          href={`${baseUrl}/status/${group.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-sm"
                        >
                          {baseUrl}/status/{group.slug}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => copyStatusUrl(group.slug)}
                        >
                          Copy link
                        </Button>
                      </CardDescription>
                    </div>
                  </div>
                  {currentUser?.role === "admin" && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEditGroup(group)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteGroup(group._id)}
                          >
                            Delete group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddMonitor(group._id)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add monitor
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {expandedGroups.has(group._id) && (
                <CardContent className="pt-0 space-y-2">
                  {!group.monitors?.length ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No monitors. Add a website or API URL to monitor.
                    </p>
                  ) : (
                    group.monitors.map((mon) => (
                      <div
                        key={mon._id}
                        className="rounded-lg border bg-card p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-7 w-7"
                              onClick={() => toggleMonitor(mon._id)}
                            >
                              {expandedMonitors.has(mon._id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{mon.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{mon.url}</p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                                mon.isUp === true
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                  : mon.isUp === false
                                    ? "bg-destructive/15 text-destructive"
                                    : "bg-muted text-muted-foreground"
                              )}
                            >
                              {mon.isUp === true ? "Up" : mon.isUp === false ? "Down" : "~"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {currentUser?.role === "admin" ? (
                              <>
                                <Button
                                  variant={mon.enabled ? "default" : "outline"}
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => setMonitorEnabled(mon._id, !mon.enabled)}
                                >
                                  {mon.enabled ? "On" : "Paused"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openEditMonitor(mon, group._id)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => deleteMonitor(mon._id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground italic px-2">Read Only</span>
                            )}
                          </div>
                        </div>
                        <div className="pl-9">
                          <p className="text-xs text-muted-foreground mb-1">Last 24 hours</p>
                          <StatusBarStrip bars={mon.statusBars24h} />
                        </div>
                        {expandedMonitors.has(mon._id) && (
                          <div className="pl-9 pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Recent logs</p>
                            {loadingLogs[mon._id] ? (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : (monitorLogs[mon._id]?.length ? (
                              <div className="max-h-48 overflow-auto rounded border bg-muted/30 p-2 space-y-1">
                                {monitorLogs[mon._id].map((log) => (
                                  <div
                                    key={log._id}
                                    className="flex items-center justify-between text-xs gap-2"
                                  >
                                    <span className={log.isUp ? "text-emerald-600" : "text-destructive"}>
                                      {log.isUp ? "Up" : "Down"}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {log.statusCode != null && `${log.statusCode}`}
                                      {log.responseTimeMs != null && ` · ${log.responseTimeMs}ms`}
                                    </span>
                                    <span className="text-muted-foreground truncate">
                                      {new Date(log.checkedAt).toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No logs yet.</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={monitorDialogOpen} onOpenChange={setMonitorDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMonitorId ? "Edit monitor" : "Add monitor"}</DialogTitle>
            <DialogDescription>
              Website or API URL to check. Set HTTP method, optional body, and which status codes count as up. Alerts use Settings → Apps (Discord webhook).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={monitorForm.handleSubmit(onMonitorSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="e.g. Homepage" {...monitorForm.register("name")} />
              {monitorForm.formState.errors.name && (
                <p className="text-sm text-destructive">{monitorForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input placeholder="https://example.com or https://api.example.com/health" {...monitorForm.register("url")} />
              {monitorForm.formState.errors.url && (
                <p className="text-sm text-destructive">{monitorForm.formState.errors.url.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={monitorForm.watch("type")}
                  onValueChange={(v) => monitorForm.setValue("type", v as "http" | "api")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">Website</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>HTTP method</Label>
                <Select
                  value={monitorForm.watch("method")}
                  onValueChange={(v) => monitorForm.setValue("method", v as typeof HTTP_METHODS[number])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HTTP_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Request body (optional, for POST / PUT / PATCH)</Label>
              <Textarea
                placeholder='{"key": "value"}'
                className="min-h-[80px] font-mono text-sm"
                {...monitorForm.register("requestBody")}
              />
            </div>
            <div className="space-y-2">
              <Label>Up HTTP status codes</Label>
              <Input
                placeholder="200, 201 or 200-299 (empty = 2xx)"
                {...monitorForm.register("upStatusCodes")}
              />
              <p className="text-xs text-muted-foreground">Comma-separated (e.g. 200, 201, 204) or range (e.g. 200-299). Leave empty for default 2xx.</p>
            </div>
            <div className="space-y-2">
              <Label>Interval (minutes)</Label>
              <Select
                value={String(monitorForm.watch("intervalMinutes"))}
                onValueChange={(v) => monitorForm.setValue("intervalMinutes", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 5, 10, 15, 30, 60].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">{editingMonitorId ? "Save" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteGroupId}
        onOpenChange={(open) => !open && setDeleteGroupId(null)}
        title="Delete Group"
        description="Are you sure you want to delete this group and all its monitors? This action cannot be undone."
        onConfirm={confirmDeleteGroup}
        isLoading={isDeleting}
      />

      <ConfirmDialog
        open={!!deleteMonitorId}
        onOpenChange={(open) => !open && setDeleteMonitorId(null)}
        title="Remove Monitor"
        description="Are you sure you want to remove this monitor? This action cannot be undone."
        onConfirm={confirmDeleteMonitor}
        isLoading={isDeleting}
      />
    </div>
  );
}
