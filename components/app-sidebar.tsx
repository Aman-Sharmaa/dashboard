"use client"

import * as React from "react"
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Settings,
  UsersRound,
  ChevronRight,
  MoreHorizontal,
  FolderKanban,
  Building2,
  CalendarClock,
  Receipt,
  FileText,
  FileSpreadsheet,
  Loader2,
  CalendarDays,
  FileTextIcon,
  Newspaper,
  FolderOpen,
  ChevronDown,
  FolderTree,
  ClipboardCheck,
  UserPlus,
  Signal,
  Rocket,
  Package,
  HardDrive,
  Key,
  Landmark,
  BookOpen,
  ReceiptText,
  Cloud,
  MessageCircle,
  Banknote,
  ClipboardList,
  Activity,
  Users,
  Clock,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  Store,
  Terminal,
  Trello,
  LayoutGrid,
  Layers,
  Briefcase,
  FileSignature,
  Blocks,
  Compass,
  Route,
  Target,
  RotateCcw,
  Flag,
  CheckSquare,
  BarChart3,
  Globe,
  Wallet,
} from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { useSearch } from "@/components/search-context"
import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

import { DEFAULT_EMPLOYEE_FEATURES, ALL_FEATURES, effectiveFeatureEnabled } from "@/lib/features"
import { sortSidebarSections } from "@/lib/sidebar-sections"
import { useSocket } from "@/components/socket-provider"

export function AppSidebar({
  user,
  profile,
  ...props
}: {
  user: { email: string; role: string; name?: string; canManageContent?: boolean; featureAccess?: string[]; userId?: string; isOutsider?: boolean; sidebarSectionOrder?: string[]; adminSidebarHiddenFeatures?: string[] }
  profile: { companyName: string; logoUrl?: string } | null
} & React.ComponentProps<typeof Sidebar>) {
  const rawPathname = usePathname()
  const pathname: string = rawPathname ?? ""
  const router = useRouter()
  const searchParams = useSearchParams()
  const { socket } = useSocket()
  const isEmployee = user.role === "employee"

  // ── Outsider flag ──
  const [isOutsider, setIsOutsider] = React.useState(user.isOutsider || false)
  // Outsiders can only access these features
  const OUTSIDER_ALLOWED_FEATURES = ["todo", "todo_tasks", "plans", "drive", "projects", "roadmap"]

  // Live feature access ~ always fetched fresh from API, never trusting stale server props
  const [liveFeatureAccess, setLiveFeatureAccess] = React.useState<string[]>(user.featureAccess || [])

  // Sync state when server prop changes (e.g. on hard refresh where layout re-runs)
  React.useEffect(() => {
    if (user.featureAccess && user.featureAccess.length > 0) {
      setLiveFeatureAccess(user.featureAccess)
    }
  }, [user.featureAccess])

  // Map pathname to feature key
  const getFeatureFromPath = React.useCallback((path: string): string | null => {
    const map: Record<string, string> = {
      "/dashboard/todo": "todo",
      "/dashboard/monitor": "monitor",
      "/dashboard/leads": "leads",
      "/dashboard/products": "products",
      "/dashboard/clients": "clients",
      "/dashboard/projects": "projects",
      "/dashboard/invoices": "invoices",
      "/dashboard/expenses": "expenses",
      "/dashboard/finance/proposals": "proposals",

      "/dashboard/khatabook": "khatabook",
      "/dashboard/finance/debts": "debts",
      "/dashboard/people": "team",
      "/dashboard/attendance": "attendance",
      "/dashboard/reimbursements": "reimbursements",
      "/dashboard/payslips": "payslips",
      "/dashboard/content": "cms",
      "/dashboard/deployment": "deployments",
      "/dashboard/assets": "assets",
      "/dashboard/drive": "drive",
      "/dashboard/devops/creds": "creds",
      "/dashboard/autodm": "autodm",
    }
    for (const [prefix, key] of Object.entries(map)) {
      if (path.startsWith(prefix)) return key
    }
    if (path.includes("/plans")) return "plans"
    return null
  }, [])

  // Refetch access from server ~ this is the source of truth
  const refetchAccess = React.useCallback(() => {
    if (!isEmployee) return
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const newAccess: string[] = data?.user?.featureAccess
        if (newAccess && newAccess.length > 0) {
          setLiveFeatureAccess(newAccess)
        }
      })
      .catch(() => { })
    // Also fetch isOutsider from /api/me
    fetch("/api/me", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user?.isOutsider) setIsOutsider(true)
        else setIsOutsider(false)
      })
      .catch(() => { })
  }, [isEmployee])

  // 1) IMMEDIATE: Fetch fresh access on mount (overrides any stale server data)
  React.useEffect(() => {
    refetchAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2) WebSocket: instant update when admin changes access
  React.useEffect(() => {
    if (!socket || !isEmployee) return

    const handleAccessUpdated = (data: { featureAccess: string[] }) => {
      setLiveFeatureAccess(data.featureAccess)
      const currentFeature = getFeatureFromPath(pathname)
      if (currentFeature && !data.featureAccess.includes(currentFeature)) {
        router.push("/dashboard")
      }
    }

    socket.on("access-updated", handleAccessUpdated)
    return () => { socket.off("access-updated", handleAccessUpdated) }
  }, [socket, isEmployee, pathname, router, getFeatureFromPath])

  // 3) Refetch on every page navigation
  React.useEffect(() => {
    refetchAccess()
  }, [pathname, refetchAccess])

  // 4) Refetch when tab becomes visible (user switches back to this tab)
  React.useEffect(() => {
    if (!isEmployee) return
    const onFocus = () => refetchAccess()
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetchAccess()
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [isEmployee, refetchAccess])

  // 5) Polling fallback every 15s
  React.useEffect(() => {
    if (!isEmployee) return
    const interval = setInterval(refetchAccess, 15000)
    return () => clearInterval(interval)
  }, [isEmployee, refetchAccess])

  // 6) Redirect if currently on a revoked page whenever access changes
  React.useEffect(() => {
    if (!isEmployee) return
    const currentFeature = getFeatureFromPath(pathname)
    const access = liveFeatureAccess && liveFeatureAccess.length > 0
      ? liveFeatureAccess
      : [] // No fallback, strictly enforce
    
    // Always-on features are accessible regardless
    const alwaysOnKeys = ALL_FEATURES.filter((f) => f.alwaysOn).map((f) => f.key)
    const effectiveSet = new Set([...access, ...alwaysOnKeys])
    
    if (currentFeature && !effectiveSet.has(currentFeature)) {
      router.push("/dashboard")
    }
  }, [liveFeatureAccess, isEmployee, pathname, router, getFeatureFromPath])
  const showContent = true
  const [contentOpen, setContentOpen] = React.useState(pathname.startsWith("/dashboard/content"))
  const [workOpen, setWorkOpen] = React.useState(pathname.startsWith("/dashboard/todo"))
  const [paymentsOpen, setPaymentsOpen] = React.useState(
    pathname.startsWith("/dashboard/clients/")
  )
  const [projectsOpen, setProjectsOpen] = React.useState(
    pathname.startsWith("/dashboard/projects")
  )
  const [websiteOpen, setWebsiteOpen] = React.useState(
    pathname === "/dashboard/content/settings" && (searchParams?.get("tab") === "header" || searchParams?.get("tab") === "footer")
  )
  const { searchQuery } = useSearch()

  React.useEffect(() => {
    if (pathname.startsWith("/dashboard/content")) setContentOpen(true)
  }, [pathname])

  React.useEffect(() => {
    if (pathname.startsWith("/dashboard/todo")) setWorkOpen(true)
  }, [pathname])

  React.useEffect(() => {
    if (pathname.startsWith("/dashboard/clients/")) setPaymentsOpen(true)
  }, [pathname])

  React.useEffect(() => {
    if (pathname.startsWith("/dashboard/projects")) setProjectsOpen(true)
  }, [pathname])

  React.useEffect(() => {
    if (pathname === "/dashboard/content/settings" && (searchParams?.get("tab") === "header" || searchParams?.get("tab") === "footer")) {
      setWebsiteOpen(true)
    }
  }, [pathname, searchParams])

  type PaymentSummaryItem = {
    clientId: string
    clientName: string
    totalPaid: number
    totalDue: number
    currency: string
    nextDueDate: string | null
  }
  const [paymentSummary, setPaymentSummary] = React.useState<PaymentSummaryItem[]>([])
  const [paymentSummaryLoading, setPaymentSummaryLoading] = React.useState(false)
  const [hasAssignedProjects, setHasAssignedProjects] = React.useState<boolean | null>(null)

  const [pinnedItems, setPinnedItems] = React.useState<{ id: string; name: string; url: string; type: string }[]>([])
  const [pinnedLoading, setPinnedLoading] = React.useState(false)

  const [sidebarCounts, setSidebarCounts] = React.useState<{ plans: number; leads: number; onboarding: number; tasks: number; pendingLeaves: number; pendingCommits: number }>({ plans: 0, leads: 0, onboarding: 0, tasks: 0, pendingLeaves: 0, pendingCommits: 0 })
  const [driveQuota, setDriveQuota] = React.useState<{ usedBytes: number; maxBytes: number } | null>(null)

  React.useEffect(() => {
    const defaults = { plans: 0, leads: 0, onboarding: 0, tasks: 0, pendingLeaves: 0, pendingCommits: 0 }
    const fetchCounts = () => {
      fetch("/api/user/sidebar-counts")
        .then(res => res.ok ? res.json() : { counts: defaults })
        .then(data => setSidebarCounts({ ...defaults, ...(data.counts || {}) }))
        .catch(() => setSidebarCounts(defaults))
    }
    fetchCounts()
    const interval = setInterval(fetchCounts, 60000)
    return () => clearInterval(interval)
  }, [])

  // Auto-mark as read when navigating to leads/clients/plans pages
  // Always updates the timestamp so future items are tracked correctly
  React.useEffect(() => {
    if (pathname.startsWith("/dashboard/leads")) {
      if (sidebarCounts.leads > 0) {
        setSidebarCounts(prev => ({ ...prev, leads: 0 }))
      }
      fetch("/api/user/mark-viewed", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "leads" }),
      }).catch(() => { })
    }
    if (pathname.startsWith("/dashboard/clients")) {
      if (sidebarCounts.onboarding > 0) {
        setSidebarCounts(prev => ({ ...prev, onboarding: 0 }))
      }
      fetch("/api/user/mark-viewed", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "onboarding" }),
      }).catch(() => { })
    }
    if (pathname.includes("/plans")) {
      if (sidebarCounts.plans > 0) {
        setSidebarCounts(prev => ({ ...prev, plans: 0 }))
      }
      fetch("/api/user/mark-viewed", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "plans" }),
      }).catch(() => { })
    }
    if (pathname.startsWith("/dashboard/todo")) {
      if (sidebarCounts.tasks > 0) {
        setSidebarCounts(prev => ({ ...prev, tasks: 0 }))
      }
      fetch("/api/user/mark-viewed", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tasks" }),
      }).catch(() => { })
    }
    if (pathname.startsWith("/dashboard/deployment")) {
      if (sidebarCounts.pendingCommits > 0) {
        setSidebarCounts(prev => ({ ...prev, pendingCommits: 0 }))
      }
      fetch("/api/user/mark-viewed", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "deployments" }),
      }).catch(() => { })
    }
  }, [pathname])

  React.useEffect(() => {
    const canAccessDrive = (liveFeatureAccess.length > 0 ? liveFeatureAccess : DEFAULT_EMPLOYEE_FEATURES).includes("drive")
    if (!isEmployee || !canAccessDrive) return
    let mounted = true
    const fetchQuota = () => {
      fetch("/api/drive/quota", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!mounted || !data) return
          setDriveQuota({
            usedBytes: Number(data.usedBytes || 0),
            maxBytes: Number(data.maxBytes || 0),
          })
        })
        .catch(() => { })
    }
    fetchQuota()
    const interval = setInterval(fetchQuota, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isEmployee, liveFeatureAccess, pathname])

  React.useEffect(() => {
    const fetchPinned = () => {
      setPinnedLoading(true)
      Promise.all([
        fetch("/api/plans?isPinnedToSidebar=true").then(res => res.ok ? res.json() : { plans: [] }),
        fetch("/api/plans/pages?isPinnedToSidebar=true").then(res => res.ok ? res.json() : { pages: [] }),
      ]).then(([plansData, pagesData]) => {
        const items = [
          ...(plansData.plans || []).map((p: any) => ({ id: p._id, name: p.name, url: `/view-plan/${p._id}`, type: "Plan" })),
          ...(pagesData.pages || []).map((p: any) => ({ id: p._id, name: p.name, url: `/view-page/${p._id}`, type: "Document" })),
        ]
        setPinnedItems(items.sort((a, b) => a.name.localeCompare(b.name)))
      }).catch(() => setPinnedItems([]))
        .finally(() => setPinnedLoading(false))
    }

    fetchPinned();

    window.addEventListener("pinned-items-updated", fetchPinned);
    return () => window.removeEventListener("pinned-items-updated", fetchPinned);
  }, [pathname])

  React.useEffect(() => {
    if (isEmployee) return
    setPaymentSummaryLoading(true)
    fetch("/api/project-payments/summary")
      .then((res) => res.ok ? res.json() : { summary: [] })
      .then((data) => setPaymentSummary(data.summary || []))
      .catch(() => setPaymentSummary([]))
      .finally(() => setPaymentSummaryLoading(false))
  }, [isEmployee])

  React.useEffect(() => {
    if (!isEmployee) return
    setHasAssignedProjects(null)
    fetch("/api/projects", { cache: "no-store", credentials: "same-origin" })
      .then((res) => res.ok ? res.json() : { projects: [] })
      .then((data) => setHasAssignedProjects(Array.isArray(data.projects) && data.projects.length > 0))
      .catch(() => setHasAssignedProjects(false))
  }, [isEmployee])

  function formatPaymentAmount(amount: number, currency: string) {
    if (amount >= 1_00_000 && currency === "INR") return `₹${(amount / 1_00_000).toFixed(1)}L`.replace(/\.0L$/, "L")
    if (amount >= 1000) return currency === "INR" ? `₹${(amount / 1000).toFixed(0)}k` : `${currency} ${(amount / 1000).toFixed(0)}k`
    return currency === "INR" ? `₹${amount}` : `${currency} ${amount}`
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // ignore
    } finally {
      router.push("/login")
    }
  }

  const adminSections = [
    {
      label: "Overview",
      items: [
        { title: "Dashboard", url: "/dashboard", isActive: pathname === "/dashboard", icon: LayoutGrid, featureKey: "dashboard" },
        {
          title: "Work",
          url: "/dashboard/todo",
          icon: ClipboardList,
          isActive: pathname.startsWith("/dashboard/todo"),
          badge: sidebarCounts.tasks,
          featureKey: "todo",
          isCollapsible: true,
          isOpen: workOpen,
          setOpen: setWorkOpen,
          subItems: [
            { title: "Todo", url: "/dashboard/todo?tab=tasks", isActive: pathname.startsWith("/dashboard/todo") && searchParams?.get("tab") === "tasks", icon: CheckSquare, featureKey: "todo_tasks" },
            { title: "Goals & KPIs", url: "/dashboard/todo?tab=goals", isActive: pathname.startsWith("/dashboard/todo") && searchParams?.get("tab") === "goals", icon: Target, featureKey: "todo_goals" },
            { title: "Routine", url: "/dashboard/todo?tab=routines", isActive: pathname.startsWith("/dashboard/todo") && searchParams?.get("tab") === "routines", icon: RotateCcw, featureKey: "todo_routines" },
            { title: "Reports", url: "/dashboard/todo?tab=reports", isActive: pathname.startsWith("/dashboard/todo") && searchParams?.get("tab") === "reports", icon: BarChart3, featureKey: "todo_reports" },
          ],
        },
      ],
    },
    {
      label: "DevOps",
      items: [
        { title: "Monitor", url: "/dashboard/monitor", isActive: pathname.startsWith("/dashboard/monitor"), icon: Activity, featureKey: "monitor" },
        { title: "Deployments", url: "/dashboard/deployment", isActive: pathname.startsWith("/dashboard/deployment"), icon: Layers, badge: sidebarCounts.pendingCommits, featureKey: "deployments" },
      ],
    },
    {
      label: "Work",
      items: [
        { title: "Projects", url: "/dashboard/projects", isActive: pathname.startsWith("/dashboard/projects") && !pathname.includes("/plans"), icon: Briefcase, featureKey: "projects" },
        { title: "Documents", url: "/dashboard/projects/plans", isActive: pathname.includes("/plans"), icon: FileText, badge: sidebarCounts.plans, featureKey: "plans" },
        { title: "Drive", url: "/dashboard/drive", isActive: pathname.startsWith("/dashboard/drive"), icon: HardDrive, featureKey: "drive" },
      ],
    },
    {
      label: "Finance",
      items: [
        { title: "Invoices", url: "/dashboard/invoices", isActive: pathname.startsWith("/dashboard/invoices"), icon: ReceiptText, featureKey: "invoices" },
        { title: "Expenses", url: "/dashboard/expenses", isActive: pathname.startsWith("/dashboard/expenses"), icon: Wallet, featureKey: "expenses" },
        { title: "Proposals", url: "/dashboard/finance/proposals", isActive: pathname.startsWith("/dashboard/finance/proposals") && !pathname.startsWith("/dashboard/finance/proposals/settings"), icon: FileSignature, featureKey: "proposals" },
        { title: "Gram Books", url: "/dashboard/khatabook", isActive: pathname.startsWith("/dashboard/khatabook"), icon: BookOpen, featureKey: "khatabook" },
        { title: "Debts", url: "/dashboard/finance/debts", isActive: pathname.startsWith("/dashboard/finance/debts"), icon: Landmark, featureKey: "debts" },
      ]
    },
    {
      label: "Marketing",
      items: [
        { title: "AutoDM", url: "/dashboard/autodm", isActive: pathname.startsWith("/dashboard/autodm"), icon: MessageCircle, featureKey: "autodm" },
      ]
    },
    {
      label: "User & Access",
      items: [
        {
          title: "Leads",
          url: "/dashboard/leads",
          icon: UserPlus,
          isActive: pathname.startsWith("/dashboard/leads"),
          badge: sidebarCounts.leads,
          featureKey: "leads",
        },
        {
          title: "Clients",
          url: "/dashboard/clients",
          icon: Building2,
          isActive: pathname.startsWith("/dashboard/clients"),
          badge: sidebarCounts.onboarding,
          featureKey: "clients",
        },
        {
          title: "Businesses",
          url: "/dashboard/products",
          icon: Boxes,
          isActive: pathname.startsWith("/dashboard/products"),
          featureKey: "products",
        },
        {
          title: "Team Members",
          url: "/dashboard/people",
          icon: Users,
          isActive: pathname.startsWith("/dashboard/people"),
          badge: sidebarCounts.pendingLeaves,
          featureKey: "team",
        },
        {
          title: "Attendance",
          url: "/dashboard/attendance",
          icon: Clock,
          isActive: pathname.startsWith("/dashboard/attendance"),
          featureKey: "attendance",
        },
        {
          title: "Assets",
          url: "/dashboard/assets",
          icon: Package,
          isActive: pathname.startsWith("/dashboard/assets"),
          featureKey: "assets",
        },
      ]
    },
    {
      label: "Content",
      items: [
        { title: "Roadmap", url: "/dashboard/roadmap", isActive: pathname.startsWith("/dashboard/roadmap"), icon: Route, featureKey: "roadmap" },
        {
          title: "Movie Party",
          url: "/dashboard/movies",
          icon: Rocket,
          isActive: pathname.startsWith("/dashboard/movies"),
          featureKey: "movies",
        },
        {
          title: "CMS",
          url: "/dashboard/content",
          icon: FolderOpen,
          isActive: pathname.startsWith("/dashboard/content") && !pathname.startsWith("/dashboard/content/settings"),
          isCollapsible: true,
          isOpen: contentOpen,
          setOpen: setContentOpen,
          featureKey: "cms",
          subItems: [
            { title: "Pages", url: "/dashboard/content/pages", isActive: pathname.startsWith("/dashboard/content/pages"), icon: FileTextIcon, featureKey: "cms_pages" },
            { title: "Posts", url: "/dashboard/content/posts", isActive: pathname.startsWith("/dashboard/content/posts"), icon: Newspaper, featureKey: "cms_posts" },
            { title: "Categories", url: "/dashboard/content/categories", isActive: pathname.startsWith("/dashboard/content/categories"), icon: FolderOpen, featureKey: "cms_categories" },
          ]
        },
        {
          title: "Website",
          url: "/dashboard/content/settings",
          icon: Globe,
          isActive: pathname.startsWith("/dashboard/content/settings"),
          featureKey: "website",
        }
      ]
    }
  ]

  // Determine effective feature access for employees (uses live state from WebSocket)
  const effectiveAccess = React.useMemo(() => {
    if (!isEmployee) return null // admins see everything
    // Outsiders: forcefully restrict to allowed features only
    if (isOutsider) return new Set(OUTSIDER_ALLOWED_FEATURES)
    const access = liveFeatureAccess && liveFeatureAccess.length > 0
      ? liveFeatureAccess
      : []
    const alwaysOnKeys = ALL_FEATURES.filter((f) => f.alwaysOn).map((f) => f.key)
    return new Set([...access, ...alwaysOnKeys])
  }, [isEmployee, isOutsider, liveFeatureAccess])

  // Helper: check if employee has access to a feature
  const hasAccess = (key: string) =>
    !effectiveAccess || effectiveFeatureEnabled(Array.from(effectiveAccess), key)
  const hasNestedAccess = (parentKey: string, childKey: string, family: string[]) => {
    if (!effectiveAccess) return true
    // Existing users created before child-level navigation controls inherit the
    // parent module until any child preference is explicitly stored.
    const hasChildPreferences = family.some((key) => effectiveAccess.has(key))
    return hasChildPreferences ? effectiveAccess.has(childKey) : effectiveAccess.has(parentKey)
  }

  // All possible sidebar items with their feature keys
  // Overview first in list; section display order follows DEFAULT_SIDEBAR_SECTION_ORDER / user prefs.
  const allEmployeeItems = [
    // Overview
    { featureKey: "dashboard", section: "Overview", title: "Dashboard", url: "/dashboard", icon: LayoutGrid, isActive: pathname === "/dashboard" },
    {
      featureKey: "todo", section: "Overview", title: "Work", url: "/dashboard/todo", icon: ClipboardList,
      isActive: pathname.startsWith("/dashboard/todo"),
      badge: sidebarCounts.tasks,
      isCollapsible: true, isOpen: workOpen, setOpen: setWorkOpen,
      subItems: [
        { title: "Todo", url: "/dashboard/todo?tab=tasks", isActive: pathname.startsWith("/dashboard/todo") && searchParams?.get("tab") === "tasks", icon: CheckSquare, featureKey: "todo_tasks" },
        { title: "Goals & KPIs", url: "/dashboard/todo?tab=goals", isActive: pathname.startsWith("/dashboard/todo") && searchParams?.get("tab") === "goals", icon: Target, featureKey: "todo_goals" },
        { title: "Routine", url: "/dashboard/todo?tab=routines", isActive: pathname.startsWith("/dashboard/todo") && searchParams?.get("tab") === "routines", icon: RotateCcw, featureKey: "todo_routines" },
        { title: "Reports", url: "/dashboard/todo?tab=reports", isActive: pathname.startsWith("/dashboard/todo") && searchParams?.get("tab") === "reports", icon: BarChart3, featureKey: "todo_reports" },
      ],
    },
    // DevOps
    { featureKey: "monitor", section: "DevOps", title: "Monitor", url: "/dashboard/monitor", icon: Activity, isActive: pathname.startsWith("/dashboard/monitor") },
    { featureKey: "deployments", section: "DevOps", title: "Deployments", url: "/dashboard/deployment", icon: Layers, isActive: pathname.startsWith("/dashboard/deployment"), badge: sidebarCounts.pendingCommits },
    // Work
    { featureKey: "projects", section: "Work", title: "Projects", url: "/dashboard/projects", icon: Briefcase, isActive: pathname.startsWith("/dashboard/projects") && !pathname.includes("/plans") },
    { featureKey: "plans", section: "Work", title: "Documents", url: "/dashboard/projects/plans", icon: FileText, isActive: pathname.includes("/plans"), badge: sidebarCounts.plans },
    { featureKey: "drive", section: "Work", title: "Drive", url: "/dashboard/drive", icon: HardDrive, isActive: pathname.startsWith("/dashboard/drive") },
    // Finance
    { featureKey: "invoices", section: "Finance", title: "Invoices", url: "/dashboard/invoices", icon: ReceiptText, isActive: pathname.startsWith("/dashboard/invoices") },
    { featureKey: "expenses", section: "Finance", title: "Expenses", url: "/dashboard/expenses", icon: Wallet, isActive: pathname.startsWith("/dashboard/expenses") },
    { featureKey: "proposals", section: "Finance", title: "Proposals", url: "/dashboard/finance/proposals", icon: FileSignature, isActive: pathname.startsWith("/dashboard/finance/proposals") },
    { featureKey: "khatabook", section: "Finance", title: "Gram Books", url: "/dashboard/khatabook", icon: BookOpen, isActive: pathname.startsWith("/dashboard/khatabook") },
    { featureKey: "debts", section: "Finance", title: "Debts", url: "/dashboard/finance/debts", icon: Landmark, isActive: pathname.startsWith("/dashboard/finance/debts") },
    // User & Access
    { featureKey: "leads", section: "User & Access", title: "Leads", url: "/dashboard/leads", icon: UserPlus, isActive: pathname.startsWith("/dashboard/leads"), badge: sidebarCounts.leads },
    { featureKey: "clients", section: "User & Access", title: "Clients", url: "/dashboard/clients", icon: Building2, isActive: pathname.startsWith("/dashboard/clients"), badge: sidebarCounts.onboarding },
    { featureKey: "products", section: "User & Access", title: "Businesses", url: "/dashboard/products", icon: Store, isActive: pathname.startsWith("/dashboard/products") },
    { featureKey: "team", section: "User & Access", title: "Team Members", url: "/dashboard/people", icon: Users, isActive: pathname.startsWith("/dashboard/people"), badge: sidebarCounts.pendingLeaves },
    { featureKey: "attendance", section: "User & Access", title: "Attendance", url: "/dashboard/attendance", icon: CalendarClock, isActive: pathname.startsWith("/dashboard/attendance") },
    { featureKey: "assets", section: "User & Access", title: "Assets", url: "/dashboard/assets", icon: Package, isActive: pathname.startsWith("/dashboard/assets") },
    // Content
    { featureKey: "roadmap", section: "Content", title: "Roadmap", url: "/dashboard/roadmap", icon: Route, isActive: pathname.startsWith("/dashboard/roadmap") },
    { featureKey: "movies", section: "Content", title: "Movie Party", url: "/dashboard/movies", icon: Rocket, isActive: pathname.startsWith("/dashboard/movies") },
    {
      featureKey: "cms", section: "Content", title: "CMS", url: "/dashboard/content", icon: FolderOpen, isActive: pathname.startsWith("/dashboard/content") && !pathname.startsWith("/dashboard/content/settings"),
      isCollapsible: true, isOpen: contentOpen, setOpen: setContentOpen,
      subItems: [
        { title: "Pages", url: "/dashboard/content/pages", isActive: pathname.startsWith("/dashboard/content/pages"), icon: FileTextIcon, featureKey: "cms_pages" },
        { title: "Posts", url: "/dashboard/content/posts", isActive: pathname.startsWith("/dashboard/content/posts"), icon: Newspaper, featureKey: "cms_posts" },
        { title: "Categories", url: "/dashboard/content/categories", isActive: pathname.startsWith("/dashboard/content/categories"), icon: FolderOpen, featureKey: "cms_categories" },
      ]
    },
    {
      featureKey: "website", section: "Content", title: "Website", url: "/dashboard/content/settings", icon: Globe, isActive: pathname.startsWith("/dashboard/content/settings"),
    },
    // Personal
    { featureKey: "reimbursements", section: "Personal", title: "Reimbursements", url: "/dashboard/reimbursements", icon: Receipt, isActive: pathname.startsWith("/dashboard/reimbursements") },
    { featureKey: "payslips", section: "Personal", title: "Payslips", url: "/dashboard/payslips", icon: FileText, isActive: pathname.startsWith("/dashboard/payslips") },
  ]

  // Build employee sections dynamically based on feature access
  const employeeSections = React.useMemo(() => {
    const todoChildren = ["todo_tasks", "todo_goals", "todo_routines", "todo_reports"]
    const cmsChildren = ["cms_pages", "cms_posts", "cms_categories", "website"]
    const filtered = allEmployeeItems
      .filter((item) => hasAccess(item.featureKey))
      .map((item) => {
        if (!item.subItems) return item
        const family = item.featureKey === "todo" ? todoChildren : cmsChildren
        return {
          ...item,
          subItems: item.subItems.filter((subItem: any) =>
            hasNestedAccess(item.featureKey, subItem.featureKey, family)
          ),
        }
      })
    const sectionMap: Record<string, any[]> = {}
    const sectionOrder: string[] = []
    for (const item of filtered) {
      if (!sectionMap[item.section]) {
        sectionMap[item.section] = []
        sectionOrder.push(item.section)
      }
      sectionMap[item.section].push(item)
    }
    return sortSidebarSections(
      sectionOrder.map((label) => ({ label, items: sectionMap[label] })),
      user.sidebarSectionOrder
    )
  }, [pathname, searchParams, effectiveAccess, contentOpen, workOpen, sidebarCounts, user.sidebarSectionOrder])

  const adminHiddenSet = new Set(user.adminSidebarHiddenFeatures || [])
  const adminSectionsVisible = isEmployee
    ? adminSections
    : adminSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item: any) => {
          const k = item.featureKey as string | undefined
          if (!k || k === "dashboard") return true
          return !adminHiddenSet.has(k)
        }),
      }))
      .map((section) => ({
        ...section,
        items: section.items.map((item: any) => ({
          ...item,
          subItems: item.subItems?.filter((subItem: any) =>
            !subItem.featureKey || !adminHiddenSet.has(subItem.featureKey)
          ),
        })),
      }))
      .filter((section) => section.items.length > 0)

  const sections = isEmployee
    ? employeeSections
    : sortSidebarSections(adminSectionsVisible, user.sidebarSectionOrder)

  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter((item: any) => {
      const matchesTitle = item.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSubItems = item.subItems?.some((sub: any) =>
        sub.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      return matchesTitle || matchesSubItems
    })
  })).filter(section => section.items.length > 0)

  const quickActions = [] // Removed

  const orgSettingsActive = pathname === "/dashboard/settings"

  return (
    <Sidebar collapsible="icon" className="border-r bg-background shadow-none" {...props}>
      <SidebarHeader className="!gap-0 !p-2 border-b bg-background/50 backdrop-blur-sm h-auto min-h-0 shrink-0">
        <SidebarMenu className="gap-0">
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className="hover:bg-transparent !h-9 min-h-9 px-1 group-data-[collapsible=icon]:!h-8 group-data-[collapsible=icon]:!w-8 group-data-[collapsible=icon]:!p-0">
              <div className="flex aspect-square size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm text-xs group-data-[collapsible=icon]:mx-auto overflow-hidden">
                {profile?.logoUrl ? (
                  <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain bg-white" />
                ) : (
                  <span className="font-bold">{profile?.companyName?.[0] || "K"}</span>
                )}
              </div>
              <div className="grid flex-1 text-left text-xs leading-tight ml-1.5 group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold text-foreground">
                  {profile?.companyName || "Webwrite"}
                </span>
              </div>
              <ChevronRight className="ml-auto size-3.5 text-muted-foreground/50 rotate-90 shrink-0 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="!gap-0 bg-background px-1 py-1 scrollbar-none flex flex-1 flex-col justify-start">
        {pinnedItems.length > 0 && (
          <SidebarGroup className="!p-0 px-1.5 pb-1">
            <SidebarGroupLabel className="!h-auto min-h-0 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50 group-data-[collapsible=icon]:hidden">
              Shortcuts
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
              {pinnedItems.map((item) => (
                <SidebarMenuItem key={`${item.type}-${item.id}`}>
                  <SidebarMenuButton
                    asChild
                    tooltip={`${item.type}: ${item.name}`}
                    className="group/btn transition-all duration-200 h-8 rounded-md px-2 mb-0.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  >
                    <Link href={item.url}>
                      <FolderTree className="size-4 text-blue-500 shrink-0" />
                      <div className="flex flex-col items-start leading-tight group-data-[collapsible=icon]:hidden ml-1">
                        <span className="text-xs truncate max-w-[150px]">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground/60">{item.type}</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {filteredSections.map((section) => (
          <SidebarGroup key={section.label} className="!p-0 px-1.5 pb-0.5">
            <SidebarGroupLabel className="!h-auto min-h-0 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50 group-data-[collapsible=icon]:hidden">
              {section.label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
              {section.items.map((item: any) => (
                <SidebarMenuItem key={item.title}>
                  {item.isCollapsible ? (
                    <>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={item.isActive}
                        onClick={(e) => {
                          e.preventDefault();
                          item.setOpen?.(!item.isOpen);
                        }}
                        className={cn(
                          "group/btn transition-all duration-200 h-8 rounded-md px-2 mb-0.5 cursor-pointer",
                          item.isActive
                            ? "bg-muted text-foreground font-semibold"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn(
                          "size-4 shrink-0 transition-colors duration-200",
                          item.isActive ? "text-primary" : "text-muted-foreground/70 group-hover/btn:text-foreground"
                        )} />
                        <span className="text-xs font-medium truncate flex-1 group-data-[collapsible=icon]:hidden text-left ml-1">{item.title}</span>
                        {item.badge > 0 && (
                          <span className="ml-auto bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full mr-2 group-data-[collapsible=icon]:hidden">
                            {item.badge}
                          </span>
                        )}
                        {item.loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />}
                        <ChevronDown className={cn(
                          "ml-auto size-4 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[collapsible=icon]:hidden",
                          item.isOpen && "rotate-180"
                        )} />
                      </SidebarMenuButton>
                      {item.isOpen && (
                        <SidebarMenuSub>
                          {item.subItems?.map((subItem: any) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={subItem.isActive}
                              >
                                <Link href={subItem.url} className="flex items-center gap-2">
                                  <subItem.icon className={cn("size-4", subItem.iconColor)} />
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={item.isActive}
                      className={cn(
                        "group/btn transition-all duration-200 h-8 rounded-md px-2 mb-0.5",
                        item.isActive
                          ? "bg-muted text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <Link href={item.url}>
                        <item.icon className={cn(
                          "size-4 shrink-0 transition-colors duration-200",
                          item.isActive ? "text-primary" : "text-muted-foreground/70 group-hover/btn:text-foreground"
                        )} />
                        <span className="text-xs flex-1 truncate group-data-[collapsible=icon]:hidden ml-1">{item.title}</span>
                        {item.badge > 0 && (
                          <span className="ml-auto bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full group-data-[collapsible=icon]:hidden">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}

      </SidebarContent>
      <SidebarFooter className="border-t bg-background/50 p-1.5">

        <SidebarMenu>
          <SidebarMenuItem className="mt-2 border-t pt-2">
            <DropdownMenu>
              {/* User dropdown remains similar but cleaned up */}
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="hover:bg-muted/50 rounded-lg p-2 h-12 group-data-[collapsible=icon]:!h-8 group-data-[collapsible=icon]:!w-8 group-data-[collapsible=icon]:!p-0"
                >
                  <Avatar className="h-8 w-8 rounded-full border">
                    {profile?.logoUrl ? (
                      <AvatarImage src={profile.logoUrl} alt={profile.companyName} />
                    ) : (
                      <AvatarFallback className="text-xs">{user.email[0].toUpperCase()}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                    <span className="truncate font-semibold">{user.name || user.email.split("@")[0]}</span>
                    <span className="truncate text-[10px] text-muted-foreground">{isEmployee ? "Employee" : "Admin Access"}</span>
                  </div>
                  <MoreHorizontal className="ml-auto size-4 text-muted-foreground/50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl" side="right" align="end" sideOffset={12}>
                {/* ... same dropdown items ... */}
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-full">
                      {profile?.logoUrl ? (
                        <AvatarImage src={profile.logoUrl} alt={profile.companyName} />
                      ) : (
                        <AvatarFallback className="rounded-full">
                          {user.email[0].toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.name || user.email.split("@")[0]}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500 hover:text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
          {isEmployee && hasAccess("drive") && driveQuota && (
            <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
              <div className="px-3 py-2 rounded-lg border bg-muted/20 mt-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span className="inline-flex items-center gap-1">
                    <HardDrive className="size-3.5" />
                    Storage
                  </span>
                  <span>
                    {(driveQuota.usedBytes / (1024 * 1024 * 1024)).toFixed(2)} / {(driveQuota.maxBytes / (1024 * 1024 * 1024)).toFixed(2)} GB
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${driveQuota.maxBytes > 0 ? Math.min(100, Math.round((driveQuota.usedBytes / driveQuota.maxBytes) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
