"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Notification {
    _id: string;
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    link?: string;
    data?: Record<string, any>;
    createdAt: string;
}

function deriveLinkFromNotification(n: Notification): string | null {
    if (n.link) return n.link;

    switch (n.type) {
        case "new_lead":
        case "lead_created":
        case "lead_updated":
            return n.data?.leadId ? `/dashboard/leads?id=${n.data.leadId}` : "/dashboard/leads";
        case "new_onboarding":
        case "client_created":
        case "client_updated":
            return n.data?.clientId ? `/dashboard/clients?id=${n.data.clientId}` : "/dashboard/clients";
        case "plan_shared":
            return n.data?.planId ? `/view-plan/${n.data.planId}` : "/dashboard/projects/plans";
        case "access_updated":
            return "/dashboard";
        case "task_assigned":
        case "task_created":
        case "task_updated":
        case "task_overdue":
            return n.data?.taskId ? `/dashboard/todo?task=${n.data.taskId}` : "/dashboard/todo";
        case "project_assigned":
        case "project_updated":
            return n.data?.projectId ? `/dashboard/projects?id=${n.data.projectId}` : "/dashboard/projects";
        case "attendance_updated":
            return "/dashboard/attendance";
        case "leave_request":
        case "leave_approved":
        case "leave_rejected":
            return n.data?.employeeId ? `/dashboard/people/${n.data.employeeId}` : "/dashboard/people";
        case "reimbursement_created":
        case "reimbursement_updated":
        case "reimbursement_approved":
        case "reimbursement_rejected":
            return "/dashboard/reimbursements";
        case "payslip_generated":
        case "payslip_created":
        case "payslip_updated":
        case "salary_payout_summary":
            return "/dashboard/payslips";
        case "invoice_created":
        case "invoice_updated":
        case "invoice_paid":
            return n.data?.invoiceId ? `/dashboard/invoices?id=${n.data.invoiceId}` : "/dashboard/invoices";
        case "proposal_created":
        case "proposal_updated":
            return n.data?.proposalId ? `/dashboard/proposals?id=${n.data.proposalId}` : "/dashboard/proposals";
        case "expense_created":
        case "expense_updated":
            return "/dashboard/expenses";
        case "deploy_success":
        case "deploy_failed":
        case "deploy_new_commit":
            return "/dashboard/deployment";
        case "contact_created":
            return "/dashboard/clients";
        default:
            return null;
    }
}

function typeIcon(type: string) {
    if (type.startsWith("task")) return "📋";
    if (type.startsWith("lead")) return "🎯";
    if (type.startsWith("invoice")) return "🧾";
    if (type.startsWith("payslip") || type.includes("salary")) return "💰";
    if (type.startsWith("leave")) return "🏖️";
    if (type.startsWith("project")) return "📁";
    if (type.startsWith("deploy")) return "🚀";
    if (type.startsWith("reimbursement")) return "💸";
    if (type.startsWith("proposal")) return "📝";
    if (type.startsWith("client") || type.includes("onboarding")) return "👤";
    return "🔔";
}

export function NotificationBell() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const deletingRef = useRef<Set<string>>(new Set());

    const fetchNotifications = async (silent = true) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                const items: Notification[] = (data.notifications || []).map((n: any) => ({
                    ...n,
                    id: String(n._id || n.id),
                }));
                setNotifications(items);
                setUnreadCount(items.filter((n) => !n.read).length);
            }
        } catch {
            // silent
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications(true);
        const interval = setInterval(() => fetchNotifications(true), 30000);
        return () => clearInterval(interval);
    }, []);

    // Refresh when dropdown opens
    useEffect(() => {
        if (open) fetchNotifications(false);
    }, [open]);

    const markOneRead = async (notification: Notification) => {
        if (notification.read) return;
        // Optimistic update
        setNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            await fetch(`/api/notifications/${notification.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ read: true }),
            });
        } catch {
            // revert on failure
            setNotifications((prev) =>
                prev.map((n) => (n.id === notification.id ? { ...n, read: false } : n))
            );
            setUnreadCount((prev) => prev + 1);
        }
    };

    const handleClick = async (notification: Notification) => {
        await markOneRead(notification);
        const link = deriveLinkFromNotification(notification);
        if (link) {
            setOpen(false);
            router.push(link);
        }
    };

    const deleteOne = async (e: React.MouseEvent, notification: Notification) => {
        e.stopPropagation();
        if (deletingRef.current.has(notification.id)) return;
        deletingRef.current.add(notification.id);

        // Optimistic remove
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        if (!notification.read) setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            await fetch(`/api/notifications/${notification.id}`, { method: "DELETE" });
        } catch {
            // Re-fetch to restore correct state
            fetchNotifications(true);
            toast.error("Failed to delete notification");
        } finally {
            deletingRef.current.delete(notification.id);
        }
    };

    const markAllRead = async () => {
        if (markingAll || unreadCount === 0) return;
        setMarkingAll(true);
        // Optimistic
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        try {
            const res = await fetch("/api/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
            });
            if (!res.ok) throw new Error();
            toast.success("All notifications marked as read");
        } catch {
            // revert
            fetchNotifications(true);
            toast.error("Failed to mark all as read");
        } finally {
            setMarkingAll(false);
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 ring-2 ring-background">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[360px] p-0" sideOffset={8}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">Notifications</span>
                        {unreadCount > 0 && (
                            <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {loading && (
                            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                        )}
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                onClick={markAllRead}
                                disabled={markingAll}
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Read all
                            </Button>
                        )}
                    </div>
                </div>

                {/* Notification List */}
                <ScrollArea className="h-[380px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] gap-3 text-center">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl">
                                🔔
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                                <p className="text-xs text-muted-foreground/60 mt-0.5">No notifications yet.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {notifications.map((notification) => {
                                const link = deriveLinkFromNotification(notification);
                                const isClickable = !!link;
                                return (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "group relative flex items-start gap-3 px-4 py-3 transition-colors",
                                            !notification.read && "bg-blue-50/60 dark:bg-blue-950/20",
                                            isClickable && "cursor-pointer hover:bg-muted/60",
                                            !isClickable && "cursor-default"
                                        )}
                                        onClick={() => isClickable && handleClick(notification)}
                                    >
                                        {/* Icon */}
                                        <span className="shrink-0 text-base mt-0.5 select-none">
                                            {typeIcon(notification.type)}
                                        </span>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn(
                                                    "text-sm font-medium leading-snug",
                                                    !notification.read && "text-foreground",
                                                    notification.read && "text-muted-foreground"
                                                )}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap shrink-0 mt-0.5">
                                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            {isClickable && (
                                                <span className="text-[10px] text-primary/70 mt-1 block">
                                                    {notification.read ? "View →" : "Click to view →"}
                                                </span>
                                            )}
                                        </div>

                                        {/* Unread dot */}
                                        {!notification.read && (
                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                                        )}

                                        {/* Action buttons - show on hover */}
                                        <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1">
                                            {!notification.read && (
                                                <button
                                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                    title="Mark as read"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markOneRead(notification);
                                                    }}
                                                >
                                                    <Check className="h-3 w-3" />
                                                </button>
                                            )}
                                            <button
                                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500 transition-colors"
                                                title="Delete"
                                                onClick={(e) => deleteOne(e, notification)}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                {notifications.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="flex items-center justify-between px-4 py-2">
                            <span className="text-xs text-muted-foreground">
                                {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
                            </span>
                            <button
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => {
                                    setOpen(false);
                                    router.push("/dashboard/notifications");
                                }}
                            >
                                View all →
                            </button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
