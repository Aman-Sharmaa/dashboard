/** Admin overview widget keys (must match CmsSetting merge keys in dashboard page). */
export const ADMIN_DASHBOARD_WIDGET_KEYS = [
  "metrics",
  "goalsProgress",
  "taskPerformance",
  "upcomingPayments",
  "monthlyOverall",
  "secondaryMetrics",
  "moneyInOut",
  "profitLossChart",
  "netPLGrowth",
  "revenueChart",
  "monitorOverview",
  "meetingStatus",
  "meetingStats",
] as const;

export const ADMIN_DASHBOARD_WIDGET_LABELS: Record<(typeof ADMIN_DASHBOARD_WIDGET_KEYS)[number], string> = {
  metrics: "Key metrics (revenue, due, clients, projects, team)",
  goalsProgress: "Yearly business goals",
  taskPerformance: "Task performance",
  upcomingPayments: "Upcoming payments",
  monthlyOverall: "Monthly expense & revenue summary",
  secondaryMetrics: "Tasks, monitor, attendance, meetings, expenses row",
  moneyInOut: "Money in / Money out tables",
  profitLossChart: "Profit & loss chart",
  netPLGrowth: "Net P&L and growth",
  revenueChart: "Monthly revenue chart & quick actions",
  monitorOverview: "Monitor overview",
  meetingStatus: "Meeting status",
  meetingStats: "Meeting statistics",
};

/** Employee overview widget keys. */
export const EMPLOYEE_DASHBOARD_WIDGET_KEYS = [
  "checkInOut",
  "statsCards",
  "taskCounts",
  "taskPerformance",
  "projects",
] as const;

export const EMPLOYEE_DASHBOARD_WIDGET_LABELS: Record<(typeof EMPLOYEE_DASHBOARD_WIDGET_KEYS)[number], string> = {
  checkInOut: "Check in / Check out",
  statsCards: "Stat cards (projects, leave, attendance, payslips, drive)",
  taskCounts: "Task counts",
  taskPerformance: "Task performance",
  projects: "My projects & quick actions",
};

export function mergeWidgetPrefs(
  defaults: Record<string, boolean>,
  prefs: Record<string, boolean> | null | undefined
): Record<string, boolean> {
  const out = { ...defaults };
  if (!prefs) return out;
  for (const k of Object.keys(out)) {
    if (typeof prefs[k] === "boolean") out[k] = prefs[k]!;
  }
  return out;
}
