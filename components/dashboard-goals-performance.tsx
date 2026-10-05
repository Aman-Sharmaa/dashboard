"use client";

import { TodayGoalsSection } from "@/components/today-goals-section";
import { TeamPerformanceView } from "@/components/team-performance-view";

export function DashboardGoalsPerformance({ isAdmin }: { isAdmin: boolean }) {
  return (
    <>
      <div className="rounded-xl border bg-card p-5">
        <TodayGoalsSection isAdmin={isAdmin} onCreateGoal={() => {}} />
      </div>
      <div className="rounded-xl border bg-card p-5">
        <TeamPerformanceView />
      </div>
    </>
  );
}
