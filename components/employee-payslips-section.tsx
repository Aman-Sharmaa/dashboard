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
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Plus, Download, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Payslip = {
  id: string;
  payslipId?: string;
  employeeId: string;
  month: number;
  year: number;
  grossSalary: number;
  reimbursement?: number;
  deductions: {
    tds?: number;
    pf?: number;
    esic?: number;
    professionalTax?: number;
    advanceSalary?: number;
    attendanceDeduction?: number;
    other?: number;
  };
  netSalary: number;
  isPaid: boolean;
  paidAt?: string;
  pdfUrl?: string;
  notes?: string;
};

type Props = {
  employeeId: string;
  isAdmin: boolean;
  /** ISO date string (YYYY-MM-DD) or null; used to restrict generate to joining date through today */
  dateOfHiring?: string | null;
};

function totalDeductions(payslip: Payslip) {
  const d = payslip.deductions;
  return (d.tds || 0) + (d.pf || 0) + (d.esic || 0) + (d.professionalTax || 0) +
    (d.advanceSalary || 0) + (d.attendanceDeduction || 0) + (d.other || 0);
}

export function EmployeePayslipsSection({ employeeId, isAdmin, dateOfHiring }: Props) {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(() => new Date().getMonth() + 1);
  const [generateYear, setGenerateYear] = useState(() => new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [payslipToDelete, setPayslipToDelete] = useState<Payslip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);

  const loadPayslips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payslips?employeeId=${encodeURIComponent(employeeId)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to load payslips");
        setPayslips([]);
        return;
      }
      setPayslips(data.payslips || []);
    } catch {
      setError("Failed to load payslips");
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  // Existing (month, year) that already have a payslip ~ don't offer them for generate again
  const existingMonthYears = useMemo(
    () => new Set(payslips.map((p) => `${p.year}-${p.month}`)),
    [payslips]
  );

  // Allowed (month, year) for generate: only from joining date through current month, excluding already generated
  const allowedGenerateOptions = useMemo(() => {
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
      const monthStart = y === startYear ? startMonth : 1;
      const monthEnd = y === currentYear ? currentMonth : 12;
      for (let m = monthStart; m <= monthEnd; m++) {
        if (!existingMonthYears.has(`${y}-${m}`)) {
          options.push({ month: m, year: y });
        }
      }
    }
    return options.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  }, [dateOfHiring, existingMonthYears]);

  const allowedYears = useMemo(() => {
    const years = Array.from(new Set(allowedGenerateOptions.map((o) => o.year))).sort((a, b) => b - a);
    return years;
  }, [allowedGenerateOptions]);

  const allowedMonthsForYear = useMemo(() => {
    return (year: number) =>
      allowedGenerateOptions
        .filter((o) => o.year === year)
        .map((o) => o.month)
        .sort((a, b) => a - b);
  }, [allowedGenerateOptions]);

  const isGenerateOptionValid = useMemo(() => {
    return (month: number, year: number) =>
      allowedGenerateOptions.some((o) => o.month === month && o.year === year);
  }, [allowedGenerateOptions]);

  // Clamp current generate month/year to allowed range when dialog opens or options change
  useEffect(() => {
    if (!allowedGenerateOptions.length) return;
    const last = allowedGenerateOptions[allowedGenerateOptions.length - 1];
    if (!isGenerateOptionValid(generateMonth, generateYear)) {
      setGenerateMonth(last.month);
      setGenerateYear(last.year);
    }
  }, [allowedGenerateOptions, isGenerateOptionValid, generateMonth, generateYear]);

  async function handleGeneratePayslip() {
    if (!isGenerateOptionValid(generateMonth, generateYear)) {
      setError("Selected month/year is outside the allowed range (joining date to current month).");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          month: generateMonth,
          year: generateYear,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenerateOpen(false);
        await loadPayslips();
      } else {
        setError(data.message || "Failed to generate payslip");
      }
    } catch {
      setError("Failed to generate payslip");
    } finally {
      setGenerating(false);
    }
  }

  async function handleMarkPaid(payslipId: string, isPaid: boolean) {
    try {
      const res = await fetch(`/api/payslips/${payslipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid }),
      });
      if (res.ok) {
        await loadPayslips();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to update payslip");
      }
    } catch {
      setError("Failed to update payslip");
    }
  }

  async function handleDelete(payslip: Payslip) {
    setPayslipToDelete(payslip);
  }

  async function confirmDelete() {
    if (!payslipToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/payslips/${payslipToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setPayslipToDelete(null);
        await loadPayslips();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to delete payslip");
      }
    } catch {
      setError("Failed to delete payslip");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeleteAll() {
    if (payslips.length === 0) return;
    setShowConfirmDeleteAll(true);
  }

  async function confirmDeleteAll() {
    setDeletingAll(true);
    setError(null);
    try {
      for (const p of payslips) {
        await fetch(`/api/payslips/${p.id}`, { method: "DELETE" });
      }
      setShowConfirmDeleteAll(false);
      await loadPayslips();
    } catch {
      setError("Failed to delete some payslips");
    } finally {
      setDeletingAll(false);
    }
  }

  async function handleDownload(payslip: Payslip) {
    try {
      const res = await fetch(`/api/payslips/${payslip.id}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${payslip.payslipId || `payslip-${payslip.year}-${String(payslip.month).padStart(2, "0")}`}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to download payslip");
      }
    } catch {
      setError("Failed to download payslip");
    }
  }

  return (
    <Card className="shadow-sm min-w-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2 min-w-0 flex-wrap">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Payslips
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Generate, mark as paid, and manage payslips for this employee. Generation is allowed only from joining date to current month."
              : "View and download your payslips."}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
                <Button variant="default" onClick={() => setGenerateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate payslip
                </Button>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Generate payslip</DialogTitle>
                    <DialogDescription>
                      Create a payslip for this employee. Only months from joining date through current month that don't already have a payslip are shown.
                    </DialogDescription>
                  </DialogHeader>
                  {allowedGenerateOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      {!dateOfHiring
                        ? "Set the employee's date of joining to generate payslips. Generation is allowed only from joining date to current month."
                        : "Payslips have already been generated for all available months (joining date through current month)."}
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Year</Label>
                            <Select
                              value={String(generateYear)}
                              onValueChange={(v) => {
                                setGenerateYear(Number(v));
                                const months = allowedMonthsForYear(Number(v));
                                if (months.length && !months.includes(generateMonth)) {
                                  setGenerateMonth(months[months.length - 1]);
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
                          </div>
                          <div className="space-y-2">
                            <Label>Month</Label>
                            <Select
                              value={String(generateMonth)}
                              onValueChange={(v) => setGenerateMonth(Number(v))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {allowedMonthsForYear(generateYear).map((m) => (
                                  <SelectItem key={m} value={String(m)}>
                                    {MONTH_NAMES[m - 1]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setGenerateOpen(false)} disabled={generating}>
                          Cancel
                        </Button>
                        <Button onClick={handleGeneratePayslip} disabled={generating}>
                          {generating ? "Generating…" : "Generate"}
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
              {payslips.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {deletingAll ? "Deleting…" : "Delete all payslips"}
                </Button>
              )}
            </>
          )}
          <Button variant="ghost" size="sm" onClick={loadPayslips} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="mt-2 min-w-0">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading payslips…</p>
        ) : payslips.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No payslips yet. {isAdmin && "Use Generate payslip to create one (from joining date to current month)."}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payslip ID</TableHead>
                  <TableHead>Month / Year</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Reimbursement</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Mark as paid</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">
                      {p.payslipId || `PSL-${p.year}-${String(p.month).padStart(2, "0")}`}
                    </TableCell>
                    <TableCell>
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </TableCell>
                    <TableCell>
                      ₹{p.grossSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {(p.reimbursement ?? 0) > 0
                        ? `₹${(p.reimbursement ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        : "~"}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-sm">
                        {p.deductions.tds != null && p.deductions.tds > 0 && (
                          <div>TDS: ₹{p.deductions.tds.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                        )}
                        {p.deductions.pf != null && p.deductions.pf > 0 && (
                          <div>PF: ₹{p.deductions.pf.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                        )}
                        {p.deductions.attendanceDeduction != null && p.deductions.attendanceDeduction > 0 && (
                          <div className="text-orange-600">Attendance: ₹{p.deductions.attendanceDeduction.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                        )}
                        <div className="font-medium pt-0.5 border-t">
                          Total: ₹{totalDeductions(p).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        ₹{p.netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={p.isPaid ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                        {p.isPaid ? "Paid" : "Unpaid"}
                      </span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`paid-${p.id}`}
                            checked={p.isPaid}
                            onCheckedChange={(checked) => handleMarkPaid(p.id, checked === true)}
                          />
                          <Label htmlFor={`paid-${p.id}`} className="cursor-pointer text-xs">
                            Paid
                          </Label>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(p)}
                          disabled={!p.isPaid}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(p)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!payslipToDelete}
        onOpenChange={(open) => !open && setPayslipToDelete(null)}
        title="Delete Payslip"
        description={`Are you sure you want to delete payslip ${payslipToDelete?.payslipId || (payslipToDelete ? `${MONTH_NAMES[payslipToDelete.month - 1]}/${payslipToDelete.year}` : "")}? This cannot be undone.`}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        variant="destructive"
      />

      <ConfirmDialog
        open={showConfirmDeleteAll}
        onOpenChange={setShowConfirmDeleteAll}
        title="Delete All Payslips"
        description={`Are you sure you want to delete all ${payslips.length} payslips for this employee? This action cannot be undone.`}
        onConfirm={confirmDeleteAll}
        isLoading={deletingAll}
        variant="destructive"
      />
    </Card>
  );
}
