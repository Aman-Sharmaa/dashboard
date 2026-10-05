"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Trash2, Loader2, Video, Calendar, Plus, Newspaper, FileTextIcon, FolderTree, Search, Eye, EyeOff, Activity, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

import { useSearch } from "@/components/search-context";
import { usePrivacy } from "@/components/privacy-context";
import { useSocket } from "@/components/socket-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type OngoingMeeting = {
  id: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  googleCalendarEventId: string | null;
  meetingLink?: string | null;
  projectName?: string;
};

// Normalize meeting links (especially Google Meet) for clean redirects
function normalizeMeetingLink(rawLink: string | null | undefined): string | null {
  if (!rawLink) return null;
  try {
    const url = new URL(rawLink);
    if (url.hostname.includes("meet.google.com")) {
      return `${url.origin}${url.pathname}`;
    }
    return rawLink;
  } catch {
    return rawLink;
  }
}

function formatTimeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

export function DashboardTopbar() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [syncingBusiness, setSyncingBusiness] = useState(false);
  const [ongoingMeeting, setOngoingMeeting] = useState<OngoingMeeting | null>(null);
  const [monitorCounts, setMonitorCounts] = useState<{ up: number; down: number; total: number }>({ up: 0, down: 0, total: 0 });
  const { socket } = useSocket();

  const prevNotificationsRef = useRef<Notification[]>([]);
  const isFirstFetchRef = useRef(true);
  const notifiedMeetingsRef = useRef<Set<string>>(new Set());

  // Pleasant notification sound generator
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 800Hz frequency for a clean chime
      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn("Could not play notification sound:", error);
    }
  }, []);

  const checkUpcomingMeetings = useCallback((meetingsList: any[]) => {
    const now = new Date();
    meetingsList.forEach((meeting) => {
      const meetingId = meeting.id || meeting._id;
      if (!meetingId || notifiedMeetingsRef.current.has(meetingId)) return;

      const startTime = new Date(meeting.startTime);
      const timeDiff = startTime.getTime() - now.getTime();

      // Notify 5 minutes before (4.5 to 5.5 minutes)
      if (timeDiff >= 4.5 * 60 * 1000 && timeDiff <= 5.5 * 60 * 1000) {
        notifiedMeetingsRef.current.add(meetingId);
        playNotificationSound();

        // Browser notification
        if ("Notification" in window && Notification.permission === "granted") {
          new window.Notification("Meeting starting soon!", {
            body: `${meeting.title}${meeting.projectName ? ` (${meeting.projectName})` : ""} starts in 5 minutes`,
            tag: `meeting-${meetingId}`,
          });
        }

        // Sonner toast
        toast.info("Meeting starting soon!", {
          description: `${meeting.title} starts in 5 minutes`,
          icon: <Calendar className="h-4 w-4" />,
          duration: 10000,
        });
      }
    });
  }, [playNotificationSound]);

  const fetchMonitorCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/monitors/status-counts");
      if (!res.ok) return;
      const data = await res.json();
      setMonitorCounts({ up: data.up ?? 0, down: data.down ?? 0, total: data.total ?? 0 });
    } catch { }
  }, []);

  useEffect(() => {
    fetchMonitorCounts();
    const interval = setInterval(fetchMonitorCounts, 60000);
    return () => clearInterval(interval);
  }, [fetchMonitorCounts]);

  useEffect(() => {
    if (!socket) return;
    const onMonitorUpdate = () => {
      fetchMonitorCounts();
    };
    socket.on("monitor-update", onMonitorUpdate);
    return () => {
      socket.off("monitor-update", onMonitorUpdate);
    };
  }, [socket, fetchMonitorCounts]);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      const newNotifications: Notification[] = data.notifications ?? [];

      if (!isFirstFetchRef.current) {
        // Find new unread notifications
        const existingIds = new Set(prevNotificationsRef.current.map((n) => n.id));
        const newlyAdded = newNotifications.filter((n) => !existingIds.has(n.id) && !n.read);

        if (newlyAdded.length > 0) {
          playNotificationSound();
          newlyAdded.forEach((n) => {
            // Sonner toast
            toast.info(n.title || "New Notification", {
              description: n.message,
              action: {
                label: "View",
                onClick: () => {
                  handleClickNotification(n);
                },
              },
            });

            // Browser notification
            if ("Notification" in window && Notification.permission === "granted") {
              new window.Notification(n.title || "New Notification", {
                body: n.message,
                tag: `notif-${n.id}`,
              });
            }
          });
        }
      } else {
        isFirstFetchRef.current = false;
      }

      prevNotificationsRef.current = newNotifications;
      setNotifications(newNotifications);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [playNotificationSound]);

  const fetchOngoingMeeting = useCallback(async () => {
    try {
      const now = new Date();
      // Fetch only current user's meetings (API already filters by user)
      const res = await fetch("/api/meetings");
      if (!res.ok) return;
      const data = await res.json();
      const meetings = data.meetings || [];

      // Find ongoing meeting (started but not ended) - only from user's own meetings
      const ongoing = meetings.find((m: any) => {
        const start = new Date(m.startTime);
        const end = new Date(m.endTime);
        return start <= now && end >= now;
      });

      if (ongoing) {
        let meetingLink = normalizeMeetingLink(ongoing.meetingLink);

        // If no meetingLink but has googleCalendarEventId, try to fetch it
        if (!meetingLink && ongoing.googleCalendarEventId) {
          try {
            const linkRes = await fetch(`/api/meetings/${ongoing.id}/meet-link`);
            if (linkRes.ok) {
              const linkData = await linkRes.json();
              if (linkData.meetingLink) {
                meetingLink = normalizeMeetingLink(linkData.meetingLink);
              }
            }
          } catch {
            // ignore
          }
        }

        setOngoingMeeting({
          id: ongoing.id,
          title: ongoing.title,
          startTime: ongoing.startTime,
          endTime: ongoing.endTime,
          googleCalendarEventId: ongoing.googleCalendarEventId,
          meetingLink,
          projectName: ongoing.projectName,
        });
      } else {
        setOngoingMeeting(null);
      }

      // Check upcoming meetings for notification alert
      checkUpcomingMeetings(meetings);
    } catch {
      // ignore
    }
  }, [checkUpcomingMeetings]);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdmin(data?.user?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    // Request notification permission quietly
    if ("Notification" in window && window.Notification.permission === "default") {
      window.Notification.requestPermission();
    }

    fetchNotifications();
    fetchOngoingMeeting();
    const notificationInterval = setInterval(fetchNotifications, 15000);
    const meetingInterval = setInterval(fetchOngoingMeeting, 30000); // Check every 30 seconds
    return () => {
      clearInterval(notificationInterval);
      clearInterval(meetingInterval);
    };
  }, [fetchNotifications, fetchOngoingMeeting]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleMarkRead(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      if (!res.ok) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  }

  async function handleMarkAllRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  }

  async function handleClickNotification(n: Notification) {
    // Mark as read
    if (!n.read) {
      handleMarkRead(n.id);
    }
    // Derive and navigate to link
    const link = (() => {
      if ((n as any).link) return (n as any).link;
      switch (n.type) {
        case "task_assigned": case "task_created": case "task_updated": case "task_overdue":
          return "/dashboard/todo";
        case "new_lead": case "lead_created": case "lead_updated":
          return "/dashboard/leads";
        case "new_onboarding": case "client_created": case "client_updated": case "contact_created":
          return "/dashboard/clients";
        case "plan_shared":
          return "/dashboard/projects/plans";
        case "access_updated":
          return "/dashboard";
        case "project_assigned": case "project_updated":
          return "/dashboard/projects";
        case "attendance_updated":
          return "/dashboard/attendance";
        case "leave_request": case "leave_approved": case "leave_rejected":
          return "/dashboard/people";
        case "reimbursement_created": case "reimbursement_updated": case "reimbursement_approved": case "reimbursement_rejected":
          return "/dashboard/reimbursements";
        case "payslip_generated": case "payslip_created": case "payslip_updated": case "salary_payout_summary":
          return "/dashboard/payslips";
        case "invoice_created": case "invoice_updated": case "invoice_paid":
          return "/dashboard/invoices";
        case "proposal_created": case "proposal_updated":
          return "/dashboard/proposals";
        case "expense_created": case "expense_updated":
          return "/dashboard/expenses";
        case "deploy_success": case "deploy_failed": case "deploy_new_commit":
          return "/dashboard/deployment";
        default:
          return null;
      }
    })();
    if (link) router.push(link);
  }


  async function handleSyncExternalBusiness() {
    try {
      setSyncingBusiness(true);
      const res = await fetch("/api/products/sync-external-revenue", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to sync external business revenue");
        return;
      }
      toast.success(data.message || "External business revenue synced");
    } catch {
      toast.error("Failed to sync external business revenue");
    } finally {
      setSyncingBusiness(false);
    }
  }

  const { searchQuery, setSearchQuery } = useSearch();
  const { isPrivacyMode, togglePrivacy } = usePrivacy();

  return (
    <div className="flex items-center gap-4">
      <div className="hidden lg:flex relative items-center max-w-sm w-full group">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
        <input
          className="w-[200px] lg:w-[300px] h-9 pl-9 pr-4 rounded-full border border-muted-foreground/10 bg-muted/20 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 focus:bg-background"
          placeholder="Search workspace (⌘K)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <kbd className="absolute right-3 hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground/50">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-4">
        {/* Monitor Status */}
        {monitorCounts.total > 0 && (
          <Link
            href="/dashboard/monitor"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:shadow-sm"
            style={{
              borderColor: monitorCounts.down > 0 ? "var(--destructive)" : "var(--border)",
              backgroundColor: monitorCounts.down > 0 ? "hsl(var(--destructive) / 0.05)" : undefined,
            }}
            title={`${monitorCounts.up} up, ${monitorCounts.down} down ~ Click to view monitors`}
          >
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                {monitorCounts.up}
              </span>
              {monitorCounts.down > 0 && (
                <span className="flex items-center gap-0.5 text-destructive">
                  <XCircle className="h-3 w-3" />
                  {monitorCounts.down}
                </span>
              )}
            </span>
          </Link>
        )}

        {/* Privacy Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePrivacy}
          className="relative rounded-full"
          aria-label={isPrivacyMode ? "Show sensitive information" : "Hide sensitive information"}
          title={isPrivacyMode ? "Show numbers" : "Hide numbers"}
        >
          {isPrivacyMode ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        {/* Quick Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 gap-2 shadow-sm border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all">
              <Plus className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">Quick Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-2 py-1.5">
              Create New
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/dashboard/content/posts/new" className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-primary/70" />
                <span>New Post</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/dashboard/content/pages/new" className="flex items-center gap-2">
                <FileTextIcon className="h-4 w-4 text-primary/70" />
                <span>New Page</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/dashboard/projects/plans?action=new-plan" className="flex items-center gap-4">
                <FolderTree className="h-4 w-4 text-primary/70" />
                <span>New Document</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isAdmin && (
          <Button
            variant="outline"
            className="h-9 gap-2 shadow-sm"
            onClick={handleSyncExternalBusiness}
            disabled={syncingBusiness}
          >
            {syncingBusiness ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="text-xs font-semibold">Sync Business</span>
          </Button>
        )}

        <div className="flex items-center gap-2">
          {/* Ongoing Meeting Display */}
          {ongoingMeeting && (
            <>
              {/* Desktop/Tablet View */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800 animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                  <span className="text-xs font-medium text-blue-900 dark:text-blue-100 truncate max-w-[200px]">
                    {ongoingMeeting.title}
                  </span>
                  {ongoingMeeting.projectName && (
                    <span className="hidden md:inline text-xs text-blue-700 dark:text-blue-300 truncate max-w-[120px]">
                      ({ongoingMeeting.projectName})
                    </span>
                  )}
                </div>
                {ongoingMeeting.meetingLink ? (
                  <a
                    href={ongoingMeeting.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 flex-shrink-0"
                  >
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Video className="h-3 w-3 mr-1.5" />
                      Join
                    </Button>
                  </a>
                ) : (
                  <Link href="/dashboard/calendar" className="ml-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs"
                    >
                      <Calendar className="h-3 w-3 mr-1.5" />
                      View
                    </Button>
                  </Link>
                )}
              </div>

              {/* Mobile View - Compact */}
              <div className="sm:hidden">
                {ongoingMeeting.meetingLink ? (
                  <a
                    href={ongoingMeeting.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Video className="h-3 w-3" />
                    </Button>
                  </a>
                ) : (
                  <Link href="/dashboard/calendar">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                    >
                      <Calendar className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </>
          )}

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full"
                aria-label="Notifications"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 max-h-[420px] overflow-hidden flex flex-col p-0"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                <span className="text-sm font-semibold">Notifications</span>
                <div className="flex items-center gap-1">
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Read all
                  </Button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 divide-y">
                {notifications.length === 0 ? (
                  <div className="px-3 py-8 text-xs text-muted-foreground text-center">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-2 py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors ${!n.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                        }`}
                      onClick={() => handleClickNotification(n)}
                    >
                      {!n.read && (
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      )}
                      {n.read && <div className="mt-1.5 h-1.5 w-1.5 shrink-0" />}
                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[11px] font-semibold truncate ${n.read ? "text-muted-foreground font-medium" : ""
                            }`}>
                            {n.title || "Notification"}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {!n.read && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            aria-label="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          aria-label="Delete notification"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t px-4 py-2 flex items-center justify-between shrink-0">
                <span className="text-xs text-muted-foreground">{notifications.length} total</span>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => router.push("/dashboard/notifications")}
                >
                  View all →
                </button>
              </div>
            </DropdownMenuContent>

          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

