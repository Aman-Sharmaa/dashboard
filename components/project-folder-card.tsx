"use client";

import Link from "next/link";
import {
  FolderOpen,
  Eye,
  Calendar,
  IndianRupee,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Globe,
  GlobeLock,
  ExternalLink,
  Users,
  ArrowRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ProjectFolderCardProps = {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  status: string;
  endDate?: string | null;
  startDate?: string | null;
  totalMonths?: number | null;
  monthlyRecurringCost?: number;
  hideCost?: boolean;
  actions?: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  assignedMembers?: { id: string; name: string }[];
  taskTotal?: number;
  taskDone?: number;
  isPinned?: boolean;
  isPinnedToSidebar?: boolean;
  isPublic?: boolean;
  publicSlug?: string | null;
  onTogglePublic?: () => void;
  variant?: "card" | "list";
};

function formatDate(d: string | null | undefined) {
  if (!d) return "~";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(n: number | undefined) {
  if (n == null || n === 0) return "~";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  planned: { label: "Planned", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  active: { label: "Active", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  on_hold: { label: "On Hold", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  completed: { label: "Completed", bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
  maintenance: { label: "Maintenance", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200 dark:border-teal-800" },
};

export function ProjectFolderCard({
  id,
  clientId,
  clientName,
  name,
  status,
  endDate,
  monthlyRecurringCost = 0,
  hideCost,
  assignedMembers = [],
  taskTotal = 0,
  taskDone = 0,
  variant = "card",
  isPublic = false,
  publicSlug,
  onTogglePublic,
  onEdit,
  onDelete,
}: ProjectFolderCardProps) {
  const href = `/dashboard/projects/clients/${clientId}/projects/${id}`;
  const progressPct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
  const statusCfg = STATUS_CONFIG[status] || {
    label: status.replace("_", " "),
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-700 dark:text-neutral-300",
    border: "border-neutral-200 dark:border-neutral-700",
  };

  const isOverdue =
    status !== "completed" &&
    endDate &&
    new Date(endDate).getTime() < new Date().setHours(0, 0, 0, 0);

  if (variant === "list") {
    return (
      <div className="group flex items-center justify-between p-4 hover:bg-neutral-50/80 dark:hover:bg-neutral-900/50 transition-colors border-b border-neutral-100 dark:border-neutral-800/80 last:border-0 gap-4">
        <Link href={href} className="flex-1 min-w-0 flex items-center gap-3.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate group-hover:text-primary transition-colors">
                {name}
              </h4>
              <Badge
                variant="outline"
                className={cn("text-[10px] px-2 py-0.5 font-semibold shrink-0 border", statusCfg.bg, statusCfg.text, statusCfg.border)}
              >
                {statusCfg.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{clientName || "General Client"}</p>
          </div>
        </Link>

        {/* Task Progress */}
        <div className="hidden md:flex flex-col gap-1 w-32 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>Progress</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">{progressPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                progressPct === 100 ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Team Avatars */}
        <div className="hidden sm:flex items-center shrink-0">
          <div className="flex -space-x-1.5">
            {assignedMembers.slice(0, 3).map((m) => (
              <Avatar key={m.id} className="h-7 w-7 border-2 border-white dark:border-neutral-900 shadow-2xs">
                <AvatarFallback className="text-[10px] font-bold bg-neutral-100 text-neutral-700">
                  {m.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>

        {/* Deadline */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground w-28 shrink-0">
          <Calendar className="h-3.5 w-3.5" />
          <span className={cn(isOverdue && "text-red-600 font-bold")}>
            {formatDate(endDate)}
          </span>
        </div>

        {/* Monthly Retainer */}
        {!hideCost && (
          <div className="hidden xl:block text-right w-24 shrink-0 text-xs font-bold text-neutral-800 dark:text-neutral-200">
            {monthlyRecurringCost > 0 ? `${formatCurrency(monthlyRecurringCost)}/mo` : "—"}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" asChild className="rounded-xl h-8 text-xs font-semibold gap-1">
            <Link href={href}>
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl p-1">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit} className="text-xs rounded-lg gap-2 cursor-pointer">
                  <Pencil className="h-3.5 w-3.5" /> Edit Project
                </DropdownMenuItem>
              )}
              {onTogglePublic && (
                <DropdownMenuItem onClick={onTogglePublic} className="text-xs rounded-lg gap-2 cursor-pointer">
                  {isPublic ? <GlobeLock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                  {isPublic ? "Make Private" : "Make Public"}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-xs rounded-lg gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Project
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-300 min-h-[250px]">
      {/* Top Header Row */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <Link href={href} className="block">
                <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 truncate group-hover:text-primary transition-colors leading-tight">
                  {name}
                </h3>
              </Link>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {clientName || "General Client"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Badge
              variant="outline"
              className={cn("text-[10px] px-2 py-0.5 font-semibold border", statusCfg.bg, statusCfg.text, statusCfg.border)}
            >
              {statusCfg.label}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl p-1">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit} className="text-xs rounded-lg gap-2 cursor-pointer">
                    <Pencil className="h-3.5 w-3.5" /> Edit Project
                  </DropdownMenuItem>
                )}
                {onTogglePublic && (
                  <DropdownMenuItem onClick={onTogglePublic} className="text-xs rounded-lg gap-2 cursor-pointer">
                    {isPublic ? <GlobeLock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                    {isPublic ? "Make Private" : "Make Public"}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-xs rounded-lg gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Project
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Task Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {taskTotal > 0 ? `${taskDone}/${taskTotal} Tasks Completed` : "No tasks created"}
            </span>
            <span className="font-bold text-neutral-900 dark:text-neutral-100">{progressPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progressPct === 100 ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${Math.max(progressPct, taskTotal > 0 ? 3 : 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card Footer Details */}
      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span className={cn(isOverdue && "text-red-600 font-bold")}>
              {endDate ? formatDate(endDate) : "Ongoing"}
            </span>
          </div>

          {!hideCost && monthlyRecurringCost > 0 && (
            <div className="flex items-center gap-1 font-bold text-neutral-800 dark:text-neutral-200">
              <IndianRupee className="h-3.5 w-3.5" />
              <span>{formatCurrency(monthlyRecurringCost)}/mo</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          {/* Assigned Members */}
          <div className="flex items-center gap-2">
            {assignedMembers.length > 0 ? (
              <div className="flex -space-x-1.5">
                {assignedMembers.slice(0, 4).map((m) => (
                  <Avatar key={m.id} className="h-6 w-6 border-2 border-white dark:border-neutral-900 shadow-2xs">
                    <AvatarFallback className="text-[9px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {m.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {assignedMembers.length > 4 && (
                  <span className="text-[10px] font-bold text-muted-foreground pl-1.5 self-center">
                    +{assignedMembers.length - 4}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                <Users className="h-3 w-3" /> Unassigned
              </span>
            )}
          </div>

          {/* View Button */}
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="rounded-xl h-7 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 gap-1 group/btn"
          >
            <Link href={href}>
              <span>Open</span>
              <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
