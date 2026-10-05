import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getOverviewStats } from "@/lib/overview-stats";
import { Employee } from "@/models/Employee";
import { Project } from "@/models/Project";
import { Attendance } from "@/models/Attendance";
import { Meeting } from "@/models/Meeting";
import { User } from "@/models/User";
import { Task } from "@/models/Task";
import { CompanyProfile } from "@/models/CompanyProfile";
import { Goal } from "@/models/Goal";
import { CmsSetting } from "@/models/CmsSetting";
import { DriveItem } from "@/models/DriveItem";
import { Debt } from "@/models/Debt";
import { calculateLeaveBalance } from "@/lib/leave-balance";
import { DEFAULT_EMPLOYEE_FEATURES } from "@/lib/features";
import {
  mergeWidgetPrefs,
  ADMIN_DASHBOARD_WIDGET_LABELS,
  EMPLOYEE_DASHBOARD_WIDGET_LABELS,
} from "@/lib/dashboard-prefs";
import { DashboardCustomizeBar } from "@/components/dashboard-customize-bar";
import { getUserDriveQuota } from "@/lib/drive";
import { ensureEmployeeByEmail } from "@/lib/ensure-employee";
import {
  TrendingUp,
  Building2,
  FolderKanban,
  Users,
  Wallet,
  ArrowUpRight,
  Settings,
  Activity,
  Clock,
  Receipt,
  FileText,
  Calendar,
  HardDrive,
  Download,
  Landmark,
  CheckCircle,
  AlertCircle,
  Sparkles,
  UserCheck,
  Shield,
  HelpCircle,
  Briefcase,
  ChevronRight,
  BarChart3,
  PieChart,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityChart } from "@/components/activity-chart";
import { ProfitLossChart } from "@/components/profit-loss-chart";
import { EmployeeCheckInOutCard } from "@/components/employee-check-in-out-card";
import { DashboardMonitorOverview } from "@/components/dashboard-monitor-overview";
import { DashboardTaskCountsEmployee, DashboardTaskCountsAdmin } from "@/components/dashboard-task-counts";
import { DashboardMonitorUpDown } from "@/components/dashboard-monitor-up-down";
import { MeetingStatsClient } from "@/components/meeting-stats-client";
import { CurrencyDisplay } from "@/components/currency-display";
import { DashboardTaskPerformance } from "@/components/dashboard-task-performance";
import { EmployeeDashboardPremium } from "@/components/employee-dashboard-premium";
import { EmployeePerformanceSection } from "@/components/employee-performance-section";
import { DashboardGoalsPerformance } from "@/components/dashboard-goals-performance";

export const dynamic = "force-dynamic";

const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp,
  Building2,
  FolderKanban,
  Users,
  Wallet,
  ArrowUpRight,
  Settings,
  Activity,
  Clock,
  Receipt,
  FileText,
  Calendar,
  HardDrive,
  Download,
  Landmark,
  CheckCircle,
  AlertCircle,
  Sparkles,
  UserCheck,
  Shield,
  HelpCircle,
  Briefcase,
  ChevronRight,
  BarChart3,
  PieChart,
  Layers,
};

// Resolve Lucide icon name string to component
function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] || ArrowUpRight;
}

// Default CMS dashboard overview settings
const DEFAULT_DASHBOARD_OVERVIEW = {
  admin: {
    title: "Dashboard",
    subtitle: "Overview for Webwrite",
    ctaLabel: "New project",
    ctaLink: "/dashboard/projects",
    showCta: true,
    quickLinks: [
      { label: "Projects", href: "/dashboard/projects", icon: "FolderKanban" },
      { label: "Team", href: "/dashboard/people", icon: "Users" },
      { label: "Clients", href: "/dashboard/clients", icon: "Building2" },
      { label: "Expenses", href: "/dashboard/khatabook", icon: "Wallet" },
      { label: "Monitor", href: "/dashboard/monitor", icon: "Activity" },
      { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
    ],
    sections: {
      metrics: true,
      goalsProgress: true,
      taskPerformance: true,
      upcomingPayments: true,
      monthlyOverall: true,
      secondaryMetrics: false,
      moneyInOut: false,
      profitLossChart: true,
      netPLGrowth: false,
      revenueChart: true,
      monitorOverview: true,
      meetingStatus: false,
      meetingStats: false,
    },
  },
  employee: {
    title: "Overview",
    subtitle: "Your dashboard · Check in/out, projects, and quick links.",
    quickLinks: [
      { label: "My projects", href: "/dashboard/projects", icon: "FolderKanban" },
      { label: "Team members", href: "/dashboard/people", icon: "Users" },
      { label: "Attendance", href: "/dashboard/attendance", icon: "Clock" },
      { label: "Reimbursement", href: "/dashboard/reimbursements", icon: "Receipt" },
      { label: "Payslips", href: "/dashboard/payslips", icon: "FileText" },
      { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
    ],
    sections: {
      checkInOut: true,
      statsCards: true,
      taskCounts: true,
      taskPerformance: true,
      projects: true,
    },
  },
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIdx = 0;
  while (value >= 1024 && unitIdx < units.length - 1) {
    value /= 1024;
    unitIdx += 1;
  }
  const decimals = value >= 10 || unitIdx === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIdx]}`;
}

function formatTaskStatus(status: string) {
  const map: Record<string, string> = {
    backlog: "Backlog",
    todo: "To Do",
    in_progress: "In Progress",
    hold: "Hold",
    in_review: "In Review",
    done: "Completed",
    rejected: "Rejected",
  };
  return map[status] || status.replace(/_/g, " ");
}

function getFeatureKeyFromHref(href: string): string | null {
  const map: Array<{ prefix: string; key: string }> = [
    { prefix: "/dashboard/projects/plans", key: "plans" },
    { prefix: "/dashboard/projects", key: "projects" },
    { prefix: "/dashboard/people", key: "team" },
    { prefix: "/dashboard/attendance", key: "attendance" },
    { prefix: "/dashboard/reimbursements", key: "reimbursements" },
    { prefix: "/dashboard/payslips", key: "payslips" },
    { prefix: "/dashboard/drive", key: "drive" },
    { prefix: "/dashboard/todo", key: "todo" },
    { prefix: "/dashboard/roadmap", key: "roadmap" },
    { prefix: "/dashboard/invoices", key: "invoices" },
    { prefix: "/dashboard/finance/proposals", key: "proposals" },
    { prefix: "/dashboard/finance/debts", key: "debts" },
    { prefix: "/dashboard/khatabook", key: "khatabook" },
    { prefix: "/dashboard/leads", key: "leads" },
    { prefix: "/dashboard/clients", key: "clients" },
    { prefix: "/dashboard/products", key: "products" },
    { prefix: "/dashboard/content", key: "cms" },
    { prefix: "/dashboard/monitor", key: "monitor" },
    { prefix: "/dashboard/deployment", key: "deployments" },
    { prefix: "/dashboard", key: "dashboard" },
  ];
  const match = map.find((row) => href.startsWith(row.prefix));
  return match ? match.key : null;
}

const COOKIE_NAME = "kalp_auth_token";

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login");
  try {
    return verifyToken(token);
  } catch {
    redirect("/login");
  }
}

export default async function DashboardHome() {
  const user = await requireAuth();
  await connectDB();

  // Fetch CMS dashboard overview settings
  const cmsDoc = await CmsSetting.findOne().select("dashboardOverview").lean();
  const cmsOverview = (cmsDoc as any)?.dashboardOverview || DEFAULT_DASHBOARD_OVERVIEW;
  const adminCms = {
    ...DEFAULT_DASHBOARD_OVERVIEW.admin,
    ...cmsOverview.admin,
    sections: { ...DEFAULT_DASHBOARD_OVERVIEW.admin.sections, ...(cmsOverview.admin?.sections || {}) },
    quickLinks: cmsOverview.admin?.quickLinks?.length > 0 ? cmsOverview.admin.quickLinks : DEFAULT_DASHBOARD_OVERVIEW.admin.quickLinks,
  };
  const empCms = {
    ...DEFAULT_DASHBOARD_OVERVIEW.employee,
    ...cmsOverview.employee,
    sections: { ...DEFAULT_DASHBOARD_OVERVIEW.employee.sections, ...(cmsOverview.employee?.sections || {}) },
    quickLinks: cmsOverview.employee?.quickLinks?.length > 0 ? cmsOverview.employee.quickLinks : DEFAULT_DASHBOARD_OVERVIEW.employee.quickLinks,
  };

  const isEmployee = user.role === "employee";
  const employeeForTasks = await ensureEmployeeByEmail(user.email);
  const assignedTaskDocs = employeeForTasks
    ? await Task.find({
      $or: [{ assignees: (employeeForTasks as any)._id }, { assignee: (employeeForTasks as any)._id }],
    })
      .populate("project", "name")
      .select("title dueDate status priority project createdAt")
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(20)
      .lean()
    : [];

  const assignedTasks = (assignedTaskDocs as any[])
    .map((t) => ({
      id: String(t._id),
      title: t.title as string,
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      status: String(t.status || ""),
      projectName:
        t.project && typeof t.project === "object" && (t.project as any).name
          ? String((t.project as any).name)
          : "~",
    }))
    .sort((a, b) => {
      const aDue = a.dueDate ? a.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueDate ? b.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    })
    .slice(0, 8);

  if (isEmployee) {
    const employee = await Employee.findOne({ email: user.email }).lean();
    if (employee && (employee as any).isOutsider) {
      redirect("/dashboard/todo");
    }

    const employeeId = employee ? (employee as any)._id : null;
    const userDoc = await User.findById(user.userId).select("featureAccess dashboardWidgetPrefs").lean();
    const rawFeatures = Array.isArray((userDoc as any)?.featureAccess) ? (userDoc as any).featureAccess as string[] : [];
    const effectiveFeatures = rawFeatures.length > 0 ? rawFeatures : DEFAULT_EMPLOYEE_FEATURES;
    const featureSet = new Set(effectiveFeatures);
    const hasFeature = (key: string) => featureSet.has(key);

    let driveQuotaBytes = 0;
    const driveBreakdown = {
      image: { bytes: 0, count: 0 },
      video: { bytes: 0, count: 0 },
      other: { bytes: 0, count: 0 },
    };
    if (hasFeature("drive")) {
      driveQuotaBytes = await getUserDriveQuota(user.userId);
      if (mongoose.Types.ObjectId.isValid(user.userId)) {
        const ownerId = new mongoose.Types.ObjectId(user.userId);
        const driveSummary = await DriveItem.aggregate([
          { $match: { owner: ownerId, type: "file" } },
          {
            $project: {
              sizeInBytes: 1,
              category: {
                $switch: {
                  branches: [
                    {
                      case: { $regexMatch: { input: { $ifNull: ["$mimeType", ""] }, regex: "^image/" } },
                      then: "image",
                    },
                    {
                      case: { $regexMatch: { input: { $ifNull: ["$mimeType", ""] }, regex: "^video/" } },
                      then: "video",
                    },
                  ],
                  default: "other",
                },
              },
            },
          },
          {
            $group: {
              _id: "$category",
              totalBytes: { $sum: "$sizeInBytes" },
              totalCount: { $sum: 1 },
            },
          },
        ]);
        for (const row of driveSummary as Array<{ _id: "image" | "video" | "other"; totalBytes: number; totalCount: number }>) {
          if (!driveBreakdown[row._id]) continue;
          driveBreakdown[row._id] = {
            bytes: Number(row.totalBytes || 0),
            count: Number(row.totalCount || 0),
          };
        }
      }
    }
    const driveUsedBytes = driveBreakdown.image.bytes + driveBreakdown.video.bytes + driveBreakdown.other.bytes;
    const driveUsagePct = driveQuotaBytes > 0 ? Math.min(100, Math.round((driveUsedBytes / driveQuotaBytes) * 100)) : 0;

    // Use manually set leave values if admin overrode them, otherwise auto-calculate
    const companyProfile = await CompanyProfile.findOne({ owner: user.userId }).lean() ||
      await CompanyProfile.findOne().lean();
    const leaveBalance = employee
      ? (employee as any).leaveManualOverride
        ? {
          casualLeaveBalance: (employee as any).casualLeaveBalance ?? 0,
          casualLeaveTotal: (employee as any).casualLeaveTotal ?? 0,
          sickLeaveBalance: (employee as any).sickLeaveBalance ?? 0,
          sickLeaveTotal: (employee as any).sickLeaveTotal ?? 0,
        }
        : await calculateLeaveBalance(employee, companyProfile)
      : { casualLeaveBalance: 0, casualLeaveTotal: 0, sickLeaveBalance: 0, sickLeaveTotal: 0 };
    const employeeProjectFilter = { assignedMembers: employeeId };
    const [assignedProjectsCount, assignedProjects] = employeeId
      ? await Promise.all([
        Project.countDocuments(employeeProjectFilter),
        Project.find(employeeProjectFilter)
          .populate("client", "companyName")
          .sort({ startDate: -1 })
          .limit(8)
          .select("name client status")
          .lean(),
      ])
      : [0, []];

    // Compute real task progress per project
    const projectIds = (assignedProjects as any[]).map((p) => p._id);
    const taskProgressAgg = projectIds.length > 0
      ? await Task.aggregate([
        { $match: { project: { $in: projectIds } } },
        {
          $group: {
            _id: "$project",
            total: { $sum: 1 },
            done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          },
        },
      ])
      : [];
    const progressMap = new Map<string, { total: number; done: number }>();
    for (const row of taskProgressAgg as { _id: any; total: number; done: number }[]) {
      progressMap.set(String(row._id), { total: row.total, done: row.done });
    }

    const projectRows = (assignedProjects as any[]).map((p) => {
      const prog = progressMap.get(String(p._id));
      const progressPct = prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
      return {
        id: String(p._id),
        clientId: p.client && typeof p.client === "object" ? String((p.client as any)._id) : String(p.client),
        name: (p as any).name,
        clientName: p.client && typeof p.client === "object" ? (p.client as any).companyName : "~",
        status: (p as any).status,
        progressPct,
        tasksDone: prog?.done || 0,
        tasksTotal: prog?.total || 0,
      };
    });

    const casualBalance = leaveBalance.casualLeaveBalance;
    const casualTotal = leaveBalance.casualLeaveTotal;
    const sickBalance = leaveBalance.sickLeaveBalance;
    const sickTotal = leaveBalance.sickLeaveTotal;

    const activeEmployeeDocs = await Employee.find({ isDismissed: false }).select("name email avatarUrl").lean();
    const activeEmployees = (activeEmployeeDocs as any[]).map(e => ({
      id: String(e._id),
      name: e.name || "",
      email: e.email || "",
      avatarUrl: e.avatarUrl || "",
    }));

    return (
      <EmployeeDashboardPremium
        userName={(user as any).name || user.email.split("@")[0]}
        userEmail={user.email}
        assignedTasks={assignedTasks as any[]}
        assignedProjectsCount={assignedProjectsCount}
        projectRows={projectRows}
        casualBalance={casualBalance}
        casualTotal={casualTotal}
        sickBalance={sickBalance}
        sickTotal={sickTotal}
        employees={activeEmployees}
      />
    );
  }

  const stats = await getOverviewStats();
  const goalDocs = await Goal.find({ year: stats.currentYear })
    .populate("business", "name kind")
    .lean();
  const goalRows = (goalDocs as any[]).map((g) => {
    const businessId = g.business?._id ? String(g.business._id) : String(g.business || "");
    const achieved = stats.revenueByBusiness.find((r) => r.businessId === businessId)?.totalRevenue || 0;
    const target = Number(g.targetAmount || 0);
    const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
    return {
      id: String(g._id),
      name: g.business?.name || "~",
      kind: g.business?.kind || "product",
      target,
      achieved,
      pct,
    };
  });
  const goalsTargetTotal = goalRows.reduce((sum, g) => sum + g.target, 0);
  const goalsAchievedTotal = goalRows.reduce((sum, g) => sum + g.achieved, 0);
  const goalsOverallPct = goalsTargetTotal > 0 ? Math.min(100, Math.round((goalsAchievedTotal / goalsTargetTotal) * 100)) : 0;

  // Meeting status (admin view)
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const now = new Date();

  // Filter meetings by user (everyone sees only their own meetings)
  const userDoc = await User.findById(user.userId).select("email dashboardWidgetPrefs").lean();
  const userEmail = userDoc ? (userDoc as any).email : null;
  const meetingFilter: Record<string, unknown> = {};

  if (userEmail) {
    meetingFilter.$or = [
      { createdBy: user.userId },
      { attendees: userEmail }
    ];
  } else {
    meetingFilter.createdBy = user.userId;
  }

  const [ongoingMeetings, todayMeetings, allProjects, allEmployees, debtAgg] = await Promise.all([
    // Ongoing meetings (started but not ended) - filtered by user
    Meeting.find({
      ...meetingFilter,
      startTime: { $lte: now },
      endTime: { $gte: now },
    })
      .populate("project", "name")
      .populate("createdBy", "email name")
      .select("title startTime endTime project createdBy attendees meetingLink googleCalendarEventId")
      .sort({ startTime: 1 })
      .lean(),
    // Today's meetings - filtered by user
    Meeting.find({
      ...meetingFilter,
      startTime: { $gte: todayStart, $lte: todayEnd },
    })
      .populate("project", "name")
      .populate("createdBy", "email name")
      .select("title startTime endTime project createdBy attendees meetingLink googleCalendarEventId")
      .sort({ startTime: 1 })
      .lean(),
    // All projects for stats filter (active clients only)
    Project.find({ status: { $ne: "completed" } })
      .populate({ path: "client", match: { isActive: true }, select: "name companyName isActive" })
      .select("name client")
      .sort({ name: 1 })
      .lean(),
    // All employees for stats filter
    Employee.find({ isDismissed: false })
      .select("name email")
      .sort({ name: 1 })
      .lean(),
    // Debt summary aggregate
    Debt.aggregate([
      {
        $group: {
          _id: { type: "$type", status: "$status" },
          total: { $sum: "$amount" },
          settled: { $sum: "$settledAmount" },
          count: { $sum: 1 },
        }
      },
    ]),
  ]);

  // Filter to active-client projects only
  const projectOptions = (allProjects as any[]).filter((p: any) => p.client != null).map((p: any) => ({
    id: String(p._id),
    name: p.name as string,
  }));

  // Debt summary computation
  const debtSummary = {
    takenPending: 0,
    takenPartial: 0,
    givenPending: 0,
    givenPartial: 0,
  };
  for (const row of debtAgg as any[]) {
    const { type, status } = row._id;
    if (type === "taken" && status === "pending") debtSummary.takenPending += Number(row.total || 0);
    if (type === "taken" && status === "partial") debtSummary.takenPartial += Number(row.total || 0) - Number(row.settled || 0);
    if (type === "given" && status === "pending") debtSummary.givenPending += Number(row.total || 0);
    if (type === "given" && status === "partial") debtSummary.givenPartial += Number(row.total || 0) - Number(row.settled || 0);
  }
  const totalTaken = debtSummary.takenPending + debtSummary.takenPartial;
  const totalGiven = debtSummary.givenPending + debtSummary.givenPartial;

  const employeeOptions = allEmployees.map((e: any) => ({
    id: String(e._id),
    name: e.name as string,
    email: e.email as string,
  }));

  // Attendance health + best employee (admin view)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  const [presentTodayIds, monthAttendance] = await Promise.all([
    Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd },
      status: "present",
      approvalStatus: "approved",
    })
      .distinct("employee")
      .then((ids) => ids.map((id) => String(id))),
    Attendance.find({
      date: { $gte: monthStart, $lte: monthEnd },
      status: "present",
      approvalStatus: "approved",
    })
      .select("employee date")
      .lean(),
  ]);

  // Compute best employee by unique present days in current month
  const daysByEmployee = new Map<string, Set<string>>();
  for (const rec of monthAttendance as any[]) {
    const empId = String(rec.employee);
    const d = new Date(rec.date);
    if (Number.isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    if (!daysByEmployee.has(empId)) {
      daysByEmployee.set(empId, new Set<string>());
    }
    daysByEmployee.get(empId)!.add(key);
  }

  let bestEmployeeId: string | null = null;
  let bestEmployeeDays = 0;
  for (const [empId, days] of daysByEmployee.entries()) {
    const count = days.size;
    if (count > bestEmployeeDays) {
      bestEmployeeDays = count;
      bestEmployeeId = empId;
    }
  }

  let bestEmployeeName = "~";
  if (bestEmployeeId) {
    const bestEmp = await Employee.findById(bestEmployeeId).select("name").lean();
    if (bestEmp && (bestEmp as any).name) {
      bestEmployeeName = (bestEmp as any).name as string;
    }
  }

  const presentTodayCount = presentTodayIds.length;
  const totalEmployees = stats.employeesTotal || 0;
  const attendancePct =
    totalEmployees > 0 ? Math.round((presentTodayCount / totalEmployees) * 100) : 0;

  const quickLinks = adminCms.quickLinks.map((ql: { label: string; href: string; icon: string }) => ({
    href: ql.label === "Expenses" || ql.href === "/dashboard/khatabook" ? "/dashboard/expenses" : ql.href,
    label: ql.label,
    icon: getIcon(ql.icon),
  }));

  const adminDashPrefs = ((userDoc as any)?.dashboardWidgetPrefs || {}) as Record<string, boolean>;
  const sec = mergeWidgetPrefs(adminCms.sections, adminDashPrefs);

  return (
    <div className="space-y-8">
      <DashboardCustomizeBar
        mode="admin"
        visibility={sec}
        labels={ADMIN_DASHBOARD_WIDGET_LABELS}
      />
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {adminCms.title}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {adminCms.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/api/dashboard/financial-report?scope=monthly">
            <Button variant="outline" className="rounded-lg">
              <Download className="h-4 w-4 mr-2" />
              Monthly-wise report
            </Button>
          </Link>
          <Link href="/api/dashboard/financial-report?scope=overall">
            <Button variant="outline" className="rounded-lg">
              <Download className="h-4 w-4 mr-2" />
              Overall report
            </Button>
          </Link>
          {adminCms.showCta && (
            <Link href={adminCms.ctaLink}>
              <Button className="rounded-lg px-5 font-medium">
                {adminCms.ctaLabel}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Key metrics ~ Row 1: Revenue, Total due, Clients, Projects, Team */}
      {sec.metrics && <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Revenue (YTD) ~ click → payment page */}
        <Link href="/dashboard/payments">
          <div className="p-4 rounded-xl border hover:opacity-90 transition-opacity h-full flex flex-col" style={{ backgroundColor: '#E20101', borderColor: '#E20101' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
                Revenue (YTD)
              </span>
              <TrendingUp className="h-4 w-4 text-white/80" />
            </div>
            <p className="text-2xl font-bold tabular-nums text-white">
              <CurrencyDisplay value={stats.totalRevenueCurrentYear} />
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[11px] text-white/70">Paid in {stats.currentYear}</p>
              {stats.revenueGrowthPct !== 0 && (
                <span className={`text-[10px] font-medium px-1 rounded ${stats.revenueGrowthPct > 0 ? "bg-white/20 text-white" : "bg-black/20 text-white"}`}>
                  {stats.revenueGrowthPct > 0 ? "+" : ""}{stats.revenueGrowthPct.toFixed(1)}% vs LY
                </span>
              )}
            </div>
            {stats.revenueByProductService.length > 0 && (
              <ul className="mt-3 pt-3 border-t border-white/20 space-y-1 flex-1">
                {stats.revenueByProductService.map((row) => (
                  <li key={`${row.name}-${row.kind}`} className="flex justify-between text-xs">
                    <span className="text-white/70 truncate">{row.name}</span>
                    <span className="tabular-nums text-white ml-2"><CurrencyDisplay value={row.totalRevenue} /></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Link>

        {/* Total due ~ all clients */}
        <Link href="/dashboard/payments">
          <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total due
              </span>
              <Wallet className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              <CurrencyDisplay value={stats.totalDue} />
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Outstanding across clients</p>
          </div>
        </Link>

        {/* Clients: active + inactive */}
        <Link href="/dashboard/clients">
          <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Clients
              </span>
              <Building2 className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{stats.clientsActive}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active</p>
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{stats.clientsInactive}</span> inactive
              </p>
            </div>
          </div>
        </Link>

        {/* Projects: ongoing, maintenance, completed */}
        <Link href="/dashboard/projects">
          <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Projects
              </span>
              <FolderKanban className="h-4 w-4 text-violet-500" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{stats.projectsOngoing}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Ongoing</p>
            <ul className="mt-3 pt-3 border-t border-border/50 space-y-1 text-xs text-muted-foreground">
              <li><span className="font-medium text-foreground">{stats.projectsMaintenance}</span> maintenance</li>
              <li><span className="font-medium text-foreground">{stats.projectsCompleted}</span> completed</li>
            </ul>
          </div>
        </Link>

        {/* Team + payroll by product/service */}
        <Link href="/dashboard/people">
          <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Team
              </span>
              <Users className="h-4 w-4 text-cyan-500" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{stats.employeesTotal}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Payroll <CurrencyDisplay value={stats.monthlyPayroll} />/mo</p>
            {(stats.payrollByProduct.length > 0 || stats.payrollByService.length > 0) && (
              <ul className="mt-3 pt-3 border-t border-border/50 space-y-1 flex-1">
                {stats.payrollByProduct.map((row) => (
                  <li key={`product-${row.name}`} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate">{row.name}</span>
                    <span className="tabular-nums ml-2"><CurrencyDisplay value={row.monthlyPayroll} /></span>
                  </li>
                ))}
                {stats.payrollByService.map((row) => (
                  <li key={`service-${row.name}`} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate">{row.name}</span>
                    <span className="tabular-nums ml-2"><CurrencyDisplay value={row.monthlyPayroll} /></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Link>

        {/* Debts summary */}
        <Link href="/dashboard/finance/debts">
          <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Debts
              </span>
              <Landmark className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
              <CurrencyDisplay value={totalTaken} />
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Owed to you (pending)</p>
            {totalGiven > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>You owe</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                    <CurrencyDisplay value={totalGiven} />
                  </span>
                </div>
              </div>
            )}
          </div>
        </Link>
      </div>}

      {/* Task Performance: Pie Chart + Goals + Team Performance */}
      {sec.taskPerformance && (
        <>
          <DashboardTaskPerformance />

          {/* Today's Goals + Team Performance — client wrapper avoids function literal across server/client boundary */}
          <DashboardGoalsPerformance isAdmin={true} />

          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">My tasks by deadline</h3>
              <Link href="/dashboard/todo" className="text-xs text-primary hover:underline">
                View board
              </Link>
            </div>
            {assignedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks assigned to you.</p>
            ) : (
              <ul className="space-y-2">
                {assignedTasks.map((t) => (
                  <li key={t.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.projectName} · {formatTaskStatus(t.status)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {t.dueDate ? t.dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "No deadline"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Upcoming Payments Alert Section */}
      {sec.upcomingPayments && stats.upcomingPayments.length > 0 && (
        <div className="rounded-xl border bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-sm font-semibold text-foreground">Upcoming Payments</h3>
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                Due in ≤10 days
              </span>
            </div>
            <Link href="/dashboard/payments">
              <Button variant="ghost" size="sm" className="text-xs hover:bg-amber-100/50 dark:hover:bg-amber-900/20 h-7">
                View all payments →
              </Button>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stats.upcomingPayments.slice(0, 8).map((p) => (
              <Link
                key={`${p.id}-${p.phaseName || "top"}`}
                href={`/dashboard/clients/${p.clientId}?tab=payments`}
                className="block p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate max-w-[120px]">
                    {p.clientName}
                  </p>
                  <span className={`text-[10px] font-semibold ${new Date(p.dueDate) < new Date() ? "text-red-500" : "text-amber-600"}`}>
                    {new Date(p.dueDate) < new Date() ? "OVERDUE" : "DUE"}
                  </span>
                </div>
                <p className="text-sm font-bold truncate">{p.projectName}</p>
                {p.phaseName && <p className="text-[11px] text-muted-foreground truncate mb-2">{p.phaseName}</p>}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
                  <span className="text-xs font-semibold tabular-nums"><CurrencyDisplay value={p.amount} /></span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {new Date(p.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {stats.upcomingPayments.length > 8 && (
            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              + {stats.upcomingPayments.length - 8} more upcoming payments. <Link href="/dashboard/payments" className="text-amber-600 hover:underline">View all</Link>
            </p>
          )}
        </div>
      )}

      {/* Monthly Expense & Revenue Overall Summary */}
      {sec.monthlyOverall && <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Link href="/dashboard/expenses">
          <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors h-full flex flex-col cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Monthly Expense Overall
              </span>
              <Wallet className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              <CurrencyDisplay value={stats.totalMonthlyExpense + stats.monthlyPayroll} />
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total monthly expense (including team cost)
            </p>
            <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Expenses:</span>
                <span className="font-medium text-foreground"><CurrencyDisplay value={stats.totalMonthlyExpense} /></span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>Team cost:</span>
                <span className="font-medium text-foreground"><CurrencyDisplay value={stats.monthlyPayroll} /></span>
              </div>
            </div>
          </div>
        </Link>
        <div className="p-4 rounded-xl border bg-card h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Monthly Revenue Overall
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <CurrencyDisplay value={stats.monthlyRevenueCurrentYear[new Date().getMonth()] || 0} />
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Revenue this month ({new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })})
          </p>
          {stats.monthlyRevenueByProductService.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-2 flex-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Breakdown</div>
              <div className="space-y-1.5">
                {stats.monthlyRevenueByProductService
                  .filter((row) => {
                    const currentMonth = new Date().getMonth();
                    return (row.monthlyRevenue[currentMonth] || 0) > 0;
                  })
                  .map((row) => {
                    const currentMonth = new Date().getMonth();
                    const monthRevenue = row.monthlyRevenue[currentMonth] || 0;
                    return (
                      <div key={`${row.name}-${row.kind}`} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate">
                          {row.name} <span className="capitalize text-muted-foreground/70">({row.kind})</span>
                        </span>
                        <span className="tabular-nums text-emerald-600 dark:text-emerald-400 ml-2">
                          <CurrencyDisplay value={monthRevenue} />
                        </span>
                      </div>
                    );
                  })}
              </div>
              {(() => {
                const productsRevenue = stats.monthlyRevenueByProductService
                  .filter((r) => r.kind === "product")
                  .reduce((sum, r) => sum + (r.monthlyRevenue[new Date().getMonth()] || 0), 0);
                const servicesRevenue = stats.monthlyRevenueByProductService
                  .filter((r) => r.kind === "service")
                  .reduce((sum, r) => sum + (r.monthlyRevenue[new Date().getMonth()] || 0), 0);
                return (
                  <div className="pt-2 mt-2 border-t border-border/30 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Products:</span>
                      <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                        <CurrencyDisplay value={productsRevenue} />
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Services:</span>
                      <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                        <CurrencyDisplay value={servicesRevenue} />
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>}

      {/* Row 2: Backlog, Monitor (up/down), Attendance health, Monthly expense ~ same size */}
      {sec.secondaryMetrics && <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
        <DashboardTaskCountsAdmin />
        <DashboardMonitorUpDown />
        <div className="p-4 rounded-xl border bg-card h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Attendance health
            </span>
            <Clock className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {attendancePct}%
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {presentTodayCount}/{totalEmployees} employees present today
          </p>
          <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Best this month</span>
              <span className="font-medium text-foreground">
                {bestEmployeeName}
                {bestEmployeeDays > 0 ? ` · ${bestEmployeeDays} day${bestEmployeeDays === 1 ? "" : "s"}` : ""}
              </span>
            </div>
          </div>
        </div>
        <Link href="/dashboard/calendar">
          <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Meeting Status
              </span>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {ongoingMeetings.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Ongoing now
            </p>
            <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Today</span>
                <span className="font-medium text-foreground">
                  {todayMeetings.length} meeting{todayMeetings.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/expenses">
          <div className="p-4 rounded-xl border bg-card hover:bg-card/80 hover:border-primary/20 transition-colors h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Monthly expense
              </span>
              <Wallet className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold tabular-nums"><CurrencyDisplay value={stats.totalMonthlyExpense} /></p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active (monthly equivalent)</p>
            {stats.expenseByProduct.length > 0 && (
              <ul className="mt-3 pt-3 border-t border-border/50 space-y-1 flex-1">
                {stats.expenseByProduct.map((row) => (
                  <li key={row.name} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate">{row.name}</span>
                    <span className="tabular-nums text-amber-600 dark:text-amber-400 ml-2"><CurrencyDisplay value={row.monthlyExpense} /></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Link>
      </div>}

      {/* Money in (breakdown from where) + Money out (breakdown to where) */}
      {sec.moneyInOut && <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Money In</h3>
          <p className="text-xs text-muted-foreground mb-4">Revenue by source (product/service), {stats.currentYear}</p>
          {stats.monthlyRevenueByProductService.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revenue linked to product/service yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Kind</th>
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                      <th key={m} className="text-right py-2 px-1 font-medium text-muted-foreground tabular-nums">{m}</th>
                    ))}
                    <th className="text-right py-2 pl-2 font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.monthlyRevenueByProductService.map((row) => (
                    <tr key={`${row.name}-${row.kind}`} className="border-b border-border/30">
                      <td className="py-1.5 pr-3 truncate max-w-[120px]">{row.name}</td>
                      <td className="py-1.5 pr-2 capitalize text-muted-foreground">{row.kind}</td>
                      {row.monthlyRevenue.map((val, i) => (
                        <td key={i} className="text-right py-1.5 px-1 tabular-nums text-emerald-600 dark:text-emerald-400"><CurrencyDisplay value={val} /></td>
                      ))}
                      <td className="text-right py-1.5 pl-2 tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                        <CurrencyDisplay value={row.monthlyRevenue.reduce((a, b) => a + b, 0)} />
                      </td>
                    </tr>
                  ))}
                  {(() => {
                    const monthlyTotals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    for (const row of stats.monthlyRevenueByProductService) {
                      row.monthlyRevenue.forEach((val, i) => { monthlyTotals[i] += val; });
                    }
                    const totalYear = monthlyTotals.reduce((a, b) => a + b, 0);
                    return (
                      <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                        <td className="py-2 pr-3" colSpan={2}>Total</td>
                        {monthlyTotals.map((val, i) => (
                          <td key={i} className="text-right py-2 px-1 tabular-nums text-emerald-600 dark:text-emerald-400"><CurrencyDisplay value={val} /></td>
                        ))}
                        <td className="text-right py-2 pl-2 tabular-nums text-emerald-600 dark:text-emerald-400"><CurrencyDisplay value={totalYear} /></td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Money out</h3>
          <p className="text-xs text-muted-foreground mb-4">Expense by destination (product/service), monthly equivalent, {stats.currentYear}</p>
          {stats.monthlyExpenseByProductService.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Kind</th>
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                      <th key={m} className="text-right py-2 px-1 font-medium text-muted-foreground tabular-nums">{m}</th>
                    ))}
                    <th className="text-right py-2 pl-2 font-medium text-amber-600 dark:text-amber-400 tabular-nums">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.monthlyExpenseByProductService.map((row) => (
                    <tr key={`${row.name}-${row.kind}`} className="border-b border-border/30">
                      <td className="py-1.5 pr-3 truncate max-w-[120px]">{row.name}</td>
                      <td className="py-1.5 pr-2 capitalize text-muted-foreground">{row.kind}</td>
                      {row.monthlyExpense.map((val, i) => (
                        <td key={i} className="text-right py-1.5 px-1 tabular-nums text-amber-600 dark:text-amber-400"><CurrencyDisplay value={val} /></td>
                      ))}
                      <td className="text-right py-1.5 pl-2 tabular-nums font-medium text-amber-600 dark:text-amber-400">
                        <CurrencyDisplay value={row.monthlyExpense.reduce((a, b) => a + b, 0)} />
                      </td>
                    </tr>
                  ))}
                  {stats.monthlyExpenseByProductService.length > 0 && (() => {
                    const monthlyTotals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    for (const row of stats.monthlyExpenseByProductService) {
                      row.monthlyExpense.forEach((val, i) => { monthlyTotals[i] += val; });
                    }
                    const totalYear = monthlyTotals.reduce((a, b) => a + b, 0);
                    return (
                      <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                        <td className="py-2 pr-3" colSpan={2}>Total</td>
                        {monthlyTotals.map((val, i) => (
                          <td key={i} className="text-right py-2 px-1 tabular-nums text-amber-600 dark:text-amber-400"><CurrencyDisplay value={val} /></td>
                        ))}
                        <td className="text-right py-2 pl-2 tabular-nums text-amber-600 dark:text-amber-400"><CurrencyDisplay value={totalYear} /></td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>}

      {/* Revenue vs Salary + Expense ~ single chart with profit/loss */}
      {sec.profitLossChart && <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Revenue vs Salary + Expense (profit / loss)</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Money in (revenue), money out (employee salary + expense) by month. Net = Revenue − (Salary + Expense). Positive net = profit, negative = loss. {stats.currentYear}
        </p>
        <div className="h-[320px]">
          <ProfitLossChart
            monthlyRevenue={stats.monthlyRevenueCurrentYear}
            monthlyPayroll={stats.monthlyPayroll}
            totalMonthlyExpense={stats.totalMonthlyExpense}
          />
        </div>
      </div>}

      {/* Net P&L month on month + Growth */}
      {sec.netPLGrowth && <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Net P&L month on month</h3>
          <p className="text-xs text-muted-foreground mb-4">Revenue (month) − monthly expense, {stats.currentYear}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => {
              const pl = stats.monthlyNetPL[i] ?? 0;
              const isNeg = pl < 0;
              return (
                <div key={m} className="rounded-lg border bg-muted/20 p-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{m}</p>
                  <p className={`text-sm font-bold tabular-nums ${isNeg ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {formatCurrency(pl)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Growth (month on month)</h3>
          <p className="text-xs text-muted-foreground mb-4">Revenue growth vs previous month, {stats.currentYear}</p>
          <div className="space-y-2">
            {(["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const).map((m, i) => {
              const prev = stats.monthlyRevenueCurrentYear[i] ?? 0;
              const curr = stats.monthlyRevenueCurrentYear[i + 1] ?? 0;
              const pct = prev !== 0 ? Math.round(((curr - prev) / prev) * 100) : (curr !== 0 ? 100 : 0);
              const prevLabel = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"][i];
              return (
                <div key={m} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{m} vs {prevLabel}</span>
                  <span className={`tabular-nums font-medium ${pct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {pct >= 0 ? "+" : ""}{pct}%
                  </span>
                </div>
              );
            })}
            {stats.monthlyRevenueCurrentYear.every((v) => v === 0) && (
              <p className="text-sm text-muted-foreground">No revenue yet this year.</p>
            )}
          </div>
        </div>
      </div>}

      {/* Main chart + quick actions */}
      {sec.revenueChart && <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Monthly revenue ({stats.currentYear})
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            By month paid (all payments)
          </p>
          <div className="h-[280px]">
            <ActivityChart monthlyRevenue={stats.monthlyRevenueCurrentYear} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <div className="space-y-1">
            {quickLinks.map(({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/20 transition-colors group"
              >
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium flex-1">{label}</span>
                <ArrowUpRight className="h-3.5 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </div>}

      {/* Monitor overview (list) */}
      {sec.monitorOverview && <div>
        <DashboardMonitorOverview />
      </div>}

      {/* Meeting Status Section */}
      {sec.meetingStatus && <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Meeting Status</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ongoing meetings and today&apos;s schedule ~ click to join or view all meetings
            </p>
          </div>
          <Link href="/dashboard/calendar">
            <Button variant="outline" size="sm" className="text-xs">
              View Calendar →
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground uppercase">Today&apos;s Meetings</h4>
            <span className="text-xs font-semibold text-foreground">{ongoingMeetings.length + todayMeetings.length}</span>
          </div>
          {ongoingMeetings.length === 0 && todayMeetings.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No meetings scheduled today</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {/* Combine and sort: ongoing first, then today's meetings */}
              {(() => {
                // Get ongoing meeting IDs to avoid duplicates
                const ongoingIds = new Set(ongoingMeetings.map((m: any) => String(m._id)));
                // Filter today's meetings to exclude ongoing ones
                const todayOnly = todayMeetings.filter((m: any) => !ongoingIds.has(String(m._id)));
                // Combine: ongoing first, then today's
                const allTodayMeetings = [...ongoingMeetings, ...todayOnly];

                return allTodayMeetings.map((m: any) => {
                  const start = new Date(m.startTime);
                  const end = new Date(m.endTime);
                  const isOngoing = start <= now && end >= now;
                  const isPast = end < now;

                  // Get meeting link - prioritize meetingLink
                  let meetingUrl = "/dashboard/calendar";
                  if (m.meetingLink) {
                    meetingUrl = m.meetingLink;
                  }

                  const durationMs = end.getTime() - start.getTime();
                  const durationMins = Math.floor(durationMs / 60000);
                  const hours = Math.floor(durationMins / 60);
                  const mins = durationMins % 60;
                  const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

                  const MeetingContent = (
                    <div className={`flex items-start justify-between gap-2 p-3 rounded-lg border transition-colors ${isOngoing
                      ? "bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700"
                      : isPast
                        ? "bg-muted/20 border-muted"
                        : "bg-muted/30 hover:bg-muted/50"
                      }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">{m.title}</p>
                          {isOngoing && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500 text-white font-semibold animate-pulse flex-shrink-0">
                              LIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {m.project?.name || "~"} · {m.createdBy?.name || m.createdBy?.email || "~"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Duration: {durationText} · {m.attendees?.length || 0} attendee{(m.attendees?.length || 0) === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0 text-right">
                        <div>{start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className="text-[10px]">to {end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  );

                  // If there's a direct meeting link, use anchor tag, otherwise use Link to calendar
                  if (m.meetingLink) {
                    return (
                      <a
                        key={String(m._id)}
                        href={m.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                      >
                        {MeetingContent}
                      </a>
                    );
                  } else if (m.googleCalendarEventId) {
                    // Try to fetch Meet link for meetings with googleCalendarEventId
                    // For now, link to calendar page - Meet link will be fetched there
                    return (
                      <Link
                        key={String(m._id)}
                        href="/dashboard/calendar"
                      >
                        {MeetingContent}
                      </Link>
                    );
                  } else {
                    return (
                      <Link
                        key={String(m._id)}
                        href="/dashboard/calendar"
                      >
                        {MeetingContent}
                      </Link>
                    );
                  }
                });
              })()}
            </div>
          )}
        </div>
      </div>}

      {/* Meeting Statistics with Filters */}
      {sec.meetingStats && <MeetingStatsClient projects={projectOptions} employees={employeeOptions} />}

      {sec.goalsProgress && (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Yearly Business Goals ({stats.currentYear})</h3>
              <p className="text-xs text-muted-foreground">Target vs achieved revenue by product/service</p>
            </div>
            <Link href="/dashboard/products">
              <Button variant="outline" size="sm" className="text-xs">Manage goals in Businesses</Button>
            </Link>
          </div>

          {goalRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals set yet. Create yearly goals from Goals page.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground">Total target</p>
                  <p className="text-lg font-bold tabular-nums"><CurrencyDisplay value={goalsTargetTotal} /></p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground">Achieved</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400"><CurrencyDisplay value={goalsAchievedTotal} /></p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground">Overall completion</p>
                  <p className="text-lg font-bold tabular-nums">{goalsOverallPct}%</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {goalRows.map((g) => (
                  <div key={g.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium">
                        {g.name} <span className="text-muted-foreground capitalize">({g.kind})</span>
                      </span>
                      <span className="tabular-nums">{g.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${g.pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
                      <span>Achieved: <CurrencyDisplay value={g.achieved} /></span>
                      <span>Target: <CurrencyDisplay value={g.target} /></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
