"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Loader2, CheckCircle2, AlertCircle, Clock, ListTodo } from "lucide-react";

type Counts = {
  total: number;
  todo: number;
  in_progress: number;
  in_review: number;
  done: number;
  overdue: number;
  backlogs: number;
};

export function DashboardTaskCountsEmployee() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    fetch("/api/tasks/counts?scope=all", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setCounts)
      .catch(() => setCounts(null));
  }, []);

  if (counts === null) {
    return (
      <div className="p-4 rounded-xl border bg-card flex items-center justify-center min-h-[100px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ongoing = counts.in_progress;

  return (
    <>
      <Link href="/dashboard">
        <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Task
            </span>
            <ClipboardList className="h-4 w-4 text-violet-500" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{counts.total}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Overall tasks</p>
        </div>
      </Link>
      <Link href="/dashboard">
        <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Ongoing
            </span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{ongoing}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">In progress</p>
        </div>
      </Link>
      <Link href="/dashboard">
        <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              In Review
            </span>
            <ListTodo className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{counts.in_review}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Waiting review</p>
        </div>
      </Link>
      <Link href="/dashboard">
        <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Due
            </span>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{counts.overdue}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Overdue</p>
        </div>
      </Link>
      <Link href="/dashboard">
        <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Completed
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{counts.done}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Done</p>
        </div>
      </Link>
    </>
  );
}

export function DashboardTaskCountsAdmin() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    fetch("/api/tasks/counts", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setCounts)
      .catch(() => setCounts(null));
  }, []);

  if (counts === null) {
    return (
      <div className="p-4 rounded-xl border bg-card flex items-center justify-center min-h-[100px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ongoing = counts.in_progress;

  return (
    <>
      <Link href="/dashboard/projects">
        <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Task
            </span>
            <ClipboardList className="h-4 w-4 text-violet-500" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{counts.total}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Overall tasks</p>
        </div>
      </Link>

      <div className="p-4 rounded-xl border bg-card h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Ongoing
          </span>
          <Clock className="h-4 w-4 text-blue-500" />
        </div>
        <p className="text-2xl font-bold tabular-nums">{ongoing}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">In progress</p>
      </div>

      <div className="p-4 rounded-xl border bg-card h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            In Review
          </span>
          <ListTodo className="h-4 w-4 text-amber-500" />
        </div>
        <p className="text-2xl font-bold tabular-nums">{counts.in_review}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Waiting review</p>
      </div>

      <div className="p-4 rounded-xl border bg-card h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Due
          </span>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </div>
        <p className="text-2xl font-bold tabular-nums">{counts.overdue}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Overdue</p>
      </div>

      <div className="p-4 rounded-xl border bg-card h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Completed
          </span>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </div>
        <p className="text-2xl font-bold tabular-nums">{counts.done}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Done</p>
      </div>
    </>
  );
}
