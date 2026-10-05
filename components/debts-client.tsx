"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Loader2,
  MoreHorizontal,
  TrendingDown,
  TrendingUp,
  Edit,
  Trash2,
  CheckCircle2,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";

interface Debt {
  id: string;
  type: "taken" | "given";
  party: string;
  amount: number;
  currency: string;
  date: string;
  dueDate?: string | null;
  notes?: string | null;
  status: "pending" | "settled" | "partial";
  settledAmount: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  settled: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  partial: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

type TabType = "all" | "taken" | "given";
type StatusFilter = "all" | "pending" | "settled" | "partial";

const emptyForm = {
  type: "taken" as "taken" | "given",
  party: "",
  amount: "",
  currency: "INR",
  date: new Date().toISOString().split("T")[0],
  dueDate: "",
  notes: "",
  status: "pending" as "pending" | "settled" | "partial",
  settledAmount: "",
};

export default function DebtsClient() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState<Debt | null>(null);
  const [settleAmount, setSettleAmount] = useState("");

  const loadDebts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/debts");
      const data = await res.json();
      setDebts(data.debts || []);
    } catch {
      toast.error("Failed to load debts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();
  }, []);

  const filtered = useMemo(() => {
    return debts.filter((d) => {
      if (activeTab !== "all" && d.type !== activeTab) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return true;
    });
  }, [debts, activeTab, statusFilter]);

  const totalTaken = useMemo(() =>
    debts.filter((d) => d.type === "taken").reduce((s, d) => s + (d.amount - (d.settledAmount || 0)), 0),
    [debts]
  );

  const totalGiven = useMemo(() =>
    debts.filter((d) => d.type === "given").reduce((s, d) => s + (d.amount - (d.settledAmount || 0)), 0),
    [debts]
  );

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (debt: Debt) => {
    setEditing(debt);
    setForm({
      type: debt.type,
      party: debt.party,
      amount: String(debt.amount),
      currency: debt.currency,
      date: debt.date ? new Date(debt.date).toISOString().split("T")[0] : "",
      dueDate: debt.dueDate ? new Date(debt.dueDate).toISOString().split("T")[0] : "",
      notes: debt.notes || "",
      status: debt.status,
      settledAmount: String(debt.settledAmount || 0),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.party || !form.amount) {
      toast.error("Party and amount are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        party: form.party,
        amount: parseFloat(form.amount),
        currency: form.currency,
        date: form.date,
        dueDate: form.dueDate || null,
        notes: form.notes || null,
        status: form.status,
        settledAmount: parseFloat(form.settledAmount || "0"),
      };

      if (editing) {
        const res = await fetch(`/api/debts/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("Debt updated");
      } else {
        const res = await fetch("/api/debts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("Debt added");
      }

      setDialogOpen(false);
      loadDebts();
    } catch {
      toast.error("Failed to save debt");
    } finally {
      setSaving(false);
    }
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/debts/${deleteTargetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Debt entry deleted successfully");
      setDebts((prev) => prev.filter((d) => d.id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch {
      toast.error("Failed to delete debt");
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const markSettled = async (debt: Debt) => {
    try {
      const res = await fetch(`/api/debts/${debt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "settled", settledAmount: debt.amount }),
      });
      if (!res.ok) throw new Error();
      toast.success("Marked as settled");
      loadDebts();
    } catch {
      toast.error("Failed");
    }
  };

  const handlePartialSettle = async () => {
    if (!settleTarget) return;
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      const newSettled = (settleTarget.settledAmount || 0) + amt;
      const newStatus = newSettled >= settleTarget.amount ? "settled" : "partial";
      const res = await fetch(`/api/debts/${settleTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settledAmount: newSettled, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Payment recorded");
      setSettleDialogOpen(false);
      setSettleTarget(null);
      setSettleAmount("");
      loadDebts();
    } catch {
      toast.error("Failed");
    }
  };

  const fmt = (n: number, currency = "INR") =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const tabs: { value: TabType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "taken", label: "Taken (Owe)" },
    { value: "given", label: "Given (Receivable)" },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-6">
      {/* Delete Debt Dialog */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
        title="Delete Debt Entry?"
        description="Are you sure you want to delete this debt record? This action cannot be undone."
        confirmLabel={deleting ? "Deleting..." : "Delete Debt"}
        variant="destructive"
        isLoading={deleting}
        onConfirm={executeDelete}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Debts</h1>
          <p className="text-muted-foreground mt-1">Track money taken and given</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Debt
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Owed (Taken)</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{fmt(totalTaken)}</p>
            <p className="text-xs text-muted-foreground">Remaining to repay</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Receivable (Given)</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(totalGiven)}</p>
            <p className="text-xs text-muted-foreground">Remaining to collect</p>
          </div>
        </div>
      </div>

      {/* Tabs + Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === t.value
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="settled">Settled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Settled</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No debt entries found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((debt) => (
                  <TableRow key={debt.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${debt.type === "taken"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          }`}
                      >
                        {debt.type === "taken" ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : (
                          <TrendingUp className="h-3 w-3" />
                        )}
                        {debt.type === "taken" ? "Taken" : "Given"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{debt.party}</TableCell>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-1">
                        <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                        {debt.amount.toLocaleString("en-IN")}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {(debt.settledAmount || 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {debt.date ? new Date(debt.date).toLocaleDateString("en-IN") : "~"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {debt.dueDate ? (
                        <span
                          className={`${new Date(debt.dueDate) < new Date() && debt.status !== "settled"
                              ? "text-red-500 font-medium"
                              : "text-muted-foreground"
                            }`}
                        >
                          {new Date(debt.dueDate).toLocaleDateString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">~</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[debt.status]}`}>
                        {debt.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                      {debt.notes || "~"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(debt)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {debt.status !== "settled" && (
                            <>
                              <DropdownMenuItem onClick={() => markSettled(debt)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark Settled
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSettleTarget(debt);
                                  setSettleAmount("");
                                  setSettleDialogOpen(true);
                                }}
                              >
                                <IndianRupee className="h-4 w-4 mr-2" />
                                Record Payment
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(debt.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Debt" : "Add Debt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as "taken" | "given" }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="taken">Taken (I owe)</SelectItem>
                    <SelectItem value="given">Given (They owe me)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR ₹</SelectItem>
                    <SelectItem value="USD">USD $</SelectItem>
                    <SelectItem value="EUR">EUR €</SelectItem>
                    <SelectItem value="GBP">GBP £</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Party (Person / Entity)</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Rahul Sharma, XYZ Bank"
                value={form.party}
                onChange={(e) => setForm((f) => ({ ...f, party: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Settled Amount</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.settledAmount}
                  onChange={(e) => setForm((f) => ({ ...f, settledAmount: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  className="mt-1"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Due Date (optional)</Label>
                <Input
                  className="mt-1"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>

            {editing && (
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="settled">Settled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                className="mt-1"
                rows={2}
                placeholder="Any additional notes..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Update" : "Add Debt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partial Settle Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {settleTarget && (
              <p className="text-sm text-muted-foreground">
                Remaining:{" "}
                <strong>
                  {fmt(settleTarget.amount - (settleTarget.settledAmount || 0), settleTarget.currency)}
                </strong>{" "}
                from {settleTarget.party}
              </p>
            )}
            <div>
              <Label>Payment Amount</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                placeholder="0"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePartialSettle}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
