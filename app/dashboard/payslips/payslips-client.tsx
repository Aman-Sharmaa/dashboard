"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type Payslip = {
  id: string;
  payslipId?: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail?: string;
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
  paidBy?: string | null;
  pdfUrl?: string;
  notes?: string;
};

type Employee = {
  id: string;
  name: string;
  email: string;
};

type Props = {
  userRole: string;
  employeeId: string | null;
  userEmail: string;
};

export default function PayslipsPageClient({ userRole, employeeId, userEmail }: Props) {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateEmployeeId, setGenerateEmployeeId] = useState<string>("");
  const [generateMonth, setGenerateMonth] = useState<number>(new Date().getMonth() + 1);
  const [generateYear, setGenerateYear] = useState<number>(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [payslipToDelete, setPayslipToDelete] = useState<Payslip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [payoutTab, setPayoutTab] = useState<"all" | "this_month" | "last_month">("all");

  const isAdmin = userRole === "admin";

  const loadEmployees = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (res.ok && data.employees) {
        setEmployees(data.employees);
      }
    } catch {
      // ignore
    }
  }, [isAdmin]);

  const loadPayslips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (isAdmin && selectedEmployeeId) {
        params.append("employeeId", selectedEmployeeId);
      } else if (employeeId) {
        params.append("employeeId", employeeId);
      }
      if (selectedMonth) {
        params.append("month", String(selectedMonth));
      }
      if (selectedYear) {
        params.append("year", String(selectedYear));
      }

      const res = await fetch(`/api/payslips?${params.toString()}`);
      const contentType = res.headers.get("content-type") || "";
      let data: { payslips?: Payslip[]; message?: string } | null = null;

      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch (parseError) {
          console.error("Failed to parse response:", parseError);
          setError("Invalid response from server. Please try again.");
          return;
        }
      } else {
        const text = await res.text();
        console.error("Non-JSON response:", text.slice(0, 200));
        setError(
          res.status >= 500
            ? "Server error. Please try again later."
            : "Failed to load payslips. Please try again."
        );
        return;
      }

      if (res.ok) {
        setPayslips(data?.payslips || []);
        setError(null);
      } else {
        const errorMessage = data?.message || `Failed to load payslips (${res.status})`;
        setError(errorMessage);
        if (res.status === 404 && errorMessage.includes("Employee profile not found")) {
          setError("Employee profile not found. Please contact your administrator.");
        }
      }
    } catch (err) {
      console.error("Error loading payslips:", err);
      setError("Failed to load payslips. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedEmployeeId, employeeId, selectedMonth, selectedYear]);

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
        toast.error(data.message || "Failed to update payslip");
      }
    } catch {
      toast.error("Failed to update payslip");
    }
  }

  async function handleGeneratePayslip() {
    if (!generateEmployeeId || generateEmployeeId === "__placeholder__") {
      toast.error("Please select an employee.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: generateEmployeeId,
          month: generateMonth,
          year: generateYear,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenerateOpen(false);
        setGenerateEmployeeId("");
        setGenerateMonth(new Date().getMonth() + 1);
        setGenerateYear(new Date().getFullYear());
        await loadPayslips();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to generate payslip");
      }
    } catch {
      toast.error("Failed to generate payslip");
    } finally {
      setGenerating(false);
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
        toast.success("Payslip deleted");
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to delete payslip");
      }
    } catch {
      toast.error("Failed to delete payslip");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDownload(payslip: Payslip) {
    if (!payslip.isPaid) {
      toast.error("Payslip must be marked as paid before download");
      return;
    }

    const url = `/api/payslips/${payslip.id}/download`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    loadPayslips();
    if (isAdmin) {
      loadEmployees();
    }
  }, [loadPayslips, loadEmployees, isAdmin]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const totalDeductions = (payslip: Payslip) => {
    const d = payslip.deductions;
    return (d.tds || 0) + (d.pf || 0) + (d.esic || 0) + (d.professionalTax || 0) +
      (d.advanceSalary || 0) + (d.attendanceDeduction || 0) + (d.other || 0);
  };

  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const lastMonthDate = new Date(thisYear, now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.getMonth() + 1;
  const lastMonthYear = lastMonthDate.getFullYear();

  const thisMonthPayslips = payslips.filter((p) => p.month === thisMonth && p.year === thisYear);
  const lastMonthPayslips = payslips.filter((p) => p.month === lastMonth && p.year === lastMonthYear);

  function payoutSummary(rows: Payslip[]) {
    return rows.reduce(
      (acc, p) => {
        acc.gross += p.grossSalary || 0;
        acc.reimbursement += p.reimbursement || 0;
        acc.deductions += totalDeductions(p);
        acc.net += p.netSalary || 0;
        return acc;
      },
      { gross: 0, reimbursement: 0, deductions: 0, net: 0 }
    );
  }

  const thisMonthSummary = payoutSummary(thisMonthPayslips);
  const lastMonthSummary = payoutSummary(lastMonthPayslips);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payslips</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Manage and view employee payslips."
              : "View and download your payslips."}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate payslip
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Generate payslip</DialogTitle>
                <DialogDescription>
                  Create a payslip for an employee for a given month and year. Gross salary, deductions (including attendance cut for unpaid leave), and net salary are calculated automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select
                    value={generateEmployeeId || "__placeholder__"}
                    onValueChange={(v) => setGenerateEmployeeId(v === "__placeholder__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__placeholder__">Select employee</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                        {monthNames.map((name, idx) => (
                          <SelectItem key={idx + 1} value={String(idx + 1)}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select
                      value={String(generateYear)}
                      onValueChange={(v) => setGenerateYear(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
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
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter payslips by employee, month, and year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {isAdmin && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select
                  value={selectedEmployeeId || "__all__"}
                  onValueChange={(value) => setSelectedEmployeeId(value === "__all__" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All employees</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Month</Label>
              <Select
                value={selectedMonth ? String(selectedMonth) : "__all__"}
                onValueChange={(value) => setSelectedMonth(value === "__all__" ? null : Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All months</SelectItem>
                  {monthNames.map((name, idx) => (
                    <SelectItem key={idx + 1} value={String(idx + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={String(selectedYear)}
                onValueChange={(value) => setSelectedYear(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payslips</CardTitle>
          <CardDescription>
            {payslips.length === 0
              ? "No payslips found"
              : `${payslips.length} payslip${payslips.length === 1 ? "" : "s"} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={payoutTab} onValueChange={(v) => setPayoutTab(v as "all" | "this_month" | "last_month")}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Payslips</TabsTrigger>
              <TabsTrigger value="this_month">This Month Payout</TabsTrigger>
              <TabsTrigger value="last_month">Last Month Payout</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : payslips.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payslips found for the selected filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payslip ID</TableHead>
                        {isAdmin && <TableHead>Employee</TableHead>}
                        <TableHead>Month/Year</TableHead>
                        <TableHead>Gross Salary</TableHead>
                        <TableHead>Reimbursement</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Status</TableHead>
                        {isAdmin && <TableHead>Paid</TableHead>}
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payslips.map((payslip) => (
                        <TableRow key={payslip.id}>
                          <TableCell className="font-mono text-sm">
                            {payslip.payslipId || `PSL-${payslip.year}-${String(payslip.month).padStart(2, "0")}`}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div>
                                <div className="font-medium">{payslip.employeeName || "N/A"}</div>
                                <div className="text-xs text-muted-foreground">{payslip.employeeEmail || ""}</div>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            {monthNames[payslip.month - 1]} {payslip.year}
                          </TableCell>
                          <TableCell>
                            ₹{payslip.grossSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            ₹{(payslip.reimbursement || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium pt-1">
                              ₹{totalDeductions(payslip).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              ₹{payslip.netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={payslip.isPaid ? "default" : "secondary"}>
                              {payslip.isPaid ? "Paid" : "Unpaid"}
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`paid-${payslip.id}`}
                                  checked={payslip.isPaid}
                                  onCheckedChange={(checked) => handleMarkPaid(payslip.id, checked === true)}
                                />
                                <Label htmlFor={`paid-${payslip.id}`} className="cursor-pointer">
                                  Paid this month
                                </Label>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(payslip)}
                                disabled={!payslip.isPaid}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(payslip)}
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
            </TabsContent>

            <TabsContent value="this_month" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Gross</p><p className="text-lg font-semibold">₹{thisMonthSummary.gross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Reimbursement</p><p className="text-lg font-semibold text-emerald-600">₹{thisMonthSummary.reimbursement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Deductions</p><p className="text-lg font-semibold text-amber-600">₹{thisMonthSummary.deductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Net Payout</p><p className="text-lg font-semibold">₹{thisMonthSummary.net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></CardContent></Card>
              </div>
              {thisMonthPayslips.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payouts found for {monthNames[thisMonth - 1]} {thisYear}.</p>
              ) : (
                <p className="text-sm text-muted-foreground">{thisMonthPayslips.length} payslip(s) included.</p>
              )}
            </TabsContent>

            <TabsContent value="last_month" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Gross</p><p className="text-lg font-semibold">₹{lastMonthSummary.gross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Reimbursement</p><p className="text-lg font-semibold text-emerald-600">₹{lastMonthSummary.reimbursement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Deductions</p><p className="text-lg font-semibold text-amber-600">₹{lastMonthSummary.deductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Net Payout</p><p className="text-lg font-semibold">₹{lastMonthSummary.net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></CardContent></Card>
              </div>
              {lastMonthPayslips.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payouts found for {monthNames[lastMonth - 1]} {lastMonthYear}.</p>
              ) : (
                <p className="text-sm text-muted-foreground">{lastMonthPayslips.length} payslip(s) included.</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!payslipToDelete}
        onOpenChange={(open) => !open && setPayslipToDelete(null)}
        title="Delete Payslip"
        description={`Are you sure you want to delete payslip ${payslipToDelete?.payslipId || (payslipToDelete ? `${monthNames[payslipToDelete.month - 1]}/${payslipToDelete.year}` : "")}? This cannot be undone.`}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        variant="destructive"
      />
    </div>
  );
}
