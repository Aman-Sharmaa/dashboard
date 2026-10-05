"use client";

import dynamic from "next/dynamic";
import { User, Lock } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

const SidebarOrderSettings = dynamic(
  () => import("@/components/sidebar-order-settings").then((m) => m.SidebarOrderSettings),
  { ssr: false }
);
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EmployeeDetails = {
  name: string;
  email: string;
  title?: string;
  department?: string;
  type?: string;
  location?: string;
  phoneNumber?: string;
  dateOfHiring?: string;
  employeeId?: number;
};

type Props = {
  employee: EmployeeDetails;
};

export function SettingsEmployeeView({ employee }: Props) {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b pb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My details</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your profile information. Contact your administrator to update any details.
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Lock className="h-4 w-4" />
          <span>Read-only</span>
        </div>
      </div>

      <SidebarOrderSettings />

      <p className="text-sm text-muted-foreground -mt-4">
        On <strong>/dashboard</strong> you can show or hide overview blocks with <strong>Dashboard layout</strong> at the top of the page.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" /> Profile
          </CardTitle>
          <CardDescription>
            Your details as recorded in the organisation. Changes must be made by an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emp-name">Name</Label>
              <Input
                id="emp-name"
                value={employee.name ?? ""}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-email">Email</Label>
              <Input
                id="emp-email"
                type="email"
                value={employee.email ?? ""}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emp-phone">Phone</Label>
              <Input
                id="emp-phone"
                value={employee.phoneNumber ?? ""}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
                placeholder="~"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-title">Title</Label>
              <Input
                id="emp-title"
                value={employee.title ?? ""}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
                placeholder="~"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emp-department">Department</Label>
              <Input
                id="emp-department"
                value={employee.department ?? ""}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
                placeholder="~"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-type">Type</Label>
              <Input
                id="emp-type"
                value={employee.type ?? ""}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
                placeholder="~"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emp-location">Location</Label>
              <Input
                id="emp-location"
                value={employee.location ?? ""}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
                placeholder="~"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-id">Employee ID</Label>
              <Input
                id="emp-id"
                value={employee.employeeId != null ? String(employee.employeeId) : ""}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
                placeholder="~"
              />
            </div>
          </div>
          {employee.dateOfHiring && (
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="emp-doh">Date of hiring</Label>
              <Input
                id="emp-doh"
                value={employee.dateOfHiring}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <UnpaidLeavesSection />
    </div>
  );
}

// ─── Unpaid Leaves Section ───
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Clock, CheckCircle2, XCircle, PlusCircle } from "lucide-react";

type UnpaidLeaveRow = {
  _id: string;
  reason: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  createdAt: string;
};

function UnpaidLeavesSection() {
  const [leaves, setLeaves] = useState<UnpaidLeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [totalApproved, setTotalApproved] = useState(0);

  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [days, setDays] = useState<number | "">("");

  useEffect(() => {
    fetch("/api/unpaid-leaves")
      .then((r) => r.json())
      .then((data) => {
        setLeaves(data.leaves || []);
        const approved = (data.leaves || []).filter((l: UnpaidLeaveRow) => l.status === "approved");
        setTotalApproved(approved.reduce((acc: number, l: UnpaidLeaveRow) => acc + l.days, 0));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason || !startDate || !endDate || !days) {
      toast.error("All fields are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/unpaid-leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, startDate, endDate, days: Number(days) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to apply");
      toast.success("Unpaid leave application submitted!");
      setLeaves((prev) => [data.leave, ...prev]);
      setShowForm(false);
      setReason("");
      setStartDate("");
      setEndDate("");
      setDays("");
    } catch (err: any) {
      toast.error(err.message || "Failed to apply");
    } finally {
      setSubmitting(false);
    }
  }

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function executeDelete() {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/unpaid-leaves/${deleteTargetId}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      toast.success("Leave request cancelled");
      setLeaves((prev) => prev.filter((l) => l._id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel");
    } finally {
      setDeleting(false);
    }
  }

  function handleDelete(id: string) {
    setDeleteTargetId(id);
  }

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-100 text-green-800 border-0 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    if (status === "rejected") return <Badge className="bg-red-100 text-red-800 border-0 text-[10px]"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    return <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  return (
    <Card>
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
        title="Cancel Leave Request?"
        description="Are you sure you want to cancel this unpaid leave request?"
        confirmLabel={deleting ? "Cancelling..." : "Cancel Leave Request"}
        variant="destructive"
        isLoading={deleting}
        onConfirm={executeDelete}
      />
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Unpaid Leaves
            </CardTitle>
            <CardDescription className="mt-1">
              Apply for unpaid leave. Approved days will be deducted from your payslip automatically.
              {totalApproved > 0 && (
                <span className="ml-2 font-semibold text-orange-600">
                  {totalApproved} day(s) approved this year.
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant={showForm ? "outline" : "default"}
            className="rounded-xl text-xs"
            onClick={() => setShowForm((v) => !v)}
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            {showForm ? "Cancel" : "Apply"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-xl border bg-muted/30">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Days</Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={days}
                  onChange={(e) => setDays(e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 1.5"
                  className="h-8 text-sm"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly explain the reason for your leave..."
                className="text-sm min-h-[70px]"
                required
              />
            </div>
            <Button type="submit" size="sm" className="rounded-xl text-xs" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : leaves.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No unpaid leave requests yet.</p>
        ) : (
          <div className="space-y-2">
            {leaves.map((l) => (
              <div key={l._id} className="flex items-start justify-between gap-3 p-3 rounded-xl border bg-white">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge(l.status)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
                    </span>
                    <span className="text-xs font-semibold text-neutral-800">{l.days} day(s)</span>
                  </div>
                  <p className="text-xs text-neutral-700 truncate">{l.reason}</p>
                  {l.adminNote && (
                    <p className="text-[10px] text-muted-foreground italic">Admin: {l.adminNote}</p>
                  )}
                </div>
                {l.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDelete(l._id)}
                    title="Cancel request"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
