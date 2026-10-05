"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

type ActivityChartProps = {
  monthlyRevenue?: number[];
};

export const ActivityChart = dynamic<ActivityChartProps>(
  () => import("./activity-chart-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] w-full flex items-center justify-center bg-card rounded-xl border border-dashed border-muted-foreground/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);
