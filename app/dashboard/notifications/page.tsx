"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
            return "/dashboard/khatabook";
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

type FilterTab = "all" | "unread";

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);
    const [filter, setFilter] = useState<FilterTab>("all");

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(
                    (data.notifications || []).map((n: any) => ({
                        ...n,
                        id: String(n._id || n.id),
                    }))
                );
            }
        } catch {
            toast.error("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markOneRead = async (notification: Notification) => {
        if (notification.read) return;
        setNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
        try {
            await fetch(`/api/notifications/${notification.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ read: true }),
            });
        } catch {
            fetchNotifications();
        }
    };

    const deleteOne = async (notification: Notification) => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        try {
            await fetch(`/api/notifications/${notification.id}`, { method: "DELETE" });
        } catch {
            fetchNotifications();
            toast.error("Failed to delete");
        }
    };

    const handleClick = async (notification: Notification) => {
        await markOneRead(notification);
        const link = deriveLinkFromNotification(notification);
        if (link) router.push(link);
    };

    const markAllRead = async () => {
        if (markingAll) return;
        setMarkingAll(true);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        try {
            const res = await fetch("/api/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
            });
            if (!res.ok) throw new Error();
            toast.success("All marked as read");
        } catch {
            fetchNotifications();
            toast.error("Failed");
        } finally {
            setMarkingAll(false);
        }
    };

    const unreadCount = notifications.filter((n) => !n.read).length;
    const displayed = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

    return (
        <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bell className="h-6 w-6" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                        <p className="text-sm text-muted-foreground">
                            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchNotifications}
                        disabled={loading}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={markAllRead}
                            disabled={markingAll}
                        >
                            <CheckCheck className="h-4 w-4 mr-1.5" />
                            Read all
                        </Button>
                    )}
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2 border-b pb-3">
                {(["all", "unread"] as FilterTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={cn(
                            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                            filter === tab
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        {tab === "all" ? "All" : "Unread"}
                        {tab === "unread" && unreadCount > 0 && (
                            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
                                {unreadCount}
                            </Badge>
                        )}
                    </button>
                ))}
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Empty state */}
            {!loading && displayed.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">
                        🔔
                    </div>
                    <div>
                        <p className="text-base font-semibold text-muted-foreground">
                            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                        </p>
                        <p className="text-sm text-muted-foreground/60 mt-1">
                            {filter === "unread" ? "You're all caught up!" : "Notifications will appear here as events happen."}
                        </p>
                    </div>
                </div>
            )}

            {/* Notification list */}
            {!loading && displayed.length > 0 && (
                <div className="rounded-xl border divide-y overflow-hidden">
                    {displayed.map((notification) => {
                        const link = deriveLinkFromNotification(notification);
                        const isClickable = !!link;
                        return (
                            <div
                                key={notification.id}
                                className={cn(
                                    "group relative flex items-start gap-4 px-5 py-4 transition-colors",
                                    !notification.read && "bg-blue-50/60 dark:bg-blue-950/20",
                                    isClickable && "cursor-pointer hover:bg-muted/40",
                                    !isClickable && "cursor-default hover:bg-muted/20"
                                )}
                                onClick={() => isClickable && handleClick(notification)}
                            >
                                {/* Unread indicator */}
                                {!notification.read && (
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500" />
                                )}

                                {/* Icon */}
                                <span className="text-xl shrink-0 mt-0.5 select-none">
                                    {typeIcon(notification.type)}
                                </span>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className={cn(
                                            "text-sm font-semibold",
                                            notification.read && "font-medium text-muted-foreground"
                                        )}>
                                            {notification.title}
                                        </p>
                                        <span className="text-xs text-muted-foreground/70 whitespace-nowrap shrink-0">
                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        {notification.message}
                                    </p>
                                    {isClickable && (
                                        <span className="text-xs text-primary mt-1.5 block font-medium">
                                            {notification.read ? "View →" : "Click to open →"}
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    {!notification.read && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            title="Mark as read"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                markOneRead(notification);
                                            }}
                                        >
                                            <CheckCheck className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                        title="Delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteOne(notification);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
