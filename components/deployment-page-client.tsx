"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Server, GitBranch, Globe, Cpu, HardDrive, MemoryStick,
  RotateCcw, Square, Settings, Search,
  Rocket, Loader2, CheckCircle2, XCircle, Clock,
  Trash2, Terminal, RefreshCw, ArrowRight, Pencil,
  ExternalLink, Zap, AlertTriangle, Github, Lock, User,
  Download, Shield, Package, Wrench, MonitorCheck, Upload,
  FolderOpen, ChevronRight, FileText, Folder, Activity,
  Play, Lightbulb, ArrowUp, Eye, EyeOff, KeyRound, History, GitCommitHorizontal, MoreHorizontal,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";

// ─── Types ───────────────────────────────────────
interface DeployProjectItem {
  id: string;
  name: string;
  pm2Name?: string;
  group: { id: string; name: string } | null;
  server: { id: string; name: string; ip: string } | null;
  repo: string;
  branch: string;
  domain?: string;
  port: number;
  status: string;
  framework: string;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: string;
  uptime?: string;
  restartCount?: number;
  lastDeployAt?: string;
  lastDeployCommit?: string;
  deployedCommitAuthor?: string;
  latestCommitSha?: string;
  latestCommitAuthor?: string;
  latestCommitAt?: string;
  latestCommitMessage?: string;
  hasPendingCommit?: boolean;
  lastCommitAuthor?: string;
  lastCommitAt?: string;
  lastCommitMessage?: string;
  createdAt: string;
  updatedAt?: string;
}

interface ServerResourceStats {
  cpu: { cores: number; model: string };
  memory: { total: number; used: number; percent: number };
  disk: { total: number; used: number; percent: number };
  uptime: string;
}

interface ServerItem {
  id: string;
  name: string;
  ip: string;
  sshUser: string;
  sshPort: number;
  authMethod: string;
  defaultNodeVersion: string;
  defaultNginxPath: string;
  maxDeploy: number;
  status: string;
  cachedResources?: ServerResourceStats | null;
  cachedResourcesAt?: string | null;
  cachedServicesCount?: number;
  cachedServicesAt?: string | null;
}

interface DomainProviderItem {
  id: string;
  name: string;
  provider: "cloudflare" | "godaddy" | "namecheap" | "hostinger";
  domainCount: number;
  cachedDomains: { domain: string; zoneId?: string }[];
  cachedDomainsAt?: string;
}

const DOMAIN_PROVIDER_META: Record<string, { label: string; color: string; fields: string[] }> = {
  cloudflare: { label: "Cloudflare", color: "text-orange-600 bg-orange-50 border-orange-200", fields: ["API Token"] },
  godaddy: { label: "GoDaddy", color: "text-teal-600 bg-teal-50 border-teal-200", fields: ["API Key", "API Secret"] },
  namecheap: { label: "Namecheap", color: "text-red-600 bg-red-50 border-red-200", fields: ["API Key", "API User"] },
  hostinger: { label: "Hostinger", color: "text-purple-600 bg-purple-50 border-purple-200", fields: ["API Token"] },
};

function formatBytesCompact(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function MiniBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn("h-1 bg-muted rounded-full overflow-hidden flex-1", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all",
          percent > 85 ? "bg-red-500" : percent > 60 ? "bg-amber-500" : "bg-emerald-500"
        )}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

interface GhRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  language: string;
}

interface GhBranch {
  name: string;
  sha: string;
}

interface LogEntry {
  id: string;
  action: string;
  status: string;
  logs: string;
  triggeredBy?: string;
  createdAt: string;
}

// ─── Status helpers ──────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  running: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  stopped: { color: "text-neutral-500", bg: "bg-neutral-50 border-neutral-200", icon: Square },
  deploying: { color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: Loader2 },
  building: { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: Loader2 },
  failed: { color: "text-red-600", bg: "bg-red-50 border-red-200", icon: XCircle },
  pending: { color: "text-neutral-400", bg: "bg-neutral-50 border-neutral-200", icon: Clock },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const spinning = status === "deploying" || status === "building";
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border", cfg.bg, cfg.color)}>
      <Icon className={cn("h-3 w-3", spinning && "animate-spin")} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
    </span>
  );
}

// ─── Main Component ──────────────────────────────
export function DeploymentPageClient() {
  const [projects, setProjects] = useState<DeployProjectItem[]>([]);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterServer, setFilterServer] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterDomain, setFilterDomain] = useState("__all__");

  const [ghConnected, setGhConnected] = useState(false);
  const [ghUser, setGhUser] = useState("");
  const [serverStats, setServerStats] = useState<Record<string, ServerResourceStats>>({});
  const [statsLoading, setStatsLoading] = useState<Record<string, boolean>>({});

  // Domain providers
  const [domainProviders, setDomainProviders] = useState<DomainProviderItem[]>([]);

  // Dialogs
  const [showNewDeploy, setShowNewDeploy] = useState(false);
  const [showAddServer, setShowAddServer] = useState(false);
  const [showConnectGithub, setShowConnectGithub] = useState(false);
  const [showConnectDomain, setShowConnectDomain] = useState<{ open: boolean; provider?: string }>({ open: false });
  const [showLogs, setShowLogs] = useState<{ projectId: string; projectName: string } | null>(null);
  const [editDeployId, setEditDeployId] = useState<string | null>(null);
  const [editServer, setEditServer] = useState<ServerItem | null>(null);
  const [setupServerId, setSetupServerId] = useState<string | null>(null);
  const [showServerApps, setShowServerApps] = useState<ServerItem | null>(null);

  const [redeployTarget, setRedeployTarget] = useState<{ id: string; name: string; serverName: string; action: "deploy" | "redeploy" } | null>(null);
  const [manageDnsTarget, setManageDnsTarget] = useState<{ domain: string; zoneId?: string; providerId: string; providerName: string } | null>(null);

  // Track which pending commits we've already notified about
  const notifiedPendingRef = useRef<Set<string>>(new Set());

  // ─── Data loading ──────────────────────────────
  const initialLoadDone = useRef(false);
  const loadAll = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);
    try {
      const [pRes, sRes, settingsRes, dpRes] = await Promise.all([
        fetch("/api/deploy/projects"),
        fetch("/api/deploy/servers"),
        fetch("/api/deploy/settings"),
        fetch("/api/deploy/domains/providers"),
      ]);
      if (pRes.ok) {
        const projectList: DeployProjectItem[] = (await pRes.json()).projects || [];
        setProjects(projectList);

        // Toast for projects with new pending commits (only after initial load)
        if (initialLoadDone.current) {
          for (const p of projectList) {
            if (p.hasPendingCommit && p.latestCommitSha) {
              const key = `${p.id}:${p.latestCommitSha}`;
              if (!notifiedPendingRef.current.has(key)) {
                notifiedPendingRef.current.add(key);
                toast.info(
                  `New commit on ${p.name}`,
                  { description: `${p.latestCommitAuthor || "Someone"}: ${p.latestCommitMessage?.slice(0, 60) || p.latestCommitSha}`, duration: 6000 }
                );
              }
            }
          }
        }
      }
      if (sRes.ok) setServers((await sRes.json()).servers || []);
      if (settingsRes.ok) {
        const s = (await settingsRes.json()).settings;
        setGhConnected(s.githubConnected || false);
        setGhUser(s.githubUser || "");
      }
      if (dpRes.ok) setDomainProviders((await dpRes.json()).providers || []);
    } catch {
      toast.error("Failed to load deployment data");
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh every 30s ~ pause when any dialog is open to prevent form disruption
  const anyDialogOpen = showNewDeploy || showAddServer || showConnectGithub || !!showLogs || !!editDeployId || !!editServer || !!setupServerId || !!showServerApps || !!redeployTarget;
  useEffect(() => {
    if (anyDialogOpen) return;
    const iv = setInterval(loadAll, 30000);
    return () => clearInterval(iv);
  }, [loadAll, anyDialogOpen]);

  // Load cached stats instantly, then fetch fresh stats for stale/missing in background
  useEffect(() => {
    if (servers.length === 0) return;
    const staleServers: ServerItem[] = [];
    for (const s of servers) {
      if (s.cachedResources && !serverStats[s.id]) {
        setServerStats((prev) => ({ ...prev, [s.id]: s.cachedResources! }));
      }
      const age = s.cachedResourcesAt ? Date.now() - new Date(s.cachedResourcesAt).getTime() : Infinity;
      if (age > 2 * 60 * 1000) staleServers.push(s);
    }
    if (staleServers.length === 0) return;
    (async () => {
      for (const s of staleServers) {
        setStatsLoading((prev) => ({ ...prev, [s.id]: true }));
        try {
          const res = await fetch(`/api/deploy/servers/${s.id}/info`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "resources", refresh: true }),
          });
          const data = await res.json();
          if (!data.error && data.cpu) {
            setServerStats((prev) => ({ ...prev, [s.id]: data }));
          }
        } catch { }
        setStatsLoading((prev) => ({ ...prev, [s.id]: false }));
      }
    })();
  }, [servers]);

  // ─── Filters ───────────────────────────────────
  const filtered = projects.filter((p) => {
    if (filterServer !== "__all__" && p.server?.id !== filterServer) return false;
    if (filterStatus !== "__all__" && p.status !== filterStatus) return false;
    if (filterDomain === "with" && !p.domain) return false;
    if (filterDomain === "without" && p.domain) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !p.domain?.toLowerCase().includes(s) && !p.repo.toLowerCase().includes(s)) return false;
    }
    return true;
  }).sort((a, b) => {
    const aTime = new Date(a.latestCommitAt || a.lastDeployAt || a.updatedAt || a.createdAt).getTime();
    const bTime = new Date(b.latestCommitAt || b.lastDeployAt || b.updatedAt || b.createdAt).getTime();
    return bTime - aTime;
  });

  // ─── Actions ───────────────────────────────────
  async function handleAction(projectId: string, action: string) {
    if (action === "deploy" || action === "redeploy") {
      const p = projects.find((x) => x.id === projectId);
      if (p?.status === "deploying" || p?.status === "building") {
        toast.error("A deployment is already in progress for this app. Please wait until it completes.");
        return;
      }
      setRedeployTarget({
        id: projectId,
        name: p?.name || "Project",
        serverName: p?.server?.name || "server",
        action: action === "redeploy" ? "redeploy" : "deploy",
      });
      return;
    }
    const labelMap: Record<string, string> = {
      reconfiguration: "Running reconfiguration",
      "reload-server": "Reloading server",
      "fix-nginx": "Fixing Nginx",
    };
    const label = labelMap[action] || `${action.charAt(0).toUpperCase() + action.slice(1)}ing`;
    toast.info(`${label}...`);
    try {
      const res = await fetch(`/api/deploy/projects/${projectId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `${action} completed`);
      } else {
        toast.error(data.message || `${action} failed`);
      }
      loadAll();
    } catch {
      toast.error(`${action} failed`);
    }
  }

  async function handleDelete(projectId: string) {
    const res = await fetch(`/api/deploy/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Project deleted");
      loadAll();
    }
  }

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="server" className="w-full space-y-6">
        <TabsList>
          <TabsTrigger value="server">Servers & Deployments</TabsTrigger>
          <TabsTrigger value="domain">Domains</TabsTrigger>
        </TabsList>
        <TabsContent value="server" className="space-y-6 mt-0">
          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setShowNewDeploy(true)} className="rounded-xl gap-2">
              <Plus className="h-4 w-4" /> New Deployment
            </Button>
            <Button variant="outline" onClick={() => setShowAddServer(true)} className="rounded-xl gap-2">
              <Server className="h-4 w-4" /> Add Server
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowConnectGithub(true)}
              className={cn("rounded-xl gap-2", ghConnected && "border-emerald-300 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50")}
            >
              <Github className="h-4 w-4" />
              {ghConnected ? `GitHub (${ghUser})` : "Connect GitHub"}
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search apps, domains, repos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64 rounded-xl"
                />
              </div>
              <Button variant="ghost" size="icon" onClick={loadAll} className="rounded-xl">
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={filterServer} onValueChange={setFilterServer}>
              <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="All Servers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Servers</SelectItem>
                {servers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                {["running", "stopped", "deploying", "failed", "pending"].map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDomain} onValueChange={setFilterDomain}>
              <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="Domain Filter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Domains</SelectItem>
                <SelectItem value="with">With Domain</SelectItem>
                <SelectItem value="without">Without Domain</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Server health cards */}
          {servers.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {servers.map((s) => {
                  const stats = serverStats[s.id];
                  const isLoading = statsLoading[s.id];
                  const alerts: string[] = [];
                  if (stats) {
                    if (stats.memory.percent > 85) alerts.push("High memory");
                    if (stats.disk.percent > 80) alerts.push("Low disk");
                  }
                  const serverProjects = projects.filter((p) => p.server?.id === s.id);
                  const appCount = serverProjects.length;
                  return (
                    <div key={s.id} className="rounded-xl border bg-card space-y-0 group relative">
                      {alerts.length > 0 && (
                        <div className="absolute -top-2 -right-2 flex gap-1 z-10">
                          {alerts.map((a) => (
                            <span key={a} className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">{a}</span>
                          ))}
                        </div>
                      )}

                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={cn("h-2 w-2 rounded-full", s.status === "connected" ? "bg-emerald-500" : s.status === "error" ? "bg-red-500" : "bg-neutral-300")} />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Settings className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setShowServerApps(s)}>
                                  <Rocket className="h-4 w-4 mr-2" /> View Apps
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(`/terminal?server=${s.id}&name=${encodeURIComponent(s.name)}&ip=${encodeURIComponent(s.ip)}`, "_blank")}>
                                  <Terminal className="h-4 w-4 mr-2" /> Terminal
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setEditServer(s)}>
                                  <Pencil className="h-4 w-4 mr-2" /> Edit Server
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSetupServerId(s.id)}>
                                  <Settings className="h-4 w-4 mr-2" /> Settings
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground font-mono">{s.ip}</p>
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            onClick={() => setShowServerApps(s)}
                          >
                            {appCount} app{appCount !== 1 ? "s" : ""} · <span className="underline underline-offset-2">view all</span>
                          </button>
                        </div>

                        {isLoading && !stats ? (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading stats...
                          </div>
                        ) : stats ? (
                          <div className="space-y-1.5 pt-1 border-t">
                            <div className="flex items-center gap-2 text-[10px]">
                              <Cpu className="h-3 w-3 text-blue-500 shrink-0" />
                              <span className="w-12 text-muted-foreground font-medium">CPU</span>
                              <span className="text-muted-foreground">{stats.cpu.cores} cores</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              <MemoryStick className="h-3 w-3 text-purple-500 shrink-0" />
                              <span className="w-12 text-muted-foreground font-medium">Mem</span>
                              <MiniBar percent={stats.memory.percent} />
                              <span className={cn("font-semibold tabular-nums w-8 text-right", stats.memory.percent > 85 ? "text-red-600" : stats.memory.percent > 60 ? "text-amber-600" : "text-muted-foreground")}>{stats.memory.percent}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              <HardDrive className="h-3 w-3 text-amber-500 shrink-0" />
                              <span className="w-12 text-muted-foreground font-medium">Disk</span>
                              <MiniBar percent={stats.disk.percent} />
                              <span className={cn("font-semibold tabular-nums w-8 text-right", stats.disk.percent > 80 ? "text-red-600" : stats.disk.percent > 60 ? "text-amber-600" : "text-muted-foreground")}>{stats.disk.percent}%</span>
                            </div>
                            <p className="text-[9px] text-muted-foreground/60 truncate pt-0.5">
                              {formatBytesCompact(stats.memory.used)}/{formatBytesCompact(stats.memory.total)} RAM · {formatBytesCompact(stats.disk.used)}/{formatBytesCompact(stats.disk.total)} Disk
                            </p>
                          </div>
                        ) : null}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Projects ~ grouped by server */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Rocket className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">No deployments yet</p>
              <Button onClick={() => setShowNewDeploy(true)} className="rounded-xl gap-2">
                <Plus className="h-4 w-4" /> Create your first deployment
              </Button>
            </div>
          ) : (() => {
            const grouped: Record<string, { server: { id: string; name: string; ip: string } | null; items: typeof filtered }> = {};
            filtered.forEach((p) => {
              const key = p.server?.id || "__none__";
              if (!grouped[key]) {
                grouped[key] = { server: p.server, items: [] };
              }
              grouped[key].items.push(p);
            });
            return (
              <div className="space-y-6">
                {Object.entries(grouped).map(([key, { server, items }]) => (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm">{server?.name || "Unassigned"}</h3>
                        {server?.ip && <span className="text-xs text-muted-foreground font-mono">{server.ip}</span>}
                        <Badge variant="secondary" className="text-[10px]">{items.length} app{items.length !== 1 ? "s" : ""}</Badge>
                      </div>
                      {server && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowServerApps(servers.find(s => s.id === server.id) || server as any)}>
                          View all
                        </Button>
                      )}
                    </div>
                    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-3", items.length > 6 && "max-h-[600px] overflow-y-auto pr-1")}>
                      {items.map((p) => (
                        <ProjectCard
                          key={p.id}
                          project={p}
                          onAction={handleAction}
                          onDelete={handleDelete}
                          onViewLogs={() => setShowLogs({ projectId: p.id, projectName: p.name })}
                          onEdit={() => setEditDeployId(p.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </TabsContent>
        <TabsContent value="domain" className="space-y-6 mt-0">
          <DomainsTab
            domainProviders={domainProviders}
            onManageDns={(domain, zoneId, providerId, providerName) => setManageDnsTarget({ domain, zoneId, providerId, providerName })}
            onConnectProvider={(provider) => setShowConnectDomain({ open: true, provider })}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {manageDnsTarget && (
        <ManageDnsDialog
          open={!!manageDnsTarget}
          onOpenChange={(o) => { if (!o) setManageDnsTarget(null); }}
          target={manageDnsTarget}
        />
      )}
      {showNewDeploy && (
        <NewDeployWizard
          open={showNewDeploy}
          onOpenChange={setShowNewDeploy}
          servers={servers}
          domainProviders={domainProviders}
          onComplete={loadAll}
          onDeploy={(id, pName, sName) => {
            setRedeployTarget({ id, name: pName, serverName: sName, action: "deploy" });
          }}
        />
      )}
      {showAddServer && (
        <AddServerDialog
          open={showAddServer}
          onOpenChange={setShowAddServer}
          onComplete={loadAll}
        />
      )}
      {showConnectGithub && (
        <ConnectGitHubDialog
          open={showConnectGithub}
          onOpenChange={setShowConnectGithub}
          onComplete={loadAll}
        />
      )}
      {showConnectDomain.open && (
        <ConnectDomainDialog
          open={showConnectDomain.open}
          onOpenChange={(open) => setShowConnectDomain({ open, provider: undefined })}
          providers={domainProviders}
          onComplete={loadAll}
          defaultProvider={showConnectDomain.provider}
        />
      )}
      {showLogs && (
        <LogsDialog
          open={!!showLogs}
          onOpenChange={() => setShowLogs(null)}
          projectId={showLogs.projectId}
          projectName={showLogs.projectName}
        />
      )}
      {editServer && (
        <EditServerDialog
          open={!!editServer}
          onOpenChange={(o) => { if (!o) setEditServer(null); }}
          server={editServer}
          onComplete={loadAll}
        />
      )}
      {setupServerId && (
        <ServerSetupDialog
          open={!!setupServerId}
          onOpenChange={(o) => { if (!o) setSetupServerId(null); }}
          serverId={setupServerId}
          onComplete={loadAll}
          initialTab="services"
        />
      )}
      {showServerApps && (
        <ServerAppsDialog
          open={!!showServerApps}
          onOpenChange={(o) => { if (!o) setShowServerApps(null); }}
          serverId={showServerApps.id}
          serverName={showServerApps.name}
          serverIp={showServerApps.ip}
          projects={projects}
          onAction={handleAction}
          onDelete={handleDelete}
          onComplete={loadAll}
        />
      )}


      {editDeployId && (
        <EditDeploymentDialog
          open={!!editDeployId}
          onOpenChange={(o) => { if (!o) setEditDeployId(null); }}
          projectId={editDeployId}
          onComplete={loadAll}
          onRedeploy={(id, pName, sName) => {
            setEditDeployId(null);
            setRedeployTarget({ id, name: pName, serverName: sName, action: "redeploy" });
          }}
        />
      )}
      {redeployTarget && (
        <DeployProgressDialog
          open={!!redeployTarget}
          onOpenChange={(o) => { if (!o) { setRedeployTarget(null); loadAll(); } }}
          projectId={redeployTarget.id}
          projectName={redeployTarget.name}
          serverName={redeployTarget.serverName}
          action={redeployTarget.action}
        />
      )}
    </div>
  );
}

// ─── Project Card ────────────────────────────────
function ProjectCard({
  project,
  onAction,
  onDelete,
  onViewLogs,
  onEdit,
}: {
  project: DeployProjectItem;
  onAction: (id: string, action: string) => void;
  onDelete: (id: string) => void;
  onViewLogs: () => void;
  onEdit: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <div className="rounded-xl border bg-card hover:shadow-md transition-shadow">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm truncate">{project.name}</h4>
                <StatusBadge status={project.status} />
                {project.hasPendingCommit && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                    <GitCommitHorizontal className="h-2.5 w-2.5" /> New Commit
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <GitBranch className="h-3 w-3" /> {project.branch}
                </span>
                {project.domain && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> {project.domain}
                  </span>
                )}
                <span className="font-mono">:{project.port}</span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAction(project.id, "redeploy")}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Redeployment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction(project.id, "reconfiguration")}>
                  <Wrench className="h-4 w-4 mr-2" /> Reconfiguration
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction(project.id, "reload-server")}>
                  <Server className="h-4 w-4 mr-2" /> Reload Server
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onViewLogs}>
                  <Terminal className="h-4 w-4 mr-2" /> View Logs
                </DropdownMenuItem>
                {project.domain && (
                  <DropdownMenuItem onClick={() => window.open(`https://${project.domain}`, "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-2" /> Open Site
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Repo */}
          <p className="text-xs text-muted-foreground truncate font-mono">{project.repo}</p>

          {/* Metrics */}
          <div className="flex items-center gap-4 text-xs">
            {project.cpuUsage !== undefined && (
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3 text-muted-foreground" />
                <span className={cn(project.cpuUsage > 80 ? "text-red-600 font-semibold" : "text-muted-foreground")}>
                  {project.cpuUsage.toFixed(1)}%
                </span>
              </span>
            )}
            {project.memoryUsage !== undefined && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <MemoryStick className="h-3 w-3" /> {project.memoryUsage}MB
              </span>
            )}
            {project.diskUsage && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <HardDrive className="h-3 w-3" /> {project.diskUsage}
              </span>
            )}
            {project.server && (
              <span className="flex items-center gap-1 text-muted-foreground ml-auto">
                <Server className="h-3 w-3" /> {project.server.name}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t">
            <div className="text-[10px] text-muted-foreground min-w-0 flex-1 mr-2">
              {(project.latestCommitAt || project.lastDeployAt) ? (
                <div className="space-y-0.5">
                  {/* Deployed commit */}
                  {project.lastDeployCommit && (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-600" />
                      <code className="bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded text-[9px] font-mono">{project.lastDeployCommit}</code>
                      {project.deployedCommitAuthor && <span className="text-muted-foreground/70">{project.deployedCommitAuthor}</span>}
                      {project.lastDeployAt && <span className="text-muted-foreground/50">{formatTimeAgo(new Date(project.lastDeployAt))}</span>}
                    </span>
                  )}
                  {/* Pending commit indicator */}
                  {project.hasPendingCommit && project.latestCommitSha && (
                    <span className="flex items-center gap-1.5">
                      <GitCommitHorizontal className="h-2.5 w-2.5 shrink-0 text-amber-500" />
                      <code className="bg-amber-50 text-amber-700 px-1 py-0.5 rounded text-[9px] font-mono">{project.latestCommitSha.slice(0, 7)}</code>
                      <span className="text-amber-600 font-medium">pending</span>
                      {project.latestCommitAuthor && <span className="text-muted-foreground/70">{project.latestCommitAuthor}</span>}
                      {project.latestCommitAt && <span className="text-muted-foreground/50">{formatTimeAgo(new Date(project.latestCommitAt))}</span>}
                    </span>
                  )}
                  {/* Latest commit message */}
                  {project.latestCommitMessage && (
                    <p className="truncate text-[9px] text-muted-foreground/50 italic">{project.latestCommitMessage}</p>
                  )}
                  {/* Fallback: no commit data but has deploy date */}
                  {!project.lastDeployCommit && !project.latestCommitSha && project.lastDeployAt && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Deployed {formatTimeAgo(new Date(project.lastDeployAt))}
                    </span>
                  )}
                </div>
              ) : (
                <span className="italic">Never deployed</span>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs rounded-lg gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => onAction(project.id, "redeploy")}
            >
              <RefreshCw className="h-3 w-3" /> Redeploy
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete deployment?"
        description={`This will remove "${project.name}" from the dashboard. The server files will not be deleted automatically.`}
        onConfirm={() => { onDelete(project.id); setConfirmDelete(false); }}
      />
    </>
  );
}

// ─── New Deploy Wizard ───────────────────────────
const DEPLOY_STEP_DEFS = [
  { id: "connect", label: "Connecting to server" },
  { id: "clone", label: "Cloning repository" },
  { id: "env", label: "Setting up environment" },
  { id: "build", label: "Installing & building" },
  { id: "pm2", label: "Starting application" },
  { id: "nginx", label: "Configuring domain" },
  { id: "ssl", label: "Setting up SSL" },
  { id: "verify", label: "Verifying deployment" },
];

const STEP_LABELS = ["Server", "Repository", "Configure"];

function NewDeployWizard({
  open,
  onOpenChange,
  servers,
  domainProviders,
  onComplete,
  onDeploy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  servers: ServerItem[];
  domainProviders: DomainProviderItem[];
  onComplete: () => void;
  onDeploy: (projectId: string, projectName: string, serverName: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Domain configuration
  const [domainMode, setDomainMode] = useState<"manual" | "auto">("manual");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [configuringDns, setConfiguringDns] = useState(false);
  const [dnsConfigured, setDnsConfigured] = useState(false);

  // Step 1: Server
  const [serverId, setServerId] = useState("");

  // Step 2: Repo
  const [ghOrgs, setGhOrgs] = useState<{ login: string }[]>([]);
  const [ghRepos, setGhRepos] = useState<GhRepo[]>([]);
  const [ghBranches, setGhBranches] = useState<GhBranch[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("__personal__");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [loadingGh, setLoadingGh] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [ghUser, setGhUser] = useState("");

  // Step 3: Configure (port + env + config)
  const [appName, setAppName] = useState("");
  const [cloneDir, setCloneDir] = useState("");
  const [autoPort, setAutoPort] = useState(true);
  const [manualPort, setManualPort] = useState("");
  const [suggestedPort, setSuggestedPort] = useState<number | null>(null);
  const [domain, setDomain] = useState("");
  const [framework, setFramework] = useState("node");
  const [installCmd, setInstallCmd] = useState("npm install");
  const [buildCmd, setBuildCmd] = useState("");
  const [startCmd, setStartCmd] = useState("npm start");
  const [envContent, setEnvContent] = useState("");

  // Load GitHub user + orgs on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/deploy/github?action=verify").then((r) => r.json()).catch(() => null),
      fetch("/api/deploy/github?action=orgs").then((r) => r.json()).catch(() => null),
    ]).then(([verifyData, orgsData]) => {
      if (verifyData?.user) setGhUser(verifyData.user.login);
      if (orgsData?.orgs) setGhOrgs(orgsData.orgs);
    });
  }, []);

  async function loadRepos(org: string) {
    setLoadingGh(true);
    try {
      const url = org === "__personal__"
        ? "/api/deploy/github?action=repos"
        : `/api/deploy/github?action=repos&org=${org}`;
      const res = await fetch(url);
      const data = await res.json();
      setGhRepos(data.repos || []);
    } catch { toast.error("Failed to load repos"); }
    finally { setLoadingGh(false); }
  }

  async function loadBranches(fullName: string) {
    setLoadingGh(true);
    try {
      const [owner, repo] = fullName.split("/");
      const res = await fetch(`/api/deploy/github?action=branches&owner=${owner}&repo=${repo}`);
      const data = await res.json();
      setGhBranches(data.branches || []);
    } catch { toast.error("Failed to load branches"); }
    finally { setLoadingGh(false); }
  }

  // Auto-load repos when entering step 2 or changing org
  useEffect(() => {
    if (step === 2) loadRepos(selectedOrg);
  }, [step, selectedOrg]);

  // Auto-suggest port when entering step 3
  useEffect(() => {
    if (step === 3 && serverId) {
      fetch(`/api/deploy/projects?serverId=${serverId}`)
        .then((r) => r.json())
        .then((d) => {
          const usedPorts = (d.projects || []).map((p: any) => p.port);
          for (let p = 3000; p <= 5000; p++) {
            if (!usedPorts.includes(p)) { setSuggestedPort(p); break; }
          }
        })
        .catch(() => { });
    }
  }, [step, serverId]);

  // Auto-fill app name from repo
  useEffect(() => {
    if (selectedRepo && !appName) {
      const repoName = selectedRepo.split("/").pop() || "";
      setAppName(repoName);
    }
  }, [selectedRepo]);

  // Auto-suggest clone dir
  useEffect(() => {
    if (appName && serverId) {
      const s = servers.find((sv) => sv.id === serverId);
      const user = s?.sshUser || "root";
      const pm2 = appName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 50);
      const suggested = user === "root" ? `/root/apps/${pm2}` : `/home/${user}/apps/${pm2}`;
      if (!cloneDir || cloneDir.match(/^\/(home\/\w+|root)\/apps\/[a-z0-9-]*$/)) {
        setCloneDir(suggested);
      }
    }
  }, [appName, serverId, servers]);


  const filteredRepos = repoSearch
    ? ghRepos.filter((r) => r.name.toLowerCase().includes(repoSearch.toLowerCase()) || r.fullName.toLowerCase().includes(repoSearch.toLowerCase()))
    : ghRepos;

  async function handleDeploy() {
    if (!appName.trim()) { toast.error("App name is required"); return; }
    if (!serverId) { toast.error("Select a server"); return; }
    if (!selectedRepo) { toast.error("Select a repository"); return; }
    if (!selectedBranch) { toast.error("Select a branch"); return; }
    if (autoPort && !suggestedPort) { toast.error("No auto port available. Enter a manual port."); return; }
    if (!autoPort && !manualPort) { toast.error("Enter a port number"); return; }
    if (!domain.trim()) { toast.error("Domain or subdomain is required"); return; }

    setSaving(true);
    try {
      const createRes = await fetch("/api/deploy/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: appName.trim(),
          serverId,
          repo: selectedRepo,
          branch: selectedBranch,
          githubOrg: selectedOrg !== "__personal__" ? selectedOrg : undefined,
          domain: domain.trim(),
          port: autoPort ? suggestedPort : Number(manualPort),
          framework,
          buildCommand: [installCmd.trim(), buildCmd.trim()].filter(Boolean).join(" && ") || "",
          startCommand: startCmd,
          envContent,
          appDir: cloneDir.trim() || undefined,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.message || "Failed to create project");

      const sName = servers.find((s) => s.id === serverId)?.name || "server";
      onOpenChange(false);
      onComplete();
      setTimeout(() => onDeploy(createData.project.id, appName.trim(), sName), 100);
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" /> New Deployment
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 py-2">
          {STEP_LABELS.map((label, i) => {
            const s = i + 1;
            return (
              <div key={s} className="flex items-center gap-1.5 flex-1">
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors shrink-0",
                  step > s ? "bg-emerald-500 text-white border-emerald-500" :
                    step === s ? "bg-primary text-primary-foreground border-primary" :
                      "border-muted text-muted-foreground"
                )}>
                  {step > s ? <CheckCircle2 className="h-3.5 w-3.5" /> : s}
                </div>
                <span className={cn("text-xs font-medium hidden sm:block", step === s ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                {s < 4 && <div className={cn("flex-1 h-0.5 rounded", step > s ? "bg-emerald-500" : "bg-muted")} />}
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Select Server ── */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <Label className="text-base font-semibold">Select Server</Label>
            {servers.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Server className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No servers configured yet.</p>
                <p className="text-xs text-muted-foreground">Add a server first using the "Add Server" button.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {servers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setServerId(s.id)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                      serverId === s.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-neutral-300"
                    )}
                  >
                    <Server className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{s.ip} · {s.sshUser}</p>
                    </div>
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", s.status === "connected" ? "bg-emerald-500" : "bg-neutral-300")} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Select Repository ── */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            {/* Source selector: Personal or Org */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Select Source</Label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setSelectedOrg("__personal__"); setSelectedRepo(""); setSelectedBranch(""); }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    selectedOrg === "__personal__" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-neutral-300"
                  )}
                >
                  <User className="h-4 w-4" />
                  {ghUser || "Personal"}
                </button>
                {ghOrgs.map((o) => (
                  <button
                    key={o.login}
                    onClick={() => { setSelectedOrg(o.login); setSelectedRepo(""); setSelectedBranch(""); }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                      selectedOrg === o.login ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-neutral-300"
                    )}
                  >
                    <Github className="h-4 w-4" />
                    {o.login}
                  </button>
                ))}
              </div>
            </div>

            {/* Repo list with search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Repository</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search repos..."
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    className="pl-8 h-8 w-48 rounded-lg text-xs"
                  />
                </div>
              </div>
              {loadingGh ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading repositories...
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {ghRepos.length === 0 ? "No repositories found. Connect GitHub first." : "No repos match your search."}
                </div>
              ) : (
                <ScrollArea className="h-52 border rounded-xl">
                  <div className="p-2 space-y-1">
                    {filteredRepos.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => { setSelectedRepo(r.fullName); setSelectedBranch(r.defaultBranch); loadBranches(r.fullName); }}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-lg text-left text-sm transition-colors",
                          selectedRepo === r.fullName ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted"
                        )}
                      >
                        <GitBranch className="h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.language || "~"} · {r.private ? <><Lock className="inline h-3 w-3" /> Private</> : "Public"}</p>
                        </div>
                        {selectedRepo === r.fullName && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Branch selector */}
            {selectedRepo && ghBranches.length > 0 && (
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {ghBranches.map((b) => (
                      <SelectItem key={b.name} value={b.name}>
                        <span className="flex items-center gap-2">
                          <GitBranch className="h-3.5 w-3.5" /> {b.name}
                          <span className="text-xs text-muted-foreground font-mono">({b.sha})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Configure ── */}
        {step === 3 && (
          <div className="space-y-5 py-4">
            {/* App info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>App Name <span className="text-red-500">*</span></Label>
                <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="my-app" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Framework</Label>
                <Select value={framework} onValueChange={(v) => {
                  setFramework(v);
                  if (v === "nextjs") { setInstallCmd("npm install"); setBuildCmd("npm run build"); setStartCmd("npm start"); }
                  else if (v === "node") { setInstallCmd("npm install"); setBuildCmd(""); setStartCmd("npm start"); }
                  else { setInstallCmd(""); setBuildCmd(""); setStartCmd(""); }
                }}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nextjs">Next.js</SelectItem>
                    <SelectItem value="node">Node.js</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clone directory */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" /> Clone Directory
              </Label>
              <Input
                value={cloneDir}
                onChange={(e) => setCloneDir(e.target.value)}
                placeholder="/home/user/apps/my-app"
                className="rounded-xl font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Where to clone the repo on the server</p>
            </div>

            {/* Port */}
            <div className="space-y-3">
              <Label className="font-semibold">Port <span className="text-red-500">*</span></Label>
              <div className="flex gap-3">
                <button
                  onClick={() => setAutoPort(true)}
                  className={cn(
                    "flex-1 p-3 rounded-xl border text-left transition-all space-y-0.5",
                    autoPort ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-neutral-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-semibold text-sm">Auto</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Next available{suggestedPort && <span className="text-primary font-mono ml-1">→ :{suggestedPort}</span>}
                  </p>
                </button>
                <button
                  onClick={() => setAutoPort(false)}
                  className={cn(
                    "flex-1 p-3 rounded-xl border text-left transition-all space-y-0.5",
                    !autoPort ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-neutral-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Pencil className="h-3.5 w-3.5 text-blue-500" />
                    <span className="font-semibold text-sm">Manual</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Custom port number</p>
                </button>
              </div>
              {!autoPort && (
                <Input
                  type="number"
                  value={manualPort}
                  onChange={(e) => setManualPort(e.target.value)}
                  placeholder="e.g. 3000"
                  className="rounded-xl font-mono"
                  min={1024}
                  max={65535}
                />
              )}
            </div>

            {/* Domain */}
            <div className="space-y-3">
              <Label>Domain / Subdomain <span className="text-red-500">*</span></Label>
              {domainProviders.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDomainMode("auto"); setDomain(""); setDnsConfigured(false); }}
                    className={cn(
                      "flex-1 p-3 rounded-xl border text-left transition-all space-y-0.5",
                      domainMode === "auto" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-neutral-300"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-semibold text-sm">Auto DNS</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Configure from connected provider</p>
                  </button>
                  <button
                    onClick={() => { setDomainMode("manual"); setDnsConfigured(false); }}
                    className={cn(
                      "flex-1 p-3 rounded-xl border text-left transition-all space-y-0.5",
                      domainMode === "manual" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-neutral-300"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Pencil className="h-3.5 w-3.5 text-blue-500" />
                      <span className="font-semibold text-sm">Manual</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Enter domain yourself</p>
                  </button>
                </div>
              )}

              {domainMode === "manual" || domainProviders.length === 0 ? (
                <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="app.example.com" className="rounded-xl" />
              ) : (
                <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
                  {/* Provider select */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Provider</Label>
                    <select
                      value={selectedProvider}
                      onChange={(e) => {
                        setSelectedProvider(e.target.value);
                        setSelectedDomain("");
                        setSelectedZoneId("");
                        setSubdomain("");
                        setDnsConfigured(false);
                      }}
                      className="w-full h-9 rounded-xl border bg-background px-3 text-sm"
                    >
                      <option value="">Select provider...</option>
                      {domainProviders.map((p) => (
                        <option key={p.id} value={p.id}>
                          {DOMAIN_PROVIDER_META[p.provider]?.label || p.provider} ~ {p.name} ({p.domainCount} domains)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Domain select */}
                  {selectedProvider && (() => {
                    const prov = domainProviders.find((p) => p.id === selectedProvider);
                    if (!prov) return null;
                    return (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Domain</Label>
                        <select
                          value={selectedDomain}
                          onChange={(e) => {
                            const d = e.target.value;
                            setSelectedDomain(d);
                            const zid = prov.cachedDomains.find((cd) => cd.domain === d)?.zoneId || "";
                            setSelectedZoneId(zid);
                            setDnsConfigured(false);
                            if (!subdomain) setDomain(d);
                            else setDomain(`${subdomain}.${d}`);
                          }}
                          className="w-full h-9 rounded-xl border bg-background px-3 text-sm"
                        >
                          <option value="">Select domain...</option>
                          {prov.cachedDomains.map((d) => (
                            <option key={d.domain} value={d.domain}>{d.domain}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}

                  {/* Subdomain input */}
                  {selectedDomain && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Subdomain <span className="text-muted-foreground font-normal">(leave empty for root domain)</span></Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={subdomain}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^a-z0-9-]/gi, "").toLowerCase();
                            setSubdomain(v);
                            setDomain(v ? `${v}.${selectedDomain}` : selectedDomain);
                            setDnsConfigured(false);
                          }}
                          placeholder="e.g. app, api, staging"
                          className="rounded-xl font-mono flex-1"
                        />
                        <span className="text-sm text-muted-foreground shrink-0">.{selectedDomain}</span>
                      </div>
                    </div>
                  )}

                  {/* Configure DNS button */}
                  {selectedDomain && serverId && (
                    <div className="pt-1">
                      {dnsConfigured ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          DNS record created for {domain}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-xl gap-2"
                          disabled={configuringDns}
                          onClick={async () => {
                            setConfiguringDns(true);
                            try {
                              const res = await fetch("/api/deploy/domains/configure", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  providerId: selectedProvider,
                                  domain: selectedDomain,
                                  zoneId: selectedZoneId,
                                  subdomain: subdomain || undefined,
                                  serverId,
                                }),
                              });
                              const data = await res.json();
                              if (data.ok) {
                                toast.success(data.message);
                                setDnsConfigured(true);
                                setDomain(data.fullDomain);
                              } else {
                                toast.error(data.message || "DNS configuration failed");
                              }
                            } catch {
                              toast.error("Failed to configure DNS");
                            } finally {
                              setConfiguringDns(false);
                            }
                          }}
                        >
                          {configuringDns ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                          Create A Record → {domain || selectedDomain}
                        </Button>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Points {domain || selectedDomain} to your server. DNS may take a few minutes to propagate.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Install, Build & Start */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Install Command</Label>
                <Input value={installCmd} onChange={(e) => setInstallCmd(e.target.value)} placeholder="npm install" className="rounded-xl font-mono text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Build Command{" "}
                    {framework === "nextjs" ? (
                      <span className="text-xs text-amber-600 font-normal">(required for Next.js)</span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-normal">(optional for Node.js)</span>
                    )}
                  </Label>
                  <Input value={buildCmd} onChange={(e) => setBuildCmd(e.target.value)}
                    placeholder={framework === "nextjs" ? "npm run build" : "leave empty to skip"}
                    className="rounded-xl font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label>Start Command</Label>
                  <Input value={startCmd} onChange={(e) => setStartCmd(e.target.value)} placeholder="npm start" className="rounded-xl font-mono text-xs" />
                </div>
              </div>
              {/* Auto PM2 Command Preview */}
              {(() => {
                const prt = autoPort ? (suggestedPort || "PORT") : (manualPort || "PORT");
                const svcName = appName ? appName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 50) : "app-name";
                const cmd = startCmd?.trim() || "npm start";
                let preview: string;
                if (cmd === "npm start" || cmd === "npm run start") {
                  preview = `PORT=${prt} pm2 start npm --name "${svcName}" -- start`;
                } else if (cmd.startsWith("npm run ")) {
                  const script = cmd.replace(/^npm run\s+/, "");
                  preview = `PORT=${prt} pm2 start npm --name "${svcName}" -- run ${script}`;
                } else {
                  preview = `PORT=${prt} pm2 start ${cmd} --name "${svcName}"`;
                }
                return (
                  <div className="rounded-xl border bg-muted/30 p-3 space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">PM2 command that will run on server</p>
                    <code className="block text-xs font-mono text-foreground bg-muted px-3 py-2 rounded-lg break-all select-all">{preview}</code>
                  </div>
                );
              })()}
            </div>

            {/* Environment Variables */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Environment Variables</Label>
                <span className="text-[10px] text-muted-foreground">Paste your .env content below</span>
              </div>
              <Textarea
                value={envContent}
                onChange={(e) => setEnvContent(e.target.value)}
                placeholder={"# Paste your .env content here\nDATABASE_URL=mongodb://...\nAPI_KEY=your-key\nNODE_ENV=production"}
                className="rounded-xl font-mono text-xs min-h-[120px] resize-y"
                spellCheck={false}
              />
              {envContent.trim() && (
                <p className="text-[10px] text-muted-foreground">
                  {envContent.trim().split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length} variables detected
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="rounded-xl">Back</Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1 && !serverId) { toast.error("Select a server"); return; }
                if (step === 2 && !selectedRepo) { toast.error("Select a repository"); return; }
                if (step === 2 && !selectedBranch) { toast.error("Select a branch"); return; }
                setStep(step + 1);
              }}
              className="rounded-xl gap-2"
            >
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleDeploy} disabled={saving} className="rounded-xl gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              {saving ? "Creating..." : "Deploy"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Server Dialog ───────────────────────────
function AddServerDialog({
  open, onOpenChange, onComplete,
}: { open: boolean; onOpenChange: (o: boolean) => void; onComplete: () => void }) {
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [sshUser, setSshUser] = useState("root");
  const [sshPort, setSshPort] = useState("22");
  const [authMethod, setAuthMethod] = useState("key");
  const [privateKey, setPrivateKey] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [addedServerId, setAddedServerId] = useState<string | null>(null);
  const [showFreshPrompt, setShowFreshPrompt] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [keyFileName, setKeyFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setKeyFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPrivateKey(reader.result);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleSave() {
    if (!name.trim() || !ip.trim()) { toast.error("Name and IP required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/deploy/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ip, sshUser, sshPort: Number(sshPort) || 22, authMethod, privateKey, password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message); return; }
      toast.success("Server added");
      setAddedServerId(data.server.id);
      setShowFreshPrompt(true);
      onComplete();
    } catch { toast.error("Failed to add server"); }
    finally { setSaving(false); }
  }

  async function handleTest(serverId: string) {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult(data);
    } catch { setTestResult({ ok: false, error: "Connection failed" }); }
    finally { setTesting(false); }
  }

  if (showSetup && addedServerId) {
    return (
      <ServerSetupDialog
        open={true}
        onOpenChange={(o) => { if (!o) { setShowSetup(false); onOpenChange(false); } }}
        serverId={addedServerId}
        onComplete={onComplete}
      />
    );
  }

  if (showFreshPrompt) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" /> Server Added Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-xl border-2 border-dashed border-muted p-6 text-center space-y-3">
              <Download className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <div>
                <p className="font-semibold text-sm">Is this a fresh server?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  If yes, we can install all required services (Nginx, Node.js, PM2, Certbot) in one click.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Skip, I'll do it later
            </Button>
            <Button onClick={() => setShowSetup(true)} className="rounded-xl gap-2">
              <Settings className="h-4 w-4" /> Yes, Setup Server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Server className="h-5 w-5" /> Add Server</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Server Name <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>IP Address <span className="text-red-500">*</span></Label>
              <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="143.198.x.x" className="rounded-xl font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>SSH User</Label>
              <Input value={sshUser} onChange={(e) => setSshUser(e.target.value)} className="rounded-xl font-mono" />
            </div>
            <div className="space-y-2">
              <Label>SSH Port</Label>
              <Input type="number" value={sshPort} onChange={(e) => setSshPort(e.target.value)} className="rounded-xl font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Auth Method</Label>
              <Select value={authMethod} onValueChange={setAuthMethod}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="key">SSH Key</SelectItem>
                  <SelectItem value="password">Password</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {authMethod === "key" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>SSH Private Key</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs rounded-lg gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3 w-3" /> Upload .pem file
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pem,.key,.pub,.ppk,.id_rsa,*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              {keyFileName && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate font-mono">{keyFileName}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-auto shrink-0"
                    onClick={() => { setKeyFileName(null); setPrivateKey(""); }}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <textarea
                value={privateKey}
                onChange={(e) => { setPrivateKey(e.target.value); setKeyFileName(null); }}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;Paste your key or upload a .pem file above"
                className="w-full h-28 rounded-xl border bg-background px-3 py-2 font-mono text-xs resize-none"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl" />
            </div>
          )}

          {testResult && (
            <div className={cn("rounded-xl border p-3 text-xs space-y-1", testResult.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
              <p className="font-semibold">{testResult.ok ? "Connection Successful" : "Connection Failed"}</p>
              {testResult.ok ? (
                <>
                  <p>OS: {testResult.os}</p>
                  <p>Node: {testResult.node}</p>
                  <p>Nginx: {testResult.nginx ? "Installed" : "Not found"}</p>
                  <p>Free Disk: {testResult.disk}</p>
                </>
              ) : (
                <p className="text-red-600">{testResult.error}</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl">
            {saving ? "Adding..." : "Add Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Connect GitHub Dialog ───────────────────────
function ConnectGitHubDialog({
  open, onOpenChange, onComplete,
}: { open: boolean; onOpenChange: (o: boolean) => void; onComplete: () => void }) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [connected, setConnected] = useState(false);
  const [ghUser, setGhUser] = useState<{ login: string; avatar_url?: string; name?: string } | null>(null);
  const [orgs, setOrgs] = useState<{ login: string; avatar_url?: string }[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoadingInitial(true);
    Promise.all([
      fetch("/api/deploy/settings").then((r) => r.json()).catch(() => null),
      fetch("/api/deploy/github?action=verify").then((r) => r.json()).catch(() => null),
      fetch("/api/deploy/github?action=orgs").then((r) => r.json()).catch(() => null),
    ]).then(([settings, verifyData, orgsData]) => {
      if (settings?.settings?.githubConnected) {
        setConnected(true);
        if (verifyData?.user) setGhUser(verifyData.user);
        if (orgsData?.orgs) setOrgs(orgsData.orgs);
      }
      setLoadingInitial(false);
    });
  }, [open]);

  async function handleVerifyAndSave() {
    if (!token.trim()) { toast.error("Paste your GitHub token"); return; }
    setVerifying(true);
    try {
      const res = await fetch("/api/deploy/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubToken: token.trim() }),
      });
      if (!res.ok) { toast.error("Failed to save token"); return; }

      const [verifyRes, orgsRes] = await Promise.all([
        fetch("/api/deploy/github?action=verify"),
        fetch("/api/deploy/github?action=orgs"),
      ]);
      const verifyData = await verifyRes.json();
      const orgsData = await orgsRes.json();

      if (!verifyData.connected) {
        toast.error("Token verification failed ~ check scopes (repo + read:org)");
        return;
      }

      setGhUser(verifyData.user);
      setOrgs(orgsData.orgs || []);
      setConnected(true);
      setToken("");
      toast.success(`Connected as ${verifyData.user.login}`);
      onComplete();
    } catch {
      toast.error("Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function handleDisconnect() {
    setSaving(true);
    try {
      await fetch("/api/deploy/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubToken: "" }),
      });
      setConnected(false);
      setGhUser(null);
      setOrgs([]);
      toast.success("GitHub disconnected");
      onComplete();
    } catch { toast.error("Failed to disconnect"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" /> Connect GitHub
          </DialogTitle>
        </DialogHeader>

        {loadingInitial ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : connected && ghUser ? (
          <div className="space-y-5 py-4">
            {/* Connected state */}
            <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg shrink-0">
                {ghUser.login.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{ghUser.name || ghUser.login}</p>
                <p className="text-xs text-emerald-700">@{ghUser.login}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs text-emerald-600 font-medium">Connected</span>
                </div>
              </div>
            </div>

            {/* Organisations */}
            {orgs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Organizations</Label>
                <div className="flex flex-wrap gap-2">
                  {orgs.map((o) => (
                    <span key={o.login} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-xs font-medium">
                      <Github className="h-3.5 w-3.5" /> {o.login}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Access info */}
            <div className="rounded-xl border p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">What this gives you</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Auto-list personal repos</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Auto-list organization repos</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Auto-list branches per repo</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Deploy directly from any repo</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-4">
            {/* Not connected state */}
            <div className="rounded-xl border-2 border-dashed border-muted p-6 text-center space-y-3">
              <Github className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <div>
                <p className="font-semibold text-sm">Connect your GitHub account</p>
                <p className="text-xs text-muted-foreground mt-1">One-click setup ~ paste your token and we auto-configure everything.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Personal Access Token <span className="text-red-500">*</span></Label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="rounded-xl font-mono text-xs"
                onKeyDown={(e) => { if (e.key === "Enter") handleVerifyAndSave(); }}
              />
              <p className="text-[10px] text-muted-foreground">
                Create at{" "}
                <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  github.com/settings/tokens
                </a>
                {" "}with <strong>repo</strong> + <strong>read:org</strong> scopes.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {connected ? (
            <>
              <Button variant="outline" onClick={handleDisconnect} disabled={saving} className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                {saving ? "Disconnecting..." : "Disconnect"}
              </Button>
              <Button onClick={() => onOpenChange(false)} className="rounded-xl">Done</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleVerifyAndSave} disabled={verifying || !token.trim()} className="rounded-xl gap-2">
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {verifying ? "Verifying..." : "Connect & Configure"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Connect Domain Provider Dialog ──────────────
function ConnectDomainDialog({
  open, onOpenChange, providers, onComplete, defaultProvider
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  providers: DomainProviderItem[];
  onComplete: () => void;
  defaultProvider?: string;
}) {
  const [tab, setTab] = useState<"list" | "add">(providers.length > 0 && !defaultProvider ? "list" : "add");
  const [name, setName] = useState("");
  const [provider, setProvider] = useState(defaultProvider || "cloudflare");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [apiEmail, setApiEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const meta = DOMAIN_PROVIDER_META[provider];
  const needsSecret = provider === "godaddy" || provider === "namecheap";
  const needsEmail = provider === "cloudflare";

  async function handleAdd() {
    if (!name.trim() || !apiKey.trim()) { toast.error("Name and API key required"); return; }
    if (needsSecret && !apiSecret.trim()) { toast.error(`${meta.fields[1]} is required`); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/deploy/domains/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          provider,
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim() || undefined,
          apiEmail: apiEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(`Connected! Found ${data.provider.domainCount} domains`);
        setName(""); setApiKey(""); setApiSecret(""); setApiEmail("");
        setTab("list");
        onComplete();
      } else {
        toast.error(data.message || "Failed to connect");
      }
    } catch { toast.error("Connection failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/deploy/domains/providers/${id}`, { method: "DELETE" });
      toast.success("Provider disconnected");
      onComplete();
    } catch { toast.error("Failed to disconnect"); }
  }

  async function handleRefresh(id: string) {
    try {
      const res = await fetch(`/api/deploy/domains/providers/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh-domains" }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Found ${data.domains?.length || 0} domains`);
        onComplete();
      } else {
        toast.error(data.message || "Refresh failed");
      }
    } catch { toast.error("Refresh failed"); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" /> Domain Providers
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          <button onClick={() => setTab("list")} className={cn("flex-1 py-1.5 text-sm rounded-lg transition-colors", tab === "list" ? "bg-background shadow font-medium" : "text-muted-foreground hover:text-foreground")}>
            Connected ({providers.length})
          </button>
          <button onClick={() => setTab("add")} className={cn("flex-1 py-1.5 text-sm rounded-lg transition-colors", tab === "add" ? "bg-background shadow font-medium" : "text-muted-foreground hover:text-foreground")}>
            Add Provider
          </button>
        </div>

        {tab === "list" ? (
          <div className="space-y-3 py-2">
            {providers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No providers connected</p>
                <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={() => setTab("add")}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Provider
                </Button>
              </div>
            ) : (
              providers.map((p) => {
                const m = DOMAIN_PROVIDER_META[p.provider];
                return (
                  <div key={p.id} className={cn("p-4 rounded-xl border space-y-2", m?.color)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm">{p.name}</span>
                        <Badge variant="secondary" className="ml-2 text-[10px]">{m?.label || p.provider}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => handleRefresh(p.id)}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.cachedDomains.slice(0, 8).map((d) => (
                        <span key={d.domain} className="text-[11px] bg-background/60 border rounded-md px-2 py-0.5 font-mono">{d.domain}</span>
                      ))}
                      {p.cachedDomains.length > 8 && (
                        <span className="text-[11px] text-muted-foreground">+{p.cachedDomains.length - 8} more</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Provider picker */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(DOMAIN_PROVIDER_META).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => { setProvider(key); setApiKey(""); setApiSecret(""); setApiEmail(""); }}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    provider === key ? `${m.color} ring-1 ring-current` : "hover:border-neutral-300"
                  )}
                >
                  <span className="font-semibold text-sm">{m.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`My ${meta.label} account`} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{meta.fields[0]}</Label>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Paste your ${meta.fields[0]}`}
                    className="rounded-xl pr-10 font-mono text-xs"
                  />
                  <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              {needsSecret && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{meta.fields[1]}</Label>
                  <Input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder={`Paste your ${meta.fields[1]}`}
                    className="rounded-xl font-mono text-xs"
                  />
                </div>
              )}
              {needsEmail && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Email <span className="text-muted-foreground font-normal">(only for Global API Key, not Bearer token)</span></Label>
                  <Input
                    value={apiEmail}
                    onChange={(e) => setApiEmail(e.target.value)}
                    placeholder="email@example.com (optional)"
                    className="rounded-xl text-xs"
                  />
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <p className="font-medium">How to get your API key:</p>
              {provider === "cloudflare" && <p>Go to <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="underline font-medium">Cloudflare API Tokens</a> → Create Token → Edit zone DNS → Use token.</p>}
              {provider === "godaddy" && <p>Go to <a href="https://developer.godaddy.com/keys" target="_blank" rel="noopener noreferrer" className="underline font-medium">GoDaddy Developer</a> → Create <strong>Production</strong> API Key (not OTE/Test). Note: GoDaddy requires 50+ domains for API access. If blocked, consider managing DNS through Cloudflare instead.</p>}
              {provider === "namecheap" && <p>Enable API access in <a href="https://ap.www.namecheap.com/Profile/Tools/ApiAccess" target="_blank" rel="noopener noreferrer" className="underline font-medium">Namecheap Profile</a> → API Access. Whitelist your server IP.</p>}
              {provider === "hostinger" && <p>Go to Hostinger Dashboard → API section to generate your token.</p>}
            </div>
          </div>
        )}

        <DialogFooter>
          {tab === "add" && (
            <Button onClick={handleAdd} disabled={saving} className="rounded-xl gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Verify & Connect
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Logs Dialog ─────────────────────────────────
function LogsDialog({
  open, onOpenChange, projectId, projectName,
}: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string; projectName: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsTab, setLogsTab] = useState<"deploy" | "pm2" | "server">("deploy");
  const [pm2Logs, setPm2Logs] = useState("");
  const [serverLogs, setServerLogs] = useState("");
  const [liveFetching, setLiveFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/deploy/projects/${projectId}/logs`)
      .then((r) => r.json())
      .then((d) => { setLogs(d.logs || []); if (d.logs?.[0]) setSelectedLog(d.logs[0]); })
      .finally(() => setLoading(false));
  }, [open, projectId]);

  useEffect(() => {
    if (!selectedLog || selectedLog.status !== "running") return;
    const iv = setInterval(async () => {
      const res = await fetch(`/api/deploy/projects/${projectId}/logs?logId=${selectedLog.id}`);
      const data = await res.json();
      if (data.log) setSelectedLog(data.log);
    }, 3000);
    return () => clearInterval(iv);
  }, [selectedLog, projectId]);

  async function fetchLiveLogs(type: "pm2" | "server") {
    setLiveFetching(true);
    try {
      const res = await fetch(`/api/deploy/projects/${projectId}/logs?type=${type}&lines=200`);
      const data = await res.json();
      if (type === "pm2") setPm2Logs(data.logs || "No PM2 logs available");
      else setServerLogs(data.logs || "No server logs available");
    } catch {
      if (type === "pm2") setPm2Logs("Failed to fetch PM2 logs");
      else setServerLogs("Failed to fetch server logs");
    } finally {
      setLiveFetching(false);
    }
  }

  useEffect(() => {
    if (!open || logsTab === "deploy") return;
    fetchLiveLogs(logsTab);
  }, [open, logsTab, projectId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" /> Logs ~ {projectName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 border-b pb-2">
          {(["deploy", "pm2", "server"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setLogsTab(tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                logsTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
              )}
            >
              {tab === "deploy" ? "Deploy History" : tab === "pm2" ? "PM2 Logs" : "Server Logs"}
            </button>
          ))}
          {logsTab !== "deploy" && (
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => fetchLiveLogs(logsTab)} disabled={liveFetching}>
              {liveFetching ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Refresh
            </Button>
          )}
        </div>

        {logsTab === "deploy" ? (
          <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
            <div className="w-48 shrink-0 overflow-y-auto border-r pr-3 space-y-1">
              {logs.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLog(l)}
                  className={cn(
                    "w-full text-left p-2 rounded-lg text-xs transition-colors",
                    selectedLog?.id === l.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {l.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                    {l.status === "success" && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                    {l.status === "failed" && <XCircle className="h-3 w-3 text-red-500" />}
                    <span className="font-medium capitalize">{l.action}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(l.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </button>
              ))}
            </div>
            <ScrollArea className="flex-1">
              {selectedLog ? (
                <pre className="text-xs font-mono whitespace-pre-wrap p-3 bg-neutral-950 text-neutral-100 rounded-xl min-h-[300px]">
                  {selectedLog.logs || "Waiting for output..."}
                  {selectedLog.status === "running" && <span className="animate-pulse">▊</span>}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground p-4">Select a log entry</p>
              )}
            </ScrollArea>
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <pre className="text-xs font-mono whitespace-pre-wrap p-3 bg-neutral-950 text-neutral-100 rounded-xl min-h-[300px]">
              {liveFetching ? "Loading logs..." : (logsTab === "pm2" ? pm2Logs : serverLogs) || "No logs available"}
            </pre>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Server Dialog ──────────────────────────
function EditServerDialog({
  open, onOpenChange, server, onComplete,
}: { open: boolean; onOpenChange: (o: boolean) => void; server: ServerItem; onComplete: () => void }) {
  const [name, setName] = useState(server.name);
  const [ip, setIp] = useState(server.ip);
  const [sshUser, setSshUser] = useState(server.sshUser);
  const [sshPort, setSshPort] = useState(String(server.sshPort || 22));
  const [authMethod, setAuthMethod] = useState(server.authMethod);
  const [privateKey, setPrivateKey] = useState("");
  const [password, setPassword] = useState("");
  const [maxDeploy, setMaxDeploy] = useState(String(server.maxDeploy));
  const [defaultNodeVersion, setDefaultNodeVersion] = useState(server.defaultNodeVersion);
  const [defaultNginxPath, setDefaultNginxPath] = useState(server.defaultNginxPath);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editKeyFileName, setEditKeyFileName] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [credsLoaded, setCredsLoaded] = useState(false);
  const [storedKey, setStoredKey] = useState<string | null>(null);
  const [storedPassword, setStoredPassword] = useState<string | null>(null);

  async function loadCredentials() {
    if (credsLoaded) return;
    setLoadingCreds(true);
    try {
      const res = await fetch(`/api/deploy/servers/${server.id}/info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "credentials" }),
      });
      if (!res.ok) { toast.error("Failed to load credentials"); return; }
      const data = await res.json();
      if (data.privateKey) setStoredKey(data.privateKey);
      if (data.password) setStoredPassword(data.password);
      setCredsLoaded(true);
    } catch { toast.error("Failed to load credentials"); }
    finally { setLoadingCreds(false); }
  }

  function downloadSshKey() {
    const keyData = privateKey.trim() || storedKey;
    if (!keyData) { toast.error("No SSH key available"); return; }
    const blob = new Blob([keyData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${server.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_ssh_key.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("SSH key downloaded");
  }

  function handleEditFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditKeyFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPrivateKey(reader.result);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleSave() {
    if (!name.trim() || !ip.trim()) { toast.error("Name and IP required"); return; }
    setSaving(true);
    try {
      const body: any = {
        name, ip, sshUser, sshPort: Number(sshPort) || 22,
        authMethod, maxDeploy: Number(maxDeploy) || 20,
        defaultNodeVersion, defaultNginxPath,
      };
      if (privateKey.trim()) body.privateKey = privateKey;
      if (password.trim()) body.password = password;

      const res = await fetch(`/api/deploy/servers/${server.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.message || "Failed"); return; }
      toast.success("Server updated");
      onComplete();
      onOpenChange(false);
    } catch { toast.error("Failed to update server"); }
    finally { setSaving(false); }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/deploy/servers/${server.id}/test`, { method: "POST" });
      setTestResult(await res.json());
    } catch { setTestResult({ ok: false, error: "Connection failed" }); }
    finally { setTesting(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/deploy/servers/${server.id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Server deleted"); onComplete(); onOpenChange(false); }
      else toast.error("Failed to delete");
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(false); }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" /> Edit Server ~ {server.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Server Name <span className="text-red-500">*</span></Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>IP Address <span className="text-red-500">*</span></Label>
                <Input value={ip} onChange={(e) => setIp(e.target.value)} className="rounded-xl font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>SSH User</Label>
                <Input value={sshUser} onChange={(e) => setSshUser(e.target.value)} className="rounded-xl font-mono" />
              </div>
              <div className="space-y-2">
                <Label>SSH Port</Label>
                <Input type="number" value={sshPort} onChange={(e) => setSshPort(e.target.value)} className="rounded-xl font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Auth Method</Label>
                <Select value={authMethod} onValueChange={setAuthMethod}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="key">SSH Key</SelectItem>
                    <SelectItem value="password">Password</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {authMethod === "key" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>SSH Private Key <span className="text-xs text-muted-foreground">(leave empty to keep existing)</span></Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs rounded-lg gap-1.5"
                      onClick={async () => {
                        if (!storedKey && !credsLoaded) await loadCredentials();
                      }}
                      disabled={loadingCreds || credsLoaded}
                    >
                      {loadingCreds ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                      {credsLoaded ? "Loaded" : "View Key"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs rounded-lg gap-1.5"
                      onClick={async () => {
                        if (!storedKey && !credsLoaded) await loadCredentials();
                        setTimeout(() => downloadSshKey(), credsLoaded ? 0 : 500);
                      }}
                    >
                      <Download className="h-3 w-3" /> Download
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs rounded-lg gap-1.5"
                      onClick={() => editFileInputRef.current?.click()}
                    >
                      <Upload className="h-3 w-3" /> Upload
                    </Button>
                  </div>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept=".pem,.key,.pub,.ppk,.id_rsa,*"
                    className="hidden"
                    onChange={handleEditFileUpload}
                  />
                </div>
                {editKeyFileName && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate font-mono">{editKeyFileName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-auto shrink-0"
                      onClick={() => { setEditKeyFileName(null); setPrivateKey(""); }}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {credsLoaded && storedKey && !privateKey.trim() && (
                  <div className="rounded-xl border bg-muted/50 p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Stored Key</span>
                    </div>
                    <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-20 overflow-y-auto">{storedKey}</pre>
                  </div>
                )}
                <textarea
                  value={privateKey}
                  onChange={(e) => { setPrivateKey(e.target.value); setEditKeyFileName(null); }}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;Paste your key or upload a .pem file above"
                  className="w-full h-24 rounded-xl border bg-background px-3 py-2 font-mono text-xs resize-none"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Password <span className="text-xs text-muted-foreground">(leave empty to keep existing)</span></Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs rounded-lg gap-1.5"
                    onClick={async () => {
                      if (!credsLoaded) await loadCredentials();
                      setShowPassword((v) => !v);
                    }}
                    disabled={loadingCreds}
                  >
                    {loadingCreds ? <Loader2 className="h-3 w-3 animate-spin" /> : showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showPassword ? "Hide" : "View"}
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={showPassword && storedPassword && !password ? storedPassword : "Enter new password"}
                    className="rounded-xl pr-10"
                  />
                  {showPassword && storedPassword && !password && (
                    <div className="mt-1.5 rounded-lg bg-muted/50 border px-3 py-1.5 text-xs font-mono text-muted-foreground">
                      Stored: {storedPassword}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Max Deployments</Label>
                <Input type="number" value={maxDeploy} onChange={(e) => setMaxDeploy(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Node Version</Label>
                <Input value={defaultNodeVersion} onChange={(e) => setDefaultNodeVersion(e.target.value)} className="rounded-xl font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Nginx Path</Label>
                <Input value={defaultNginxPath} onChange={(e) => setDefaultNginxPath(e.target.value)} className="rounded-xl font-mono text-xs" />
              </div>
            </div>

            {testResult && (
              <div className={cn("rounded-xl border p-3 text-xs space-y-1", testResult.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
                <p className="font-semibold">{testResult.ok ? "Connection Successful" : "Connection Failed"}</p>
                {testResult.ok ? (
                  <>
                    <p>OS: {testResult.os}</p>
                    <p>Node: {testResult.node}</p>
                    <p>Nginx: {testResult.nginx ? "Installed" : "Not found"}</p>
                    <p>Free Disk: {testResult.disk}</p>
                  </>
                ) : (
                  <p className="text-red-600">{testResult.error}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(true)} className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 mr-auto">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing} className="rounded-xl gap-2">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {testing ? "Testing..." : "Test Connection"}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete server?"
        description={`This will permanently remove "${server.name}" (${server.ip}). Projects using this server will need to be reassigned.`}
        onConfirm={() => { handleDelete(); setConfirmDelete(false); }}
      />
    </>
  );
}

// ─── Server Settings Dialog ──────────────────────
type SetupService = "upgrade" | "nginx" | "nodejs" | "pm2" | "certbot";
type ServiceStatus = "pending" | "checking" | "running" | "done" | "error" | "skipped";

const SERVICE_META: Record<SetupService, { label: string; description: string; icon: any }> = {
  upgrade: { label: "System Upgrade", description: "Update packages & upgrade OS", icon: RefreshCw },
  nginx: { label: "Nginx", description: "High-performance web server & reverse proxy", icon: Globe },
  nodejs: { label: "Node.js 20.x", description: "JavaScript runtime + npm", icon: Package },
  pm2: { label: "PM2", description: "Production process manager for Node.js", icon: MonitorCheck },
  certbot: { label: "Certbot", description: "Free SSL certificates via Let's Encrypt", icon: Shield },
};
const ALL_SERVICES: SetupService[] = ["upgrade", "nginx", "nodejs", "pm2", "certbot"];

interface PM2Process { name: string; pmId: number; status: string; cpu: number; memory: number; uptime: number; restarts: number; pid: number; mode: string; nodeVersion: string; }
interface FileItem { name: string; isDir: boolean; size: string; modified: string; perms: string; }
interface ResourceData { cpu: { cores: number; model: string }; memory: { total: number; used: number; percent: number }; disk: { total: number; used: number; percent: number }; uptime: string; topOutput: string; }

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

function ServerSetupDialog({
  open, onOpenChange, serverId, onComplete, initialTab,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  serverId: string;
  onComplete: () => void;
  initialTab?: string;
}) {
  const [activeTab, setActiveTab] = useState(initialTab || "services");
  const [email, setEmail] = useState("");
  const [selectedServices, setSelectedServices] = useState<Set<SetupService>>(new Set(ALL_SERVICES));
  const [serviceStatus, setServiceStatus] = useState<Record<SetupService, ServiceStatus>>(
    () => Object.fromEntries(ALL_SERVICES.map((s) => [s, "pending"])) as Record<SetupService, ServiceStatus>
  );
  const [serviceVersions, setServiceVersions] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [installing, setInstalling] = useState(false);
  const [checking, setChecking] = useState(true);
  const [allDone, setAllDone] = useState(false);

  // Files tab
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filePath, setFilePath] = useState("");
  const [filesLoading, setFilesLoading] = useState(false);
  const [homeDir, setHomeDir] = useState("");

  // PM2 tab
  const [pm2Processes, setPm2Processes] = useState<PM2Process[]>([]);
  const [pm2Loading, setPm2Loading] = useState(false);

  // Resources tab
  const [resources, setResources] = useState<ResourceData | null>(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Custom install
  const [customCmd, setCustomCmd] = useState("");
  const [customLogs, setCustomLogs] = useState<string[]>([]);
  const [customRunning, setCustomRunning] = useState(false);

  // Logs tab
  const [logSource, setLogSource] = useState("setup");
  const [pm2LogProcess, setPm2LogProcess] = useState("__all__");
  const [pm2LogOutput, setPm2LogOutput] = useState("");
  const [pm2LogsLoading, setPm2LogsLoading] = useState(false);

  // Login attempts tab
  const [loginAttempts, setLoginAttempts] = useState<{ success: boolean; user: string; ip: string; time: string }[]>([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginFilter, setLoginFilter] = useState<"all" | "success" | "failed">("all");

  // Load services check
  useEffect(() => {
    if (!open) return;
    setChecking(true);
    fetch(`/api/deploy/servers/${serverId}/setup`)
      .then((r) => r.json())
      .then((data) => {
        if (data.checks) {
          const newStatus: Record<string, ServiceStatus> = {};
          const newVersions: Record<string, string> = {};
          for (const [svc, info] of Object.entries(data.checks) as [string, { installed: boolean; version: string }][]) {
            if (info.installed) { newStatus[svc] = "done"; newVersions[svc] = info.version; }
            else { newStatus[svc] = "pending"; }
          }
          setServiceStatus((prev) => ({ ...prev, ...newStatus } as Record<SetupService, ServiceStatus>));
          setServiceVersions(newVersions);
        }
      })
      .catch(() => { })
      .finally(() => setChecking(false));
  }, [open, serverId]);

  // Load files
  async function loadFiles(dir: string) {
    setFilesLoading(true);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "files", path: dir }),
      });
      const data = await res.json();
      setFiles(data.files || []);
      setFilePath(data.path || dir);
    } catch { toast.error("Failed to load files"); }
    finally { setFilesLoading(false); }
  }

  // Load PM2
  async function loadPm2() {
    setPm2Loading(true);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pm2" }),
      });
      const data = await res.json();
      setPm2Processes(data.processes || []);
    } catch { toast.error("Failed to load PM2 data"); }
    finally { setPm2Loading(false); }
  }

  // Load resources
  async function loadResources(refresh = false) {
    setResourcesLoading(true);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resources", refresh }),
      });
      const data = await res.json();
      if (!data.error) setResources(data);
    } catch { toast.error("Failed to load resources"); }
    finally { setResourcesLoading(false); }
  }

  async function loadPm2Logs() {
    setPm2LogsLoading(true);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pm2-logs", processName: pm2LogProcess === "__all__" ? undefined : pm2LogProcess, lines: 150 }),
      });
      const data = await res.json();
      setPm2LogOutput(data.output || "No logs available");
    } catch { toast.error("Failed to load PM2 logs"); }
    finally { setPm2LogsLoading(false); }
  }

  async function loadLoginAttempts() {
    setLoginLoading(true);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login-attempts" }),
      });
      const data = await res.json();
      setLoginAttempts(data.attempts || []);
      if (data.error) toast.error(data.error);
    } catch { toast.error("Failed to load login attempts"); }
    finally { setLoginLoading(false); }
  }

  // Auto-load when switching tabs
  useEffect(() => {
    if (!open) return;
    if (activeTab === "logins" && loginAttempts.length === 0 && !loginLoading) loadLoginAttempts();
    if (activeTab === "files" && files.length === 0 && !filesLoading) {
      if (homeDir) {
        loadFiles(filePath || homeDir);
      } else {
        (async () => {
          try {
            const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "home-dir" }),
            });
            const data = await res.json();
            const dir = data.home || "/root";
            setHomeDir(dir);
            setFilePath(dir);
            loadFiles(dir);
          } catch {
            setHomeDir("/root");
            setFilePath("/root");
            loadFiles("/root");
          }
        })();
      }
    }
    if (activeTab === "pm2" && pm2Processes.length === 0) loadPm2();
    if (activeTab === "resources" && !resources) loadResources();
    if (activeTab === "logs" && logSource === "pm2" && !pm2LogOutput && !pm2LogsLoading) loadPm2Logs();
  }, [activeTab, open, logSource]);

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab || "services");
  }, [open, initialTab]);

  function toggleService(svc: SetupService) {
    if (installing) return;
    if (serviceStatus[svc] === "done") return;
    setSelectedServices((prev) => { const next = new Set(prev); if (next.has(svc)) next.delete(svc); else next.add(svc); return next; });
  }

  async function handleInstall() {
    const toInstall = ALL_SERVICES.filter((s) => selectedServices.has(s) && serviceStatus[s] !== "done");
    if (toInstall.length === 0) { toast.info("All selected services are already installed"); return; }
    if (toInstall.includes("certbot") && !email.trim()) { toast.error("Email is required for Certbot SSL registration"); return; }
    setInstalling(true); setAllDone(false); setLogs([]); setActiveTab("logs");
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/setup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: toInstall, email: email.trim() || undefined }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "start") { setServiceStatus((prev) => ({ ...prev, [evt.service]: "running" })); setLogs((prev) => [...prev, `\n━━━ Installing ${SERVICE_META[evt.service as SetupService]?.label || evt.service} ━━━`]); }
            else if (evt.type === "log") { setLogs((prev) => [...prev, evt.data]); }
            else if (evt.type === "done") { setServiceStatus((prev) => ({ ...prev, [evt.service]: "done" })); setServiceVersions((prev) => ({ ...prev, [evt.service]: evt.version || "" })); setLogs((prev) => [...prev, `✓ ${SERVICE_META[evt.service as SetupService]?.label || evt.service} installed ~ ${evt.version}`]); }
            else if (evt.type === "error") { setServiceStatus((prev) => ({ ...prev, [evt.service]: "error" })); setLogs((prev) => [...prev, `✗ ${SERVICE_META[evt.service as SetupService]?.label || evt.service} failed: ${evt.data}`]); }
            else if (evt.type === "complete") { setAllDone(true); }
          } catch { }
        }
      }
    } catch (err: any) { setLogs((prev) => [...prev, `\n✗ Setup failed: ${err.message}`]); }
    finally { setInstalling(false); onComplete(); }
  }

  async function handleCustomInstall() {
    if (!customCmd.trim()) return;
    setCustomRunning(true); setCustomLogs([]);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install-custom", command: customCmd }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "log" || evt.type === "done" || evt.type === "error") setCustomLogs((prev) => [...prev, evt.data]);
          } catch { }
        }
      }
    } catch (err: any) { setCustomLogs((prev) => [...prev, `Error: ${err.message}`]); }
    finally { setCustomRunning(false); }
  }

  const [pm2Acting, setPm2Acting] = useState<string | null>(null);
  async function handlePm2Action(processName: string, pmAction: "restart" | "stop" | "start" | "delete") {
    setPm2Acting(`${pmAction}-${processName}`);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pm2-action", pmAction, processName }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`${pmAction} "${processName}" succeeded`);
        loadPm2();
      } else {
        toast.error(data.message || `${pmAction} failed`);
      }
    } catch { toast.error(`Failed to ${pmAction} process`); }
    finally { setPm2Acting(null); }
  }

  function navigateToDir(dir: string) {
    const newPath = dir === ".." ? filePath.split("/").slice(0, -1).join("/") || "/" : `${filePath === "/" ? "" : filePath}/${dir}`;
    loadFiles(newPath);
  }

  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  async function handleFileDownload(fileName: string) {
    const fullPath = `${filePath === "/" ? "" : filePath}/${fileName}`;
    setDownloadingFile(fileName);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "download-file", path: fullPath }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "Download failed" }));
        toast.error(data.message || "Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${fileName}`);
    } catch { toast.error("Failed to download file"); }
    finally { setDownloadingFile(null); }
  }

  const pendingCount = ALL_SERVICES.filter((s) => selectedServices.has(s) && serviceStatus[s] !== "done").length;
  const doneCount = ALL_SERVICES.filter((s) => serviceStatus[s] === "done").length;

  const pm2TotalCpu = pm2Processes.reduce((a, p) => a + p.cpu, 0);
  const pm2TotalMem = pm2Processes.reduce((a, p) => a + p.memory, 0);

  // Optimization suggestions
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [optimizeResults, setOptimizeResults] = useState<Record<string, { ok: boolean; output: string }>>({});

  async function runOptimize(id: string, cmd: string) {
    setOptimizing(id);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "optimize", command: cmd }),
      });
      const data = await res.json();
      setOptimizeResults((prev) => ({ ...prev, [id]: { ok: data.ok, output: data.output || "" } }));
      if (data.ok) {
        toast.success("Optimization applied");
        loadResources(true);
        loadPm2();
      } else {
        toast.error(data.output ? `Failed: ${data.output.slice(0, 100)}` : "Optimization failed");
      }
    } catch { toast.error("Optimization failed"); }
    finally { setOptimizing(null); }
  }

  type Suggestion = { id: string; icon: any; title: string; desc: string; severity: "warn" | "info" | "good"; fixLabel?: string; fixCmd?: string };
  const suggestions: Suggestion[] = [];
  if (resources) {
    if (resources.memory.percent > 85) suggestions.push({
      id: "high-mem", icon: MemoryStick, title: "High memory usage",
      desc: `${resources.memory.percent}% used ~ clear caches & drop page cache to free memory`,
      severity: "warn", fixLabel: "Clear Caches", fixCmd: "sync && echo 3 | tee /proc/sys/vm/drop_caches > /dev/null && echo 'Page cache cleared' && free -h | head -2"
    });
    suggestions.push({
      id: "redis-cache-clear",
      icon: MemoryStick,
      title: "Clear Redis DB & cache",
      desc: "Clear system page cache, then flush Redis database and in-memory cache",
      severity: "info",
      fixLabel: "Clear Redis + Cache",
      fixCmd: "sync && echo 3 | tee /proc/sys/vm/drop_caches > /dev/null; if command -v redis-cli >/dev/null 2>&1; then (redis-cli FLUSHALL ASYNC 2>&1 || redis-cli flushall 2>&1); redis-cli MEMORY PURGE 2>/dev/null || true; echo 'Redis DB/cache cleared'; else echo 'redis-cli not found, skipped Redis flush'; fi; free -h | head -2"
    });
    if (resources.disk.percent > 80) suggestions.push({
      id: "low-disk", icon: HardDrive, title: "Disk space running low",
      desc: `${resources.disk.percent}% used ~ clean up logs, old journals, and package cache`,
      severity: "warn", fixLabel: "Clean Disk",
      fixCmd: "journalctl --vacuum-time=3d 2>/dev/null; rm -rf /tmp/* 2>/dev/null; command -v apt-get >/dev/null && apt-get autoremove -y && apt-get clean || (command -v dnf >/dev/null && dnf autoremove -y && dnf clean all || yum autoremove -y 2>/dev/null && yum clean all 2>/dev/null); find /var/log -name '*.gz' -delete 2>/dev/null; find /var/log -name '*.1' -delete 2>/dev/null; echo 'Cleanup done' && df -h /"
    });
    if (resources.memory.percent <= 85 && resources.disk.percent <= 80) {
      suggestions.push({
        id: "swap-check", icon: MemoryStick, title: "Check swap usage",
        desc: "Review swap configuration for optimal performance",
        severity: "info", fixLabel: "Optimize Swap", fixCmd: "swapon --show 2>/dev/null; echo '---'; cat /proc/sys/vm/swappiness; echo 'Current swappiness'; sysctl -w vm.swappiness=10 2>&1; echo 'Swappiness set to 10'"
      });
    }
  }
  pm2Processes.forEach((p) => {
    if (p.restarts > 10) suggestions.push({
      id: `restart-${p.name}`, icon: RotateCcw, title: `"${p.name}" restarting frequently`,
      desc: `${p.restarts} restarts ~ restart cleanly and flush logs`,
      severity: "warn", fixLabel: "Restart & Flush", fixCmd: `pm2 flush ${JSON.stringify(p.name)} && pm2 restart ${JSON.stringify(p.name)} && echo 'Restarted ${p.name}'`
    });
    if (p.memory > 500 * 1024 * 1024) suggestions.push({
      id: `mem-${p.name}`, icon: MemoryStick, title: `"${p.name}" using ${formatBytes(p.memory)}`,
      desc: "Restart to release memory & set max memory limit",
      severity: "info", fixLabel: "Restart Process", fixCmd: `pm2 restart ${JSON.stringify(p.name)} --max-memory-restart 512M && echo 'Restarted with 512M limit'`
    });
    if (p.status === "stopped") suggestions.push({
      id: `stopped-${p.name}`, icon: Square, title: `"${p.name}" is stopped`,
      desc: "Remove from PM2 to free resources, or start it back up",
      severity: "info", fixLabel: "Remove Process", fixCmd: `pm2 delete ${JSON.stringify(p.name)} && pm2 save && echo 'Removed ${p.name}'`
    });
  });

  if (suggestions.length === 0) {
    suggestions.push({
      id: "clean-general", icon: Wrench, title: "General cleanup",
      desc: "Clean system journals, temp files, and old logs",
      severity: "info", fixLabel: "Run Cleanup",
      fixCmd: "journalctl --vacuum-time=3d 2>/dev/null; rm -rf /tmp/* 2>/dev/null; find /var/log -name '*.gz' -delete 2>/dev/null; pm2 flush 2>/dev/null; echo 'Cleanup complete'"
    });
    suggestions.push({ id: "all-good", icon: CheckCircle2, title: "Looking good!", desc: "No critical optimization issues found", severity: "good" });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!installing && !customRunning) onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden rounded-2xl flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Server Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto shrink-0 -mx-1 px-1 pb-1 scrollbar-none" style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
            <TabsList className="inline-flex w-max gap-0.5 rounded-xl">
              <TabsTrigger value="services" className="rounded-lg gap-1 text-xs px-2.5 shrink-0"><Package className="h-3.5 w-3.5" /> Services</TabsTrigger>
              <TabsTrigger value="files" className="rounded-lg gap-1 text-xs px-2.5 shrink-0"><FolderOpen className="h-3.5 w-3.5" /> Files</TabsTrigger>
              <TabsTrigger value="pm2" className="rounded-lg gap-1 text-xs px-2.5 shrink-0"><Activity className="h-3.5 w-3.5" /> PM2</TabsTrigger>
              <TabsTrigger value="resources" className="rounded-lg gap-1 text-xs px-2.5 shrink-0"><Cpu className="h-3.5 w-3.5" /> Resources</TabsTrigger>
              <TabsTrigger value="install" className="rounded-lg gap-1 text-xs px-2.5 shrink-0"><Download className="h-3.5 w-3.5" /> Install</TabsTrigger>
              <TabsTrigger value="optimize" className="rounded-lg gap-1 text-xs px-2.5 shrink-0"><Lightbulb className="h-3.5 w-3.5" /> Optimize</TabsTrigger>
              <TabsTrigger value="logs" className="rounded-lg gap-1 text-xs px-2.5 shrink-0"><Terminal className="h-3.5 w-3.5" /> Logs</TabsTrigger>
              <TabsTrigger value="logins" className="rounded-lg gap-1 text-xs px-2.5 shrink-0"><Shield className="h-3.5 w-3.5" /> Logins</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg gap-1 text-xs px-2.5 shrink-0"><Settings className="h-3.5 w-3.5" /> Settings</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Services Tab ── */}
          <TabsContent value="services" className="flex-1 min-h-0 overflow-y-auto space-y-4 py-3">
            {checking ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><span className="ml-2 text-sm text-muted-foreground">Checking installed services...</span></div>
            ) : (
              <>
                <div className="space-y-2">
                  {ALL_SERVICES.map((svc) => {
                    const meta = SERVICE_META[svc]; const Icon = meta.icon;
                    const status = serviceStatus[svc]; const isSelected = selectedServices.has(svc);
                    const isDone = status === "done"; const isRunning = status === "running";
                    return (
                      <button key={svc} onClick={() => toggleService(svc)} disabled={installing || isDone}
                        className={cn("w-full flex items-center gap-4 p-3 rounded-xl border text-left transition-all",
                          isDone ? "border-emerald-200 bg-emerald-50/50 opacity-80" : isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-neutral-300",
                          isRunning && "border-blue-300 bg-blue-50/50 ring-1 ring-blue-300"
                        )}>
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                          isDone ? "bg-emerald-100 text-emerald-600" : isRunning ? "bg-blue-100 text-blue-600" : status === "error" ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground"
                        )}>{isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{meta.label}</span>
                            {isDone && <Badge variant="secondary" className="text-[10px] h-4 bg-emerald-100 text-emerald-700 border-0">Installed</Badge>}
                            {isRunning && <Badge variant="secondary" className="text-[10px] h-4 bg-blue-100 text-blue-700 border-0">Installing...</Badge>}
                            {status === "error" && <Badge variant="secondary" className="text-[10px] h-4 bg-red-100 text-red-700 border-0">Failed</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{meta.description}</p>
                          {isDone && serviceVersions[svc] && <p className="text-[10px] font-mono text-emerald-600 mt-0.5">{serviceVersions[svc]}</p>}
                        </div>
                        <div className="shrink-0">
                          {isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : status === "error" ? <XCircle className="h-5 w-5 text-red-500" /> : (
                            <div className={cn("h-5 w-5 rounded-md border-2 transition-colors", isSelected ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                              {isSelected && <CheckCircle2 className="h-full w-full text-white" />}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedServices.has("certbot") && serviceStatus["certbot"] !== "done" && (
                  <div className="rounded-xl border bg-amber-50/50 border-amber-200 p-4 space-y-2">
                    <Label className="text-xs font-semibold text-amber-800 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Email for SSL (Certbot)</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className="rounded-xl text-sm" />
                  </div>
                )}
                {pendingCount > 0 && (
                  <Button onClick={handleInstall} disabled={installing || checking} className="w-full rounded-xl gap-2">
                    {installing ? <><Loader2 className="h-4 w-4 animate-spin" /> Installing...</> : <><Download className="h-4 w-4" /> Install Selected ({pendingCount})</>}
                  </Button>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Files Tab ── */}
          <TabsContent value="files" className="flex-1 min-h-0 overflow-hidden flex flex-col py-2 gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-lg" onClick={() => navigateToDir("..")} disabled={filePath === "/"}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <div className="flex-1 bg-muted rounded-lg px-3 py-1.5 text-xs font-mono truncate">{filePath || "Loading..."}</div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-lg" onClick={() => loadFiles(filePath)}>
                <RefreshCw className={cn("h-3.5 w-3.5", filesLoading && "animate-spin")} />
              </Button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: "Home", path: homeDir || "/root" },
                { label: "/", path: "/" },
                { label: "/var/www", path: "/var/www" },
                { label: "/etc", path: "/etc" },
                { label: "/etc/nginx", path: "/etc/nginx" },
                { label: "/var/log", path: "/var/log" },
                { label: "/opt", path: "/opt" },
              ].map((q) => (
                <Button
                  key={q.path}
                  variant={filePath === q.path ? "secondary" : "outline"}
                  size="sm"
                  className="h-6 text-[10px] rounded-md px-2"
                  onClick={() => loadFiles(q.path)}
                  disabled={filesLoading}
                >
                  {q.label}
                </Button>
              ))}
            </div>
            <ScrollArea className="flex-1 border rounded-xl">
              {filesLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : files.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">Empty directory</div>
              ) : (
                <div className="divide-y">
                  {files.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1)).map((f) => (
                    <div key={f.name} className="flex items-center hover:bg-muted/50 transition-colors">
                      <button onClick={() => f.isDir && navigateToDir(f.name)}
                        className={cn("flex-1 flex items-center gap-3 px-3 py-2 text-left text-xs", f.isDir && "cursor-pointer")}>
                        {f.isDir ? <Folder className="h-4 w-4 text-blue-500 shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span className={cn("font-medium flex-1 truncate", f.isDir && "text-blue-700")}>{f.name}</span>
                        <span className="text-muted-foreground shrink-0 w-16 text-right">{f.size}</span>
                        <span className="text-muted-foreground shrink-0 w-28 text-right">{f.modified}</span>
                        {f.isDir && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      </button>
                      {!f.isDir && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 mr-2 shrink-0 rounded-lg"
                          onClick={() => handleFileDownload(f.name)} disabled={downloadingFile === f.name}>
                          {downloadingFile === f.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── PM2 Tab ── */}
          <TabsContent value="pm2" className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{pm2Processes.length} process{pm2Processes.length !== 1 ? "es" : ""} · CPU: {pm2TotalCpu.toFixed(1)}% · Mem: {formatBytes(pm2TotalMem)}</p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={async () => {
                  try { const res = await fetch(`/api/deploy/servers/${serverId}/info`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pm2-restart-all" }) }); const d = await res.json(); if (d.ok) { toast.success("All processes restarted"); loadPm2(); } else toast.error(d.message || "Failed"); } catch { toast.error("Failed"); }
                }}><RotateCcw className="h-3 w-3" /> Restart All</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={async () => {
                  try { const res = await fetch(`/api/deploy/servers/${serverId}/info`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pm2-flush" }) }); const d = await res.json(); if (d.ok) toast.success("PM2 logs flushed"); else toast.error(d.message || "Failed"); } catch { toast.error("Failed"); }
                }}><Trash2 className="h-3 w-3" /> Flush Logs</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={async () => {
                  try { const res = await fetch(`/api/deploy/servers/${serverId}/info`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pm2-save" }) }); const d = await res.json(); if (d.ok) toast.success("PM2 process list saved"); else toast.error(d.message || "Failed"); } catch { toast.error("Failed"); }
                }}><Download className="h-3 w-3" /> Save</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={loadPm2}>
                  <RefreshCw className={cn("h-3 w-3", pm2Loading && "animate-spin")} /> Refresh
                </Button>
              </div>
            </div>
            {pm2Loading && pm2Processes.length === 0 ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : pm2Processes.length === 0 ? (
              <div className="text-center py-12 space-y-2"><Activity className="h-8 w-8 mx-auto text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No PM2 processes running</p></div>
            ) : (
              <div className="space-y-2">
                {pm2Processes.map((p) => (
                  <div key={p.pmId} className="rounded-xl border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full shrink-0", p.status === "online" ? "bg-emerald-500" : p.status === "stopped" ? "bg-neutral-400" : "bg-red-500")} />
                        <span className="font-semibold text-sm">{p.name}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 border-0">{p.mode}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-mono mr-2">PID {p.pid} · id {p.pmId}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" title="Restart"
                          disabled={pm2Acting === `restart-${p.name}`}
                          onClick={() => handlePm2Action(p.name, "restart")}>
                          {pm2Acting === `restart-${p.name}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        </Button>
                        {p.status === "online" ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-amber-600 hover:text-amber-700" title="Stop"
                            disabled={pm2Acting === `stop-${p.name}`}
                            onClick={() => handlePm2Action(p.name, "stop")}>
                            {pm2Acting === `stop-${p.name}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3" />}
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-emerald-600 hover:text-emerald-700" title="Start"
                            disabled={pm2Acting === `start-${p.name}`}
                            onClick={() => handlePm2Action(p.name, "start")}>
                            {pm2Acting === `start-${p.name}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-red-500 hover:text-red-600" title="Delete"
                          disabled={pm2Acting === `delete-${p.name}`}
                          onClick={() => handlePm2Action(p.name, "delete")}>
                          {pm2Acting === `delete-${p.name}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <Cpu className="h-3 w-3 text-muted-foreground" />
                        <span className={cn(p.cpu > 50 ? "text-amber-600 font-semibold" : p.cpu > 80 ? "text-red-600 font-semibold" : "text-muted-foreground")}>{p.cpu.toFixed(1)}%</span>
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground"><MemoryStick className="h-3 w-3" /> {formatBytes(p.memory)}</span>
                      <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> {formatUptime(p.uptime)}</span>
                      <span className={cn("flex items-center gap-1", p.restarts > 5 ? "text-amber-600" : "text-muted-foreground")}><RotateCcw className="h-3 w-3" /> {p.restarts} restarts</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", p.cpu > 80 ? "bg-red-500" : p.cpu > 50 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(p.cpu, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Resources Tab ── */}
          <TabsContent value="resources" className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{resources?.uptime || ""}</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => loadResources(true)}>
                <RefreshCw className={cn("h-3 w-3", resourcesLoading && "animate-spin")} /> Refresh
              </Button>
            </div>
            {resourcesLoading && !resources ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : resources ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {/* CPU */}
                  <div className="rounded-xl border p-4 space-y-2">
                    <div className="flex items-center gap-2"><Cpu className="h-4 w-4 text-blue-500" /><span className="text-xs font-semibold">CPU</span></div>
                    <p className="text-lg font-bold">{resources.cpu.cores} cores</p>
                    <p className="text-[10px] text-muted-foreground truncate">{resources.cpu.model || "Unknown"}</p>
                  </div>
                  {/* Memory */}
                  <div className="rounded-xl border p-4 space-y-2">
                    <div className="flex items-center gap-2"><MemoryStick className="h-4 w-4 text-purple-500" /><span className="text-xs font-semibold">Memory</span></div>
                    <p className="text-lg font-bold">{resources.memory.percent}%</p>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(resources.memory.used)} / {formatBytes(resources.memory.total)}</p>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={cn("h-full rounded-full", resources.memory.percent > 85 ? "bg-red-500" : resources.memory.percent > 60 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${resources.memory.percent}%` }} /></div>
                  </div>
                  {/* Disk */}
                  <div className="rounded-xl border p-4 space-y-2">
                    <div className="flex items-center gap-2"><HardDrive className="h-4 w-4 text-amber-500" /><span className="text-xs font-semibold">Disk</span></div>
                    <p className="text-lg font-bold">{resources.disk.percent}%</p>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(resources.disk.used)} / {formatBytes(resources.disk.total)}</p>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={cn("h-full rounded-full", resources.disk.percent > 85 ? "bg-red-500" : resources.disk.percent > 60 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${resources.disk.percent}%` }} /></div>
                  </div>
                </div>
                {resources.topOutput && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Top Processes</Label>
                    <pre className="text-[10px] font-mono bg-neutral-950 text-neutral-100 rounded-xl p-3 overflow-x-auto whitespace-pre">{resources.topOutput}</pre>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-sm text-muted-foreground">Failed to load resources</div>
            )}
          </TabsContent>

          {/* ── Custom Install Tab ── */}
          <TabsContent value="install" className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Install Custom Service</Label>
              <p className="text-[10px] text-muted-foreground">Run any apt/npm/pip install command on the server. Commands run as root with DEBIAN_FRONTEND=noninteractive.</p>
              <div className="flex gap-2">
                <Input value={customCmd} onChange={(e) => setCustomCmd(e.target.value)} placeholder="e.g. apt-get install -y redis-server" className="rounded-xl font-mono text-xs flex-1" onKeyDown={(e) => { if (e.key === "Enter" && !customRunning) handleCustomInstall(); }} />
                <Button onClick={handleCustomInstall} disabled={customRunning || !customCmd.trim()} className="rounded-xl gap-2 shrink-0">
                  {customRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {customRunning ? "Running..." : "Run"}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Quick Install</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Redis", cmd: "PKG=$(command -v apt-get >/dev/null 2>&1 && echo 'apt-get install -y' || (command -v dnf >/dev/null 2>&1 && echo 'dnf install -y' || echo 'yum install -y')) && $PKG redis-server 2>/dev/null || $PKG redis && systemctl enable redis-server 2>/dev/null || systemctl enable redis && redis-server --version" },
                  { label: "MySQL", cmd: "PKG=$(command -v apt-get >/dev/null 2>&1 && echo 'apt-get install -y' || (command -v dnf >/dev/null 2>&1 && echo 'dnf install -y' || echo 'yum install -y')) && $PKG mysql-server 2>/dev/null || $PKG mysql-community-server && systemctl enable mysqld 2>/dev/null || systemctl enable mysql && mysql --version" },
                  { label: "PostgreSQL", cmd: "PKG=$(command -v apt-get >/dev/null 2>&1 && echo 'apt-get install -y' || (command -v dnf >/dev/null 2>&1 && echo 'dnf install -y' || echo 'yum install -y')) && $PKG postgresql postgresql-contrib 2>/dev/null || $PKG postgresql-server postgresql && systemctl enable postgresql && psql --version" },
                  { label: "Docker", cmd: "curl -fsSL https://get.docker.com | sh && docker --version" },
                  { label: "Git", cmd: "PKG=$(command -v apt-get >/dev/null 2>&1 && echo 'apt-get install -y' || (command -v dnf >/dev/null 2>&1 && echo 'dnf install -y' || echo 'yum install -y')) && $PKG git && git --version" },
                  { label: "FFmpeg", cmd: "PKG=$(command -v apt-get >/dev/null 2>&1 && echo 'apt-get install -y' || (command -v dnf >/dev/null 2>&1 && echo 'dnf install -y' || echo 'yum install -y')) && $PKG ffmpeg && ffmpeg -version | head -1" },
                  { label: "Python 3", cmd: "PKG=$(command -v apt-get >/dev/null 2>&1 && echo 'apt-get install -y' || (command -v dnf >/dev/null 2>&1 && echo 'dnf install -y' || echo 'yum install -y')) && $PKG python3 python3-pip && python3 --version" },
                  { label: "htop", cmd: "PKG=$(command -v apt-get >/dev/null 2>&1 && echo 'apt-get install -y' || (command -v dnf >/dev/null 2>&1 && echo 'dnf install -y' || echo 'yum install -y')) && $PKG htop && htop --version" },
                ].map((q) => (
                  <Button key={q.label} variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={() => { setCustomCmd(q.cmd); }}>
                    {q.label}
                  </Button>
                ))}
              </div>
            </div>
            {customLogs.length > 0 && (
              <ScrollArea className="h-[250px]">
                <pre className="text-xs font-mono whitespace-pre-wrap p-3 bg-neutral-950 text-neutral-100 rounded-xl">
                  {customLogs.join("\n")}
                  {customRunning && <span className="animate-pulse text-blue-400"> ▊</span>}
                </pre>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ── Optimize Tab ── */}
          <TabsContent value="optimize" className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground">Optimization Suggestions</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => { setOptimizeResults({}); loadResources(true); loadPm2(); }}>
                <RefreshCw className="h-3 w-3" /> Re-analyze
              </Button>
            </div>
            <div className="space-y-2">
              {suggestions.map((s) => {
                const Icon = s.icon;
                const result = optimizeResults[s.id];
                const isRunning = optimizing === s.id;
                return (
                  <div key={s.id} className={cn("rounded-xl border overflow-hidden",
                    s.severity === "warn" ? "border-amber-200 bg-amber-50/50" : s.severity === "good" ? "border-emerald-200 bg-emerald-50/50" : "border-muted")}>
                    <div className="flex items-start gap-3 p-3">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                        s.severity === "warn" ? "bg-amber-100 text-amber-600" : s.severity === "good" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600")}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.desc}</p>
                      </div>
                      {s.fixCmd && (
                        <Button
                          size="sm"
                          variant={result?.ok ? "outline" : "default"}
                          className={cn("shrink-0 rounded-lg gap-1.5 text-xs h-8",
                            result?.ok && "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100")}
                          disabled={isRunning || result?.ok === true}
                          onClick={() => runOptimize(s.id, s.fixCmd!)}
                        >
                          {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : result?.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}
                          {isRunning ? "Running..." : result?.ok ? "Done" : s.fixLabel}
                        </Button>
                      )}
                    </div>
                    {result && (
                      <div className={cn("border-t px-3 py-2", result.ok ? "bg-emerald-50/50 border-emerald-200" : "bg-red-50/50 border-red-200")}>
                        <pre className="text-[10px] font-mono whitespace-pre-wrap max-h-24 overflow-y-auto text-muted-foreground">{result.output}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Logs Tab ── */}
          <TabsContent value="logs" className="flex-1 min-h-0 flex flex-col gap-2 py-2">
            <div className="flex items-center gap-2">
              <Select value={logSource} onValueChange={(v) => setLogSource(v)}>
                <SelectTrigger className="h-7 w-40 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="setup">Setup Logs</SelectItem>
                  <SelectItem value="pm2">PM2 Logs</SelectItem>
                </SelectContent>
              </Select>
              {logSource === "pm2" && (
                <>
                  <Select value={pm2LogProcess} onValueChange={setPm2LogProcess}>
                    <SelectTrigger className="h-7 w-36 rounded-lg text-xs"><SelectValue placeholder="All processes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Processes</SelectItem>
                      {pm2Processes.map((p) => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={loadPm2Logs}>
                    <RefreshCw className={cn("h-3 w-3", pm2LogsLoading && "animate-spin")} /> Refresh
                  </Button>
                </>
              )}
            </div>
            <ScrollArea className="flex-1 min-h-[360px]">
              {logSource === "setup" ? (
                <pre className="text-xs font-mono whitespace-pre-wrap p-4 bg-neutral-950 text-neutral-100 rounded-xl min-h-[350px]">
                  {logs.length === 0 ? <span className="text-neutral-500">No install logs yet. Install services to see output here.</span> : logs.join("\n")}
                  {installing && <span className="animate-pulse text-blue-400"> ▊</span>}
                  {allDone && !installing && <span className="text-emerald-400">{"\n\n"}━━━ Setup complete ━━━</span>}
                </pre>
              ) : (
                <pre className="text-xs font-mono whitespace-pre-wrap p-4 bg-neutral-950 text-neutral-100 rounded-xl min-h-[350px]">
                  {pm2LogsLoading ? <span className="text-neutral-500">Loading PM2 logs...</span> : pm2LogOutput ? pm2LogOutput : <span className="text-neutral-500">No PM2 logs available. Click refresh to load.</span>}
                </pre>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── Login Attempts Tab ── */}
          <TabsContent value="logins" className="flex-1 min-h-0 overflow-hidden flex flex-col py-2 gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select value={loginFilter} onValueChange={(v: any) => setLoginFilter(v)}>
                  <SelectTrigger className="h-7 w-28 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground">
                  {loginAttempts.filter((a) => loginFilter === "all" || (loginFilter === "success" ? a.success : !a.success)).length} entries
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={loadLoginAttempts}>
                <RefreshCw className={cn("h-3 w-3", loginLoading && "animate-spin")} /> Refresh
              </Button>
            </div>
            <ScrollArea className="flex-1 border rounded-xl">
              {loginLoading && loginAttempts.length === 0 ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : loginAttempts.length === 0 ? (
                <div className="text-center py-12 space-y-2"><Shield className="h-8 w-8 mx-auto text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No login attempts found</p></div>
              ) : (
                <div className="divide-y">
                  <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0">
                    <span className="w-14">Status</span>
                    <span className="flex-1">Username</span>
                    <span className="w-32">IP Address</span>
                    <span className="w-36 text-right">Time</span>
                  </div>
                  {loginAttempts.filter((a) => loginFilter === "all" || (loginFilter === "success" ? a.success : !a.success)).map((a, i) => (
                    <div key={i} className={cn("flex items-center gap-3 px-3 py-2 text-xs", !a.success && "bg-red-50/30")}>
                      <span className="w-14">
                        {a.success ? (
                          <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-100 text-emerald-700 border-0 px-1.5">OK</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] h-4 bg-red-100 text-red-700 border-0 px-1.5">FAIL</Badge>
                        )}
                      </span>
                      <span className="flex-1 font-mono font-medium truncate flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />{a.user}
                      </span>
                      <span className="w-32 font-mono text-muted-foreground">{a.ip}</span>
                      <span className="w-36 text-right text-muted-foreground">{a.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── Settings Tab ── */}
          <TabsContent value="settings" className="flex-1 min-h-0 overflow-y-auto py-3 space-y-4">
            <ServerSettingsPanel serverId={serverId} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => { if (!installing && !customRunning) onOpenChange(false); }} className="rounded-xl" disabled={installing || customRunning}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Server Settings Panel ──────────────────────
function ServerSettingsPanel({ serverId }: { serverId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [sshUser, setSshUser] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [authMethod, setAuthMethod] = useState("key");
  const [defaultNginxPath, setDefaultNginxPath] = useState("/etc/nginx");
  const [maxDeploy, setMaxDeploy] = useState("20");
  const [showCreds, setShowCreds] = useState(false);
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [credsLoading, setCredsLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/deploy/servers/${serverId}`)
      .then((r) => r.json())
      .then((data) => {
        const s = data.server || data;
        if (!s) return;
        setName(s.name || "");
        setIp(s.ip || "");
        setSshUser(s.sshUser || "root");
        setSshPort(String(s.sshPort || 22));
        setAuthMethod(s.authMethod || "key");
        setDefaultNginxPath(s.defaultNginxPath || "/etc/nginx");
        setMaxDeploy(String(s.maxDeploy || 20));
      })
      .catch(() => toast.error("Failed to load server"))
      .finally(() => setLoading(false));
  }, [serverId]);

  async function loadCredentials() {
    setCredsLoading(true);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "credentials" }),
      });
      const data = await res.json();
      setPassword(data.password || "");
      setPrivateKey(data.privateKey || "");
      setShowCreds(true);
    } catch { toast.error("Failed to load credentials"); }
    finally { setCredsLoading(false); }
  }

  async function handleSave() {
    if (!name.trim() || !ip.trim()) { toast.error("Name and IP are required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, ip, sshUser, sshPort: Number(sshPort) || 22,
          authMethod, defaultNginxPath, maxDeploy: Number(maxDeploy) || 20,
        }),
      });
      if (res.ok) toast.success("Server settings saved");
      else { const d = await res.json().catch(() => ({})); toast.error(d.message || "Save failed"); }
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Server Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">IP Address</Label>
          <Input value={ip} onChange={(e) => setIp(e.target.value)} className="rounded-xl font-mono" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">SSH User</Label>
          <Input value={sshUser} onChange={(e) => setSshUser(e.target.value)} className="rounded-xl font-mono" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">SSH Port</Label>
          <Input value={sshPort} onChange={(e) => setSshPort(e.target.value)} type="number" className="rounded-xl font-mono" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Auth Method</Label>
          <Select value={authMethod} onValueChange={setAuthMethod}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="key">SSH Key</SelectItem>
              <SelectItem value="password">Password</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Nginx Path</Label>
          <Input value={defaultNginxPath} onChange={(e) => setDefaultNginxPath(e.target.value)} className="rounded-xl font-mono text-xs" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Max Deployments</Label>
          <Input value={maxDeploy} onChange={(e) => setMaxDeploy(e.target.value)} type="number" className="rounded-xl font-mono" />
        </div>
      </div>

      <div className="rounded-xl border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Credentials</Label>
          {!showCreds ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={loadCredentials} disabled={credsLoading}>
              {credsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />} View
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => { setShowCreds(false); setPassword(""); setPrivateKey(""); }}>
              <EyeOff className="h-3 w-3" /> Hide
            </Button>
          )}
        </div>
        {showCreds && (
          <div className="space-y-2">
            {authMethod === "password" && password && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Password</Label>
                <Input value={password} readOnly className="rounded-lg font-mono text-xs bg-muted" />
              </div>
            )}
            {authMethod === "key" && privateKey && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">SSH Private Key</Label>
                <pre className="text-[10px] font-mono bg-neutral-950 text-neutral-300 rounded-lg p-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-all">{privateKey.slice(0, 200)}...</pre>
              </div>
            )}
            {!password && !privateKey && <p className="text-xs text-muted-foreground italic">No credentials stored</p>}
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}

// ─── Server Apps Dialog ─────────────────────────
interface DetectedService {
  name: string;
  domain?: string;
  port?: number;
  repo?: string;
  branch?: string;
  appDir?: string;
  pm2Name?: string;
  pm2Status?: string;
  pm2Cpu?: number;
  pm2Mem?: number;
  pm2Restarts?: number;
  pm2Uptime?: number;
  pm2Id?: number;
  ssl?: boolean;
  nginxConfig?: string;
  hasGit: boolean;
  source: string;
}

// ─── Redeploy Progress Dialog ────────────────────
function DeployProgressDialog({
  open, onOpenChange, projectId, projectName, serverName, action,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  projectId: string; projectName: string; serverName: string;
  action: "deploy" | "redeploy";
}) {
  const [steps, setSteps] = useState<{ id: string; label: string; status: string; detail?: string }[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [success, setSuccess] = useState(false);
  const startedRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    const filteredSteps = action === "redeploy"
      ? DEPLOY_STEP_DEFS.filter((s) => s.id !== "nginx" && s.id !== "ssl")
      : DEPLOY_STEP_DEFS;
    setSteps(filteredSteps.map((s) => ({ ...s, status: "pending" })));
    setLogs([]);
    setDone(false);
    setSuccess(false);

    (async () => {
      let completed = false;
      try {
        const res = await fetch(`/api/deploy/projects/${projectId}/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let buf = "";
          while (true) {
            const { done: streamDone, value } = await reader.read();
            if (streamDone) break;
            buf += decoder.decode(value, { stream: true });
            const parts = buf.split("\n\n");
            buf = parts.pop() || "";
            for (const part of parts) {
              if (!part.startsWith("data: ")) continue;
              try {
                const ev = JSON.parse(part.slice(6));
                if (ev.type === "step") {
                  setSteps((prev) =>
                    prev.map((s) => (s.id === ev.stepId ? { ...s, status: ev.status, detail: ev.detail } : s))
                  );
                } else if (ev.type === "log") {
                  setLogs((prev) => [...prev, ev.line]);
                } else if (ev.type === "complete") {
                  setDone(true);
                  setSuccess(ev.success);
                  completed = true;
                }
              } catch { }
            }
          }
        }

        if (!completed) {
          setDone(true);
          setSuccess(false);
        }
      } catch {
        setDone(true);
        setSuccess(false);
      }
    })();
  }, [open, projectId, action]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!done) return; onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" /> {action === "redeploy" ? "Redeploying" : "Deploying"} {projectName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-center space-y-1">
            {done ? (
              success ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Deployment Successful!</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-700 border border-red-200">
                  <XCircle className="h-5 w-5" />
                  <span className="font-semibold">Deployment Failed</span>
                </div>
              )
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-semibold">Deploying...</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">{projectName} → {serverName}</p>
          </div>

          <div className="space-y-1.5">
            {steps.map((ds) => {
              const isRunning = ds.status === "running";
              const isCompleted = ds.status === "completed";
              const isFailed = ds.status === "failed";
              const isSkipped = ds.status === "skipped";
              const StepIcon = isCompleted ? CheckCircle2 : isRunning ? Loader2 : isFailed ? XCircle : isSkipped ? ChevronRight : Clock;
              const color = isCompleted ? "text-emerald-600" : isRunning ? "text-blue-600" : isFailed ? "text-red-600" : isSkipped ? "text-neutral-400" : "text-muted-foreground/40";

              return (
                <div key={ds.id} className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  isRunning && "bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-200 dark:ring-blue-800",
                  isFailed && "bg-red-50 dark:bg-red-950/30 ring-1 ring-red-200 dark:ring-red-800",
                  isCompleted && "bg-emerald-50/50 dark:bg-emerald-950/20",
                )}>
                  <StepIcon className={cn("h-4 w-4 shrink-0", color, isRunning && "animate-spin")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", isRunning || isCompleted || isFailed ? color : "text-muted-foreground")}>{ds.label}</p>
                    {ds.detail && <p className="text-xs text-muted-foreground truncate mt-0.5">{ds.detail}</p>}
                  </div>
                  {isRunning && <span className="text-[10px] font-medium text-blue-500 uppercase tracking-wider">Running</span>}
                </div>
              );
            })}
          </div>

          {logs.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Terminal className="h-3 w-3" /> Output
              </Label>
              <ScrollArea className="h-44 rounded-lg border bg-neutral-950 p-3">
                <div className="font-mono text-[11px] leading-relaxed text-neutral-300 space-y-0.5">
                  {logs.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap break-all">{line}</div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          {done && (
            <Button
              onClick={() => onOpenChange(false)}
              className={cn("rounded-xl gap-2", success ? "bg-emerald-600 hover:bg-emerald-700" : "")}
            >
              {success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {success ? "Done" : "Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Deployment Dialog ─────────────────────
function EditDeploymentDialog({
  open, onOpenChange, projectId, onComplete, onRedeploy,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  projectId: string; onComplete: () => void;
  onRedeploy?: (id: string, name: string, serverName: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [pm2Name, setPm2Name] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("");
  const [domain, setDomain] = useState("");
  const [port, setPort] = useState("");
  const [appDir, setAppDir] = useState("");
  const [framework, setFramework] = useState("node");
  const [buildCmd, setBuildCmd] = useState("");
  const [startCmd, setStartCmd] = useState("");
  const [envContent, setEnvContent] = useState("");
  const [envHistory, setEnvHistory] = useState<{ id: string; content: string; changedBy: string; createdAt: string }[]>([]);
  const [showEnvHistory, setShowEnvHistory] = useState(false);
  const [showEnvValues, setShowEnvValues] = useState(false);
  const [serverName, setServerName] = useState("");
  const [serverId, setServerId] = useState("");
  const [serverIp, setServerIp] = useState("");
  const [lastDeploy, setLastDeploy] = useState<string | null>(null);
  const [lastCommit, setLastCommit] = useState<string | null>(null);
  const [githubOrg, setGithubOrg] = useState("");

  // Branch dropdown
  const [branches, setBranches] = useState<string[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Live data from server
  const [livePort, setLivePort] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState("");
  const [refetching, setRefetching] = useState(false);

  function loadProject() {
    setLoading(true);
    fetch(`/api/deploy/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        const p = data.project;
        if (!p) { toast.error("Project not found"); return; }
        setName(p.name || "");
        setPm2Name(p.pm2Name || "");
        setRepo(p.repo || "");
        setBranch(p.branch || "");
        setDomain(p.domain || "");
        setPort(p.port ? String(p.port) : "");
        setAppDir(p.appDir || "");
        setFramework(p.framework || "node");
        setBuildCmd(p.buildCommand || "");
        setStartCmd(p.startCommand || "");
        setServerName(p.server?.name || "");
        setServerId(p.server?.id || "");
        setServerIp(p.server?.ip || "");
        setGithubOrg(p.githubOrg || "");
        setLastDeploy(p.lastDeployAt || null);
        setLastCommit(p.lastDeployCommit || null);
        // Prefer envContent, fall back to converting envVars
        if (p.envContent) {
          setEnvContent(p.envContent);
        } else {
          const entries = Object.entries(p.envVars || {});
          setEnvContent(entries.length > 0 ? entries.map(([k, v]) => `${k}=${v}`).join("\n") : "");
        }
        if (data.envHistory) setEnvHistory(data.envHistory);
        if (p.repo) fetchBranches(p.repo, p.githubOrg);
      })
      .catch(() => toast.error("Failed to load project"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (open) loadProject(); }, [open, projectId]);

  async function fetchBranches(repoSlug: string, org?: string) {
    if (!repoSlug) return;
    setBranchesLoading(true);
    try {
      const parts = repoSlug.split("/");
      const owner = parts.length >= 2 ? parts[0] : (org || "");
      const repoName = parts.length >= 2 ? parts[1] : parts[0];
      if (!owner || !repoName) return;
      const res = await fetch(`/api/deploy/github?action=branches&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}`);
      if (res.ok) {
        const data = await res.json();
        const branchNames = (data.branches || []).map((b: any) => b.name || b);
        setBranches(branchNames);
      }
    } catch { /* ignore */ }
    finally { setBranchesLoading(false); }
  }

  async function handleRefetch() {
    if (!serverId || !pm2Name) { toast.info("No server or PM2 name to fetch from"); return; }
    setRefetching(true);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect-services", refresh: true }),
      });
      const data = await res.json();
      const svcs = data.services || [];
      const match = svcs.find((s: any) =>
        s.pm2Name === pm2Name || s.name === pm2Name || s.name === name ||
        (s.port && String(s.port) === port)
      );
      if (match) {
        if (match.port && !port) setPort(String(match.port));
        if (match.port) setLivePort(match.port);
        if (match.pm2Status) setLiveStatus(match.pm2Status);
        if (match.domain && !domain) setDomain(match.domain);
        if (match.appDir && !appDir) setAppDir(match.appDir);
        if (match.repo && !repo) {
          const slug = match.repo.replace(/.*github\.com[:/]/, "").replace(/\.git$/, "");
          setRepo(slug);
          fetchBranches(slug);
        }
        if (match.branch && !branch) setBranch(match.branch);
        toast.success("Fetched live data from server");
      } else {
        toast.info(`Service "${pm2Name}" not found on server ~ it may not be running`);
      }
    } catch { toast.error("Failed to fetch from server"); }
    finally { setRefetching(false); }
  }

  async function handleSave(andRedeploy = false) {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const body: Record<string, any> = {
        name, repo, branch, domain, pm2Name,
        appDir, framework,
        buildCommand: buildCmd, startCommand: startCmd, envContent,
      };
      if (port) body.port = Number(port);
      const res = await fetch(`/api/deploy/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("Deployment updated");
        onComplete();
        onOpenChange(false);
        if (andRedeploy && onRedeploy) {
          setTimeout(() => onRedeploy(projectId, name, serverName), 150);
        }
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message || "Update failed");
      }
    } catch { toast.error("Update failed"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" /> Edit Deployment</DialogTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1.5" onClick={handleRefetch} disabled={refetching}>
              {refetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Refetch
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            {serverName && (
              <span className="flex items-center gap-1"><Server className="h-3 w-3" /> {serverName} {serverIp && <span className="font-mono">({serverIp})</span>}</span>
            )}
            {liveStatus && (
              <Badge variant="secondary" className={cn("text-[9px] h-4 border-0",
                liveStatus === "online" ? "bg-emerald-100 text-emerald-700" : liveStatus === "stopped" ? "bg-neutral-100 text-neutral-600" : "bg-red-100 text-red-700"
              )}>{liveStatus}</Badge>
            )}
            {lastDeploy && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatTimeAgo(new Date(lastDeploy))}
                {lastCommit && <code className="bg-muted px-1 py-0.5 rounded text-[9px] font-mono">{lastCommit}</code>}
              </span>
            )}
          </div>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Name & PM2 Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PM2 Service Name</Label>
                <Input value={pm2Name} onChange={(e) => setPm2Name(e.target.value)} placeholder="my-app" className="rounded-xl font-mono text-xs" />
              </div>
            </div>

            {/* Framework */}
            <div className="space-y-1.5">
              <Label className="text-xs">Framework</Label>
              <div className="flex gap-2">
                {[
                  { val: "node", label: "Node.js" },
                  { val: "nextjs", label: "Next.js" },
                  { val: "custom", label: "Custom" },
                ].map((f) => (
                  <button key={f.val} onClick={() => {
                    setFramework(f.val);
                    if (f.val === "nextjs") {
                      if (!buildCmd || buildCmd === "npm install") setBuildCmd("npm install && npm run build");
                      if (!startCmd || startCmd === "npm start") setStartCmd("npm start");
                    } else if (f.val === "node") {
                      if (buildCmd === "npm install && npm run build") setBuildCmd("npm install");
                      if (!startCmd) setStartCmd("npm start");
                    }
                  }}
                    className={cn("flex-1 py-2 text-xs rounded-xl border transition-all font-medium",
                      framework === f.val ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" : "hover:border-neutral-300"
                    )}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Repository */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Github className="h-3.5 w-3.5" /> Repository</Label>
              <div className="flex gap-2">
                <Input value={repo} onChange={(e) => { setRepo(e.target.value); setBranches([]); }}
                  placeholder="owner/repo" className="rounded-xl font-mono text-xs flex-1" />
                <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs gap-1 shrink-0"
                  disabled={!repo || branchesLoading}
                  onClick={() => fetchBranches(repo, githubOrg)}>
                  {branchesLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitBranch className="h-3 w-3" />}
                  Fetch
                </Button>
              </div>
            </div>

            {/* Branch */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Branch</Label>
                {branches.length > 0 ? (
                  <select value={branch} onChange={(e) => setBranch(e.target.value)}
                    className="w-full h-9 rounded-xl border bg-background px-3 text-sm font-mono">
                    {!branches.includes(branch) && branch && <option value={branch}>{branch}</option>}
                    {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                ) : (
                  <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className="rounded-xl font-mono text-xs" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">App Directory</Label>
                <Input value={appDir} onChange={(e) => setAppDir(e.target.value)} placeholder="/home/user/apps/my-app" className="rounded-xl font-mono text-xs" />
              </div>
            </div>

            {/* Domain & Port */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Domain</Label>
                <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="app.example.com" className="rounded-xl font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  Port
                  {livePort && livePort !== Number(port) && (
                    <span className="text-[10px] text-amber-600 font-normal">(live: {livePort})</span>
                  )}
                </Label>
                <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="3000" className="rounded-xl font-mono" type="number" />
              </div>
            </div>

            {/* Build & Start */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Build Command{" "}
                  {framework === "nextjs" ? (
                    <span className="text-amber-600 font-normal">(required)</span>
                  ) : (
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  )}
                </Label>
                <Input value={buildCmd} onChange={(e) => setBuildCmd(e.target.value)}
                  placeholder={framework === "nextjs" ? "npm install && npm run build" : "npm install"}
                  className="rounded-xl font-mono text-xs" />
                {framework === "node" && (
                  <p className="text-[10px] text-muted-foreground">Node.js apps only need <code className="bg-muted px-1 rounded">npm install</code>. Build step is optional.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start Command</Label>
                <Input value={startCmd} onChange={(e) => setStartCmd(e.target.value)}
                  placeholder={framework === "nextjs" ? "npm start" : "npm start"}
                  className="rounded-xl font-mono text-xs" />
              </div>
            </div>

            {/* Auto PM2 Command Preview */}
            {(() => {
              const prt = port || "PORT";
              const svcName = pm2Name || name?.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 50) || "app-name";
              const cmd = startCmd?.trim() || "npm start";
              let preview: string;
              if (cmd === "npm start" || cmd === "npm run start") {
                preview = `PORT=${prt} pm2 start npm --name "${svcName}" -- start`;
              } else if (cmd.startsWith("npm run ")) {
                const script = cmd.replace(/^npm run\s+/, "");
                preview = `PORT=${prt} pm2 start npm --name "${svcName}" -- run ${script}`;
              } else {
                preview = `PORT=${prt} pm2 start ${cmd} --name "${svcName}"`;
              }
              return (
                <div className="rounded-xl border bg-muted/30 p-3 space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">PM2 command that will run on server</p>
                  <code className="block text-xs font-mono text-foreground bg-muted px-3 py-2 rounded-lg break-all select-all">{preview}</code>
                </div>
              );
            })()}

            {/* Environment Variables */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Environment Variables</Label>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => setShowEnvValues((v) => !v)}>
                    {showEnvValues ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  {envHistory.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => setShowEnvHistory((v) => !v)}>
                      <History className="h-3 w-3" /> History ({envHistory.length})
                    </Button>
                  )}
                </div>
              </div>
              {showEnvHistory ? (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {envHistory.map((h) => (
                    <div key={h.id} className="rounded-lg border p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="font-medium text-foreground/80">{h.changedBy}</span>
                          <span>{new Date(h.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] rounded-lg" onClick={() => { setEnvContent(h.content); setShowEnvHistory(false); toast.success("Restored env from history"); }}>
                          Restore
                        </Button>
                      </div>
                      <pre className="text-[10px] font-mono bg-muted rounded-md p-2 max-h-20 overflow-auto whitespace-pre-wrap break-all">{h.content.split("\n").slice(0, 5).join("\n")}{h.content.split("\n").length > 5 ? "\n..." : ""}</pre>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {showEnvValues ? (
                    <Textarea
                      value={envContent}
                      onChange={(e) => setEnvContent(e.target.value)}
                      placeholder={"# Paste your .env content here\nDATABASE_URL=mongodb://...\nAPI_KEY=your-key"}
                      className="rounded-xl font-mono text-xs min-h-[140px] resize-y"
                      spellCheck={false}
                    />
                  ) : (
                    <Textarea
                      value={envContent ? envContent.split("\n").map((l) => {
                        const trimmed = l.trim();
                        if (!trimmed || trimmed.startsWith("#")) return l;
                        const eqIdx = trimmed.indexOf("=");
                        if (eqIdx > 0) return trimmed.slice(0, eqIdx + 1) + "••••••";
                        return l;
                      }).join("\n") : ""}
                      readOnly
                      onClick={() => setShowEnvValues(true)}
                      placeholder="Click the eye icon to edit .env"
                      className="rounded-xl font-mono text-xs min-h-[140px] resize-y cursor-pointer opacity-80"
                      spellCheck={false}
                    />
                  )}
                  {envContent.trim() && (
                    <p className="text-[10px] text-muted-foreground">
                      {envContent.trim().split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length} variables
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
          <Button onClick={() => handleSave(false)} disabled={saving || loading} className="rounded-xl">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {onRedeploy && (
            <Button onClick={() => handleSave(true)} disabled={saving || loading} className="rounded-xl gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <Rocket className="h-3.5 w-3.5" /> Save & Redeploy
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




function ServerAppsDialog({
  open, onOpenChange, serverId, serverName, serverIp, projects, onAction, onDelete, onComplete,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  serverId: string; serverName: string; serverIp: string;
  projects: DeployProjectItem[];
  onAction: (id: string, action: string) => void;
  onDelete: (id: string) => void;
  onComplete: () => void;
}) {
  const [services, setServices] = useState<DetectedService[]>([]);
  const [domainResults, setDomainResults] = useState<Record<string, { status: string; code?: number }>>({});
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [pm2Acting, setPm2Acting] = useState<string | null>(null);
  const [showLogsFor, setShowLogsFor] = useState<{ id: string; name: string } | null>(null);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  const serverProjects = projects.filter((p) => p.server?.id === serverId);

  async function handleImportService(svc: DetectedService) {
    setImporting(svc.name);
    try {
      const repoSlug = svc.repo
        ? svc.repo.replace(/.*github\.com[:/]/, "").replace(/\.git$/, "")
        : "";
      const payload: Record<string, any> = {
        name: svc.pm2Name || svc.name,
        serverId,
        repo: repoSlug,
        branch: svc.branch || "main",
        domain: svc.domain || "",
        framework: "node",
        buildCommand: "npm install",
        startCommand: "npm start",
        appDir: svc.appDir || "",
        pm2Name: svc.pm2Name || svc.name,
      };
      if (svc.port) payload.port = Number(svc.port);

      const res = await fetch("/api/deploy/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.project?.id) {
        toast.success("Imported ~ edit details below");
        onComplete();
        setEditProjectId(data.project.id);
      } else if (res.status === 409 && data.message?.includes("Port")) {
        // Port already in use ~ try without specifying port to auto-assign
        payload.port = undefined;
        const retry = await fetch("/api/deploy/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const retryData = await retry.json();
        if (retry.ok && retryData.project?.id) {
          toast.success("Imported (auto-assigned port) ~ edit details below");
          onComplete();
          setEditProjectId(retryData.project.id);
        } else {
          toast.error(retryData.message || "Import failed");
        }
      } else {
        toast.error(data.message || "Import failed");
      }
    } catch { toast.error("Import failed"); }
    finally { setImporting(null); }
  }

  const autoImportedRef = useRef(false);

  async function autoImportUnmanaged(detectedServices: DetectedService[]) {
    if (autoImportedRef.current) return;
    const unmanaged = detectedServices.filter((svc) => {
      const svcRepoSlug = svc.repo ? svc.repo.replace(/.*github\.com[:/]/, "").replace(/\.git$/, "").toLowerCase() : "";
      const svcName = (svc.pm2Name || svc.name || "").toLowerCase();
      return !serverProjects.find((p) => {
        const pName = p.name.toLowerCase();
        const pPm2 = (p.pm2Name || "").toLowerCase();
        if (svcName && (pName === svcName || pPm2 === svcName)) return true;
        if (svc.domain && p.domain && svc.domain === p.domain) return true;
        if (svc.port && p.port === svc.port) return true;
        if (svcRepoSlug && p.repo) {
          const pRepoSlug = p.repo.replace(/.*github\.com[:/]/, "").replace(/\.git$/, "").toLowerCase();
          if (svcRepoSlug === pRepoSlug) return true;
        }
        return false;
      });
    });
    if (unmanaged.length === 0) return;
    autoImportedRef.current = true;

    let imported = 0;
    for (const svc of unmanaged) {
      const repoSlug = svc.repo ? svc.repo.replace(/.*github\.com[:/]/, "").replace(/\.git$/, "") : "";
      const payload: Record<string, any> = {
        name: svc.pm2Name || svc.name,
        serverId,
        repo: repoSlug,
        branch: svc.branch || "main",
        domain: svc.domain || "",
        framework: "node",
        buildCommand: "npm install",
        startCommand: "npm start",
        appDir: svc.appDir || "",
        pm2Name: svc.pm2Name || svc.name,
      };
      if (svc.port) payload.port = Number(svc.port);
      try {
        const res = await fetch("/api/deploy/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok && res.status === 409) {
          payload.port = undefined;
          await fetch("/api/deploy/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
        imported++;
      } catch { /* skip failed imports silently */ }
    }
    if (imported > 0) {
      toast.success(`Auto-imported ${imported} service${imported > 1 ? "s" : ""}`);
      onComplete();
    }
  }

  async function scanServer(refresh = false) {
    setScanning(true);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect-services", refresh }),
      });
      const data = await res.json();
      const detected = data.services || [];
      setServices(detected);
      setDomainResults(data.domainResults || {});
      setIsCached(data.cached === true);
      setCachedAt(data.cachedAt || null);
      setScanned(true);
      // Auto-import unmanaged services as new deployments
      autoImportUnmanaged(detected);
    } catch { toast.error("Failed to scan server"); }
    finally { setScanning(false); }
  }

  useEffect(() => { if (open && !scanned) scanServer(false); }, [open]);

  async function handlePm2Action(processName: string, pmAction: string) {
    setPm2Acting(`${pmAction}-${processName}`);
    try {
      const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pm2-action", pmAction, processName }),
      });
      const data = await res.json();
      if (data.ok) { toast.success(`${pmAction} "${processName}" succeeded`); scanServer(); }
      else toast.error(data.message || `${pmAction} failed`);
    } catch { toast.error(`Failed to ${pmAction}`); }
    finally { setPm2Acting(null); }
  }

  function findManagedProject(svc: DetectedService): DeployProjectItem | undefined {
    const svcRepoSlug = svc.repo ? svc.repo.replace(/.*github\.com[:/]/, "").replace(/\.git$/, "").toLowerCase() : "";
    return serverProjects.find((p) => {
      const pName = p.name.toLowerCase();
      const pPm2 = (p.pm2Name || "").toLowerCase();
      const svcName = (svc.pm2Name || svc.name || "").toLowerCase();
      if (svcName && (pName === svcName || pPm2 === svcName)) return true;
      if (svc.domain && p.domain && svc.domain === p.domain) return true;
      if (svc.port && p.port === svc.port) return true;
      if (svcRepoSlug && p.repo) {
        const pRepoSlug = p.repo.replace(/.*github\.com[:/]/, "").replace(/\.git$/, "").toLowerCase();
        if (svcRepoSlug === pRepoSlug) return true;
      }
      return false;
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <span>{serverName}</span>
              <span className="text-xs font-mono text-muted-foreground font-normal">{serverIp}</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {serverProjects.length} managed · {services.filter((s) => !findManagedProject(s)).length} detected
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between pb-2 border-b shrink-0">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">All services running on this server</p>
              {cachedAt && (
                <span className="text-[10px] text-muted-foreground/50">
                  {isCached ? "cached" : "scanned"} {new Date(cachedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => scanServer(true)} disabled={scanning}>
              {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {scanning ? "Scanning..." : "Rescan"}
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0 pr-3">
            <div className="space-y-6 py-3">
              {/* Managed Projects */}
              {serverProjects.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Managed Deployments</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {serverProjects.map((p) => {
                      const ds = domainResults[p.domain || ""];
                      const matchedSvc = services.find((s) =>
                        (s.pm2Name && s.pm2Name === p.name) || (s.domain && s.domain === p.domain) || (s.port && s.port === p.port)
                      );
                      return (
                        <div key={p.id} className="rounded-xl border bg-card p-4 space-y-2.5">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={cn("h-2 w-2 rounded-full shrink-0",
                                  p.status === "running" ? "bg-emerald-500" : p.status === "stopped" ? "bg-neutral-400" : p.status === "failed" ? "bg-red-500" : "bg-amber-500")} />
                                <h4 className="font-semibold text-sm truncate">{p.name}</h4>
                                <Badge variant="secondary" className="text-[9px] h-4 border-0">{p.status}</Badge>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg shrink-0"><Settings className="h-3.5 w-3.5" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditProjectId(p.id)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onAction(p.id, "redeploy")}><RefreshCw className="h-4 w-4 mr-2" /> Redeployment</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAction(p.id, "reconfiguration")}><Wrench className="h-4 w-4 mr-2" /> Reconfiguration</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAction(p.id, "reload-server")}><Server className="h-4 w-4 mr-2" /> Reload Server</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setShowLogsFor({ id: p.id, name: p.name })}><Terminal className="h-4 w-4 mr-2" /> View Logs</DropdownMenuItem>
                                {p.domain && <DropdownMenuItem onClick={() => window.open(`https://${p.domain}`, "_blank")}><ExternalLink className="h-4 w-4 mr-2" /> Open Site</DropdownMenuItem>}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => onDelete(p.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {p.domain && (
                            <div className="flex items-center gap-2 text-xs">
                              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <a href={`https://${p.domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{p.domain}</a>
                              {ds ? (
                                <Badge variant={ds.status === "up" ? "secondary" : "destructive"} className={cn("text-[9px] h-4 border-0", ds.status === "up" ? "bg-emerald-100 text-emerald-700" : "")}>
                                  {ds.status === "up" ? `✓ ${ds.code}` : `✗ ${ds.code || "down"}`}
                                </Badge>
                              ) : null}
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="font-mono">:{p.port}</span>
                            <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> {p.branch}</span>
                            <span className="font-mono">{p.framework}</span>
                          </div>

                          {p.repo && (
                            <p className="text-[10px] text-muted-foreground truncate font-mono">{p.repo.replace(/.*github\.com[:/]/, "").replace(/\.git$/, "")}</p>
                          )}

                          {matchedSvc && (matchedSvc.pm2Cpu !== undefined || matchedSvc.pm2Mem !== undefined) && (
                            <div className="flex items-center gap-3 text-[10px] pt-1 border-t">
                              {typeof matchedSvc.pm2Cpu === "number" && (
                                <span className="flex items-center gap-1"><Cpu className="h-3 w-3 text-muted-foreground" /> <span className={cn(matchedSvc.pm2Cpu > 50 ? "text-amber-600 font-semibold" : "text-muted-foreground")}>{matchedSvc.pm2Cpu.toFixed(1)}%</span></span>
                              )}
                              {typeof matchedSvc.pm2Mem === "number" && (
                                <span className="flex items-center gap-1 text-muted-foreground"><MemoryStick className="h-3 w-3" /> {formatBytesCompact(matchedSvc.pm2Mem)}</span>
                              )}
                              {typeof matchedSvc.pm2Restarts === "number" && (
                                <span className={cn("flex items-center gap-1", (matchedSvc.pm2Restarts || 0) > 5 ? "text-amber-600" : "text-muted-foreground")}><RotateCcw className="h-3 w-3" /> {matchedSvc.pm2Restarts}</span>
                              )}
                            </div>
                          )}

                          {(p.latestCommitAt || p.lastDeployAt) && (
                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/60 truncate">
                              {p.lastDeployCommit && (
                                <code className="font-mono bg-emerald-50 text-emerald-700 px-1 rounded">{p.lastDeployCommit}</code>
                              )}
                              {p.hasPendingCommit && p.latestCommitSha && (
                                <span className="flex items-center gap-1">
                                  <ArrowRight className="h-2.5 w-2.5 text-amber-500" />
                                  <code className="font-mono bg-amber-50 text-amber-700 px-1 rounded">{p.latestCommitSha.slice(0, 7)}</code>
                                </span>
                              )}
                              {p.latestCommitAuthor && <span className="font-medium">{p.latestCommitAuthor}</span>}
                              {p.latestCommitAt && <span>· {formatTimeAgo(new Date(p.latestCommitAt))}</span>}
                              {p.latestCommitMessage && <span className="truncate">~ {p.latestCommitMessage}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detected Services */}
              {scanning ? (
                <div className="flex items-center justify-center py-12 gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Scanning ports, nginx configs, PM2, git repos...</span>
                </div>
              ) : services.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Detected Services</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {services.map((svc, idx) => {
                      const managed = findManagedProject(svc);
                      if (managed) return null;
                      const ds = svc.domain ? domainResults[svc.domain] : undefined;
                      const isActing = pm2Acting?.includes(svc.name);

                      return (
                        <div key={`${svc.name}-${idx}`} className="rounded-xl border border-dashed p-4 space-y-2.5">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {svc.pm2Status ? (
                                  <span className={cn("h-2 w-2 rounded-full shrink-0",
                                    svc.pm2Status === "online" ? "bg-emerald-500" : svc.pm2Status === "stopped" ? "bg-neutral-400" : "bg-red-500")} />
                                ) : (
                                  <span className="h-2 w-2 rounded-full shrink-0 bg-blue-400" />
                                )}
                                <h4 className="font-semibold text-sm truncate">{svc.name}</h4>
                                {svc.pm2Status && <Badge variant="secondary" className="text-[9px] h-4 border-0">{svc.pm2Status}</Badge>}
                                <Badge variant="outline" className="text-[9px] h-4">{svc.source}</Badge>
                              </div>
                            </div>
                            {svc.pm2Name && (
                              <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" title="Restart"
                                  disabled={isActing} onClick={() => handlePm2Action(svc.pm2Name!, "restart")}>
                                  {pm2Acting === `restart-${svc.name}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                                </Button>
                                {svc.pm2Status === "online" ? (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-amber-600" title="Stop"
                                    disabled={isActing} onClick={() => handlePm2Action(svc.pm2Name!, "stop")}>
                                    {pm2Acting === `stop-${svc.name}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3" />}
                                  </Button>
                                ) : svc.pm2Status === "stopped" ? (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-emerald-600" title="Start"
                                    disabled={isActing} onClick={() => handlePm2Action(svc.pm2Name!, "start")}>
                                    {pm2Acting === `start-${svc.name}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                                  </Button>
                                ) : null}
                              </div>
                            )}
                          </div>

                          {svc.domain && (
                            <div className="flex items-center gap-2 text-xs">
                              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <a href={`http${svc.ssl ? "s" : ""}://${svc.domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{svc.domain}</a>
                              {svc.ssl && <Lock className="h-3 w-3 text-emerald-500 shrink-0" />}
                              {ds ? (
                                <Badge variant={ds.status === "up" ? "secondary" : "destructive"} className={cn("text-[9px] h-4 border-0", ds.status === "up" ? "bg-emerald-100 text-emerald-700" : "")}>
                                  {ds.status === "up" ? `✓ ${ds.code}` : `✗ ${ds.code || "down"}`}
                                </Badge>
                              ) : null}
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            {svc.port && <span className="font-mono">:{svc.port}</span>}
                            {svc.hasGit && <span className="flex items-center gap-1 text-emerald-600"><Github className="h-3 w-3" /> Connected</span>}
                            {!svc.hasGit && <span className="flex items-center gap-1 text-muted-foreground/50"><Github className="h-3 w-3" /> No repo</span>}
                          </div>

                          {svc.repo && (
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <GitBranch className="h-3 w-3 shrink-0" />
                              <span className="truncate font-mono">{svc.repo.replace(/.*github\.com[:/]/, "").replace(/\.git$/, "")}</span>
                              {svc.branch && <span>:{svc.branch}</span>}
                            </div>
                          )}

                          {svc.appDir && <p className="text-[9px] font-mono text-muted-foreground/50 truncate">{svc.appDir}</p>}

                          {(typeof svc.pm2Cpu === "number" || typeof svc.pm2Mem === "number") && (
                            <div className="flex items-center gap-3 text-[10px] pt-1 border-t">
                              {typeof svc.pm2Cpu === "number" && (
                                <span className="flex items-center gap-1"><Cpu className="h-3 w-3 text-muted-foreground" /> {svc.pm2Cpu.toFixed(1)}%</span>
                              )}
                              {typeof svc.pm2Mem === "number" && (
                                <span className="flex items-center gap-1 text-muted-foreground"><MemoryStick className="h-3 w-3" /> {formatBytesCompact(svc.pm2Mem)}</span>
                              )}
                              {typeof svc.pm2Restarts === "number" && (
                                <span className={cn("flex items-center gap-1", (svc.pm2Restarts || 0) > 5 ? "text-amber-600" : "text-muted-foreground")}><RotateCcw className="h-3 w-3" /> {svc.pm2Restarts} restarts</span>
                              )}
                            </div>
                          )}

                          <div className="pt-1.5 border-t flex items-center gap-2 flex-wrap">
                            {svc.pm2Name && (
                              <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg gap-1.5 flex-1"
                                onClick={() => {
                                  if (!svc.pm2Name) return;
                                  handlePm2Action(svc.pm2Name, "restart");
                                }}>
                                <RotateCcw className="h-3 w-3" /> Restart
                              </Button>
                            )}
                            {svc.hasGit && svc.pm2Name && (
                              <Button size="sm" className="h-7 text-xs rounded-lg gap-1.5 flex-1"
                                onClick={async () => {
                                  if (!svc.appDir) return;
                                  toast.info("Pulling latest & restarting...");
                                  try {
                                    const res = await fetch(`/api/deploy/servers/${serverId}/info`, {
                                      method: "POST", headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ action: "quick-deploy", appDir: svc.appDir, branch: svc.branch || "main", pm2Name: svc.pm2Name, repo: svc.repo || "" }),
                                    });
                                    const data = await res.json();
                                    if (data.ok) { toast.success("Deployed successfully"); scanServer(); }
                                    else toast.error(data.output || "Deploy failed");
                                  } catch { toast.error("Deploy failed"); }
                                }}>
                                <Rocket className="h-3 w-3" /> Deploy
                              </Button>
                            )}
                            <Button size="sm" variant="secondary" className="h-7 text-xs rounded-lg gap-1.5 flex-1"
                              disabled={importing === svc.name}
                              onClick={() => handleImportService(svc)}>
                              {importing === svc.name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
                              Import & Edit
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : scanned ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No additional services detected on the server.</div>
              ) : null}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 pt-2 border-t shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showLogsFor && (
        <LogsDialog
          open={!!showLogsFor}
          onOpenChange={() => setShowLogsFor(null)}
          projectId={showLogsFor.id}
          projectName={showLogsFor.name}
        />
      )}

      {editProjectId && (
        <EditDeploymentDialog
          open={!!editProjectId}
          onOpenChange={(o) => { if (!o) setEditProjectId(null); }}
          projectId={editProjectId}
          onComplete={() => { onComplete(); scanServer(); }}
        />
      )}
    </>
  );
}

// ─── Domains Tab ─────────────────────────────────
function DomainsTab({
  domainProviders,
  onManageDns,
  onConnectProvider,
}: {
  domainProviders: DomainProviderItem[];
  onManageDns: (domain: string, zoneId: string | undefined, providerId: string, providerName: string) => void;
  onConnectProvider: (provider?: string) => void;
}) {
  const allDomains = domainProviders.flatMap(p =>
    (p.cachedDomains || []).map(d => ({ ...d, providerId: p.id, providerName: p.name }))
  );

  if (allDomains.length === 0) {
    return (
      <div className="text-center py-16 space-y-6">
        <div>
          <Globe className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No domains found in any provider</p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Button onClick={() => onConnectProvider("godaddy")} className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <Plus className="h-4 w-4" />
            Connect GoDaddy
          </Button>
          <Button onClick={() => onConnectProvider()} variant="outline" className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            Add Other Provider
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Domain</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allDomains.map((d, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{d.domain}</TableCell>
              <TableCell>{d.providerName}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onManageDns(d.domain, d.zoneId, d.providerId, d.providerName)}>
                      <Settings className="h-4 w-4 mr-2" /> Manage DNS
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Manage DNS Dialog ───────────────────────────
function ManageDnsDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: { domain: string; zoneId?: string; providerId: string; providerName: string };
}) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form, setForm] = useState({ type: "A", name: "@", value: "", ttl: 14400, proxied: false });

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/deploy/domains/providers/${target.providerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-records", domain: target.domain, zoneId: target.zoneId }),
      });
      const data = await res.json();
      if (data.ok) {
        setRecords(data.records || []);
      } else {
        toast.error(data.message || "Failed to load DNS records");
      }
    } catch {
      toast.error("Failed to load DNS records");
    } finally {
      setLoading(false);
    }
  }, [target]);

  useEffect(() => {
    if (open) loadRecords();
  }, [open, loadRecords]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/deploy/domains/providers/${target.providerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set-record",
          domain: target.domain,
          zoneId: target.zoneId,
          record: form
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Record saved");
        setEditingRecord(null);
        loadRecords();
      } else {
        toast.error(data.message || "Failed to save record");
      }
    } catch {
      toast.error("Failed to save record");
    }
  }

  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [deletingRecord, setDeletingRecord] = useState(false);

  async function executeDelete() {
    if (!deleteRecordId) return;
    setDeletingRecord(true);
    try {
      const res = await fetch(`/api/deploy/domains/providers/${target.providerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-record",
          domain: target.domain,
          zoneId: target.zoneId,
          recordId: deleteRecordId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Record deleted");
        setDeleteRecordId(null);
        loadRecords();
      } else {
        toast.error(data.message || "Failed to delete record");
      }
    } catch {
      toast.error("Failed to delete record");
    } finally {
      setDeletingRecord(false);
    }
  }

  function handleDelete(recordId: string) {
    setDeleteRecordId(recordId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Manage DNS for {target.domain}</DialogTitle>
          <p className="text-sm text-muted-foreground">Provider: {target.providerName}</p>
        </DialogHeader>

        {editingRecord ? (
          <div className="p-6 overflow-y-auto">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["A", "AAAA", "CNAME", "TXT", "MX", "NS"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="@ or sub" required />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Value / Content</Label>
                  <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="192.168.1.1" required />
                </div>
                <div className="space-y-2">
                  <Label>TTL (seconds)</Label>
                  <Input type="number" value={form.ttl} onChange={(e) => setForm({ ...form, ttl: parseInt(e.target.value) || 1 })} required />
                </div>
                {target.providerName.toLowerCase().includes("cloudflare") && (
                  <div className="space-y-2">
                    <Label>Proxied</Label>
                    <Select value={form.proxied ? "true" : "false"} onValueChange={(v) => setForm({ ...form, proxied: v === "true" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Proxied</SelectItem>
                        <SelectItem value="false">DNS Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingRecord(null)}>Cancel</Button>
                <Button type="submit">Save Record</Button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex justify-end">
              <Button onClick={() => { setForm({ type: "A", name: "@", value: "", ttl: 14400, proxied: false }); setEditingRecord({}); }} size="sm">
                <Plus className="h-4 w-4 mr-2" /> Add Record
              </Button>
            </div>
            <ScrollArea className="flex-1 p-0">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0">
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r, i) => (
                      <TableRow key={r.id || i}>
                        <TableCell className="font-medium">{r.type}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={r.value}>{r.value}</TableCell>
                        <TableCell>{r.ttl}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForm({ type: r.type, name: r.name, value: r.value, ttl: r.ttl || 14400, proxied: !!r.proxied }); setEditingRecord(r); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {r.id && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(r.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {records.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No DNS records found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>

      <ConfirmDialog
        open={!!deleteRecordId}
        onOpenChange={(openState) => !openState && setDeleteRecordId(null)}
        title="Delete DNS Record?"
        description="Are you sure you want to delete this DNS record? This may affect domain routing."
        confirmLabel={deletingRecord ? "Deleting..." : "Delete Record"}
        variant="destructive"
        isLoading={deletingRecord}
        onConfirm={executeDelete}
      />
    </Dialog>
  );
}

