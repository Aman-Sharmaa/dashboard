"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  CalendarDays,
  Minus,
  Plus,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

type MonthlyBreakdown = {
  month: string;
  casual: number;
  sick: number;
  unpaid: number;
  total: number;
};

type LeaveBalance = {
  casualLeaveBalance: number;
  casualLeaveTotal: number;
  sickLeaveBalance: number;
  sickLeaveTotal: number;
};

export function EmployeeLeaveBalance({
  employeeId,
  isAdmin,
}: {
  employeeId: string;
  isAdmin: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [monthly, setMonthly] = useState<MonthlyBreakdown[]>([]);
  const [totalLeaves, setTotalLeaves] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    casualLeaveBalance: "",
    casualLeaveTotal: "",
    sickLeaveBalance: "",
    sickLeaveTotal: "",
  });
  const [saving, setSaving] = useState(false);

  const [deductOpen, setDeductOpen] = useState(false);
  const [deductForm, setDeductForm] = useState({
    type: "casual" as "casual" | "sick",
    amount: "1",
  });
  const [deducting, setDeducting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/leave-history?employeeId=${employeeId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBalance(data.balance);
      setMonthly(data.monthlyBreakdown || []);
      setTotalLeaves(data.totalLeaves || 0);
    } catch {
      toast.error("Failed to load leave data");
    } finally {
      setLoading(false);
    }
  }

  function openEdit() {
    if (!balance) return;
    setEditForm({
      casualLeaveBalance: balance.casualLeaveBalance.toString(),
      casualLeaveTotal: balance.casualLeaveTotal.toString(),
      sickLeaveBalance: balance.sickLeaveBalance.toString(),
      sickLeaveTotal: balance.sickLeaveTotal.toString(),
    });
    setEditOpen(true);
  }

  async function handleEditSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "leaves",
          casualLeaveBalance: Number(editForm.casualLeaveBalance),
          casualLeaveTotal: Number(editForm.casualLeaveTotal),
          sickLeaveBalance: Number(editForm.sickLeaveBalance),
          sickLeaveTotal: Number(editForm.sickLeaveTotal),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Failed to save");
      }
      toast.success("Leave balance updated");
      setEditOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeduct() {
    setDeducting(true);
    try {
      const amount = Number(deductForm.amount);
      if (amount <= 0) throw new Error("Amount must be positive");
      if (!balance) throw new Error("No balance data");

      const field = deductForm.type === "casual" ? "casualLeaveBalance" : "sickLeaveBalance";
      const current = deductForm.type === "casual" ? balance.casualLeaveBalance : balance.sickLeaveBalance;
      const newVal = Math.max(0, current - amount);

      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "leaves",
          [field]: newVal,
          casualLeaveTotal: balance.casualLeaveTotal,
          sickLeaveTotal: balance.sickLeaveTotal,
          ...(field === "casualLeaveBalance"
            ? { sickLeaveBalance: balance.sickLeaveBalance }
            : { casualLeaveBalance: balance.casualLeaveBalance }),
        }),
      });
      if (!res.ok) throw new Error("Failed to deduct");
      toast.success(`Deducted ${amount} ${deductForm.type} leave(s)`);
      setDeductOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to deduct");
    } finally {
      setDeducting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Casual Leaves
            </p>
            <p className="text-3xl font-bold">
              {balance?.casualLeaveBalance ?? 0}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {balance?.casualLeaveTotal ?? 0}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Sick Leaves
            </p>
            <p className="text-3xl font-bold">
              {balance?.sickLeaveBalance ?? 0}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {balance?.sickLeaveTotal ?? 0}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Total Used
            </p>
            <p className="text-3xl font-bold">{totalLeaves}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Available
            </p>
            <p className="text-3xl font-bold text-emerald-600">
              {(balance?.casualLeaveBalance ?? 0) + (balance?.sickLeaveBalance ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={openEdit} className="gap-2">
            <Pencil className="h-3.5 w-3.5" />
            Edit Balance
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeductOpen(true)} className="gap-2">
            <Minus className="h-3.5 w-3.5" />
            Deduct Leave
          </Button>
        </div>
      )}

      {/* Monthly breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Monthly Breakdown
          </CardTitle>
          <CardDescription>Leaves taken per month</CardDescription>
        </CardHeader>
        <CardContent>
          {monthly.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No leave records found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Month</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Casual</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Sick</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Unpaid</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((row) => (
                    <tr key={row.month} className="border-b last:border-0">
                      <td className="py-3 font-medium">{row.month}</td>
                      <td className="py-3 text-center">
                        {row.casual > 0 ? (
                          <Badge variant="secondary">{row.casual}</Badge>
                        ) : (
                          <span className="text-muted-foreground">~</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {row.sick > 0 ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                            {row.sick}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">~</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {row.unpaid > 0 ? (
                          <Badge variant="destructive">{row.unpaid}</Badge>
                        ) : (
                          <span className="text-muted-foreground">~</span>
                        )}
                      </td>
                      <td className="py-3 text-center font-semibold">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Leave Balance</DialogTitle>
            <DialogDescription>
              Manually set the leave balance. This will mark as manual override.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Casual Balance</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.casualLeaveBalance}
                  onChange={(e) => setEditForm((f) => ({ ...f, casualLeaveBalance: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Casual Total</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.casualLeaveTotal}
                  onChange={(e) => setEditForm((f) => ({ ...f, casualLeaveTotal: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sick Balance</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.sickLeaveBalance}
                  onChange={(e) => setEditForm((f) => ({ ...f, sickLeaveBalance: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Sick Total</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.sickLeaveTotal}
                  onChange={(e) => setEditForm((f) => ({ ...f, sickLeaveTotal: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deduct Dialog */}
      <Dialog open={deductOpen} onOpenChange={setDeductOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deduct Leave</DialogTitle>
            <DialogDescription>
              Deduct a specific number of leaves from the balance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select
                value={deductForm.type}
                onValueChange={(v) => setDeductForm((f) => ({ ...f, type: v as "casual" | "sick" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of days</Label>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={deductForm.amount}
                onChange={(e) => setDeductForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeductOpen(false)} disabled={deducting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeduct} disabled={deducting}>
              {deducting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deduct
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
