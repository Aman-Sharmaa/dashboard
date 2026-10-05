"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus, Search, MoreVertical, Activity, Send, Users, BarChart3, MessageCircle,
  Play, Pause, Square, Edit, RefreshCw, Trash2, AlertCircle, CheckCircle,
  Instagram, Zap, Eye, Clock, Filter, ArrowRight, TrendingUp, Hash,
  LogOut, Settings, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AutoDMCreateDialog } from "./autodm-create-dialog";
import { AutoDMSettingsPanel } from "./autodm-settings";

// ─── Types ───────────────────────────────────────────────────────────────────

interface InstagramAccount {
  id: string;
  instagramUserId: string;
  username: string;
  profilePicture?: string;
  accountType?: string;
  status: "connected" | "disconnected" | "expired";
  connectedAt: string;
}

interface Automation {
  id: string;
  name: string;
  instagramAccountId: string;
  triggerType: string;
  mediaType: "specific" | "any" | "next";
  mediaId?: string;
  commentMode: "any" | "keyword";
  includedKeywords?: string[];
  publicReplyEnabled: boolean;
  followGateEnabled: boolean;
  mainMessage: string;
  status: "active" | "paused" | "stopped";
  stats: { runs: number; dmsSent: number; followsGained: number };
  createdAt: string;
}

interface LogEntry {
  id: string;
  username: string;
  triggerText?: string;
  publicReplyStatus: string;
  dmStatus: string;
  followRequired: boolean;
  followVerified: boolean;
  errorMessage?: string;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  if (status === "active") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (status === "paused") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-slate-500/10 text-slate-500 border-slate-500/20";
}

function dmStatusColor(status: string) {
  if (status === "sent") return "text-emerald-600";
  if (status === "failed") return "text-red-500";
  return "text-muted-foreground";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AutoDMClient() {
  const [activeTab, setActiveTab] = useState("automations");
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [stopDialogId, setStopDialogId] = useState<string | null>(null);
  const [connectingAccount, setConnectingAccount] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingAutomations, setLoadingAutomations] = useState(true);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/autodm/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch {
      toast.error("Failed to load Instagram accounts");
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  const loadAutomations = useCallback(async () => {
    setLoadingAutomations(true);
    try {
      const res = await fetch("/api/autodm/automations");
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations || []);
      }
    } catch {
      toast.error("Failed to load automations");
    } finally {
      setLoadingAutomations(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/autodm/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.runs || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadAccounts();
    loadAutomations();
    loadLogs();
  }, [loadAccounts, loadAutomations, loadLogs]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleConnectAccount = async () => {
    setConnectingAccount(true);
    try {
      const res = await fetch("/api/autodm/accounts", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`@${data.account.username} connected successfully!`);
      loadAccounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to connect Instagram account");
    } finally {
      setConnectingAccount(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await fetch(`/api/autodm/accounts/${id}`, { method: "DELETE" });
      toast.success("Account disconnected");
      loadAccounts();
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const handleStatusChange = async (id: string, status: "active" | "paused" | "stopped") => {
    try {
      const res = await fetch(`/api/autodm/automations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast.success(`Automation ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/autodm/automations/${id}`, { method: "DELETE" });
      setAutomations((prev) => prev.filter((a) => a.id !== id));
      toast.success("Automation deleted");
    } catch {
      toast.error("Failed to delete automation");
    }
  };

  const handleCreateSuccess = (automation: Automation) => {
    loadAutomations();
    setCreateDialogOpen(false);
    setEditingAutomation(null);
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const connectedAccounts = accounts.filter((a) => a.status === "connected");
  const totalRuns = automations.reduce((s, a) => s + (a.stats?.runs || 0), 0);
  const totalDMs = automations.reduce((s, a) => s + (a.stats?.dmsSent || 0), 0);
  const totalFollowers = automations.reduce((s, a) => s + (a.stats?.followsGained || 0), 0);
  const activeCount = automations.filter((a) => a.status === "active").length;

  const filteredAutomations = automations.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.mainMessage.toLowerCase().includes(q);
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AutoDM</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Automate conversations from your Instagram content
          </p>
        </div>
        {connectedAccounts.length > 0 && (
          <Button onClick={() => { setEditingAutomation(null); setCreateDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Create Automation
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="automations" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" /> Automations</TabsTrigger>
          <TabsTrigger value="accounts" className="gap-1.5 text-xs"><Instagram className="h-3.5 w-3.5" /> Accounts</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" /> Logs</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" /> Settings</TabsTrigger>
        </TabsList>

        {/* ════ AUTOMATIONS TAB ════ */}
        <TabsContent value="automations" className="space-y-4 mt-6">
          {/* Aggregate Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "DMs Sent", value: totalDMs.toLocaleString(), icon: Send, color: "text-indigo-500" },
              { label: "Total Runs", value: totalRuns.toLocaleString(), icon: Activity, color: "text-emerald-500" },
              { label: "Followers Gained", value: totalFollowers.toLocaleString(), icon: Users, color: "text-pink-500" },
              { label: "Active", value: activeCount.toString(), icon: Zap, color: "text-amber-500" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-0.5">{stat.value}</p>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {connectedAccounts.length === 0 ? (
            <Card>
              <CardContent className="py-16 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center shadow-lg shadow-pink-500/20">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Connect Instagram First</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Go to the Accounts tab and connect your professional Instagram account to start creating automations.
                  </p>
                </div>
                <Button onClick={() => setActiveTab("accounts")} className="gap-2">
                  <Instagram className="h-4 w-4" /> Go to Accounts
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search automations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex bg-muted/50 p-1 rounded-lg">
                  {["all", "active", "paused", "stopped"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all capitalize ${
                        statusFilter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {filteredAutomations.length === 0 ? (
                <Card>
                  <CardContent className="py-16 flex flex-col items-center text-center gap-4">
                    <Zap className="h-12 w-12 text-muted-foreground/30" />
                    <div>
                      <h3 className="font-semibold">No automations yet</h3>
                      <p className="text-muted-foreground text-sm mt-1">Create your first automation to start sending AutoDMs.</p>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" /> Create Automation
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredAutomations.map((automation) => {
                    const account = accounts.find((a) => a.id === automation.instagramAccountId);
                    return (
                      <Card key={automation.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <Avatar className="h-9 w-9 flex-shrink-0">
                                <AvatarImage src={account?.profilePicture} />
                                <AvatarFallback className="bg-gradient-to-tr from-pink-500 to-orange-400 text-white text-xs">
                                  {account?.username?.[0]?.toUpperCase() || "IG"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm truncate">{automation.name}</span>
                                  <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${statusColor(automation.status)}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${automation.status === "active" ? "bg-emerald-500" : automation.status === "paused" ? "bg-amber-500" : "bg-slate-400"}`} />
                                    {automation.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  @{account?.username || "—"} · {automation.mediaType === "any" ? "Any Post/Reel" : automation.mediaType === "next" ? "Next Post" : "Specific Post"} · {automation.commentMode === "any" ? "Any Comment" : `Keywords: ${automation.includedKeywords?.join(", ")}`}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span><span className="font-semibold text-foreground">{(automation.stats?.runs || 0).toLocaleString()}</span> Runs</span>
                                  <span><span className="font-semibold text-foreground">{(automation.stats?.dmsSent || 0).toLocaleString()}</span> DMs</span>
                                  <span><span className="font-semibold text-foreground">{(automation.stats?.followsGained || 0).toLocaleString()}</span> Followers</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {automation.status === "active" ? (
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => handleStatusChange(automation.id, "paused")}>
                                  <Pause className="h-3 w-3" /> Pause
                                </Button>
                              ) : automation.status === "paused" ? (
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs text-emerald-600 border-emerald-500/30" onClick={() => handleStatusChange(automation.id, "active")}>
                                  <Play className="h-3 w-3" /> Resume
                                </Button>
                              ) : null}
                              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { setEditingAutomation(automation); setCreateDialogOpen(true); }}>
                                <Edit className="h-3 w-3" /> Edit
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {automation.status !== "stopped" && (
                                    <DropdownMenuItem onClick={() => setStopDialogId(automation.id)} className="text-red-600">
                                      <Square className="h-3.5 w-3.5 mr-2" /> Stop AutoDM
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDelete(automation.id)} className="text-red-600">
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ════ ACCOUNTS TAB ════ */}
        <TabsContent value="accounts" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Instagram Accounts</h2>
              <p className="text-sm text-muted-foreground">Connect your professional Instagram accounts</p>
            </div>
            <Button onClick={handleConnectAccount} disabled={connectingAccount} className="gap-2 bg-gradient-to-r from-pink-500 to-orange-400 border-0 text-white hover:opacity-90">
              {connectingAccount ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {connectingAccount ? "Connecting..." : "Connect Instagram"}
            </Button>
          </div>

          {accounts.length === 0 ? (
            <Card>
              <CardContent className="py-16 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center">
                  <Instagram className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">No Instagram account connected</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    First save your Meta System User Access Token in Settings, then click Connect Instagram.
                  </p>
                </div>
                <Button
                  onClick={handleConnectAccount}
                  disabled={connectingAccount}
                  className="gap-2 bg-gradient-to-r from-pink-500 to-orange-400 border-0 text-white"
                >
                  {connectingAccount ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Connect Instagram
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {accounts.map((account) => (
                <Card key={account.id} className={account.status !== "connected" ? "opacity-60" : ""}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 ring-2 ring-pink-500/20">
                        <AvatarImage src={account.profilePicture} />
                        <AvatarFallback className="bg-gradient-to-tr from-pink-500 to-orange-400 text-white text-lg">
                          {account.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">@{account.username}</p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-4 px-1.5 ${account.status === "connected" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${account.status === "connected" ? "bg-emerald-500" : "bg-red-500"}`} />
                            {account.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{account.accountType || "Professional"} Account</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {automations.filter((a) => a.instagramAccountId === account.id).length} automations
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 text-xs"
                        onClick={() => fetch(`/api/autodm/accounts/${account.id}`, { method: "POST" }).then(() => loadAccounts())}
                      >
                        <RefreshCw className="h-3 w-3" /> Reconnect
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 text-xs text-red-600 hover:text-red-700"
                        onClick={() => handleDisconnect(account.id)}
                      >
                        <LogOut className="h-3 w-3" /> Disconnect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ════ LOGS TAB ════ */}
        <TabsContent value="logs" className="space-y-4 mt-6">
          <div>
            <h2 className="text-base font-semibold">Automation Logs</h2>
            <p className="text-sm text-muted-foreground">Real-time log of every automation execution</p>
          </div>

          {logs.length === 0 ? (
            <Card>
              <CardContent className="py-16 flex flex-col items-center text-center gap-3">
                <Activity className="h-12 w-12 text-muted-foreground/30" />
                <p className="font-semibold">No runs yet</p>
                <p className="text-sm text-muted-foreground">Automation executions will appear here in real-time.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedLogId(selectedLogId === log.id ? null : log.id)}
                    >
                      <div className="flex-shrink-0">
                        {log.dmStatus === "sent" ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : log.dmStatus === "failed" ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">@{log.username}</span>
                          {log.triggerText && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">
                              "{log.triggerText.slice(0, 20)}{log.triggerText.length > 20 ? "…" : ""}"
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span>Reply: <span className={dmStatusColor(log.publicReplyStatus)}>{log.publicReplyStatus}</span></span>
                          <span>DM: <span className={dmStatusColor(log.dmStatus)}>{log.dmStatus}</span></span>
                          {log.followRequired && <span>Follow: {log.followVerified ? "✓" : "pending"}</span>}
                        </div>
                        {selectedLogId === log.id && log.errorMessage && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs text-red-600">
                            {log.errorMessage}
                          </div>
                        )}
                      </div>
                      <time className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </time>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════ SETTINGS TAB ════ */}
        <TabsContent value="settings" className="mt-6">
          <AutoDMSettingsPanel />
        </TabsContent>
      </Tabs>

      {/* Stop Confirmation Dialog */}
      <Dialog open={!!stopDialogId} onOpenChange={(o) => !o && setStopDialogId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Stop AutoDM?</DialogTitle>
            <DialogDescription>
              This automation will no longer respond to new comments. Existing conversations will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStopDialogId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (stopDialogId) {
                  handleStatusChange(stopDialogId, "stopped");
                  setStopDialogId(null);
                }
              }}
            >
              Stop Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <AutoDMCreateDialog
        open={createDialogOpen}
        onOpenChange={(o) => { setCreateDialogOpen(o); if (!o) setEditingAutomation(null); }}
        accounts={accounts}
        editingAutomation={editingAutomation}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
