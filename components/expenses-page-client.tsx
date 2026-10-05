"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Users,
  Building2,
  TrendingDown,
  Pause,
  Play,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  Receipt,
  Layers,
  ArrowUpRight,
  Info,
  DollarSign,
  CheckCircle2,
  BarChart3,
  Megaphone,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyDisplay } from "@/components/currency-display";
import { toast } from "sonner";

export interface ExpenseItem {
  id: string;
  product: { id: string; name: string; kind: string } | null;
  type: string;
  amount: number;
  frequency: "monthly" | "yearly" | "custom";
  customMonths?: number;
  remark?: string;
  isPaused: boolean;
  createdAt?: string;
}

export interface ProductOption {
  id: string;
  name: string;
  kind: string;
}

export interface EmployeeCostItem {
  id: string;
  name: string;
  role?: string;
  email?: string;
  annualSalary: number;
  monthlySalary: number;
  assignedProduct?: string;
  assignedService?: string;
}
export interface MarketingExpenseItem {
  id: string;
  month: string; // e.g. "2026-09" or "September 2026"
  amount: number;
  channel: string; // e.g. "Social Media", "SEO", "Events"
  remark?: string;
  createdAt?: string;
}


function calculateMonthlyEquivalent(amount: number, frequency: string, customMonths?: number): number {
  if (frequency === "yearly") return Math.round(amount / 12);
  if (frequency === "custom" && customMonths && customMonths >= 1) return Math.round(amount / customMonths);
  return Math.round(amount);
}

export function ExpensesPageClient({
  expenses: initialExpenses,
  products,
  teamMembers,
}: {
  expenses: ExpenseItem[];
  products: ProductOption[];
  teamMembers: EmployeeCostItem[];
}) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");

  // Modal states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Marketing expense states
  const [marketingExpenses, setMarketingExpenses] = useState<MarketingExpenseItem[]>([]);
  const [addMarketingDialogOpen, setAddMarketingDialogOpen] = useState(false);
  const [editingMarketing, setEditingMarketing] = useState<MarketingExpenseItem | null>(null);
  const [deletingMarketingId, setDeletingMarketingId] = useState<string | null>(null);
  const [savingMarketing, setSavingMarketing] = useState(false);
  const [marketingForm, setMarketingForm] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    amount: "",
    channel: "",
    remark: "",
  });

  // Form states
  const [formData, setFormData] = useState({
    productId: products[0]?.id || "",
    type: "",
    amount: "",
    frequency: "monthly" as "monthly" | "yearly" | "custom",
    customMonths: "3",
    remark: "",
  });

  // Calculate totals
  const activeExpenses = expenses.filter((e) => !e.isPaused);
  const totalOperationalMonthly = activeExpenses.reduce((sum, e) => {
    return sum + calculateMonthlyEquivalent(e.amount, e.frequency, e.customMonths);
  }, 0);

  const totalTeamMonthly = teamMembers.reduce((sum, m) => sum + (m.monthlySalary || 0), 0);
  const totalMonthlyOverall = totalOperationalMonthly + totalTeamMonthly;

  // Breakdown by Product / Business
  const breakdownByProduct = activeExpenses.reduce((acc, e) => {
    const pName = e.product?.name || "General / Corporate";
    const monthlyAmt = calculateMonthlyEquivalent(e.amount, e.frequency, e.customMonths);
    acc[pName] = (acc[pName] || 0) + monthlyAmt;
    return acc;
  }, {} as Record<string, number>);

  // Breakdown by Expense Type / Category
  const breakdownByType = activeExpenses.reduce((acc, e) => {
    const type = e.type || "Other";
    const monthlyAmt = calculateMonthlyEquivalent(e.amount, e.frequency, e.customMonths);
    acc[type] = (acc[type] || 0) + monthlyAmt;
    return acc;
  }, {} as Record<string, number>);

  // Unique categories for filter
  const categories = Array.from(new Set(expenses.map((e) => e.type))).filter(Boolean);

  // Filtered expenses list
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      (e.product?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.remark || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || e.type === selectedCategory;
    const matchesStatus =
      activeTab === "all" ||
      (activeTab === "active" && !e.isPaused) ||
      (activeTab === "paused" && e.isPaused);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  function openAddDialog() {
    setFormData({
      productId: products[0]?.id || "",
      type: "",
      amount: "",
      frequency: "monthly",
      customMonths: "3",
      remark: "",
    });
    setAddDialogOpen(true);
  }

  function openEditDialog(exp: ExpenseItem) {
    setEditingExpense(exp);
    setFormData({
      productId: exp.product?.id || products[0]?.id || "",
      type: exp.type || "",
      amount: String(exp.amount),
      frequency: exp.frequency || "monthly",
      customMonths: String(exp.customMonths || 3),
      remark: exp.remark || "",
    });
  }

  async function handleSaveExpense() {
    if (!formData.productId || !formData.type || !formData.amount) {
      toast.error("Please fill in Product, Category/Type, and Amount");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        product: formData.productId,
        type: formData.type.trim(),
        amount: Number(formData.amount),
        frequency: formData.frequency,
        customMonths: formData.frequency === "custom" ? Number(formData.customMonths) : undefined,
        remark: formData.remark.trim(),
      };

      if (editingExpense) {
        const res = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update expense");
        const data = await res.json();
        setExpenses((prev) => prev.map((item) => (item.id === editingExpense.id ? data.expense : item)));
        toast.success("Expense updated successfully");
        setEditingExpense(null);
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create expense");
        const data = await res.json();
        setExpenses((prev) => [data.expense, ...prev]);
        toast.success("Expense added successfully");
        setAddDialogOpen(false);
      }
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePause(exp: ExpenseItem) {
    try {
      const res = await fetch(`/api/expenses/${exp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaused: !exp.isPaused }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const data = await res.json();
      setExpenses((prev) => prev.map((item) => (item.id === exp.id ? data.expense : item)));
      toast.success(exp.isPaused ? "Expense resumed" : "Expense paused");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update expense");
    }
  }

  async function handleDeleteExpense() {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/expenses/${deletingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete expense");
      setExpenses((prev) => prev.filter((item) => item.id !== deletingId));
      toast.success("Expense deleted");
      setDeletingId(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete expense");
    }
  }

  // ─── Marketing Expense Handlers ───────────────────────────────────────

  function openAddMarketingDialog() {
    setMarketingForm({
      month: new Date().toISOString().slice(0, 7),
      amount: "",
      channel: "",
      remark: "",
    });
    setEditingMarketing(null);
    setAddMarketingDialogOpen(true);
  }

  function openEditMarketingDialog(item: MarketingExpenseItem) {
    setEditingMarketing(item);
    setMarketingForm({
      month: item.month,
      amount: String(item.amount),
      channel: item.channel,
      remark: item.remark || "",
    });
    setAddMarketingDialogOpen(true);
  }

  async function handleSaveMarketing() {
    if (!marketingForm.month || !marketingForm.amount || !marketingForm.channel) {
      toast.error("Please fill in Month, Channel, and Amount");
      return;
    }
    setSavingMarketing(true);
    try {
      const payload = {
        product: products[0]?.id || "",
        type: "marketing",
        amount: Number(marketingForm.amount),
        frequency: "monthly" as const,
        remark: `[${marketingForm.month}] ${marketingForm.channel}${marketingForm.remark ? " - " + marketingForm.remark : ""}`,
      };

      if (editingMarketing) {
        const res = await fetch(`/api/expenses/${editingMarketing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
        const data = await res.json();
        // Parse back the marketing expense
        const updated: MarketingExpenseItem = {
          id: data.expense.id,
          month: marketingForm.month,
          amount: Number(marketingForm.amount),
          channel: marketingForm.channel,
          remark: marketingForm.remark,
          createdAt: data.expense.createdAt,
        };
        setMarketingExpenses((prev) => prev.map((m) => m.id === editingMarketing.id ? updated : m));
        toast.success("Marketing expense updated");
        setEditingMarketing(null);
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to add");
        const data = await res.json();
        const newItem: MarketingExpenseItem = {
          id: data.expense.id,
          month: marketingForm.month,
          amount: Number(marketingForm.amount),
          channel: marketingForm.channel,
          remark: marketingForm.remark,
          createdAt: data.expense.createdAt,
        };
        setMarketingExpenses((prev) => [newItem, ...prev]);
        toast.success("Marketing expense added");
      }
      setAddMarketingDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setSavingMarketing(false);
    }
  }

  async function handleDeleteMarketing() {
    if (!deletingMarketingId) return;
    try {
      const res = await fetch(`/api/expenses/${deletingMarketingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setMarketingExpenses((prev) => prev.filter((m) => m.id !== deletingMarketingId));
      toast.success("Marketing expense deleted");
      setDeletingMarketingId(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  }

  // ─── Marketing derived data ────────────────────────────────────────────

  // Also extract marketing expenses from the operational expenses list (type = "marketing")
  const marketingFromExpenses = expenses.filter((e) => e.type?.toLowerCase() === "marketing");

  // Parse month/channel from remark pattern: "[YYYY-MM] Channel - remark"
  const parsedMarketingExpenses: MarketingExpenseItem[] = [
    ...marketingExpenses,
    ...marketingFromExpenses.map((e): MarketingExpenseItem => {
      const remarkMatch = e.remark?.match(/^\[(\d{4}-\d{2})\]\s*([^-]+)(?:\s*-\s*(.*))?$/);
      return {
        id: e.id,
        month: remarkMatch?.[1] || new Date(e.createdAt || Date.now()).toISOString().slice(0, 7),
        amount: calculateMonthlyEquivalent(e.amount, e.frequency, e.customMonths),
        channel: remarkMatch?.[2]?.trim() || e.type || "Marketing",
        remark: remarkMatch?.[3]?.trim() || e.remark || "",
        createdAt: e.createdAt,
      };
    }),
  ];

  // Remove duplicates by id
  const uniqueMarketingIds = new Set<string>();
  const allMarketingExpenses = parsedMarketingExpenses.filter((m) => {
    if (uniqueMarketingIds.has(m.id)) return false;
    uniqueMarketingIds.add(m.id);
    return true;
  });

  // Group by month for monthly chart
  const marketingByMonth = allMarketingExpenses.reduce((acc, m) => {
    acc[m.month] = (acc[m.month] || 0) + m.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedMonths = Object.keys(marketingByMonth).sort();
  const totalMarketingSpend = Object.values(marketingByMonth).reduce((a, b) => a + b, 0);
  const avgMonthlyMarketing = sortedMonths.length > 0 ? Math.round(totalMarketingSpend / sortedMonths.length) : 0;
  const maxMonthlyMarketing = Math.max(...Object.values(marketingByMonth), 1);

  // Channel breakdown
  const marketingByChannel = allMarketingExpenses.reduce((acc, m) => {
    acc[m.channel] = (acc[m.channel] || 0) + m.amount;
    return acc;
  }, {} as Record<string, number>);


  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monthly Expenses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Detailed breakdown of recurring operational costs and team payroll
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
        {/* Total Overall */}
        <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-card to-card relative overflow-hidden shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Monthly Expense Overall
              </span>
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-bold tabular-nums text-foreground">
              <CurrencyDisplay value={totalMonthlyOverall} />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total monthly expenditure (Operational + Team Payroll)
            </p>

            <div className="mt-4 pt-3 border-t border-border/50 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-amber-500" /> Operational Expenses:
                </span>
                <span className="font-semibold text-foreground">
                  <CurrencyDisplay value={totalOperationalMonthly} />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-cyan-500" /> Team Payroll Cost:
                </span>
                <span className="font-semibold text-foreground">
                  <CurrencyDisplay value={totalTeamMonthly} />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational Expenses Card */}
        <Card className="border bg-card shadow-sm hover:border-amber-500/30 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Operational Expenses
              </span>
              <div className="h-8 w-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              <CurrencyDisplay value={totalOperationalMonthly} />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Monthly equivalent from {activeExpenses.length} active recurring subscriptions
            </p>
            <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
              <span>Includes SaaS, Hosting, Infrastructure & Operations</span>
            </div>
          </CardContent>
        </Card>

        {/* Team Payroll Card */}
        <Card className="border bg-card shadow-sm hover:border-cyan-500/30 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Team Payroll Cost
              </span>
              <div className="h-8 w-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-bold tabular-nums text-foreground">
              <CurrencyDisplay value={totalTeamMonthly} />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Monthly salary across {teamMembers.length} team members
            </p>
            <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground flex justify-between">
              <span>Annual Payroll:</span>
              <span className="font-semibold text-foreground">
                <CurrencyDisplay value={totalTeamMonthly * 12} />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Removed Expense Categories & Business Breakdown Cards as requested */}

      {/* Main Tabs & Table View */}
      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="expenses" className="gap-2">
            <Receipt className="h-4 w-4" /> Operational Expenses ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="marketing" className="gap-2">
            <Megaphone className="h-4 w-4" /> Marketing Expenses
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" /> Team Payroll Breakdown ({teamMembers.length})
          </TabsTrigger>
        </TabsList>

        {/* ════════════ TAB 1: OPERATIONAL EXPENSES ════════════ */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expense, business or remarks..."
                  className="pl-8 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {categories.length > 0 && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-44 text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto bg-muted/60 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({expenses.length})
              </button>
              <button
                onClick={() => setActiveTab("active")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Active ({expenses.filter((e) => !e.isPaused).length})
              </button>
              <button
                onClick={() => setActiveTab("paused")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "paused" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Paused ({expenses.filter((e) => e.isPaused).length})
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Wallet className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="font-semibold text-sm">No expenses found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add recurring operational expenses to track monthly costs.
                  </p>
                  <Button onClick={openAddDialog} size="sm" className="mt-4 gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add Expense
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business / Service</TableHead>
                      <TableHead>Category / Type</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead className="text-right">Billed Amount</TableHead>
                      <TableHead className="text-right">Monthly Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((exp) => {
                      const monthlyCost = calculateMonthlyEquivalent(exp.amount, exp.frequency, exp.customMonths);
                      return (
                        <TableRow key={exp.id} className={exp.isPaused ? "opacity-60 bg-muted/20" : ""}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{exp.product?.name || "General / Corporate"}</span>
                              {exp.remark && (
                                <span className="text-xs text-muted-foreground truncate max-w-xs">{exp.remark}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs font-normal">
                              {exp.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground capitalize">
                            {exp.frequency === "custom" ? `Every ${exp.customMonths || 3} months` : exp.frequency}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            <CurrencyDisplay value={exp.amount} />
                            <span className="text-[10px] text-muted-foreground block font-normal capitalize">
                              {exp.frequency === "yearly" ? "/yr" : exp.frequency === "monthly" ? "/mo" : `/${exp.customMonths || 3}mo`}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                            <CurrencyDisplay value={monthlyCost} />
                            <span className="text-[10px] text-muted-foreground font-normal block">/mo eqv</span>
                          </TableCell>
                          <TableCell>
                            {exp.isPaused ? (
                              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Paused
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => handleTogglePause(exp)}
                                title={exp.isPaused ? "Resume expense" : "Pause expense"}
                              >
                                {exp.isPaused ? <Play className="h-3.5 w-3.5 text-emerald-600" /> : <Pause className="h-3.5 w-3.5 text-amber-600" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                                onClick={() => openEditDialog(exp)}
                                title="Edit expense"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                onClick={() => setDeletingId(exp.id)}
                                title="Delete expense"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════ TAB: MARKETING EXPENSES ════════════ */}
        <TabsContent value="marketing" className="space-y-4">
          {/* Summary cards */}
          <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
            <Card className="border-2 border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-card to-card shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-pink-600 dark:text-pink-400">Total Marketing Spend</span>
                  <div className="h-8 w-8 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-600">
                    <Megaphone className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-bold tabular-nums text-foreground">
                  <CurrencyDisplay value={totalMarketingSpend} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">Across {sortedMonths.length} month{sortedMonths.length !== 1 ? "s" : ""} tracked</p>
              </CardContent>
            </Card>

            <Card className="border bg-card shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Monthly</span>
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  <CurrencyDisplay value={avgMonthlyMarketing} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">Average per month</p>
              </CardContent>
            </Card>

            <Card className="border bg-card shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channels</span>
                  <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-600">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
                  {Object.keys(marketingByChannel).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Active marketing channels</p>
              </CardContent>
            </Card>
          </div>

          {/* Month-wise chart & channel breakdown */}
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
            {/* Monthly bar chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-pink-500" /> Month-wise Marketing Spend
                </CardTitle>
                <CardDescription>Monthly marketing expenditure trend</CardDescription>
              </CardHeader>
              <CardContent>
                {sortedMonths.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No marketing expenses logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {sortedMonths.slice().reverse().map((month) => {
                      const amount = marketingByMonth[month];
                      const pct = Math.round((amount / maxMonthlyMarketing) * 100);
                      const [y, m] = month.split("-");
                      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
                      return (
                        <div key={month} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span>{label}</span>
                            <span className="tabular-nums text-pink-600 dark:text-pink-400 font-semibold">
                              <CurrencyDisplay value={amount} />
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Channel breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-violet-500" /> Spend by Channel
                </CardTitle>
                <CardDescription>Total allocation per marketing channel</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(marketingByChannel).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No channels logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(marketingByChannel)
                      .sort((a, b) => b[1] - a[1])
                      .map(([channel, amount]) => {
                        const pct = totalMarketingSpend > 0 ? Math.round((amount / totalMarketingSpend) * 100) : 0;
                        return (
                          <div key={channel} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="capitalize">{channel}</span>
                              <span className="tabular-nums text-violet-600 dark:text-violet-400 font-semibold">
                                <CurrencyDisplay value={amount} /> ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>


        </TabsContent>

        {/* ════════════ TAB 2: TEAM PAYROLL BREAKDOWN ════════════ */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-500" /> Employee Payroll Expense
              </CardTitle>
              <CardDescription>
                Monthly salary breakdown contributing to the total team cost of <CurrencyDisplay value={totalTeamMonthly} />/mo
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {teamMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">No active team members registered.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Annual Salary</TableHead>
                      <TableHead className="text-right">Monthly Salary</TableHead>
                      <TableHead className="text-right">% of Total Payroll</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((m) => {
                      const pct = totalTeamMonthly > 0 ? Math.round((m.monthlySalary / totalTeamMonthly) * 100) : 0;
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">
                            <div>
                              <span>{m.name}</span>
                              {m.email && <span className="text-xs text-muted-foreground block">{m.email}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{m.role || "Team Member"}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            <CurrencyDisplay value={m.annualSalary} />
                          </TableCell>
                          <TableCell className="text-right font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                            <CurrencyDisplay value={m.monthlySalary} /> / mo
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs tabular-nums">{pct}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ════════════ ADD / EDIT MARKETING DIALOG ════════════ */}
      <Dialog open={addMarketingDialogOpen} onOpenChange={(open) => { if (!open) { setAddMarketingDialogOpen(false); setEditingMarketing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-pink-600" />
              {editingMarketing ? "Edit Marketing Expense" : "Add Marketing Expense"}
            </DialogTitle>
            <DialogDescription>
              Track monthly marketing expenditure by channel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month *</Label>
                <Input
                  type="month"
                  value={marketingForm.month}
                  onChange={(e) => setMarketingForm((f) => ({ ...f, month: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 25000"
                  value={marketingForm.amount}
                  onChange={(e) => setMarketingForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Marketing Channel *</Label>
              <Input
                placeholder="e.g. Social Media, SEO, Events, Google Ads, LinkedIn"
                value={marketingForm.channel}
                onChange={(e) => setMarketingForm((f) => ({ ...f, channel: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Remarks / Notes</Label>
              <Input
                placeholder="e.g. Campaign name, vendor, specific details"
                value={marketingForm.remark}
                onChange={(e) => setMarketingForm((f) => ({ ...f, remark: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddMarketingDialogOpen(false); setEditingMarketing(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveMarketing} disabled={savingMarketing} className="bg-pink-600 hover:bg-pink-700">
              {savingMarketing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingMarketing ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════ DELETE MARKETING CONFIRM ════════════ */}
      <Dialog open={!!deletingMarketingId} onOpenChange={(open) => !open && setDeletingMarketingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Marketing Expense</DialogTitle>
            <DialogDescription>Are you sure you want to delete this marketing expense entry?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMarketingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMarketing}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════ ADD / EDIT DIALOG ════════════ */}
      <Dialog open={addDialogOpen || !!editingExpense} onOpenChange={(open) => { if (!open) { setAddDialogOpen(false); setEditingExpense(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add Operational Expense"}</DialogTitle>
            <DialogDescription>
              Record recurring server, SaaS, software, or operational expenses.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Business / Asset *</Label>
              <Select value={formData.productId} onValueChange={(v) => setFormData((f) => ({ ...f, productId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select business or service" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} <span className="text-xs text-muted-foreground capitalize">({p.kind})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category / Expense Type *</Label>
              <Input
                placeholder="e.g. Server, Software, Hosting, SaaS, Legal, Marketing"
                value={formData.type}
                onChange={(e) => setFormData((f) => ({ ...f, type: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={formData.amount}
                  onChange={(e) => setFormData((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Billing Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(v: "monthly" | "yearly" | "custom") => setFormData((f) => ({ ...f, frequency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="custom">Custom (Months)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.frequency === "custom" && (
              <div className="space-y-2">
                <Label>Interval (Months)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 3 for quarterly"
                  value={formData.customMonths}
                  onChange={(e) => setFormData((f) => ({ ...f, customMonths: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Remarks / Provider Notes</Label>
              <Input
                placeholder="e.g. AWS US-East servers / Vercel Pro subscription"
                value={formData.remark}
                onChange={(e) => setFormData((f) => ({ ...f, remark: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); setEditingExpense(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveExpense} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingExpense ? "Update Expense" : "Save Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════ DELETE CONFIRM DIALOG ════════════ */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>Are you sure you want to delete this expense record?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteExpense}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
