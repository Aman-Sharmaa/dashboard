"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, FileText, Eye, Edit, Trash2, MoreHorizontal, Printer, Download,
  Search, Filter, ArrowLeft, ArrowRight, Save, Loader2, Copy, Send,
  FileSpreadsheet, Settings, X, ChevronDown, ChevronUp, Check,
  CheckCircle, ExternalLink, AlertCircle, RotateCcw, Receipt, DollarSign,
  MapPin, Globe, IndianRupee
} from "lucide-react";
import { toast } from "sonner";
import {
  InvoiceData, InvoiceRenderer, LineItem, InvoiceTax,
  fmt, statusColor, amountInWordsForCurrency,
} from "@/components/invoice-templates";
import {
  NATIONAL_CURRENCY,
  INTERNATIONAL_CURRENCIES,
  defaultInternationalCurrency,
  formatCurrencyLabel,
  isInternationalCurrency,
  getCurrencySymbol,
} from "@/lib/currencies";
import { buildInvoiceNumber } from "@/lib/invoice-number";

interface ClientData { id: string; name: string; companyName: string; email: string; companyAddress: string; gstin: string; pan: string; phone: string; clientRegion?: "national" | "international"; }
interface ProjectData { id: string; name: string; clientId: string; clientName: string; status: string; }
interface PaymentData {
  id: string; client: { id: string; name: string; companyName: string };
  project: { id: string; name: string } | null; totalAmount: number;
  currency: string; billingCycle: string;
  phases: { _id: string; name: string; amount: number; percentage: number; status: string }[];
  monthlyBreakdown: { month: string; amount: number }[];
  status: string; createdAt: string;
}

interface Props {
  invoices: InvoiceData[]; clients: ClientData[]; projects: ProjectData[];
  companyProfile: any; payments: PaymentData[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildSender(profile: any, mode: string) {
  const s = profile?.invoiceSettings || {};
  return {
    name: mode === "personal" ? (s.personalName || profile?.personalDetails?.contactName || "") : (profile?.companyName || ""),
    address: [profile?.companyDetails?.address, profile?.companyDetails?.city, profile?.companyDetails?.state, profile?.companyDetails?.zip].filter(Boolean).join(", "),
    email: profile?.personalDetails?.email || "",
    phone: profile?.personalDetails?.phone || "",
    pan: profile?.taxDetails?.panNumber || "",
    gstNumber: profile?.taxDetails?.gstNumber || "",
    location: profile?.companyDetails?.city || "",
  };
}

function buildBank(profile: any) {
  return {
    accountHolderName: profile?.bankDetails?.accountHolderName || "",
    accountNumber: profile?.bankDetails?.accountNumber || "",
    bankName: "", bankBranch: "", bankAddress: "",
    ifscCode: profile?.bankDetails?.ifscCode || "",
    panCardNo: profile?.taxDetails?.panNumber || "",
    swiftCode: "",
  };
}

function freshForm(profile: any) {
  const s = profile?.invoiceSettings || {};
  const mode = s.senderMode || "company";
  const defaultHsn = s.defaultHsn || "";
  return {
    invoiceNumber: "", invoiceDate: new Date().toISOString().split("T")[0],
    template: s.defaultTemplate || "professional", invoiceType: "single" as string,
    invoiceDocumentType: "invoice" as "invoice" | "proforma",
    senderMode: mode, category: s.defaultCategory || "", uin: s.defaultUin || "",
    sender: buildSender(profile, mode),
    recipient: { name: "", companyName: "", address: "", email: "", gstin: "", pan: "" },
    toCompanyName: "", toCompanyAddress: "",
    clientId: "", projectId: "", paymentId: "", phaseId: "", month: "",
    clientRegion: "national" as "national" | "international",
    currency: NATIONAL_CURRENCY,
    lineItems: [{ description: "", hsn: defaultHsn, rate: 0, quantity: 1, amount: 0 }] as LineItem[],
    enableGst: true, gstType: "intrastate" as string, gstRate: 18,
    discount: 0, roundOff: 0, purpose: "",
    notes: s.defaultNotes || "", periodFrom: "", periodTo: "", dueDate: "",
    signatureNote: s.defaultSignatureNote || "",
    taxDisclaimer: s.defaultTaxDisclaimer || "You shall be solely responsible for any and all taxes, retirement contributions or payments, disability insurance, unemployment taxes, and other statutory payroll type taxes applicable to this compensation.",
    bankDetails: buildBank(profile),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function InvoicesPageClient({ invoices: initialInvoices, clients, projects, companyProfile, payments }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab") || "list";
  const editId = searchParams?.get("edit");
  const viewId = searchParams?.get("view");
  const fromPayment = searchParams?.get("fromPayment");

  const [invoices, setInvoices] = useState(initialInvoices);
  const [activeTab, setActiveTab] = useState(editId ? "create" : viewId ? "view" : tabParam);
  const [form, setForm] = useState<any>(freshForm(companyProfile));
  const [editingId, setEditingId] = useState<string | null>(editId || null);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceData | null>(null);
  const [saving, setSaving] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [gstFilter, setGstFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState<string | null>(null);
  const [paidDateInput, setPaidDateInput] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Series dialog state
  const [editSeriesDialogOpen, setEditSeriesDialogOpen] = useState<string | null>(null);
  const [editSeriesData, setEditSeriesData] = useState<{ prefix: string; serial: string; region: "national" | "international" }>({ prefix: "", serial: "", region: "national" });
  const [savingSeries, setSavingSeries] = useState(false);
  const [step, setStep] = useState(1); // 1=basics, 2=items, 3=review
  const [showAdvanced, setShowAdvanced] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Create Flow dialog state
  const [createFlowOpen, setCreateFlowOpen] = useState(false);
  const [createFlowStep, setCreateFlowStep] = useState(1);
  const [createFlowData, setCreateFlowData] = useState<{region: "national"|"international", currency: string, withGst: boolean}>({region: "national", currency: NATIONAL_CURRENCY, withGst: true});

  // List primary tab state
  const [listPrimaryTab, setListPrimaryTab] = useState("gst");

  // Record Payment dialog state
  const [recordPaymentDialogOpen, setRecordPaymentDialogOpen] = useState<string | null>(null);
  const [recordPaymentAmount, setRecordPaymentAmount] = useState("");
  const [recordPaymentDate, setRecordPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Settings
  const [settings, setSettings] = useState<any>(companyProfile?.invoiceSettings || {});
  const [savingSettings, setSavingSettings] = useState(false);

  const suggestedInvoiceNumber = useMemo(() => {
    const region = form.clientRegion === "international" ? "international" : "national";
    const date = form.invoiceDate ? new Date(form.invoiceDate) : new Date();
    return buildInvoiceNumber(companyProfile?.invoiceSettings, region, date).invoiceNumber;
  }, [companyProfile, form.clientRegion, form.invoiceDate]);

  // ─── Load from URL params ─────────────────────────────────────────────
  useEffect(() => {
    if (editId) {
      const inv = invoices.find(i => i.id === editId);
      if (inv) { loadInvoice(inv); setEditingId(editId); setActiveTab("create"); setStep(1); }
    }
  }, [editId]);

  useEffect(() => {
    if (viewId) {
      const inv = invoices.find(i => i.id === viewId);
      if (inv) { setViewingInvoice(inv); setActiveTab("view"); }
    }
  }, [viewId]);

  useEffect(() => {
    if (fromPayment) {
      const p = payments.find(x => x.id === fromPayment);
      if (p) { prefillPayment(p); setActiveTab("create"); setStep(1); }
    }
  }, [fromPayment]);

  // ─── Load invoice into form ───────────────────────────────────────────

  function loadInvoice(inv: InvoiceData) {
    const gRate = inv.tax?.sgstRate ? inv.tax.sgstRate * 2 : (inv.tax?.igstRate || 18);
    setForm({
      invoiceNumber: inv.invoiceNumber, invoiceDate: inv.invoiceDate?.split("T")[0] || new Date().toISOString().split("T")[0],
      template: inv.template || "professional", invoiceType: inv.invoiceType || "single",
      invoiceDocumentType: (inv as any).invoiceDocumentType || "invoice",
      senderMode: inv.senderMode || "company", category: inv.category || "", uin: inv.uin || "",
      sender: inv.sender || {}, recipient: inv.recipient || {},
      toCompanyName: inv.toCompanyName || "", toCompanyAddress: inv.toCompanyAddress || "",
      clientId: inv.client?.id || "", projectId: inv.project?.id || "",
      paymentId: inv.projectPayment || "", phaseId: inv.phaseId || "", month: inv.month || "",
      lineItems: inv.lineItems.length > 0 ? inv.lineItems : [{ description: "", hsn: "", rate: 0, quantity: 1, amount: 0 }],
      clientRegion: isInternationalCurrency(inv.currency) ? "international" : ((inv as any).clientRegion || "national"),
      currency: inv.currency || NATIONAL_CURRENCY,
      enableGst: !!(inv.tax?.sgstRate || inv.tax?.igstRate),
      gstType: inv.tax?.igstRate ? "interstate" : "intrastate", gstRate: gRate,
      discount: inv.discount || 0, roundOff: inv.roundOff || 0,
      purpose: inv.purpose || "", notes: inv.notes || "",
      periodFrom: inv.periodFrom?.split("T")[0] || "", periodTo: inv.periodTo?.split("T")[0] || "",
      dueDate: inv.dueDate?.split("T")[0] || "",
      signatureNote: inv.signatureNote || "", taxDisclaimer: inv.taxDisclaimer || "",
      bankDetails: inv.bankDetails || buildBank(companyProfile),
    });
  }

  function prefillPayment(pay: PaymentData) {
    const c = clients.find(x => x.id === pay.client.id);
    const f = freshForm(companyProfile);
    f.clientId = pay.client.id;
    f.projectId = pay.project?.id || "";
    f.paymentId = pay.id;
    if (c) {
      f.recipient = { name: c.name, companyName: c.companyName, address: c.companyAddress, email: c.email, gstin: c.gstin, pan: c.pan };
      f.toCompanyName = c.companyName; f.toCompanyAddress = c.companyAddress;
    }
    if (pay.billingCycle === "phases" && pay.phases.length > 0) f.invoiceType = "phase";
    else if (pay.billingCycle === "monthly") f.invoiceType = "monthly";
    f.lineItems = [{ description: `Services towards ${pay.project?.name || "Project Payment"}`, rate: 0, quantity: 1, amount: pay.totalAmount }];
    setForm(f);
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  function pickClient(id: string) {
    const c = clients.find(x => x.id === id);
    const region = c?.clientRegion || "national";
    setForm((f: any) => ({
      ...f, clientId: id,
      clientRegion: region,
      currency: region === "international" ? defaultInternationalCurrency(f.currency) : NATIONAL_CURRENCY,
      recipient: c ? { name: c.name, companyName: c.companyName, address: c.companyAddress, email: c.email, gstin: c.gstin, pan: c.pan } : f.recipient,
      toCompanyName: c?.companyName || "", toCompanyAddress: c?.companyAddress || "",
    }));
  }

  function pickPayment(id: string) {
    if (id === "none") { setForm((f: any) => ({ ...f, paymentId: "" })); return; }
    const p = payments.find(x => x.id === id);
    if (!p) return;
    const defaultHsn = companyProfile?.invoiceSettings?.defaultHsn || "";
    setForm((f: any) => ({
      ...f, paymentId: id,
      currency: p.currency || "INR",
      clientRegion: p.currency && isInternationalCurrency(p.currency) ? "international" : f.clientRegion,
      lineItems: [{ description: `Services towards ${p.project?.name || "Project Payment"}`, hsn: defaultHsn, rate: 0, quantity: 1, amount: p.totalAmount }],
    }));
  }

  function addItem() {
    const defaultHsn = companyProfile?.invoiceSettings?.defaultHsn || "";
    setForm((f: any) => ({ ...f, lineItems: [...f.lineItems, { description: "", hsn: defaultHsn, rate: 0, quantity: 1, amount: 0 }] }));
  }
  function removeItem(i: number) { setForm((f: any) => ({ ...f, lineItems: f.lineItems.filter((_: any, j: number) => j !== i) })); }
  function updateItem(i: number, key: string, val: any) {
    setForm((f: any) => {
      const items = [...f.lineItems];
      items[i] = { ...items[i], [key]: val };
      if (key === "rate" || key === "quantity") items[i].amount = (Number(items[i].rate) || 0) * (Number(items[i].quantity) || 1);
      return { ...f, lineItems: items };
    });
  }

  // ─── Calculated values ────────────────────────────────────────────────

  const subTotal = form.lineItems.reduce((s: number, i: LineItem) => s + (Number(i.amount) || 0), 0);
  const discount = Number(form.discount) || 0;
  const taxable = subTotal - discount;
  const gstRate = form.enableGst ? (Number(form.gstRate) || 0) : 0;
  let tax: InvoiceTax = {};
  if (form.enableGst && gstRate > 0) {
    if (form.gstType === "interstate") tax = { igstRate: gstRate, igstAmount: (taxable * gstRate) / 100 };
    else { const h = gstRate / 2; tax = { sgstRate: h, sgstAmount: (taxable * h) / 100, cgstRate: h, cgstAmount: (taxable * h) / 100 }; }
  }
  const totalTax = (tax.sgstAmount || 0) + (tax.cgstAmount || 0) + (tax.igstAmount || 0);
  const roundOff = Number(form.roundOff) || 0;
  const totalAmount = taxable + totalTax + roundOff;

  const currentPayment = payments.find((p) => p.id === form.paymentId);
  const canProceedStep1 =
    !!form.clientId &&
    !!form.invoiceDate &&
    (form.invoiceType !== "phase" || !form.paymentId || !!form.phaseId) &&
    (form.invoiceType !== "monthly" || !form.paymentId || !!form.month);
  const hasAtLeastOneLine = form.lineItems.some((i: LineItem) => i.description?.trim() && (Number(i.amount) || 0) > 0);

  // ─── Save ─────────────────────────────────────────────────────────────

  async function handleSave(statusOverride?: string) {
    setSaving(true);
    try {
      const payload = {
        invoiceNumber: form.invoiceNumber.trim() || undefined, invoiceDate: form.invoiceDate,
        template: form.template, invoiceType: form.invoiceType, invoiceDocumentType: form.invoiceDocumentType, senderMode: form.senderMode,
        category: form.category, uin: form.uin, sender: form.sender, recipient: form.recipient,
        toCompanyName: form.toCompanyName, toCompanyAddress: form.toCompanyAddress,
        lineItems: form.lineItems.filter((i: LineItem) => i.description),
        subTotal, tax, discount, roundOff, totalAmount,
        amountInWords: amountInWordsForCurrency(totalAmount, form.currency || NATIONAL_CURRENCY),
        currency: form.currency || NATIONAL_CURRENCY, clientRegion: form.clientRegion || "national", bankDetails: form.bankDetails, purpose: form.purpose, notes: form.notes,
        isNoGst: !form.enableGst,
        periodFrom: form.periodFrom || undefined, periodTo: form.periodTo || undefined,
        status: statusOverride || "draft", dueDate: form.dueDate || undefined,
        client: form.clientId || undefined, project: form.projectId || undefined,
        projectPayment: form.paymentId || undefined, phaseId: form.phaseId || undefined,
        month: form.month || undefined, signatureNote: form.signatureNote, taxDisclaimer: form.taxDisclaimer,
      };
      const url = editingId ? `/api/invoices/${editingId}` : "/api/invoices";
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      toast.success(editingId ? "Invoice updated" : "Invoice created");
      router.refresh();
      setForm(freshForm(companyProfile)); setEditingId(null); setActiveTab("list"); setStep(1);
      router.push("/dashboard/invoices");
    } catch (e: any) { toast.error(e.message || "Failed to save invoice"); } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/invoices/${deletingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invoice deleted"); setInvoices(prev => prev.filter(i => i.id !== deletingId));
      setDeleteDialogOpen(false); setDeletingId(null);
    } catch { toast.error("Failed to delete invoice"); }
  }

  async function handleMarkPaid() {
    if (!markPaidDialogOpen) return;
    setMarkingPaid(markPaidDialogOpen);
    try {
      const res = await fetch(`/api/invoices/${markPaidDialogOpen}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidDate: paidDateInput || new Date().toISOString() })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      const data = await res.json();
      if (data.invoice) {
        setInvoices(prev => prev.map(inv => inv.id === markPaidDialogOpen ? data.invoice : inv));
        if (viewingInvoice?.id === markPaidDialogOpen) setViewingInvoice(data.invoice);
      }
      toast.success("Invoice marked as paid" + (data.paymentUpdated ? " & payment record updated" : ""));
      setMarkPaidDialogOpen(null);
    } catch (e: any) { toast.error(e.message || "Failed to mark as paid"); } finally { setMarkingPaid(null); }
  }

  async function handleQuickStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.invoice) {
        setInvoices(prev => prev.map(inv => inv.id === id ? data.invoice : inv));
        if (viewingInvoice?.id === id) setViewingInvoice(data.invoice);
      }
      toast.success(`Invoice marked as ${status}`);
    } catch { toast.error("Failed to update status"); }
  }

  async function handleConvertInvoice(id: string) {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceDocumentType: "invoice" }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.invoice) {
        setInvoices(prev => prev.map(inv => inv.id === id ? data.invoice : inv));
        if (viewingInvoice?.id === id) setViewingInvoice(data.invoice);
      }
      toast.success("Converted to Invoice");
    } catch { toast.error("Failed to convert invoice"); }
  }

  async function handleNoGst(id: string, isNoGst: boolean) {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isNoGst }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.invoice) {
        setInvoices(prev => prev.map(inv => inv.id === id ? data.invoice : inv));
        if (viewingInvoice?.id === id) setViewingInvoice(data.invoice);
      }
      toast.success(isNoGst ? "Invoice marked as No GST" : "No GST mark removed");
    } catch {
      toast.error("Failed to update GST classification");
    }
  }

  async function handleRecordPayment() {
    if (!recordPaymentDialogOpen) return;
    const inv = invoices.find(i => i.id === recordPaymentDialogOpen);
    if (!inv) return;
    const amount = Number(recordPaymentAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setRecordingPayment(true);
    try {
      const remaining = inv.totalAmount - ((inv as any).settledAmount || 0);
      const isFullPayment = amount >= remaining;
      const newStatus = isFullPayment ? "paid" : "sent";
      const newSettled = ((inv as any).settledAmount || 0) + amount;
      const res = await fetch(`/api/invoices/${recordPaymentDialogOpen}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settledAmount: newSettled,
          status: newStatus,
          ...(isFullPayment ? { paidDate: recordPaymentDate } : {}),
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      const data = await res.json();
      if (data.invoice) {
        setInvoices(prev => prev.map(i => i.id === recordPaymentDialogOpen ? data.invoice : i));
        if (viewingInvoice?.id === recordPaymentDialogOpen) setViewingInvoice(data.invoice);
      }
      toast.success(isFullPayment ? "Invoice fully settled ✓" : `₹${amount.toLocaleString()} recorded — partial payment`);
      setRecordPaymentDialogOpen(null);
      setRecordPaymentAmount("");
    } catch (e: any) { toast.error(e.message || "Failed to record payment"); } finally { setRecordingPayment(false); }
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/invoices/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      if (!res.ok) throw new Error("Failed"); toast.success("Invoice settings saved");
    } catch { toast.error("Failed to save settings"); } finally { setSavingSettings(false); }
  }

  // ─── Nav helpers ──────────────────────────────────────────────────────

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    
    // Primary Tab filtering (All, GST, Without GST, International)
    if (listPrimaryTab === "gst" && (inv.isNoGst || isInternationalCurrency(inv.currency) || (inv as any).clientRegion === "international")) return false;
    if (listPrimaryTab === "no_gst" && (!inv.isNoGst || isInternationalCurrency(inv.currency) || (inv as any).clientRegion === "international")) return false;
    if (listPrimaryTab === "international" && !isInternationalCurrency(inv.currency) && (inv as any).clientRegion !== "international") return false;


    if (typeFilter !== "all" && inv.invoiceType !== typeFilter) return false;
    if (docTypeFilter === "invoice" && (inv as any).invoiceDocumentType !== "invoice" && (inv as any).invoiceDocumentType !== undefined && (inv as any).invoiceDocumentType !== null && (inv as any).invoiceDocumentType !== "") return false;
    if (docTypeFilter === "proforma" && (inv as any).invoiceDocumentType !== "proforma") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return inv.invoiceNumber.toLowerCase().includes(q) || inv.client?.name?.toLowerCase().includes(q) || inv.client?.companyName?.toLowerCase().includes(q) || inv.project?.name?.toLowerCase().includes(q);
    }
    return true;
  });

  async function handleSaveSeriesEdit() {
    const serial = Number(editSeriesData.serial);
    if (!editSeriesData.prefix.trim() || isNaN(serial) || serial < 1) {
      toast.error("Enter a valid prefix and serial number");
      return;
    }
    setSavingSeries(true);
    try {
      const patch = editSeriesData.region === "international"
        ? { internationalInvoicePrefix: editSeriesData.prefix.trim(), internationalNextSerial: serial }
        : { invoicePrefix: editSeriesData.prefix.trim(), nextSerial: serial };
      const res = await fetch("/api/invoices/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invoice series updated successfully");
      setSettings((s: any) => ({ ...s, ...patch }));
      setEditSeriesDialogOpen(null);
    } catch { toast.error("Failed to update series"); } finally { setSavingSeries(false); }
  }

  function openEditSeries(inv: InvoiceData) {
    const isIntl = isInternationalCurrency(inv.currency);
    const s = companyProfile?.invoiceSettings || {};
    setEditSeriesData({
      prefix: isIntl ? (s.internationalInvoicePrefix || "INT") : (s.invoicePrefix || "INV"),
      serial: String(isIntl ? (s.internationalNextSerial || 1) : (s.nextSerial || 1)),
      region: isIntl ? "international" : "national",
    });
    setEditSeriesDialogOpen(inv.id);
  }

  function goTab(tab: string) {
    setActiveTab(tab);
    if (tab === "list") router.push("/dashboard/invoices");
    else if (tab === "create") { if (!editingId) { setForm(freshForm(companyProfile)); setStep(1); } router.push("/dashboard/invoices?tab=create"); }
    else if (tab === "settings") router.push("/dashboard/invoices?tab=settings");
  }

  function startNew(region: "national"|"international", currency: string, withGst: boolean) {
    const f = freshForm(companyProfile);
    f.clientRegion = region;
    f.currency = currency;
    f.enableGst = withGst;
    setForm(f);
    setEditingId(null);
    setStep(1);
    setActiveTab("create");
    router.push("/dashboard/invoices?tab=create");
  }
  function startEdit(inv: InvoiceData) { loadInvoice(inv); setEditingId(inv.id); setStep(1); setActiveTab("create"); }
  function startView(inv: InvoiceData) { setViewingInvoice(inv); setActiveTab("view"); }

  function buildPreview(): InvoiceData {
    const cl = clients.find(c => c.id === form.clientId);
    const pr = projects.find(p => p.id === form.projectId);
    return {
      ...form,
      id: "preview",
      invoiceNumber: form.invoiceNumber.trim() || suggestedInvoiceNumber,
      totalAmount, subTotal, tax, discount, roundOff,
      amountInWords: amountInWordsForCurrency(totalAmount, form.currency || NATIONAL_CURRENCY),
      lineItems: form.lineItems.filter((i: LineItem) => i.description),
      status: "draft",
      createdAt: new Date().toISOString(),
      client: cl ? { id: cl.id, name: cl.name, companyName: cl.companyName } : null,
      project: pr ? { id: pr.id, name: pr.name } : null,
      projectPayment: form.paymentId,
    } as any;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">Create, manage and track invoices</p>
        </div>
        <Button onClick={() => { setCreateFlowStep(1); setCreateFlowOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Invoice</Button>
      </div>

      <Tabs value={activeTab} onValueChange={goTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="list" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" /> All</TabsTrigger>
          <TabsTrigger value="create" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> {editingId ? "Edit" : "Create"}</TabsTrigger>
          <TabsTrigger value="view" className="gap-1.5 text-xs" disabled={!viewingInvoice}><FileSpreadsheet className="h-3.5 w-3.5" /> Preview</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" /> Settings</TabsTrigger>
        </TabsList>

        {/* ════════════ LIST ════════════ */}
        <TabsContent value="list" className="space-y-4 mt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search invoices..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><Filter className="h-3.5 w-3.5 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex bg-muted/50 p-1 rounded-lg">
              {["all", "gst", "no_gst", "international"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setListPrimaryTab(tab)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${listPrimaryTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {tab === "all" ? "All" : tab === "gst" ? "GST" : tab === "no_gst" ? "Without GST" : "International"}
                </button>
              ))}
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg">No invoices yet</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">Set up your details in Settings first, then create invoices in seconds.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => goTab("settings")} className="gap-2"><Settings className="h-4 w-4" /> Setup Settings</Button>
                  <Button onClick={() => { setCreateFlowStep(1); setCreateFlowOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Create Invoice</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map(inv => (
                      <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => startView(inv)}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell>{inv.client?.companyName || inv.client?.name || "~"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant="outline" className="capitalize text-xs">{inv.invoiceType}</Badge>
                            {(inv as any).invoiceDocumentType === "proforma" && <Badge className="text-[10px] bg-purple-100 text-purple-800 border-purple-200">Proforma</Badge>}
                            {inv.isNoGst && <Badge className="text-[10px] bg-slate-100 text-slate-800 border-slate-200">No GST</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <div>{fmt(inv.totalAmount, inv.currency)}</div>
                          {((inv as any).settledAmount || 0) > 0 && (inv as any).settledAmount < inv.totalAmount && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                              Rec: {fmt((inv as any).settledAmount, inv.currency)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="outline" className={`capitalize text-xs ${statusColor(inv.status)}`}>{inv.status}</Badge></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); startEdit(inv); }}>
                                <Edit className="mr-2 h-4 w-4 text-amber-600" /> Edit Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); startView(inv); }}>
                                <Eye className="mr-2 h-4 w-4 text-blue-600" /> Preview
                              </DropdownMenuItem>
                              {inv.status === "paid" && (
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); openEditSeries(inv); }}>
                                  <Settings className="mr-2 h-4 w-4 text-violet-600" /> Edit Series
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); handleNoGst(inv.id, !inv.isNoGst); }}>
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-slate-600" />
                                {inv.isNoGst ? "Remove No GST" : "Mark as No GST"}
                              </DropdownMenuItem>
                              {inv.status !== "paid" && (
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); setRecordPaymentAmount(""); setRecordPaymentDate(new Date().toISOString().slice(0, 10)); setRecordPaymentDialogOpen(inv.id); }}>
                                  <Receipt className="mr-2 h-4 w-4 text-emerald-600" /> Record Payment
                                </DropdownMenuItem>
                              )}
                              {inv.status !== "paid" && (
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); setRecordPaymentAmount(String(inv.totalAmount - ((inv as any).settledAmount || 0))); setRecordPaymentDate(new Date().toISOString().slice(0, 10)); setRecordPaymentDialogOpen(inv.id); }}>
                                  <DollarSign className="mr-2 h-4 w-4 text-blue-600" /> Settle (Full)
                                </DropdownMenuItem>
                              )}
                              {inv.status !== "paid" && (
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); setDeletingId(inv.id); setDeleteDialogOpen(true); }} className="text-red-600 focus:text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4 text-red-600" /> Delete
                                </DropdownMenuItem>
                              )}
                              {inv.status !== "paid" && (
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); setPaidDateInput(new Date().toISOString().slice(0, 10)); setMarkPaidDialogOpen(inv.id); }} disabled={markingPaid === inv.id}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Mark as Paid
                                </DropdownMenuItem>
                              )}
                              {(inv as any).invoiceDocumentType === "proforma" && (
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); handleConvertInvoice(inv.id); }}>
                                  <FileText className="mr-2 h-4 w-4 text-blue-600" /> Convert to Invoice
                                </DropdownMenuItem>
                              )}
                              {inv.status === "paid" && (
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); handleQuickStatus(inv.id, "sent"); }}>
                                  <RotateCcw className="mr-2 h-4 w-4 text-orange-600" /> Mark as Unpaid
                                </DropdownMenuItem>
                              )}
                              {inv.status !== "draft" && (
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); handleQuickStatus(inv.id, "draft"); }}>
                                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Mark as Draft
                                </DropdownMenuItem>
                              )}
                              {inv.status !== "overdue" && (
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); handleQuickStatus(inv.id, "overdue"); }}>
                                  <AlertCircle className="mr-2 h-4 w-4 text-red-600" /> Mark as Overdue
                                </DropdownMenuItem>
                              )}
                              {inv.status !== "sent" && (
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); handleQuickStatus(inv.id, "sent"); }}>
                                  <Send className="mr-2 h-4 w-4 text-blue-600" /> Mark as Sent
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════════════ CREATE / EDIT ════════════ */}
        <TabsContent value="create" className="mt-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[{ n: 1, label: "Basics" }, { n: 2, label: "Items & Amount" }, { n: 3, label: "Review & Save" }].map(({ n, label }) => (
              <button key={n} onClick={() => setStep(n)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${step === n ? "bg-primary text-primary-foreground shadow-sm" : step > n ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                {step > n ? <Check className="h-3.5 w-3.5" /> : <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-xs">{n}</span>}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* ───── STEP 1: Basics ───── */}
          {step === 1 && (
            <div className="space-y-5 max-w-2xl">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Who is this invoice for?</CardTitle>
                  <CardDescription>Pick the client. Recipient details auto-fill from their record.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <Select value={form.clientId} onValueChange={pickClient}>
                      <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName} ({c.name}){c.gstin ? ` - GST: ${c.gstin}` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select value={form.projectId} onValueChange={v => setForm((f: any) => ({ ...f, projectId: v }))}>
                        <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                        <SelectContent>
                          {projects.filter(p => !form.clientId || p.clientId === form.clientId).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Record</Label>
                      <Select value={form.paymentId || "none"} onValueChange={pickPayment}>
                        <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {payments.filter(p => !form.clientId || p.client.id === form.clientId).map(p => <SelectItem key={p.id} value={p.id}>{p.project?.name || p.client.companyName} - {fmt(p.totalAmount, p.currency)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Invoice options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Template selector */}
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[{ v: "professional", l: "Professional" }, { v: "modern", l: "Modern" }, { v: "classic", l: "Classic" }, { v: "reimbursement", l: "Reimbursement" }].map(t => (
                        <button key={t.v} type="button" onClick={() => setForm((f: any) => ({ ...f, template: t.v }))}
                          className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${form.template === t.v ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/20"}`}>
                          {t.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Client Region</Label>
                      <Select
                        value={form.clientRegion || "national"}
                        onValueChange={(v) =>
                          setForm((f: any) => ({
                            ...f,
                            clientRegion: v,
                            currency:
                              v === "national"
                                ? NATIONAL_CURRENCY
                                : defaultInternationalCurrency(f.currency),
                          }))
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="national">National (India)</SelectItem>
                          <SelectItem value="international">International</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      {form.clientRegion === "international" ? (
                        <Select
                          value={form.currency || "USD"}
                          onValueChange={(v) => setForm((f: any) => ({ ...f, currency: v, clientRegion: "international" }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {INTERNATIONAL_CURRENCIES.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.code} ({c.symbol}) ~ {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={formatCurrencyLabel(NATIONAL_CURRENCY)} disabled />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Number</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.invoiceNumber}
                        onChange={(e) => setForm((f: any) => ({ ...f, invoiceNumber: e.target.value }))}
                        placeholder={suggestedInvoiceNumber}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => setForm((f: any) => ({ ...f, invoiceNumber: suggestedInvoiceNumber }))}
                      >
                        Use suggested
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave blank to auto-generate ({suggestedInvoiceNumber}), or enter a custom number like KALP/May/003.
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Document Type</Label>
                      <Select value={form.invoiceDocumentType} onValueChange={v => setForm((f: any) => ({ ...f, invoiceDocumentType: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="invoice">Invoice</SelectItem>
                          <SelectItem value="proforma">Proforma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={form.invoiceType} onValueChange={v => setForm((f: any) => ({ ...f, invoiceType: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="phase">Phase</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice as</Label>
                      <Select value={form.senderMode} onValueChange={v => setForm((f: any) => ({ ...f, senderMode: v, sender: buildSender(companyProfile, v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">Personal Name</SelectItem>
                          <SelectItem value="company">Company Name</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={form.invoiceDate} onChange={e => setForm((f: any) => ({ ...f, invoiceDate: e.target.value }))} />
                    </div>
                  </div>

                  {/* Phase / Month selection */}
                  {form.invoiceType === "phase" && form.paymentId && (
                    <div className="space-y-2">
                      <Label>Select Phase</Label>
                      <Select value={form.phaseId} onValueChange={v => {
                        const phase = payments.find(p => p.id === form.paymentId)?.phases.find(ph => ph._id === v);
                        setForm((f: any) => ({
                          ...f,
                          phaseId: v,
                          lineItems: [{ description: `Phase: ${phase?.name || ""}`, hsn: f.lineItems[0]?.hsn || "", rate: 0, quantity: 1, amount: phase?.amount || 0 }]
                        }));
                      }}>
                        <SelectTrigger><SelectValue placeholder="Pick phase" /></SelectTrigger>
                        <SelectContent>
                          {payments.find(p => p.id === form.paymentId)?.phases.map(ph => <SelectItem key={ph._id} value={ph._id}>{ph.name} - {fmt(ph.amount)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {form.invoiceType === "monthly" && form.paymentId && (
                    <div className="space-y-2">
                      <Label>Select Month</Label>
                      <Select value={form.month} onValueChange={v => {
                        const monthItem = payments.find(p => p.id === form.paymentId)?.monthlyBreakdown.find(m => m.month === v);
                        setForm((f: any) => ({
                          ...f,
                          month: v,
                          lineItems: [{ description: `Monthly Retainer: ${monthItem?.month || ""}`, hsn: f.lineItems[0]?.hsn || "", rate: 0, quantity: 1, amount: monthItem?.amount || 0 }]
                        }));
                      }}>
                        <SelectTrigger><SelectValue placeholder="Pick month" /></SelectTrigger>
                        <SelectContent>
                          {payments.find(p => p.id === form.paymentId)?.monthlyBreakdown.map(m => <SelectItem key={m.month} value={m.month}>{m.month} - {fmt(m.amount)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              {currentPayment && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Linked payment snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Project</span><p className="font-medium">{currentPayment.project?.name || "~"}</p></div>
                    <div><span className="text-muted-foreground">Billing cycle</span><p className="font-medium capitalize">{currentPayment.billingCycle}</p></div>
                    <div><span className="text-muted-foreground">Total amount</span><p className="font-medium">{fmt(currentPayment.totalAmount, currentPayment.currency)}</p></div>
                    <div><span className="text-muted-foreground">Status</span><p className="font-medium capitalize">{currentPayment.status}</p></div>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {!canProceedStep1 ? "Pick client/date and required phase/month selection to continue." : "Ready to add items and totals."}
                </p>
                <Button onClick={() => setStep(2)} className="gap-2" disabled={!canProceedStep1}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ───── STEP 2: Items & Amount ───── */}
          {step === 2 && (
            <div className="space-y-5 max-w-3xl">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Line Items</CardTitle>
                      <CardDescription>Add services / work done and their amounts</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={addItem} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Row</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Header row */}
                    <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground px-1">
                      <div className="w-6">#</div>
                      <div className="w-20">HSN</div>
                      <div className="flex-1">Description</div>
                      <div className="w-24 text-right">Rate</div>
                      <div className="w-16 text-right">Qty</div>
                      <div className="w-28 text-right">Amount ({getCurrencySymbol(form.currency || NATIONAL_CURRENCY)})</div>
                      <div className="w-9"></div>
                    </div>
                    {form.lineItems.map((item: LineItem, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground w-6">{idx + 1}.</div>
                        <Input className="w-20" value={item.hsn || ""} onChange={e => updateItem(idx, "hsn", e.target.value)} placeholder="HSN" />
                        <Input className="flex-1" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Service description" />
                        <Input className="w-24 text-right" type="number" value={item.rate || ""} onChange={e => updateItem(idx, "rate", Number(e.target.value))} placeholder="Rate" />
                        <Input className="w-16 text-right" type="number" value={item.quantity || 1} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} />
                        <Input className="w-28 text-right font-medium" type="number" value={item.amount || ""} onChange={e => updateItem(idx, "amount", Number(e.target.value))} placeholder="Amount" />
                        {form.lineItems.length > 1 ? (
                          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-600" onClick={() => removeItem(idx)}><X className="h-4 w-4" /></Button>
                        ) : <div className="w-9" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tax & total - compact */}
              <Card>
                <CardContent className="pt-5">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Tax controls */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <Switch checked={form.enableGst} onCheckedChange={v => setForm((f: any) => ({ ...f, enableGst: v }))} />
                        <Label className="text-sm">Apply GST</Label>
                      </div>
                      {form.enableGst && (
                        <div className="flex gap-3">
                          <Select value={form.gstType} onValueChange={v => setForm((f: any) => ({ ...f, gstType: v }))}>
                            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="intrastate">SGST + CGST</SelectItem>
                              <SelectItem value="interstate">IGST</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1.5">
                            <Input className="w-16 text-right" type="number" value={form.gstRate} onChange={e => setForm((f: any) => ({ ...f, gstRate: Number(e.target.value) }))} />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Discount</Label>
                          <Input className="w-28" type="number" value={form.discount || ""} onChange={e => setForm((f: any) => ({ ...f, discount: Number(e.target.value) }))} placeholder="0" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Round Off</Label>
                          <Input className="w-28" type="number" value={form.roundOff || ""} onChange={e => setForm((f: any) => ({ ...f, roundOff: Number(e.target.value) }))} step="0.01" placeholder="0" />
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="w-64 space-y-2 text-sm border-l pl-6">
                      <div className="flex justify-between"><span className="text-muted-foreground">Sub-Total</span><span className="font-medium">{fmt(subTotal)}</span></div>
                      {discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-red-600">- {fmt(discount)}</span></div>}
                      {form.enableGst && form.gstType === "intrastate" && <>
                        <div className="flex justify-between"><span className="text-muted-foreground">SGST ({tax.sgstRate}%)</span><span>{fmt(tax.sgstAmount || 0)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">CGST ({tax.cgstRate}%)</span><span>{fmt(tax.cgstAmount || 0)}</span></div>
                      </>}
                      {form.enableGst && form.gstType === "interstate" && <div className="flex justify-between"><span className="text-muted-foreground">IGST ({tax.igstRate}%)</span><span>{fmt(tax.igstAmount || 0)}</span></div>}
                      {roundOff !== 0 && <div className="flex justify-between"><span className="text-muted-foreground">Round Off</span><span>{fmt(roundOff)}</span></div>}
                      <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>{fmt(totalAmount)}</span></div>
                      <p className="text-[11px] text-muted-foreground italic leading-tight">{amountInWordsForCurrency(totalAmount, form.currency || NATIONAL_CURRENCY)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button onClick={() => setStep(3)} className="gap-2" disabled={!hasAtLeastOneLine}>
                  Review <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ───── STEP 3: Review & Save ───── */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Quick summary card */}
              <Card>
                <CardContent className="pt-5">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div><span className="text-muted-foreground block text-xs mb-0.5">Invoice No.</span><span className="font-medium">{form.invoiceNumber.trim() || suggestedInvoiceNumber}</span></div>
                    <div><span className="text-muted-foreground block text-xs mb-0.5">From</span><span className="font-medium">{form.sender?.name || "~"}</span></div>
                    <div><span className="text-muted-foreground block text-xs mb-0.5">To</span><span className="font-medium">{form.recipient?.companyName || form.recipient?.name || "~"}</span></div>
                    <div><span className="text-muted-foreground block text-xs mb-0.5">Template</span><span className="font-medium capitalize">{form.template}</span></div>
                    <div><span className="text-muted-foreground block text-xs mb-0.5">Total</span><span className="font-bold text-base">{fmt(totalAmount)}</span></div>
                  </div>
                </CardContent>
              </Card>

              {/* Live preview */}
              <div ref={printRef}>
                <InvoiceRenderer invoice={buildPreview()} profile={companyProfile} />
              </div>

              {/* Advanced overrides - collapsed by default */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="gap-2 text-muted-foreground w-full justify-start">
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Edit details (sender, recipient, bank, notes)
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sender */}
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">From (Sender)</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <Input placeholder="Name" value={form.sender.name || ""} onChange={e => setForm((f: any) => ({ ...f, sender: { ...f.sender, name: e.target.value } }))} />
                        <Input placeholder="Email" value={form.sender.email || ""} onChange={e => setForm((f: any) => ({ ...f, sender: { ...f.sender, email: e.target.value } }))} />
                        <Input placeholder="Phone" value={form.sender.phone || ""} onChange={e => setForm((f: any) => ({ ...f, sender: { ...f.sender, phone: e.target.value } }))} />
                        <Textarea placeholder="Address" rows={2} value={form.sender.address || ""} onChange={e => setForm((f: any) => ({ ...f, sender: { ...f.sender, address: e.target.value } }))} />
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="PAN" value={form.sender.pan || ""} onChange={e => setForm((f: any) => ({ ...f, sender: { ...f.sender, pan: e.target.value } }))} />
                          <Input placeholder="GST No." value={form.sender.gstNumber || ""} onChange={e => setForm((f: any) => ({ ...f, sender: { ...f.sender, gstNumber: e.target.value } }))} />
                        </div>
                      </CardContent>
                    </Card>
                    {/* Recipient */}
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">To (Recipient)</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <Input placeholder="Contact Name" value={form.recipient.name || ""} onChange={e => setForm((f: any) => ({ ...f, recipient: { ...f.recipient, name: e.target.value } }))} />
                        <Input placeholder="Company Name" value={form.recipient.companyName || ""} onChange={e => setForm((f: any) => ({ ...f, recipient: { ...f.recipient, companyName: e.target.value } }))} />
                        <Input placeholder="Email" value={form.recipient.email || ""} onChange={e => setForm((f: any) => ({ ...f, recipient: { ...f.recipient, email: e.target.value } }))} />
                        <Textarea placeholder="Address" rows={2} value={form.recipient.address || ""} onChange={e => setForm((f: any) => ({ ...f, recipient: { ...f.recipient, address: e.target.value } }))} />
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="GSTIN" value={form.recipient.gstin || ""} onChange={e => setForm((f: any) => ({ ...f, recipient: { ...f.recipient, gstin: e.target.value } }))} />
                          <Input placeholder="PAN" value={form.recipient.pan || ""} onChange={e => setForm((f: any) => ({ ...f, recipient: { ...f.recipient, pan: e.target.value } }))} />
                        </div>
                      </CardContent>
                    </Card>
                    {/* Bank */}
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Wire Transfer Details</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="A/C Holder" value={form.bankDetails.accountHolderName || ""} onChange={e => setForm((f: any) => ({ ...f, bankDetails: { ...f.bankDetails, accountHolderName: e.target.value } }))} />
                          <Input placeholder="A/C Number" value={form.bankDetails.accountNumber || ""} onChange={e => setForm((f: any) => ({ ...f, bankDetails: { ...f.bankDetails, accountNumber: e.target.value } }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Bank Name" value={form.bankDetails.bankName || ""} onChange={e => setForm((f: any) => ({ ...f, bankDetails: { ...f.bankDetails, bankName: e.target.value } }))} />
                          <Input placeholder="IFSC" value={form.bankDetails.ifscCode || ""} onChange={e => setForm((f: any) => ({ ...f, bankDetails: { ...f.bankDetails, ifscCode: e.target.value } }))} />
                        </div>
                        <Input placeholder="Swift Code" value={form.bankDetails.swiftCode || ""} onChange={e => setForm((f: any) => ({ ...f, bankDetails: { ...f.bankDetails, swiftCode: e.target.value } }))} />
                      </CardContent>
                    </Card>
                    {/* Extra */}
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Extra Details</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="UIN / Contract" value={form.uin} onChange={e => setForm((f: any) => ({ ...f, uin: e.target.value }))} />
                          <Input placeholder="Category (e.g. Consultant)" value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))} />
                        </div>
                        <Textarea placeholder="Notes" rows={2} value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
                        <Textarea placeholder="Tax Disclaimer" rows={2} value={form.taxDisclaimer} onChange={e => setForm((f: any) => ({ ...f, taxDisclaimer: e.target.value }))} />
                      </CardContent>
                    </Card>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Actions */}
              <div className="flex justify-between items-center border-t pt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
                  </Button>
                  <Button onClick={() => handleSave("sent")} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Save & Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ════════════ VIEW / PREVIEW ════════════ */}
        <TabsContent value="view" className="space-y-4 mt-6">
          {viewingInvoice ? (
            <>
              <div className="flex items-center justify-between print:hidden">
                <Button variant="ghost" onClick={() => { setViewingInvoice(null); setActiveTab("list"); }} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
                <div className="flex gap-2">
                  {viewingInvoice.status !== "paid" && (
                    <Button size="sm" onClick={() => { setPaidDateInput(new Date().toISOString().slice(0, 10)); setMarkPaidDialogOpen(viewingInvoice.id); }} disabled={markingPaid === viewingInvoice.id} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                      {markingPaid === viewingInvoice.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Mark as Paid
                    </Button>
                  )}
                  {viewingInvoice.status === "paid" && (
                    <Badge variant="outline" className="capitalize text-xs bg-emerald-100 text-emerald-800 border-emerald-200 px-3 py-1.5">Paid</Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => startEdit(viewingInvoice)} className="gap-1.5"><Edit className="h-3.5 w-3.5" /> Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(`/invoices/${viewingInvoice.id}/view`, "_blank")} className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> Full Page</Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5"><Printer className="h-3.5 w-3.5" /> Print</Button>
                  <Button variant="outline" size="sm" onClick={() => { toast.info("Use Print > Save as PDF"); setTimeout(() => window.print(), 500); }} className="gap-1.5"><Download className="h-3.5 w-3.5" /> PDF</Button>
                </div>
              </div>
              <InvoiceRenderer invoice={viewingInvoice} profile={companyProfile} />
            </>
          ) : (
            <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Eye className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold">No invoice selected</h3>
              <p className="text-muted-foreground text-sm mt-1">Pick one from the list to preview</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ════════════ SETTINGS ════════════ */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Invoice Settings</h2>
              <p className="text-muted-foreground text-sm">Set once. Every new invoice uses these defaults automatically.</p>
            </div>
            <Button onClick={handleSaveSettings} disabled={savingSettings} className="gap-2">
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Your Identity on Invoices</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Default sender</Label>
                  <Select value={settings.senderMode || "company"} onValueChange={v => setSettings((s: any) => ({ ...s, senderMode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">My Name</SelectItem>
                      <SelectItem value="company">Company Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Personal Name</Label>
                  <Input value={settings.personalName || ""} onChange={e => setSettings((s: any) => ({ ...s, personalName: e.target.value }))} placeholder="Your full name for invoices" />
                </div>
                <div className="space-y-2">
                  <Label>Default Category</Label>
                  <Input value={settings.defaultCategory || ""} onChange={e => setSettings((s: any) => ({ ...s, defaultCategory: e.target.value }))} placeholder="e.g. Consultant / Senior Fellow" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">National Invoice Numbering</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Prefix</Label>
                  <Input value={settings.invoicePrefix || ""} onChange={e => setSettings((s: any) => ({ ...s, invoicePrefix: e.target.value }))} placeholder="e.g. AG or INV" />
                </div>
                <div className="space-y-2">
                  <Label>Next Serial</Label>
                  <Input type="number" value={settings.nextSerial || 1} onChange={e => setSettings((s: any) => ({ ...s, nextSerial: Number(e.target.value) }))} />
                </div>
                <p className="text-xs text-muted-foreground">Format: PREFIX/Month/SERIAL &rarr; AG/April/001</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">International Invoice Numbering</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Prefix</Label>
                  <Input value={settings.internationalInvoicePrefix || ""} onChange={e => setSettings((s: any) => ({ ...s, internationalInvoicePrefix: e.target.value }))} placeholder="e.g. INT" />
                </div>
                <div className="space-y-2">
                  <Label>Next Serial</Label>
                  <Input type="number" value={settings.internationalNextSerial || 1} onChange={e => setSettings((s: any) => ({ ...s, internationalNextSerial: Number(e.target.value) }))} />
                </div>
                <p className="text-xs text-muted-foreground">Format: PREFIX/Month/SERIAL &rarr; INT/April/001</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Common Settings</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>UIN / Contract No.</Label>
                  <Input value={settings.defaultUin || ""} onChange={e => setSettings((s: any) => ({ ...s, defaultUin: e.target.value }))} placeholder="Default contract number" />
                </div>
                <div className="space-y-2">
                  <Label>Default HSN / SAC</Label>
                  <Input value={settings.defaultHsn || ""} onChange={e => setSettings((s: any) => ({ ...s, defaultHsn: e.target.value }))} placeholder="e.g. 998314" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Default Template</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: "professional", l: "Professional" }, { v: "modern", l: "Modern" }, { v: "classic", l: "Classic" }, { v: "reimbursement", l: "Reimbursement" }].map(t => (
                    <button key={t.v} type="button" onClick={() => setSettings((s: any) => ({ ...s, defaultTemplate: t.v }))}
                      className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${(settings.defaultTemplate || "professional") === t.v ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/20"}`}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Default Notes & Disclaimers</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={settings.defaultNotes || ""} onChange={e => setSettings((s: any) => ({ ...s, defaultNotes: e.target.value }))} placeholder="Default notes on all invoices" rows={2} />
                <Textarea value={settings.defaultTaxDisclaimer || ""} onChange={e => setSettings((s: any) => ({ ...s, defaultTaxDisclaimer: e.target.value }))} placeholder="Tax disclaimer" rows={2} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!markPaidDialogOpen} onOpenChange={open => !open && setMarkPaidDialogOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>Select the date this invoice was settled. This will be used for revenue calculation in the dashboard.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Settled Date</Label>
              <Input type="date" value={paidDateInput} onChange={e => setPaidDateInput(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidDialogOpen(null)}>Cancel</Button>
            <Button onClick={handleMarkPaid} disabled={!!markingPaid || !paidDateInput}>
              {markingPaid ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GST Choice Dialog */}
      {/* Create Invoice Flow Dialog */}
      <Dialog open={createFlowOpen} onOpenChange={setCreateFlowOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createFlowStep === 1 && "Create New Invoice"}
              {createFlowStep === 2 && "Select Currency"}
              {createFlowStep === 3 && "GST Settings"}
            </DialogTitle>
            <DialogDescription>
              {createFlowStep === 1 && "Is this invoice for a national or international client?"}
              {createFlowStep === 2 && "Choose the currency for this international invoice."}
              {createFlowStep === 3 && "Choose whether this invoice will include GST calculation."}
            </DialogDescription>
          </DialogHeader>

          {createFlowStep === 1 && (
            <div className="grid grid-cols-2 gap-4 py-4 animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => {
                  setCreateFlowData({ ...createFlowData, region: "national", currency: NATIONAL_CURRENCY });
                  setCreateFlowStep(3); // Skip currency for national
                }}
                className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all text-center gap-2 group"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <MapPin className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">National</span>
                <span className="text-xs text-muted-foreground">For clients inside India (INR)</span>
              </button>

              <button
                onClick={() => {
                  setCreateFlowData({ ...createFlowData, region: "international" });
                  setCreateFlowStep(2); // Go to currency selection
                }}
                className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-muted hover:border-muted-foreground/40 bg-card hover:bg-accent transition-all text-center gap-2 group"
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
                  <Globe className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">International</span>
                <span className="text-xs text-muted-foreground">For clients outside India</span>
              </button>
            </div>
          )}

          {createFlowStep === 2 && (
            <div className="grid grid-cols-2 gap-4 py-4 animate-in slide-in-from-right-4 duration-200">
              <button
                onClick={() => {
                  setCreateFlowData({ ...createFlowData, currency: "USD" });
                  setCreateFlowStep(3);
                }}
                className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500 transition-all text-center gap-2 group"
              >
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <DollarSign className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">Dollars (USD)</span>
                <span className="text-xs text-muted-foreground">Standard international billing</span>
              </button>

              <button
                onClick={() => {
                  setCreateFlowData({ ...createFlowData, currency: "INR" });
                  setCreateFlowStep(3);
                }}
                className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500 transition-all text-center gap-2 group"
              >
                <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <IndianRupee className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">Rupees (INR)</span>
                <span className="text-xs text-muted-foreground">Bill international clients in INR</span>
              </button>
            </div>
          )}

          {createFlowStep === 3 && (
            <div className="grid grid-cols-2 gap-4 py-4 animate-in slide-in-from-right-4 duration-200">
              <button
                onClick={() => { 
                  setCreateFlowOpen(false); 
                  startNew(createFlowData.region, createFlowData.currency, true); 
                }}
                className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all text-center gap-2 group"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Receipt className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">Create GST Invoice</span>
                <span className="text-xs text-muted-foreground">Calculates CGST/SGST/IGST</span>
              </button>

              <button
                onClick={() => { 
                  setCreateFlowOpen(false); 
                  startNew(createFlowData.region, createFlowData.currency, false); 
                }}
                className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-muted hover:border-muted-foreground/40 bg-card hover:bg-accent transition-all text-center gap-2 group"
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="font-semibold text-sm">Create Without GST</span>
                <span className="text-xs text-muted-foreground">Excludes GST fields</span>
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Payment / Settle Dialog */}
      <Dialog open={!!recordPaymentDialogOpen} onOpenChange={open => !open && setRecordPaymentDialogOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment / Settle</DialogTitle>
            <DialogDescription>
              Record an amount received for this invoice. Partial payments will be tracked without creating multiple invoices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Amount Received (₹)</Label>
              <Input
                type="number"
                placeholder="Enter amount received"
                value={recordPaymentAmount}
                onChange={e => setRecordPaymentAmount(e.target.value)}
              />
              {recordPaymentDialogOpen && (() => {
                const inv = invoices.find(i => i.id === recordPaymentDialogOpen);
                if (!inv) return null;
                const settled = (inv as any).settledAmount || 0;
                const remaining = inv.totalAmount - settled;
                return (
                  <p className="text-xs text-muted-foreground">
                    Total invoice: ₹{inv.totalAmount.toLocaleString()} | Already settled: ₹{settled.toLocaleString()} | Remaining: <strong className="text-foreground">₹{remaining.toLocaleString()}</strong>
                  </p>
                );
              })()}
            </div>

            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={recordPaymentDate}
                onChange={e => setRecordPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordPaymentDialogOpen(null)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={recordingPayment}>
              {recordingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Series Dialog - only available on Paid invoices */}
      <Dialog open={!!editSeriesDialogOpen} onOpenChange={open => !open && setEditSeriesDialogOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-violet-600" /> Edit Invoice Series
            </DialogTitle>
            <DialogDescription>
              Update the invoice numbering series prefix and next serial number for {editSeriesData.region === "international" ? "international" : "national"} invoices. Only available on paid invoices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
              <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                <FileText className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide">
                  {editSeriesData.region === "international" ? "International" : "National"} Series
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Preview: <span className="font-mono font-semibold text-violet-700 dark:text-violet-300">{editSeriesData.prefix || "PREFIX"}/{new Date().toLocaleString("en-US", { month: "long" })}/{String(Number(editSeriesData.serial) || 1).padStart(3, "0")}</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Series Prefix</Label>
                <Input
                  placeholder={editSeriesData.region === "international" ? "e.g. INT" : "e.g. KALP"}
                  value={editSeriesData.prefix}
                  onChange={e => setEditSeriesData(d => ({ ...d, prefix: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Next Serial #</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  value={editSeriesData.serial}
                  onChange={e => setEditSeriesData(d => ({ ...d, serial: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The next invoice in this series will be numbered: <strong>{editSeriesData.prefix || "PREFIX"}/{new Date().toLocaleString("en-US", { month: "long" })}/{String(Number(editSeriesData.serial) || 1).padStart(3, "0")}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSeriesDialogOpen(null)}>Cancel</Button>
            <Button onClick={handleSaveSeriesEdit} disabled={savingSeries} className="gap-2">
              {savingSeries ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Series
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Templates are imported from @/components/invoice-templates
