"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const DashboardTaskPerformance = dynamic(
  () => import("./dashboard-task-performance-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border bg-card p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);
