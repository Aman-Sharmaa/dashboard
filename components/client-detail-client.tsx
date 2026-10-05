"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Building2, Receipt, FolderKanban, CreditCard, Plus, ChevronRight, ChevronDown, Loader2, Trash2, Pencil, RotateCcw } from "lucide-react";
import { ProjectFolderCard } from "@/components/project-folder-card";
import { toast } from "sonner";

type ClientData = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyWebsite?: string;
  gstin?: string;
  pan?: string;
  taxAddress?: string;
  notes?: string;
  isActive?: boolean;
  updatedAt?: string | Date;
  // Legacy payment fields (unused; payments are now under project-payments)
  paymentProjectId?: string | null;
  paymentType?: string;
  scheduleType?: string;
  totalBudget?: number;
  budgetPhases?: unknown[];
};

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
  isPinned?: boolean;
  isPinnedToSidebar?: boolean;
};

type PaymentPhase = {
  _id?: string;
  name: string;
  percentage: number;
  amount: number;
  remark: string;
  status?: "draft" | "sent" | "paid" | "overdue";
  billGeneratedAt?: string | Date | null;
  dueDate?: string | Date | null;
  paidDate?: string | Date | null;
  isGstBill?: boolean;
};

type ClientPaymentRow = {
  id: string;
  project: { id: string; name: string } | null;
  product: { id: string; name: string; kind: string } | null;
  totalAmount: number;
  currency: string;
  billingCycle: string;
  status: string;
  phases?: PaymentPhase[];
  billGeneratedAt?: string | Date | null;
  paidDate?: string | Date | null;
  isGstBill?: boolean;
  createdAt?: string | null;
};

type CompanyProfile = {
  companyName?: string;
  legalName?: string;
  companyDetails?: { address?: string; city?: string; state?: string; country?: string; zip?: string; website?: string };
  taxDetails?: { gstNumber?: string; panNumber?: string };
  bankDetails?: { accountHolderName?: string; accountNumber?: string; ifscCode?: string };
  personalDetails?: { contactName?: string; email?: string; phone?: string };
};

const BILLING_CYCLES: { value: string; label: string }[] = [
  { value: "one_time", label: "One time" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "phases", label: "Phases" },
];

const PAYMENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

const PROJECT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "planned", label: "Pending" },
  { value: "active", label: "Ongoing" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "maintenance", label: "Maintenance" },
];

function projectStatusLabel(status: string) {
  return PROJECT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function projectTotalMonths(start: string | undefined, end: string | undefined): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return null;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return months >= 0 ? months + 1 : null;
}

const VALID_TABS = ["personal", "company", "tax", "projects", "payments"];

function formatRupee(num: number | null | undefined): string {
  if (num == null || Number.isNaN(num)) return "~";
  return `₹${Number(num).toLocaleString("en-IN")}`;
}

type Props = {
  client: ClientData;
  clientId: string;
  isAdmin: boolean;
  initialProjects: ProjectRow[];
};

export function ClientDetailClient({ client: initialClient, clientId, isAdmin, initialProjects }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [client, setClient] = useState(initialClient);
  const sortedInitial = [...initialProjects].sort((a, b) => a.name.localeCompare(b.name));
  const [projects, setProjects] = useState<ProjectRow[]>(sortedInitial);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const tabParam = searchParams?.get("tab");
  const activeTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "personal";
  const [projectStatusFilter, setProjectStatusFilter] = useState("");
  const [clientPayments, setClientPayments] = useState<ClientPaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    projectId: "",
    productId: "",
    totalAmount: "",
    currency: "INR",
    billingCycle: "one_time",
    status: "draft",
    notes: "",
    phases: [] as PaymentPhase[],
    paidDate: "",
    createdAt: "" as string,
  });
  const [generateBillPaymentId, setGenerateBillPaymentId] = useState<string | null>(null);
  const [generateBillPhaseIndex, setGenerateBillPhaseIndex] = useState<number | null>(null);
  const [generateBillGst, setGenerateBillGst] = useState(true);
  const [generateBillSaving, setGenerateBillSaving] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string; kind: string }[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [viewBillPayment, setViewBillPayment] = useState<ClientPaymentRow | null>(null);
  const [paymentStatusSavingId, setPaymentStatusSavingId] = useState<string | null>(null);
  const [reversePhasesSavingId, setReversePhasesSavingId] = useState<string | null>(null);
  const [expandedPhasePaymentIds, setExpandedPhasePaymentIds] = useState<Set<string>>(new Set());
  const [paymentFilterProjectId, setPaymentFilterProjectId] = useState("");
  const [paymentFilterStatus, setPaymentFilterStatus] = useState("");
  const [paymentFilterProductId, setPaymentFilterProductId] = useState("");
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState<{ paymentId: string; phaseIndex: number } | null>(null);
  const [paidDateInput, setPaidDateInput] = useState("");
  const [markPaidSaving, setMarkPaidSaving] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState<typeof paymentForm | null>(null);
  const [editPaymentSaving, setEditPaymentSaving] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [deleteConfirmPaymentId, setDeleteConfirmPaymentId] = useState<string | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Sync client state from server when initialClient changes (e.g. page refresh, navigation)
  useEffect(() => {
    setClient(initialClient);
  }, [initialClient.id, initialClient.updatedAt]);

  useEffect(() => {
    const sorted = [...initialProjects].sort((a, b) => a.name.localeCompare(b.name));
    setProjects(sorted);
  }, [initialProjects]);

  useEffect(() => {
    if (activeTab === "projects") {
      setLoading(false);
    }
  }, [activeTab]);



  // Load payments for this client when Payments tab is active
  useEffect(() => {
    if (activeTab !== "payments") return;
    setPaymentsLoading(true);
    fetch(`/api/project-payments?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        const list = (data.payments || []).map((p: any) => ({
          id: p.id,
          project: p.project ?? null,
          product: p.product ?? null,
          totalAmount: p.totalAmount,
          currency: p.currency ?? "INR",
          billingCycle: p.billingCycle ?? "one_time",
          status: p.status ?? "draft",
          phases: Array.isArray(p.phases) ? p.phases.map((ph: any) => ({ ...ph, status: ph.status ?? "draft", billGeneratedAt: ph.billGeneratedAt ?? null, dueDate: ph.dueDate ?? null, paidDate: ph.paidDate ?? null })) : [],
          billGeneratedAt: p.billGeneratedAt ?? null,
          paidDate: p.paidDate ?? null,
          isGstBill: p.isGstBill ?? false,
          createdAt: p.createdAt,
        }));
        setClientPayments(list);
      })
      .catch(() => toast.error("Failed to load payments"))
      .finally(() => setPaymentsLoading(false));
  }, [clientId, activeTab]);

  // Load company profile and products when payments tab is active
  useEffect(() => {
    if (activeTab !== "payments") return;
    fetch("/api/company")
      .then((r) => r.json())
      .then((data) => setCompanyProfile(data.profile ?? null))
      .catch(() => { });
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts((data.products || []).map((x: any) => ({ id: x._id, name: x.name, kind: x.kind || "product" }))))
      .catch(() => { });
  }, [activeTab]);

  async function handleSavePersonal(form: Partial<ClientData>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to update");
        return;
      }
      setClient(data.client);
      toast.success("Saved");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  function openAddPayment() {
    setPaymentForm({
      projectId: "",
      productId: "",
      totalAmount: "",
      currency: "INR",
      billingCycle: "one_time",
      status: "draft",
      notes: "",
      phases: [],
      paidDate: "" as string,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setPaymentDialogOpen(true);
  }

  function addPaymentPhase() {
    const total = Number(paymentForm.totalAmount) || 0;
    const nextNum = paymentForm.phases.length + 1;
    setPaymentForm((f) => ({
      ...f,
      phases: [
        ...f.phases,
        { name: `Phase ${nextNum}`, percentage: 0, amount: 0, remark: "", dueDate: "" },
      ],
    }));
  }

  function updatePaymentPhase(index: number, field: keyof PaymentPhase, value: string | number) {
    const total = Number(paymentForm.totalAmount) || 0;
    setPaymentForm((f) => {
      const next = f.phases.map((p, i) =>
        i !== index ? p : { ...p, [field]: value }
      );
      const phase = next[index];
      if (phase && total > 0) {
        if (field === "percentage") {
          const pct = Number(value) || 0;
          next[index] = { ...phase, amount: Math.round((total * pct) / 100) };
        } else if (field === "amount") {
          const amt = Number(value) || 0;
          next[index] = {
            ...phase,
            percentage: total ? Math.round((amt / total) * 1000) / 10 : 0,
          };
        }
      }
      return { ...f, phases: next };
    });
  }

  function removePaymentPhase(index: number) {
    setPaymentForm((f) => ({
      ...f,
      phases: f.phases.filter((_, i) => i !== index),
    }));
  }

  function getPhasesTotalPercent() {
    return paymentForm.phases.reduce(
      (sum, p) => sum + (Number(p.percentage) || 0),
      0
    );
  }

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentForm.totalAmount) {
      toast.error("Amount is required");
      return;
    }
    setPaymentSaving(true);
    try {
      const res = await fetch("/api/project-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          projectId: paymentForm.projectId || null,
          productId: paymentForm.productId || null,
          totalAmount: Number(paymentForm.totalAmount),
          currency: paymentForm.currency,
          billingCycle: paymentForm.billingCycle,
          status: paymentForm.status,
          notes: paymentForm.notes || undefined,
          paidDate: paymentForm.paidDate || undefined,
          phases: paymentForm.phases.length > 0 ? paymentForm.phases : undefined,
          createdAt: paymentForm.createdAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create payment");
      setClientPayments((prev) => [
        {
          id: data.payment.id,
          project: data.payment.project ?? null,
          product: data.payment.product ?? null,
          totalAmount: data.payment.totalAmount,
          currency: data.payment.currency ?? "INR",
          billingCycle: data.payment.billingCycle ?? "one_time",
          status: data.payment.status ?? "draft",
          phases: Array.isArray(data.payment.phases) ? data.payment.phases : [],
          paidDate: data.payment.paidDate ?? null,
          createdAt: data.payment.createdAt,
        },
        ...prev,
      ]);
      setPaymentDialogOpen(false);
      toast.success("Payment created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create payment");
    } finally {
      setPaymentSaving(false);
    }
  }

  function formatRupeeAmount(num: number, currency: string) {
    if (currency === "INR") return `₹${Number(num).toLocaleString("en-IN")}`;
    return `${currency} ${Number(num).toLocaleString()}`;
  }

  /** Returns "overdue" | "due_soon" (≤5 days) | null when phase is unpaid and has dueDate */
  function getPhaseDueAlert(ph: PaymentPhase): "overdue" | "due_soon" | null {
    if (ph.status === "paid" || !ph.dueDate) return null;
    const due = new Date(ph.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "overdue";
    if (diffDays <= 5) return "due_soon";
    return null;
  }

  async function handleGenerateBill() {
    if (!generateBillPaymentId) return;
    setGenerateBillSaving(true);
    try {
      const payment = clientPayments.find((p) => p.id === generateBillPaymentId);
      const isPhaseBill = generateBillPhaseIndex !== null && payment?.phases && payment.phases.length > 0;

      let body: Record<string, unknown>;
      let targetPhaseId: string | undefined;

      if (isPhaseBill && payment!.phases!.length > generateBillPhaseIndex!) {
        const phaseToBill = payment!.phases![generateBillPhaseIndex!];
        // @ts-ignore
        targetPhaseId = phaseToBill._id || undefined;

        const phases = payment!.phases!.map((ph, i) =>
          i === generateBillPhaseIndex
            ? { ...ph, status: "sent" as const, billGeneratedAt: new Date().toISOString(), isGstBill: generateBillGst }
            : ph
        );
        body = { phases };
      } else {
        body = {
          billGeneratedAt: new Date().toISOString(),
          isGstBill: generateBillGst,
          status: "sent",
        };
      }

      // 1. Generate Invoice
      const invRes = await fetch("/api/invoices/from-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: generateBillPaymentId,
          phaseId: targetPhaseId,
          template: "professional"
        }),
      });

      if (!invRes.ok) {
        const d = await invRes.json();
        throw new Error(d.message || "Failed to generate invoice");
      }

      const res = await fetch(`/api/project-payments/${generateBillPaymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to generate bill");
      }
      const data = await res.json();
      setGenerateBillPaymentId(null);
      setGenerateBillPhaseIndex(null);
      setClientPayments((prev) =>
        prev.map((p) =>
          p.id === generateBillPaymentId
            ? {
              ...p,
              phases: data.payment?.phases ?? p.phases,
              billGeneratedAt: data.payment?.billGeneratedAt ?? p.billGeneratedAt,
              isGstBill: data.payment?.isGstBill ?? generateBillGst,
              status: data.payment?.status ?? p.status,
            }
            : p
        )
      );
      toast.success(isPhaseBill ? "Phase bill generated" : "Bill generated");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate bill");
    } finally {
      setGenerateBillSaving(false);
    }
  }

  function openMarkPaidDialog(paymentId: string, phaseIndex: number) {
    const payment = clientPayments.find((p) => p.id === paymentId);
    if (phaseIndex !== -1) {
      const phase = payment?.phases?.[phaseIndex];
      if (phase?.paidDate) {
        const dateStr = typeof phase.paidDate === "string" && phase.paidDate.length >= 10
          ? phase.paidDate.slice(0, 10)
          : new Date(phase.paidDate).toISOString().slice(0, 10);
        setPaidDateInput(dateStr);
      } else {
        setPaidDateInput(new Date().toISOString().slice(0, 10));
      }
    } else {
      if (payment?.paidDate) {
        const dateStr = typeof payment.paidDate === "string" && payment.paidDate.length >= 10
          ? payment.paidDate.slice(0, 10)
          : new Date(payment.paidDate).toISOString().slice(0, 10);
        setPaidDateInput(dateStr);
      } else {
        setPaidDateInput(new Date().toISOString().slice(0, 10));
      }
    }
    setMarkPaidDialogOpen({ paymentId, phaseIndex });
  }

  async function handleMarkPhaseStatus(paymentId: string, phaseIndex: number, status: "paid" | "sent" | "draft", paidDate?: string) {
    const payment = clientPayments.find((p) => p.id === paymentId);
    if (!payment?.phases?.length || phaseIndex >= payment.phases.length) return;
    try {
      const phases = payment.phases.map((ph, i) =>
        i === phaseIndex
          ? { ...ph, status, paidDate: status === "paid" && paidDate ? paidDate : (status === "paid" ? ph.paidDate : undefined) }
          : ph
      );
      const res = await fetch(`/api/project-payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phases }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to update");
      }
      const data = await res.json();
      const updatedPayment = data.payment;
      setClientPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId
            ? { ...p, phases: updatedPayment?.phases ?? p.phases, status: updatedPayment?.status ?? p.status }
            : p
        )
      );
      setViewBillPayment((prev) =>
        prev?.id === paymentId ? { ...prev, phases: updatedPayment?.phases, status: updatedPayment?.status } : prev
      );
      toast.success(status === "paid" ? "Phase marked as paid" : `Phase marked as ${status}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update phase");
    }
  }

  async function handleConfirmMarkPaid() {
    if (!markPaidDialogOpen) return;
    setMarkPaidSaving(true);
    try {
      if (markPaidDialogOpen.phaseIndex !== -1) {
        await handleMarkPhaseStatus(markPaidDialogOpen.paymentId, markPaidDialogOpen.phaseIndex, "paid", paidDateInput);
      } else {
        await handleUpdatePaymentStatus(markPaidDialogOpen.paymentId, "paid", paidDateInput);
      }
      setMarkPaidDialogOpen(null);
      setPaidDateInput("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark as paid");
    } finally {
      setMarkPaidSaving(false);
    }
  }

  function allPhasesPaid(payment: ClientPaymentRow): boolean {
    return !!(payment.phases?.length && payment.phases.every((ph) => ph.status === "paid"));
  }

  async function handleReverseAllPhasesToUnpaid(paymentId: string) {
    const payment = clientPayments.find((p) => p.id === paymentId);
    if (!payment?.phases?.length) return;
    setReversePhasesSavingId(paymentId);
    try {
      const phases = payment.phases.map((ph) => ({ ...ph, status: "sent" as const }));
      const res = await fetch(`/api/project-payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phases }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to update");
      }
      const data = await res.json();
      setClientPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, phases: data.payment?.phases ?? p.phases } : p))
      );
      setViewBillPayment((prev) => (prev?.id === paymentId ? { ...prev, phases: data.payment?.phases } : prev));
      toast.success("All phases set to not paid");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reverse phases");
    } finally {
      setReversePhasesSavingId(null);
    }
  }

  async function handleUpdatePaymentStatus(paymentId: string, status: "paid" | "sent", paidDate?: string) {
    setPaymentStatusSavingId(paymentId);
    try {
      const res = await fetch(`/api/project-payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paidDate: status === "paid" && paidDate ? paidDate : undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to update");
      }
      setClientPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status, paidDate: status === "paid" && paidDate ? paidDate : p.paidDate } : p))
      );
      setViewBillPayment((prev) => (prev?.id === paymentId ? { ...prev, status, paidDate: status === "paid" && paidDate ? paidDate : prev.paidDate } : prev));
      toast.success(status === "paid" ? "Marked as paid" : "Marked as not paid");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setPaymentStatusSavingId(null);
    }
  }

  const filteredPayments = clientPayments.filter((p) => {
    if (paymentFilterProjectId && (p.project?.id !== paymentFilterProjectId)) return false;
    if (paymentFilterStatus) {
      const isFullyPaid = allPhasesPaid(p) || p.status === "paid";
      if (paymentFilterStatus === "paid" && !isFullyPaid) return false;
      if (paymentFilterStatus !== "paid" && p.status !== paymentFilterStatus) return false;
    }
    if (paymentFilterProductId && (p.product?.id !== paymentFilterProductId)) return false;
    return true;
  });

  function getPaymentPaidAmount(p: ClientPaymentRow): number {
    if (p.phases?.length) {
      return p.phases.filter((ph) => ph.status === "paid").reduce((s, ph) => s + Number(ph.amount) || 0, 0);
    }
    return p.status === "paid" ? Number(p.totalAmount) || 0 : 0;
  }
  function getPaymentDueAmount(p: ClientPaymentRow): number {
    if (p.phases?.length) {
      return p.phases.filter((ph) => ph.status !== "paid").reduce((s, ph) => s + Number(ph.amount) || 0, 0);
    }
    return p.status !== "paid" ? Number(p.totalAmount) || 0 : 0;
  }

  const paymentStats = {
    totalBudget: filteredPayments.reduce((s, p) => s + Number(p.totalAmount) || 0, 0),
    paid: filteredPayments.reduce((s, p) => s + getPaymentPaidAmount(p), 0),
    due: filteredPayments.reduce((s, p) => s + getPaymentDueAmount(p), 0),
  };

  function openEditPayment(p: ClientPaymentRow) {
    setEditPaymentForm({
      projectId: p.project?.id ?? "",
      productId: p.product?.id ?? "",
      totalAmount: String(p.totalAmount),
      currency: p.currency ?? "INR",
      billingCycle: p.billingCycle ?? "one_time",
      status: p.status ?? "draft",
      notes: "",
      paidDate: p.paidDate ? (typeof p.paidDate === "string" && p.paidDate.length >= 10 ? p.paidDate.slice(0, 10) : new Date(p.paidDate).toISOString().slice(0, 10)) : "",
      phases: (p.phases ?? []).map((ph) => ({
        _id: (ph as any)._id,
        name: ph.name ?? "",
        percentage: Number(ph.percentage) || 0,
        amount: Number(ph.amount) || 0,
        remark: ph.remark ?? "",
        status: ph.status ?? "draft",
        billGeneratedAt: ph.billGeneratedAt ?? undefined,
        dueDate: ph.dueDate ? (typeof ph.dueDate === "string" && ph.dueDate.length >= 10 ? ph.dueDate.slice(0, 10) : new Date(ph.dueDate).toISOString().slice(0, 10)) : "",
        paidDate: ph.paidDate ? (typeof ph.paidDate === "string" && ph.paidDate.length >= 10 ? ph.paidDate.slice(0, 10) : new Date(ph.paidDate).toISOString().slice(0, 10)) : "",
        isGstBill: ph.isGstBill ?? false,
      })),
      createdAt: p.createdAt ? (typeof p.createdAt === "string" && p.createdAt.length >= 10 ? p.createdAt.slice(0, 10) : new Date(p.createdAt).toISOString().slice(0, 10)) : "",
    });
    setEditingPaymentId(p.id);
  }

  async function handleSaveEditPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPaymentId || !editPaymentForm) return;
    if (!editPaymentForm.totalAmount) {
      toast.error("Amount is required");
      return;
    }
    const totalPct = editPaymentForm.phases.reduce((s, p) => s + (Number(p.percentage) || 0), 0);
    if (totalPct > 100) {
      toast.error("Total of phase percentages cannot exceed 100%");
      return;
    }
    setEditPaymentSaving(true);
    try {
      const res = await fetch(`/api/project-payments/${editingPaymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: editPaymentForm.projectId || null,
          productId: editPaymentForm.productId || null,
          totalAmount: Number(editPaymentForm.totalAmount),
          currency: editPaymentForm.currency,
          billingCycle: editPaymentForm.billingCycle,
          status: editPaymentForm.status,
          notes: editPaymentForm.notes || undefined,
          paidDate: editPaymentForm.paidDate || undefined,
          phases: editPaymentForm.phases.length > 0 ? editPaymentForm.phases : undefined,
          createdAt: editPaymentForm.createdAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update");
      const u = data.payment;
      setClientPayments((prev) =>
        prev.map((p) =>
          p.id === editingPaymentId
            ? {
              ...p,
              project: u.project ?? null,
              product: u.product ?? null,
              totalAmount: u.totalAmount,
              currency: u.currency ?? "INR",
              billingCycle: u.billingCycle ?? "one_time",
              status: u.status ?? p.status,
              paidDate: u.paidDate ?? null,
              phases: Array.isArray(u.phases) ? u.phases : [],
            }
            : p
        )
      );
      setViewBillPayment((prev) => (prev?.id === editingPaymentId ? { ...prev, ...data.payment } : prev));
      setEditingPaymentId(null);
      setEditPaymentForm(null);
      toast.success("Payment updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment");
    } finally {
      setEditPaymentSaving(false);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    setDeletingPaymentId(paymentId);
    try {
      const res = await fetch(`/api/project-payments/${paymentId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to delete");
      }
      setClientPayments((prev) => prev.filter((p) => p.id !== paymentId));
      setDeleteConfirmPaymentId(null);
      setViewBillPayment((prev) => (prev?.id === paymentId ? null : prev));
      setEditingPaymentId((prev) => (prev === paymentId ? null : prev));
      toast.success("Payment deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete payment");
    } finally {
      setDeletingPaymentId(null);
    }
  }

  function updateEditPhase(index: number, field: keyof PaymentPhase, value: string | number) {
    if (!editPaymentForm) return;
    const total = Number(editPaymentForm.totalAmount) || 0;
    setEditPaymentForm((f) => {
      if (!f) return f;
      const next = f.phases.map((p, i) => (i !== index ? p : { ...p, [field]: value }));
      const phase = next[index];
      if (phase && total > 0) {
        if (field === "percentage") {
          const pct = Number(value) || 0;
          next[index] = { ...phase, amount: Math.round((total * pct) / 100) };
        } else if (field === "amount") {
          const amt = Number(value) || 0;
          next[index] = { ...phase, percentage: total ? Math.round((amt / total) * 1000) / 10 : 0 };
        }
      }
      return { ...f, phases: next };
    });
  }

  function addEditPhase() {
    if (!editPaymentForm) return;
    const nextNum = editPaymentForm.phases.length + 1;
    setEditPaymentForm((f) =>
      f
        ? {
          ...f,
          phases: [...f.phases, { name: `Phase ${nextNum}`, percentage: 0, amount: 0, remark: "", dueDate: "" }],
        }
        : f
    );
  }

  function removeEditPhase(index: number) {
    setEditPaymentForm((f) => (f ? { ...f, phases: f.phases.filter((_, i) => i !== index) } : f));
  }

  const editPhasesTotalPercent = editPaymentForm?.phases.reduce((s, p) => s + (Number(p.percentage) || 0), 0) ?? 0;

  async function handleDeleteProject(projectId: string) {
    setDeletingProjectId(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to delete");
      }
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setDeleteProjectId(null);
      toast.success("Project deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete project");
    } finally {
      setDeletingProjectId(null);
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="min-w-0">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="tax" className="gap-2">
            <Receipt className="h-4 w-4" />
            Tax
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Add payment dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add payment</DialogTitle>
            <DialogDescription>
              Create a payment for this client. Optionally link to a project.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Select
                value={paymentForm.projectId || "none"}
                onValueChange={(v) => setPaymentForm((f) => ({ ...f, projectId: v === "none" ? "" : v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.filter((p) => p.status !== "completed").map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Associate with product / service</Label>
              <Select
                value={paymentForm.productId || "none"}
                onValueChange={(v) => setPaymentForm((f) => ({ ...f, productId: v === "none" ? "" : v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {products.map((pr) => (
                    <SelectItem key={pr.id} value={pr.id}>
                      {pr.name} ({pr.kind})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Link this payment to a product or service for revenue reporting on the dashboard.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={paymentForm.totalAmount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, totalAmount: e.target.value }))}
                  placeholder="0"
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={paymentForm.currency}
                  onValueChange={(v) => setPaymentForm((f) => ({ ...f, currency: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Created date (optional)</Label>
                <Input
                  type="date"
                  value={paymentForm.createdAt}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, createdAt: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Paid date (optional)</Label>
                <Input
                  type="date"
                  value={paymentForm.paidDate}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, paidDate: e.target.value }))}
                  className="rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground">Used for historic revenue attribution.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Billing cycle</Label>
                <Select
                  value={paymentForm.billingCycle}
                  onValueChange={(v) => setPaymentForm((f) => ({ ...f, billingCycle: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={paymentForm.status}
                  onValueChange={(v) => setPaymentForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base">Phases (optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1 h-8"
                  onClick={addPaymentPhase}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add phase
                </Button>
              </div>
              {paymentForm.phases.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No phases. Add a phase breakdown if needed.</p>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[100px]">Phase</TableHead>
                        <TableHead className="w-[70px]">%</TableHead>
                        <TableHead className="w-[100px]">Amount</TableHead>
                        <TableHead>Remark</TableHead>
                        <TableHead className="w-[120px]">Due date</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentForm.phases.map((phase, index) => (
                        <TableRow key={index}>
                          <TableCell className="p-1.5">
                            <Input
                              value={phase.name}
                              onChange={(e) => updatePaymentPhase(index, "name", e.target.value)}
                              placeholder="Phase 1"
                              className="h-8 rounded-lg text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              value={phase.percentage || ""}
                              onChange={(e) => updatePaymentPhase(index, "percentage", e.target.value)}
                              className="h-8 rounded-lg w-16 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={phase.amount || ""}
                              onChange={(e) => updatePaymentPhase(index, "amount", e.target.value)}
                              className="h-8 rounded-lg w-24 text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Input
                              value={phase.remark}
                              onChange={(e) => updatePaymentPhase(index, "remark", e.target.value)}
                              placeholder="Remark"
                              className="h-8 rounded-lg text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Input
                              type="date"
                              value={typeof phase.dueDate === "string" && phase.dueDate.length >= 10 ? phase.dueDate.slice(0, 10) : (phase.dueDate ? new Date(phase.dueDate).toISOString().slice(0, 10) : "")}
                              onChange={(e) => updatePaymentPhase(index, "dueDate", e.target.value)}
                              className="h-8 rounded-lg text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removePaymentPhase(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {paymentForm.phases.length > 0 && (
                <p className={`text-xs ${getPhasesTotalPercent() > 100 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  Total: {getPhasesTotalPercent().toFixed(1)}%
                  {getPhasesTotalPercent() > 100 && " ~ cannot exceed 100%"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
                className="rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={paymentSaving || getPhasesTotalPercent() > 100}
                className="rounded-xl"
              >
                {paymentSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate bill dialog */}
      <Dialog open={!!generateBillPaymentId} onOpenChange={(open) => { if (!open) { setGenerateBillPaymentId(null); setGenerateBillPhaseIndex(null); } }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {generateBillPhaseIndex !== null && clientPayments.find((x) => x.id === generateBillPaymentId)?.phases?.[generateBillPhaseIndex]
                ? `Generate bill ~ ${clientPayments.find((x) => x.id === generateBillPaymentId)!.phases![generateBillPhaseIndex].name}`
                : "Generate bill"}
            </DialogTitle>
            <DialogDescription>
              {generateBillPhaseIndex !== null ? "Generate bill for this phase only. Bill details from company settings." : "Bill details will be taken from company settings. Choose whether this is a GST bill."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Issue as GST bill?</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={generateBillGst === true}
                    onChange={() => setGenerateBillGst(true)}
                    className="rounded-full"
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={generateBillGst === false}
                    onChange={() => setGenerateBillGst(false)}
                    className="rounded-full"
                  />
                  No
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGenerateBillPaymentId(null)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleGenerateBill}
                disabled={generateBillSaving}
                className="rounded-xl"
              >
                {generateBillSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate bill
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View bill dialog */}
      <Dialog open={!!viewBillPayment} onOpenChange={(open) => !open && setViewBillPayment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Bill</DialogTitle>
            <DialogDescription>
              {viewBillPayment?.isGstBill ? "GST Invoice" : "Bill"} ~ generated from company settings
            </DialogDescription>
          </DialogHeader>
          {viewBillPayment && (
            <div className="space-y-6 py-2 text-sm">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">From</p>
                  <p className="font-medium">{companyProfile?.companyName || companyProfile?.legalName || "~"}</p>
                  {companyProfile?.companyDetails?.address && <p className="text-muted-foreground">{companyProfile.companyDetails.address}</p>}
                  {companyProfile?.companyDetails?.city && (
                    <p className="text-muted-foreground">
                      {[companyProfile.companyDetails.city, companyProfile.companyDetails.state, companyProfile.companyDetails.zip].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {viewBillPayment.isGstBill && companyProfile?.taxDetails?.gstNumber && (
                    <p className="text-muted-foreground mt-1">GSTIN: {companyProfile.taxDetails.gstNumber}</p>
                  )}
                  {viewBillPayment.isGstBill && companyProfile?.taxDetails?.panNumber && (
                    <p className="text-muted-foreground">PAN: {companyProfile.taxDetails.panNumber}</p>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">Bill To</p>
                  <p className="font-medium">{client.companyName}</p>
                  {client.companyAddress && <p className="text-muted-foreground">{client.companyAddress}</p>}
                  {viewBillPayment.isGstBill && client.gstin && <p className="text-muted-foreground mt-1">GSTIN: {client.gstin}</p>}
                  {viewBillPayment.isGstBill && client.pan && <p className="text-muted-foreground">PAN: {client.pan}</p>}
                </div>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-2">Amount</p>
                <p className="text-xl font-semibold">{formatRupeeAmount(viewBillPayment.totalAmount, viewBillPayment.currency)}</p>
                {viewBillPayment.project && <p className="text-muted-foreground">Project: {viewBillPayment.project.name}</p>}
              </div>
              {viewBillPayment.phases && viewBillPayment.phases.length > 0 && (
                <div>
                  <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-2">Phase breakdown</p>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Phase</TableHead>
                        <TableHead>%</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Remark</TableHead>
                        <TableHead>Due date</TableHead>
                        <TableHead>Paid date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewBillPayment.phases.map((ph: PaymentPhase, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{ph.name || "~"}</TableCell>
                          <TableCell>{ph.percentage != null ? `${Number(ph.percentage).toLocaleString("en-IN")}%` : "~"}</TableCell>
                          <TableCell>{formatRupeeAmount(ph.amount, viewBillPayment.currency)}</TableCell>
                          <TableCell className="text-muted-foreground">{ph.remark || "~"}</TableCell>
                          <TableCell>{ph.dueDate ? new Date(ph.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "~"}</TableCell>
                          <TableCell>{ph.paidDate ? new Date(ph.paidDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "~"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {viewBillPayment.billGeneratedAt && (
                <p className="text-muted-foreground text-xs">
                  Bill generated on {new Date(viewBillPayment.billGeneratedAt).toLocaleString()}
                </p>
              )}
              {isAdmin && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant={viewBillPayment.status === "paid" ? "default" : "outline"}
                    onClick={() => openMarkPaidDialog(viewBillPayment.id, -1)}
                    disabled={paymentStatusSavingId === viewBillPayment.id}
                    className="rounded-xl gap-1"
                  >
                    {paymentStatusSavingId === viewBillPayment.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    {viewBillPayment.status === "paid" ? "Edit paid date" : "Mark as Paid"}
                  </Button>
                  <Button
                    size="sm"
                    variant={viewBillPayment.status !== "paid" ? "default" : "outline"}
                    onClick={() => handleUpdatePaymentStatus(viewBillPayment.id, "sent")}
                    disabled={paymentStatusSavingId === viewBillPayment.id}
                    className="rounded-xl"
                  >
                    Mark as Not paid
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit payment dialog */}
      <Dialog open={!!editingPaymentId && !!editPaymentForm} onOpenChange={(open) => !open && (setEditingPaymentId(null), setEditPaymentForm(null))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit payment</DialogTitle>
            <DialogDescription>Update payment details and phases.</DialogDescription>
          </DialogHeader>
          {editPaymentForm && (
            <form onSubmit={handleSaveEditPayment} className="space-y-4">
              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Select
                  value={editPaymentForm.projectId || "none"}
                  onValueChange={(v) => setEditPaymentForm((f) => (f ? { ...f, projectId: v === "none" ? "" : v } : f))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.filter((p) => p.status !== "completed").map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Associate with product / service</Label>
                <Select
                  value={editPaymentForm.productId || "none"}
                  onValueChange={(v) => setEditPaymentForm((f) => (f ? { ...f, productId: v === "none" ? "" : v } : f))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {products.map((pr) => (
                      <SelectItem key={pr.id} value={pr.id}>
                        {pr.name} ({pr.kind})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Link to a product or service for revenue reporting.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editPaymentForm.totalAmount}
                    onChange={(e) => setEditPaymentForm((f) => (f ? { ...f, totalAmount: e.target.value } : f))}
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={editPaymentForm.currency}
                    onValueChange={(v) => setEditPaymentForm((f) => (f ? { ...f, currency: v } : f))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Billing cycle</Label>
                  <Select
                    value={editPaymentForm.billingCycle}
                    onValueChange={(v) => setEditPaymentForm((f) => (f ? { ...f, billingCycle: v } : f))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_CYCLES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editPaymentForm.status}
                    onValueChange={(v) => setEditPaymentForm((f) => (f ? { ...f, status: v } : f))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Created date (optional)</Label>
                  <Input
                    type="date"
                    value={editPaymentForm.createdAt}
                    onChange={(e) => setEditPaymentForm((f) => (f ? { ...f, createdAt: e.target.value } : f))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Paid date (optional)</Label>
                  <Input
                    type="date"
                    value={editPaymentForm.paidDate}
                    onChange={(e) => setEditPaymentForm((f) => (f ? { ...f, paidDate: e.target.value } : f))}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Phases</Label>
                  <Button type="button" variant="outline" size="sm" className="rounded-xl h-8" onClick={addEditPhase}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add phase
                  </Button>
                </div>
                {editPaymentForm.phases.length > 0 && (
                  <>
                    <div className="rounded-xl border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[100px]">Phase</TableHead>
                            <TableHead className="w-[70px]">%</TableHead>
                            <TableHead className="w-[100px]">Amount</TableHead>
                            <TableHead>Remark</TableHead>
                            <TableHead className="w-[120px]">Due date</TableHead>
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editPaymentForm.phases.map((phase, index) => (
                            <TableRow key={index}>
                              <TableCell className="p-1.5">
                                <Input
                                  value={phase.name}
                                  onChange={(e) => updateEditPhase(index, "name", e.target.value)}
                                  className="h-8 rounded-lg text-sm"
                                />
                              </TableCell>
                              <TableCell className="p-1.5">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.1}
                                  value={phase.percentage || ""}
                                  onChange={(e) => updateEditPhase(index, "percentage", e.target.value)}
                                  className="h-8 rounded-lg w-16 text-sm"
                                />
                              </TableCell>
                              <TableCell className="p-1.5">
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={phase.amount || ""}
                                  onChange={(e) => updateEditPhase(index, "amount", e.target.value)}
                                  className="h-8 rounded-lg w-24 text-sm"
                                />
                              </TableCell>
                              <TableCell className="p-1.5">
                                <Input
                                  value={phase.remark}
                                  onChange={(e) => updateEditPhase(index, "remark", e.target.value)}
                                  className="h-8 rounded-lg text-sm"
                                />
                              </TableCell>
                              <TableCell className="p-1.5">
                                <Input
                                  type="date"
                                  value={typeof phase.dueDate === "string" ? phase.dueDate.slice(0, 10) : ""}
                                  onChange={(e) => updateEditPhase(index, "dueDate", e.target.value)}
                                  className="h-8 rounded-lg text-sm"
                                />
                              </TableCell>
                              <TableCell className="p-1.5">
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeEditPhase(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className={`text-xs ${editPhasesTotalPercent > 100 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      Total: {editPhasesTotalPercent.toFixed(1)}% {editPhasesTotalPercent > 100 && "~ cannot exceed 100%"}
                    </p>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={editPaymentForm.notes}
                  onChange={(e) => setEditPaymentForm((f) => (f ? { ...f, notes: e.target.value } : f))}
                  placeholder="Optional"
                  className="rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => (setEditingPaymentId(null), setEditPaymentForm(null))} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={editPaymentSaving || editPhasesTotalPercent > 100} className="rounded-xl">
                  {editPaymentSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete payment confirm */}
      <Dialog open={!!deleteConfirmPaymentId} onOpenChange={(open) => !open && setDeleteConfirmPaymentId(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete payment</DialogTitle>
            <DialogDescription>This action cannot be undone. Are you sure you want to delete this payment?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmPaymentId(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmPaymentId && handleDeletePayment(deleteConfirmPaymentId)}
              disabled={!!deletingPaymentId}
              className="rounded-xl"
            >
              {deletingPaymentId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark paid dialog */}
      <Dialog open={!!markPaidDialogOpen} onOpenChange={(open) => !open && setMarkPaidDialogOpen(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {markPaidDialogOpen && markPaidDialogOpen.phaseIndex !== -1 ? "Mark phase as paid" : "Mark payment as paid"}
            </DialogTitle>
            <DialogDescription>
              Set the date when this {markPaidDialogOpen && markPaidDialogOpen.phaseIndex !== -1 ? "phase" : "payment"} was paid. You can set a past date if the payment was made earlier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Paid date</Label>
              <Input
                type="date"
                value={paidDateInput}
                onChange={(e) => setPaidDateInput(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMarkPaidDialogOpen(null)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleConfirmMarkPaid}
                disabled={markPaidSaving || !paidDateInput}
                className="rounded-xl"
              >
                {markPaidSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {markPaidDialogOpen && clientPayments.find((p) => p.id === markPaidDialogOpen.paymentId)?.phases?.[markPaidDialogOpen.phaseIndex]?.status === "paid"
                  ? "Update paid date"
                  : "Mark as paid"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete project confirm */}
      <Dialog open={!!deleteProjectId} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to delete &quot;{projects.find((x) => x.id === deleteProjectId)?.name ?? "this project"}&quot;?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteProjectId(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteProjectId && handleDeleteProject(deleteProjectId)}
              disabled={!!deletingProjectId}
              className="rounded-xl"
            >
              {deletingProjectId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TabsContent value="personal" className="mt-0">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
            <CardDescription>Contact person information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  defaultValue={client.name}
                  onBlur={(e) => isAdmin && e.target.value !== client.name && handleSavePersonal({ name: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  defaultValue={client.email}
                  onBlur={(e) => isAdmin && e.target.value !== client.email && handleSavePersonal({ email: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  defaultValue={client.phone || ""}
                  onBlur={(e) => isAdmin && handleSavePersonal({ phone: e.target.value || undefined })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input
                  defaultValue={client.designation || ""}
                  onBlur={(e) => isAdmin && handleSavePersonal({ designation: e.target.value || undefined })}
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="company" className="mt-0">
        <Card>
          <CardHeader>
            <CardTitle>Company details</CardTitle>
            <CardDescription>Company information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Company name</Label>
                <Input
                  defaultValue={client.companyName}
                  onBlur={(e) => isAdmin && handleSavePersonal({ companyName: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Textarea
                  defaultValue={client.companyAddress || ""}
                  onBlur={(e) => isAdmin && handleSavePersonal({ companyAddress: e.target.value || undefined })}
                  disabled={!isAdmin}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  defaultValue={client.companyPhone || ""}
                  onBlur={(e) => isAdmin && handleSavePersonal({ companyPhone: e.target.value || undefined })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  defaultValue={client.companyWebsite || ""}
                  onBlur={(e) => isAdmin && handleSavePersonal({ companyWebsite: e.target.value || undefined })}
                  disabled={!isAdmin}
                  placeholder="https://"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tax" className="mt-0">
        <Card>
          <CardHeader>
            <CardTitle>Tax details</CardTitle>
            <CardDescription>GSTIN, PAN and tax address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input
                  defaultValue={client.gstin || ""}
                  onBlur={(e) => isAdmin && handleSavePersonal({ gstin: e.target.value || undefined })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>PAN</Label>
                <Input
                  defaultValue={client.pan || ""}
                  onBlur={(e) => isAdmin && handleSavePersonal({ pan: e.target.value || undefined })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Tax / Billing address</Label>
                <Textarea
                  defaultValue={client.taxAddress || ""}
                  onBlur={(e) => isAdmin && handleSavePersonal({ taxAddress: e.target.value || undefined })}
                  disabled={!isAdmin}
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="projects" className="mt-0">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Projects</CardTitle>
              <CardDescription>Projects associated with this client</CardDescription>
            </div>
            {isAdmin && (
              <Button size="sm" asChild>
                <Link href={`/dashboard/projects/clients/${clientId}/projects/new`}>
                  <Plus className="h-4 w-4 mr-2" /> New project
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!loading && projects.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {PROJECT_STATUS_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value || "all"}
                    variant={projectStatusFilter === opt.value ? "default" : "outline"}
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setProjectStatusFilter(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            )}
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {projects
                  .filter((p) => !projectStatusFilter || p.status === projectStatusFilter)
                  .map((p) => (
                    <ProjectFolderCard
                      key={p.id}
                      id={p.id}
                      clientId={clientId}
                      clientName={client.companyName}
                      name={p.name}
                      status={p.status}
                      endDate={p.endDate ?? null}
                      totalMonths={projectTotalMonths(p.startDate, p.endDate)}
                      monthlyRecurringCost={0}
                      onEdit={() => router.push(`/dashboard/projects/clients/${clientId}/projects/${p.id}`)}
                      onDelete={isAdmin ? (() => setDeleteProjectId(p.id)) : undefined}
                      isPinned={p.isPinned}
                      isPinnedToSidebar={p.isPinnedToSidebar}
                    />
                  ))}
              </div>
            )}
            {!loading && projects.length > 0 && projectStatusFilter && projects.filter((p) => p.status === projectStatusFilter).length === 0 && (
              <p className="text-sm text-muted-foreground">No projects with this status.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payments" className="mt-0">
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>
              Payments for this client. Create project-linked or general payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isAdmin && (
              <Button type="button" onClick={openAddPayment} className="rounded-xl gap-2">
                <Plus className="h-4 w-4" />
                Add payment
              </Button>
            )}

            {!paymentsLoading && clientPayments.length > 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment total</p>
                    <p className="text-xl font-semibold mt-1 tabular-nums">{formatRupeeAmount(paymentStats.totalBudget, "INR")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sum of all filtered payments</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paid</p>
                    <p className="text-xl font-semibold mt-1 text-green-600 tabular-nums">{formatRupeeAmount(paymentStats.paid, "INR")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Status: Paid</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due</p>
                    <p className="text-xl font-semibold mt-1 text-amber-600 tabular-nums">{formatRupeeAmount(paymentStats.due, "INR")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Draft / Sent / Overdue</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Label className="text-muted-foreground text-sm">Filters</Label>
                  <Select value={paymentFilterProjectId || "all"} onValueChange={(v) => setPaymentFilterProjectId(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[180px] rounded-xl">
                      <SelectValue placeholder="Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All projects</SelectItem>
                      {projects.filter((p) => p.status !== "completed").map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                      {projects.length === 0 && <SelectItem value="none" disabled>No projects</SelectItem>}
                    </SelectContent>
                  </Select>
                  <Select value={paymentFilterStatus || "all"} onValueChange={(v) => setPaymentFilterStatus(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[140px] rounded-xl">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {PAYMENT_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={paymentFilterProductId || "all"} onValueChange={(v) => setPaymentFilterProductId(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[180px] rounded-xl">
                      <SelectValue placeholder="Product / Service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All products / services</SelectItem>
                      {products.map((pr) => (
                        <SelectItem key={pr.id} value={pr.id}>
                          {pr.name} ({pr.kind})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => (setPaymentFilterProjectId(""), setPaymentFilterStatus(""), setPaymentFilterProductId(""))}
                  >
                    Include all
                  </Button>
                </div>
              </>
            )}

            {paymentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : clientPayments.length === 0 ? (
              <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
                No payments yet. {isAdmin && "Click \"Add payment\" to create one."}
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
                No payments match the current filters. Try &quot;Include all&quot; to clear filters.
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                {filteredPayments.some((p) => p.phases && p.phases.length > 0) && (
                  <div className="flex items-center justify-end gap-2 px-3 py-2 border-b bg-muted/20">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPhasePaymentIds(
                          new Set(filteredPayments.filter((p) => p.phases?.length).map((p) => p.id))
                        )
                      }
                      className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Expand all
                    </button>
                    <span className="text-muted-foreground/50">|</span>
                    <button
                      type="button"
                      onClick={() => setExpandedPhasePaymentIds(new Set())}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Collapse all
                    </button>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Project</TableHead>
                      <TableHead>Product / Service</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((p) => {
                      const hasPhases = p.phases && p.phases.length > 0;
                      const isPhaseOpen = expandedPhasePaymentIds.has(p.id);
                      return (
                        <Fragment key={p.id}>
                          <TableRow className={hasPhases ? "group" : ""}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {hasPhases && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                    onClick={() =>
                                      setExpandedPhasePaymentIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(p.id)) next.delete(p.id);
                                        else next.add(p.id);
                                        return next;
                                      })
                                    }
                                    aria-label={isPhaseOpen ? "Close phase breakdown" : "Open phase breakdown"}
                                  >
                                    <ChevronDown
                                      className={`h-4 w-4 transition-transform duration-200 ${isPhaseOpen ? "rotate-180" : ""}`}
                                    />
                                  </Button>
                                )}
                                <span className="min-w-0">
                                  {p.project ? (
                                    <Link
                                      href={`/dashboard/projects/clients/${clientId}/projects/${p.project.id}`}
                                      className="text-primary hover:underline"
                                    >
                                      {p.project.name}
                                    </Link>
                                  ) : (
                                    "~"
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {p.product ? `${p.product.name} (${p.product.kind})` : "~"}
                            </TableCell>
                            <TableCell className="font-medium tabular-nums">
                              {formatRupeeAmount(p.totalAmount, p.currency)}
                            </TableCell>
                            <TableCell>
                              {BILLING_CYCLES.find((c) => c.value === p.billingCycle)?.label ?? p.billingCycle}
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  allPhasesPaid(p) || p.status === "paid"
                                    ? "text-green-600 dark:text-green-400 font-medium"
                                    : p.status === "overdue"
                                      ? "text-red-600"
                                      : ""
                                }
                              >
                                {allPhasesPaid(p) || p.status === "paid"
                                  ? "Completed"
                                  : (PAYMENT_STATUS_OPTIONS.find((s) => s.value === p.status)?.label ?? p.status)}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "~"}
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                  {p.phases && p.phases.length > 0 ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="rounded-xl h-8"
                                      onClick={() => setViewBillPayment(p)}
                                    >
                                      View
                                    </Button>
                                  ) : !p.billGeneratedAt ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="rounded-xl h-8"
                                      onClick={() => { setGenerateBillPaymentId(p.id); setGenerateBillPhaseIndex(null); }}
                                    >
                                      Generate bill
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="rounded-xl h-8"
                                      onClick={() => setViewBillPayment(p)}
                                    >
                                      View bill
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="rounded-xl h-8"
                                    onClick={() => openEditPayment(p)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="rounded-xl h-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteConfirmPaymentId(p.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                          {hasPhases && isPhaseOpen && (
                            <TableRow>
                              <TableCell colSpan={isAdmin ? 7 : 6} className="bg-muted/30 p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phase breakdown</p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs rounded-lg text-muted-foreground hover:text-foreground -mr-1"
                                    onClick={() =>
                                      setExpandedPhasePaymentIds((prev) => {
                                        const next = new Set(prev);
                                        next.delete(p.id);
                                        return next;
                                      })
                                    }
                                  >
                                    <ChevronDown className="h-3.5 w-3.5 rotate-180 mr-1" />
                                    Close
                                  </Button>
                                </div>
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent border-0">
                                      <TableHead className="w-[100px] h-8">Phase</TableHead>
                                      <TableHead className="w-[70px] h-8">%</TableHead>
                                      <TableHead className="w-[100px] h-8">Amount</TableHead>
                                      <TableHead className="h-8">Remark</TableHead>
                                      <TableHead className="w-[100px] h-8">Due date</TableHead>
                                      <TableHead className="w-[100px] h-8">Paid date</TableHead>
                                      <TableHead className="w-[80px] h-8">Status</TableHead>
                                      {isAdmin && <TableHead className="w-[180px] h-8">Actions</TableHead>}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(p.phases ?? []).map((ph: PaymentPhase, i: number) => {
                                      const dueAlert = getPhaseDueAlert(ph);
                                      const dueStr = ph.dueDate
                                        ? new Date(ph.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                        : "~";
                                      return (
                                        <TableRow key={i} className={dueAlert ? "bg-amber-50/50 dark:bg-amber-950/20 border-l-2 border-l-amber-500" : "border-0"}>
                                          <TableCell className="py-1 text-sm">{ph.name || "~"}</TableCell>
                                          <TableCell className="py-1 text-sm">
                                            {ph.percentage != null && !Number.isNaN(Number(ph.percentage))
                                              ? `${Number(ph.percentage).toLocaleString("en-IN")}%`
                                              : "~"}
                                          </TableCell>
                                          <TableCell className="py-1 text-sm tabular-nums">{formatRupeeAmount(ph.amount, p.currency)}</TableCell>
                                          <TableCell className="py-1 text-sm text-muted-foreground">{ph.remark || "~"}</TableCell>
                                          <TableCell className="py-1 text-sm">
                                            <div className="flex flex-col gap-0.5">
                                              <span className="tabular-nums">{dueStr}</span>
                                              {dueAlert === "overdue" && (
                                                <span className="inline-flex items-center rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
                                                  Overdue
                                                </span>
                                              )}
                                              {dueAlert === "due_soon" && (
                                                <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                  Due in ≤5 days
                                                </span>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="py-1 text-sm">
                                            {ph.paidDate
                                              ? new Date(ph.paidDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                              : "~"}
                                          </TableCell>
                                          <TableCell className="py-1 text-sm">
                                            <span className={ph.status === "paid" ? "text-green-600" : ph.status === "sent" ? "text-amber-600" : ""}>
                                              {PAYMENT_STATUS_OPTIONS.find((s) => s.value === (ph.status ?? "draft"))?.label ?? (ph.status ?? "Draft")}
                                            </span>
                                          </TableCell>
                                          {isAdmin && (
                                            <TableCell className="py-1">
                                              {!ph.billGeneratedAt ? (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-7 text-xs rounded-lg"
                                                  onClick={() => { setGenerateBillPaymentId(p.id); setGenerateBillPhaseIndex(i); }}
                                                >
                                                  Generate bill
                                                </Button>
                                              ) : (
                                                <>
                                                  {ph.status === "paid" ? (
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="h-7 text-xs rounded-lg"
                                                      onClick={() => openMarkPaidDialog(p.id, i)}
                                                    >
                                                      Edit paid date
                                                    </Button>
                                                  ) : (
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="h-7 text-xs rounded-lg"
                                                      onClick={() => openMarkPaidDialog(p.id, i)}
                                                    >
                                                      Mark paid
                                                    </Button>
                                                  )}
                                                </>
                                              )}
                                            </TableCell>
                                          )}
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                                {isAdmin && allPhasesPaid(p) && (
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                      Paid full
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs rounded-lg gap-1"
                                      onClick={() => handleReverseAllPhasesToUnpaid(p.id)}
                                      disabled={reversePhasesSavingId === p.id}
                                    >
                                      {reversePhasesSavingId === p.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <RotateCcw className="h-3.5 w-3.5" />
                                      )}
                                      Reverse to not paid
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
