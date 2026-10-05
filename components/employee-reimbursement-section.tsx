"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Receipt, Plus, Pencil, Trash2, RefreshCw, MessageSquare, Check, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const REIMBURSEMENT_TYPES = [
  "Travel",
  "Medical",
  "Internet",
  "Equipment",
  "Books / Learning",
  "Meals",
  "Other",
];

type ReimbursementItem = {
  id?: string;
  amount: number;
  type?: string;
  note?: string;
  description?: string;
  status?: "pending" | "approved" | "rejected";
  editRequestedAt?: string;
  editRequestNote?: string;
  rejectionReason?: string;
};

type Payslip = {
  id: string;
  payslipId?: string;
  month: number;
  year: number;
  reimbursement?: number;
  reimbursementType?: string;
  reimbursementNote?: string;
  reimbursementDescription?: string;
  reimbursementItems?: ReimbursementItem[];
  isPaid?: boolean;
};

/** Stashed reimbursement (no payslip for this month) */
type StashEntry = { month: number; year: number; items: ReimbursementItem[] };

/** Orphan reimbursements (Reimbursement docs with no payslip yet) */
type OrphanEntry = { month: number; year: number; items: ReimbursementItem[] };

/** One row in the table: from a payslip, stash, or orphan */
type ReimbursementRow =
  | {
    source: "payslip";
    payslipId: string;
    payslip: Payslip;
    itemIndex: number;
    item: ReimbursementItem | null;
  }
  | {
    source: "stash";
    month: number;
    year: number;
    itemIndex: number;
    item: ReimbursementItem | null;
    items: ReimbursementItem[];
  }
  | {
    source: "orphan";
    month: number;
    year: number;
    itemIndex: number;
    item: ReimbursementItem | null;
    items: ReimbursementItem[];
  };

function normalizePayslip(p: Payslip & { _id?: unknown }): Payslip {
  const items = (p.reimbursementItems || []) as ReimbursementItem[];
  return {
    ...p,
    id: p.id || (p._id != null ? String(p._id) : ""),
    reimbursementItems: items.map((i) => ({
      id: i.id,
      amount: Number(i.amount) || 0,
      type: i.type ?? undefined,
      note: i.note ?? undefined,
      description: i.description ?? undefined,
      status: i.status ?? undefined,
      editRequestedAt: i.editRequestedAt ?? undefined,
      editRequestNote: i.editRequestNote ?? undefined,
      rejectionReason: i.rejectionReason ?? undefined,
    })),
  };
}

function payslipsToRows(payslips: Payslip[]): ReimbursementRow[] {
  const rows: ReimbursementRow[] = [];
  for (const p of payslips) {
    const items = p.reimbursementItems ?? [];
    if (items.length === 0) {
      rows.push({ source: "payslip", payslipId: p.id, payslip: p, itemIndex: -1, item: null });
    } else {
      items.forEach((item, idx) => {
        rows.push({ source: "payslip", payslipId: p.id, payslip: p, itemIndex: idx, item });
      });
    }
  }
  return rows.sort((a, b) => (b.source === "payslip" ? b.payslip.year : b.year) - (a.source === "payslip" ? a.payslip.year : a.year) || (b.source === "payslip" ? b.payslip.month : b.month) - (a.source === "payslip" ? a.payslip.month : a.month));
}

function stashToRows(stash: StashEntry[]): ReimbursementRow[] {
  const rows: ReimbursementRow[] = [];
  for (const s of stash) {
    const items = s.items ?? [];
    if (items.length === 0) {
      rows.push({ source: "stash", month: s.month, year: s.year, itemIndex: -1, item: null, items: [] });
    } else {
      items.forEach((item, idx) => {
        rows.push({ source: "stash", month: s.month, year: s.year, itemIndex: idx, item, items: s.items });
      });
    }
  }
  return rows.sort((a, b) => rowMonthYear(b).year - rowMonthYear(a).year || rowMonthYear(b).month - rowMonthYear(a).month);
}

function orphanToRows(orphans: OrphanEntry[]): ReimbursementRow[] {
  const rows: ReimbursementRow[] = [];
  for (const o of orphans) {
    const items = o.items ?? [];
    if (items.length === 0) {
      rows.push({ source: "orphan", month: o.month, year: o.year, itemIndex: -1, item: null, items: [] });
    } else {
      items.forEach((item, idx) => {
        rows.push({ source: "orphan", month: o.month, year: o.year, itemIndex: idx, item, items: o.items });
      });
    }
  }
  return rows.sort((a, b) => rowMonthYear(b).year - rowMonthYear(a).year || rowMonthYear(b).month - rowMonthYear(a).month);
}

function rowMonthYear(row: ReimbursementRow): { month: number; year: number } {
  return row.source === "payslip" ? { month: row.payslip.month, year: row.payslip.year } : { month: row.month, year: row.year };
}

function rowKey(row: ReimbursementRow): string {
  if (row.source === "payslip") return row.item?.id ? `r-${row.item.id}` : `${row.payslipId}-${row.itemIndex}`;
  const { month, year } = rowMonthYear(row);
  return row.item?.id ? `r-${row.item.id}` : `${row.source}-${year}-${month}-${row.itemIndex}`;
}

function rowCanDelete(row: ReimbursementRow): boolean {
  if (row.source === "payslip" && row.payslip.isPaid) return false;
  return true;
}

type Props = {
  employeeId: string;
  isAdmin: boolean;
  /** ISO date (YYYY-MM-DD); restricts month/year to joining through current */
  dateOfHiring?: string | null;
};

export function EmployeeReimbursementSection({ employeeId, isAdmin, dateOfHiring }: Props) {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [reimbursementStash, setReimbursementStash] = useState<StashEntry[]>([]);
  const [orphanReimbursements, setOrphanReimbursements] = useState<OrphanEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addMonth, setAddMonth] = useState(() => new Date().getMonth() + 1);
  const [addYear, setAddYear] = useState(() => new Date().getFullYear());
  const [addAmount, setAddAmount] = useState("");
  const [addType, setAddType] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editPayslip, setEditPayslip] = useState<Payslip | null>(null);
  const [editStash, setEditStash] = useState<{ month: number; year: number } | null>(null);
  const [editReimbursementId, setEditReimbursementId] = useState<string | null>(null);
  const [editItemIndex, setEditItemIndex] = useState<number>(-1);
  const [deletingRow, setDeletingRow] = useState<ReimbursementRow | null>(null);
  const [requestEditOpen, setRequestEditOpen] = useState(false);
  const [requestEditId, setRequestEditId] = useState<string | null>(null);
  const [requestEditNote, setRequestEditNote] = useState("");
  const [requestEditSubmitting, setRequestEditSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPayslips = useCallback(async (cacheBust = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/payslips?employeeId=${encodeURIComponent(employeeId)}${cacheBust ? `&_t=${Date.now()}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to load payslips");
        setPayslips([]);
        setReimbursementStash([]);
        setOrphanReimbursements([]);
        return;
      }
      setPayslips(data.payslips || []);
      setReimbursementStash(data.reimbursementStash || []);
      setOrphanReimbursements(data.orphanReimbursements || []);
    } catch {
      setError("Failed to load payslips");
      setPayslips([]);
      setReimbursementStash([]);
      setOrphanReimbursements([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  const reimbursementRows = useMemo(() => {
    const all = [
      ...payslipsToRows(payslips),
      ...stashToRows(reimbursementStash),
      ...orphanToRows(orphanReimbursements),
    ].sort(
      (a, b) => (rowMonthYear(b).year - rowMonthYear(a).year) || (rowMonthYear(b).month - rowMonthYear(a).month)
    );
    // Hide auto-generated placeholder rows when reimbursement is 0 (payslip exists but has no items)
    return all.filter(
      (row) =>
        !(
          row.source === "payslip" &&
          row.item == null &&
          (row.payslip.reimbursement ?? 0) === 0
        )
    );
  }, [payslips, reimbursementStash, orphanReimbursements]);
  const existingMonthYears = useMemo(
    () => new Set(payslips.map((p) => `${p.year}-${p.month}`)),
    [payslips]
  );

  // Allowed month/year for add: only from joining date through current month
  const allowedMonthYears = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (!dateOfHiring) return [];
    const join = new Date(dateOfHiring);
    if (Number.isNaN(join.getTime())) return [];

    const startYear = join.getFullYear();
    const startMonth = join.getMonth() + 1;

    const options: { month: number; year: number }[] = [];
    for (let y = startYear; y <= currentYear; y++) {
      const mStart = y === startYear ? startMonth : 1;
      const mEnd = y === currentYear ? currentMonth : 12;
      for (let m = mStart; m <= mEnd; m++) {
        options.push({ month: m, year: y });
      }
    }
    return options.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
  }, [dateOfHiring]);

  const allowedYears = useMemo(
    () => Array.from(new Set(allowedMonthYears.map((o) => o.year))).sort((a, b) => b - a),
    [allowedMonthYears]
  );
  const allowedMonthsForYear = useCallback(
    (year: number) =>
      allowedMonthYears
        .filter((o) => o.year === year)
        .map((o) => o.month)
        .sort((a, b) => a - b),
    [allowedMonthYears]
  );

  const isEditMode =
    editReimbursementId != null ||
    (editPayslip != null && editItemIndex >= 0) ||
    (editStash != null && editItemIndex >= 0);
  const isAddFirstItem =
    (editPayslip != null && editItemIndex === -1) || (editStash != null && editItemIndex === -1);
  const isMonthYearFixed = isEditMode || isAddFirstItem;
  const isAddMode = !isEditMode;
  const isStashMode = editStash != null;
  const isReimbursementIdMode = editReimbursementId != null;

  async function handleSaveReimbursement() {
    const amount = parseFloat(addAmount);
    if (Number.isNaN(amount) || amount < 0) {
      setError("Enter a valid amount (≥ 0).");
      return;
    }
    const valid = allowedMonthYears.some((o) => o.month === addMonth && o.year === addYear);
    if (!valid) {
      setError("Invalid month/year.");
      return;
    }

    const newItem: ReimbursementItem = {
      amount,
      type: addType || undefined,
      note: addNote || undefined,
      description: addDescription || undefined,
    };

    setSubmitting(true);
    setError(null);
    try {
      if (isReimbursementIdMode && editReimbursementId) {
        const res = await fetch(`/api/reimbursements/${editReimbursementId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: newItem.amount,
            type: newItem.type,
            note: newItem.note,
            description: newItem.description,
          }),
        });
        if (res.ok) {
          setAddOpen(false);
          setEditReimbursementId(null);
          setEditStash(null);
          setEditPayslip(null);
          setEditItemIndex(-1);
          setAddAmount("");
          setAddType("");
          setAddNote("");
          setAddDescription("");
          await loadPayslips(true);
        } else {
          const data = await res.json();
          setError(data.message || "Failed to update reimbursement");
        }
      } else if (isStashMode && editStash) {
        const stashEntry = reimbursementStash.find((s) => s.month === editStash.month && s.year === editStash.year);
        const currentItems = stashEntry?.items ?? [];
        const updatedItems =
          editItemIndex >= 0
            ? currentItems.map((it, i) => (i === editItemIndex ? newItem : it))
            : [...currentItems, newItem];
        const res = await fetch("/api/reimbursement-stash", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            month: addMonth,
            year: addYear,
            items: updatedItems,
          }),
        });
        if (res.ok) {
          setAddOpen(false);
          setEditStash(null);
          setEditPayslip(null);
          setEditItemIndex(-1);
          setAddAmount("");
          setAddType("");
          setAddNote("");
          setAddDescription("");
          await loadPayslips(true);
        } else {
          const data = await res.json();
          setError(data.message || "Failed to update stashed reimbursement");
        }
      } else if (isEditMode && editPayslip != null && editItemIndex >= 0) {
        const currentItems = editPayslip.reimbursementItems ?? [];
        const updatedItems = [...currentItems];
        updatedItems[editItemIndex] = newItem;
        const res = await fetch(`/api/payslips/${editPayslip.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reimbursementItems: updatedItems }),
        });
        const data = await res.json();
        if (res.ok) {
          setAddOpen(false);
          setEditStash(null);
          setEditPayslip(null);
          setEditItemIndex(-1);
          setAddAmount("");
          setAddType("");
          setAddNote("");
          setAddDescription("");
          const updated = data.payslip && normalizePayslip(data.payslip as Payslip & { _id?: unknown });
          if (updated) {
            setPayslips((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
            );
          }
          await loadPayslips(true);
        } else {
          setError(data.message || "Failed to update reimbursement");
        }
      } else {
        const res = await fetch("/api/reimbursements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            month: addMonth,
            year: addYear,
            amount: newItem.amount,
            type: newItem.type,
            note: newItem.note,
            description: newItem.description,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setAddOpen(false);
          setAddAmount("");
          setAddType("");
          setAddNote("");
          setAddDescription("");
          await loadPayslips(true);
        } else {
          setError(data.message || "Failed to add reimbursement");
        }
      }
    } catch {
      setError("Failed to save reimbursement");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteReimbursement(row: ReimbursementRow) {
    if (!rowCanDelete(row)) {
      setError("Cannot delete reimbursement after invoice is paid.");
      return;
    }
    setDeletingRow(row);
  }

  async function handleApproval(reimbursementId: string, action: "approve" | "reject") {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/reimbursements/${reimbursementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || `Failed to ${action} reimbursement`);
        return;
      }
      await loadPayslips(true);
    } catch {
      setError(`Failed to ${action} reimbursement`);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteReimbursement() {
    if (!deletingRow) return;
    const row = deletingRow;
    const { month, year } = rowMonthYear(row);

    setIsDeleting(true);
    setError(null);
    try {
      if (row.item?.id) {
        const res = await fetch(`/api/reimbursements/${row.item.id}`, { method: "DELETE" });
        if (res.ok) await loadPayslips(true);
        else {
          const data = await res.json();
          setError(data.message || "Failed to delete reimbursement");
        }
      } else if (row.source === "stash") {
        const updatedItems =
          row.item != null ? row.items.filter((_, i) => i !== row.itemIndex) : [];
        if (updatedItems.length === 0) {
          const res = await fetch(
            `/api/reimbursement-stash?employeeId=${encodeURIComponent(employeeId)}&month=${month}&year=${year}`,
            { method: "DELETE" }
          );
          if (res.ok) await loadPayslips(true);
          else {
            const data = await res.json();
            setError(data.message || "Failed to delete stashed reimbursement");
          }
        } else {
          const res = await fetch("/api/reimbursement-stash", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeId, month, year, items: updatedItems }),
          });
          if (res.ok) await loadPayslips(true);
          else {
            const data = await res.json();
            setError(data.message || "Failed to remove reimbursement");
          }
        }
      } else if (row.source === "payslip") {
        if (row.item) {
          const currentItems = row.payslip.reimbursementItems ?? [];
          const updatedItems = currentItems.filter((_, i) => i !== row.itemIndex);
          const res = await fetch(`/api/payslips/${row.payslipId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reimbursementItems: updatedItems }),
          });
          if (res.ok) await loadPayslips(true);
          else {
            const data = await res.json();
            setError(data.message || "Failed to remove reimbursement");
          }
        }
      }
    } catch {
      setError("Failed to remove reimbursement");
    } finally {
      setIsDeleting(false);
      setDeletingRow(null);
    }
  }

  function openRequestEditDialog(id: string) {
    setRequestEditId(id);
    setRequestEditNote("");
    setRequestEditOpen(true);
    setError(null);
  }

  async function submitRequestEdit() {
    if (!requestEditId) return;
    setRequestEditSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/reimbursements/${requestEditId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editRequestNote: requestEditNote.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setRequestEditOpen(false);
        setRequestEditId(null);
        setRequestEditNote("");
        await loadPayslips(true);
      } else {
        setError(data.message || "Failed to submit edit request");
      }
    } catch {
      setError("Failed to submit edit request");
    } finally {
      setRequestEditSubmitting(false);
    }
  }

  function openEditDialog(row: ReimbursementRow) {
    const { month, year } = rowMonthYear(row);
    setAddMonth(month);
    setAddYear(year);
    setEditItemIndex(row.itemIndex);
    if (row.item?.id) {
      setEditReimbursementId(row.item.id);
      setEditStash(null);
      setEditPayslip(null);
    } else if (row.source === "stash") {
      setEditReimbursementId(null);
      setEditStash({ month, year });
      setEditPayslip(null);
    } else {
      setEditReimbursementId(null);
      setEditStash(null);
      setEditPayslip(row.source === "payslip" ? row.payslip : null);
    }
    if (row.item) {
      setAddAmount(String(row.item.amount));
      setAddType(row.item.type ?? "");
      setAddNote(row.item.note ?? "");
      setAddDescription(row.item.description ?? "");
    } else {
      setAddAmount("");
      setAddType("");
      setAddNote("");
      setAddDescription("");
    }
    setAddOpen(true);
  }

  function openAddDialog() {
    setEditPayslip(null);
    setEditStash(null);
    setEditReimbursementId(null);
    setEditItemIndex(-1);
    setAddOpen(true);
    if (allowedMonthYears.length) {
      const last = allowedMonthYears[allowedMonthYears.length - 1];
      setAddMonth(last.month);
      setAddYear(last.year);
    }
    setAddAmount("");
    setAddType("");
    setAddNote("");
    setAddDescription("");
  }

  function closeAddDialog() {
    setAddOpen(false);
    setEditPayslip(null);
    setEditStash(null);
    setEditReimbursementId(null);
    setEditItemIndex(-1);
    setAddAmount("");
    setAddType("");
    setAddNote("");
    setAddDescription("");
  }

  return (
    <>
      <Card className="shadow-sm min-w-0 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2 min-w-0 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" /> Reimbursement
            </CardTitle>
            <CardDescription>
              {dateOfHiring
                ? "Submit reimbursement requests for approval. Once approved, reimbursement is added to the current month salary cycle."
                : "Set the employee's date of joining to add reimbursements (only months from joining date onwards are allowed)."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => loadPayslips(true)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) closeAddDialog(); }}>
              <Button
                variant="default"
                onClick={openAddDialog}
                disabled={allowedMonthYears.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add reimbursement
              </Button>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{isEditMode ? "Edit reimbursement" : "Add reimbursement"}</DialogTitle>
                  <DialogDescription>
                    {isEditMode
                      ? "Update amount, type, and optional note/description. Changes will reflect on the payslip."
                      : "Select month/year. You can add multiple reimbursements for the same month. Type, note and description are saved."}
                  </DialogDescription>
                </DialogHeader>
                {allowedMonthYears.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Set the employee&apos;s date of joining to add reimbursements (only months from joining date onwards are allowed).
                  </p>
                ) : (
                  <>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Year</Label>
                          {isMonthYearFixed ? (
                            <p className="text-sm py-2 font-medium">{addYear}</p>
                          ) : (
                            <Select
                              value={String(addYear)}
                              onValueChange={(v) => {
                                setAddYear(Number(v));
                                const months = allowedMonthsForYear(Number(v));
                                if (months.length && !months.includes(addMonth)) {
                                  setAddMonth(months[months.length - 1]);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {allowedYears.map((y) => (
                                  <SelectItem key={y} value={String(y)}>
                                    {y}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Month</Label>
                          {isMonthYearFixed ? (
                            <p className="text-sm py-2 font-medium">{MONTH_NAMES[addMonth - 1]}</p>
                          ) : (
                            <Select value={String(addMonth)} onValueChange={(v) => setAddMonth(Number(v))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {allowedMonthsForYear(addYear).map((m) => (
                                  <SelectItem key={m} value={String(m)}>
                                    {MONTH_NAMES[m - 1]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Amount (₹)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="0"
                          value={addAmount}
                          onChange={(e) => setAddAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={addType} onValueChange={setAddType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {REIMBURSEMENT_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Note</Label>
                        <Input
                          placeholder="Short note"
                          value={addNote}
                          onChange={(e) => setAddNote(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Details (e.g. purpose, dates)"
                          rows={3}
                          value={addDescription}
                          onChange={(e) => setAddDescription(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={closeAddDialog} disabled={submitting}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveReimbursement} disabled={submitting}>
                        {submitting ? "Saving…" : "Save"}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
            <Dialog open={requestEditOpen} onOpenChange={(open) => { setRequestEditOpen(open); if (!open) setRequestEditId(null); setRequestEditNote(""); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request edit</DialogTitle>
                  <DialogDescription>Ask admin to update this reimbursement. Add a note describing what should be changed (optional).</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label>Note for admin</Label>
                  <Textarea
                    placeholder="e.g. Correct amount to ₹500, change type to Travel"
                    rows={3}
                    value={requestEditNote}
                    onChange={(e) => setRequestEditNote(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setRequestEditOpen(false); setRequestEditId(null); setRequestEditNote(""); }} disabled={requestEditSubmitting}>
                    Cancel
                  </Button>
                  <Button onClick={submitRequestEdit} disabled={requestEditSubmitting}>
                    {requestEditSubmitting ? "Sending…" : "Send request"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="mt-2 min-w-0">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              {error}
            </div>
          )}
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : reimbursementRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No payslips yet. {isAdmin ? "Generate a payslip from the Payslips tab first, or add reimbursement for a month (creates a payslip with reimbursement)." : "Use the Add reimbursement button above to submit a claim."}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payslip ID</TableHead>
                    <TableHead>Month / Year</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount (₹)</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reimbursementRows.map((row) => {
                    const { month, year } = rowMonthYear(row);
                    const key = rowKey(row);
                    const hasEditRequest = Boolean(row.item?.editRequestedAt);
                    const canRequestEdit = !isAdmin && row.item?.id;
                    const status = row.item?.status || "approved";
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-mono text-sm">
                          {row.source === "stash"
                            ? "Stashed (no payslip)"
                            : row.source === "orphan"
                              ? "Orphan (no payslip)"
                              : (row.payslip.payslipId || `PSL-${row.payslip.year}-${String(row.payslip.month).padStart(2, "0")}`)}
                        </TableCell>
                        <TableCell>
                          {MONTH_NAMES[month - 1]} {year}
                        </TableCell>
                        <TableCell>{row.item?.type || "~"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={status === "approved" ? "default" : status === "pending" ? "secondary" : "destructive"}
                            className="capitalize"
                            title={status === "rejected" ? row.item?.rejectionReason || "Rejected" : undefined}
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ₹{(row.item?.amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate" title={row.item?.note || undefined}>
                          {row.item?.note || "~"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={row.item?.description || undefined}>
                          {row.item?.description || "~"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {hasEditRequest && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="text-xs font-normal">
                                      Edit requested
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{row.item?.editRequestNote || "No note provided."}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {canRequestEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-muted-foreground"
                                onClick={() => openRequestEditDialog(row.item!.id!)}
                                title="Request edit"
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Request edit
                              </Button>
                            )}
                            {isAdmin && (
                              <>
                                {row.item?.id && status === "pending" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-600"
                                      onClick={() => handleApproval(row.item!.id!, "approve")}
                                      disabled={submitting}
                                      title="Approve (adds to current month salary)"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-600"
                                      onClick={() => handleApproval(row.item!.id!, "reject")}
                                      disabled={submitting}
                                      title="Reject"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openEditDialog(row)}
                                  title={row.item ? "Edit" : "Add item"}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {(row.item != null || row.source === "stash" || row.source === "orphan") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteReimbursement(row)}
                                    disabled={(deletingRow != null && rowKey(deletingRow) === key) || !rowCanDelete(row)}
                                    title={!rowCanDelete(row) ? "Cannot delete after invoice is paid" : row.item ? "Remove" : "Delete stashed reimbursement"}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deletingRow}
        onOpenChange={(open) => !open && setDeletingRow(null)}
        title="Remove Reimbursement"
        description={
          deletingRow?.item
            ? `Are you sure you want to remove the reimbursement of ₹${deletingRow.item.amount.toLocaleString("en-IN")}? This action cannot be undone.`
            : "Are you sure you want to remove this stashed reimbursement? This action cannot be undone."
        }
        onConfirm={confirmDeleteReimbursement}
        isLoading={isDeleting}
      />
    </>
  );
}
