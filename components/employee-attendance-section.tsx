"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, LogIn, LogOut } from "lucide-react";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";

type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  status: string;
  leaveType?: string;
  approvalStatus: string;
  reason?: string;
  checkInAt?: string;
  checkOutAt?: string;
};

type Props = {
  employeeId: string;
  userRole: string;
  userEmail: string;
  isViewingSelf: boolean;
};

export function EmployeeAttendanceSection({
  employeeId,
  userRole,
  userEmail,
  isViewingSelf,
}: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policyLeaveTypes, setPolicyLeaveTypes] = useState<string[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<{
    casualLeaveBalance?: number;
    sickLeaveBalance?: number;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"present" | "absent" | "leave">("leave");
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");
  const [checkInAt, setCheckInAt] = useState("");
  const [checkOutAt, setCheckOutAt] = useState("");
  const [leaveDateRange, setLeaveDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const isAdmin = userRole === "admin";
  const isEmployee = userRole === "employee";

  async function loadRecords() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attendance?employeeId=${encodeURIComponent(employeeId)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to load attendance");
        return;
      }
      setRecords(
        (data.attendance || []).map((r: AttendanceRecord & { date?: string }) => ({
          id: r.id,
          employeeId: r.employeeId,
          date: r.date,
          status: r.status,
          leaveType: r.leaveType,
          approvalStatus: r.approvalStatus,
          reason: r.reason,
          checkInAt: r.checkInAt,
          checkOutAt: r.checkOutAt,
        }))
      );
    } catch {
      setError("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkspacePolicy() {
    try {
      const res = await fetch("/api/company");
      if (!res.ok) return;
      const data = await res.json();
      const settings = data.profile?.leaveSettings;
      if (settings) {
        setPolicyLeaveTypes(Array.isArray(settings.leaveTypes) ? settings.leaveTypes : []);
      }
    } catch {
      setPolicyLeaveTypes([]);
    }
  }

  async function loadCurrentEmployee() {
    if (!isViewingSelf && !isAdmin) return;
    try {
      const res = await fetch(`/api/employees/${employeeId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.employee) {
        setCurrentEmployee({
          casualLeaveBalance: data.employee.casualLeaveBalance ?? 0,
          sickLeaveBalance: data.employee.sickLeaveBalance ?? 0,
        });
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadRecords();
    loadWorkspacePolicy();
    loadCurrentEmployee();
  }, [employeeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "leave") {
      if (policyLeaveTypes.length === 0) {
        setError("Leave is not available. No leave types configured.");
        return;
      }
      if (!leaveType) {
        setError("Please select a leave type");
        return;
      }
      const isCasual = leaveType.toLowerCase().includes("casual");
      const isSick = leaveType.toLowerCase().includes("sick");
      const isUnpaid = leaveType.toLowerCase().includes("unpaid");
      if (!isUnpaid && currentEmployee) {
        if (isCasual && (currentEmployee.casualLeaveBalance || 0) <= 0) {
          setError("No casual leave balance available");
          return;
        }
        if (isSick && (currentEmployee.sickLeaveBalance || 0) <= 0) {
          setError("No sick leave balance available");
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const isEditing = Boolean(editingId);

      if (status === "leave" && !isEditing && leaveDateRange.from && leaveDateRange.to) {
        const from = leaveDateRange.from;
        const to = leaveDateRange.to;
        const days: string[] = [];
        const d = new Date(from);
        while (d <= to) {
          days.push(d.toISOString().slice(0, 10));
          d.setDate(d.getDate() + 1);
        }

        for (const day of days) {
          const body: Record<string, unknown> = {
            date: day,
            status: "leave",
            leaveType: leaveType || undefined,
            reason: reason || undefined,
            leaveFrom: from.toISOString(),
            leaveTo: to.toISOString(),
          };
          if (isAdmin) body.employeeId = employeeId;
          const res = await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            if (!data.message?.includes("already exists")) {
              setError(data.message || `Failed to submit leave for ${day}`);
            }
          }
        }
      } else {
        const url = isEditing ? `/api/attendance/${editingId}` : "/api/attendance";
        const method = isEditing ? "PUT" : "POST";
        const body: Record<string, unknown> = {
          date,
          status,
          leaveType: leaveType || undefined,
          reason: reason || undefined,
        };
        if (!isEditing && isAdmin) {
          body.employeeId = employeeId;
        }
        if (checkInAt?.trim()) body.checkInAt = new Date(checkInAt).toISOString();
        if (checkOutAt?.trim()) body.checkOutAt = new Date(checkOutAt).toISOString();
        if (isEditing) {
          body.checkInAt = checkInAt?.trim() ? new Date(checkInAt).toISOString() : undefined;
          body.checkOutAt = checkOutAt?.trim() ? new Date(checkOutAt).toISOString() : undefined;
        }

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Failed to submit attendance");
          return;
        }
      }

      setDate(new Date().toISOString().slice(0, 10));
      setLeaveType("");
      setReason("");
      setCheckInAt("");
      setCheckOutAt("");
      setLeaveDateRange({ from: undefined, to: undefined });
      setEditingId(null);
      setFormOpen(false);
      await loadRecords();
    } catch {
      setError("Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(record: AttendanceRecord) {
    if (isEmployee && record.approvalStatus !== "pending") return;
    setEditingId(record.id);
    const d = new Date(record.date);
    setDate(Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10));
    setStatus(record.status as "present" | "absent" | "leave");
    setLeaveType(record.leaveType || "");
    setReason(record.reason || "");
    setCheckInAt(record.checkInAt ? new Date(record.checkInAt).toISOString().slice(0, 16) : "");
    setCheckOutAt(record.checkOutAt ? new Date(record.checkOutAt).toISOString().slice(0, 16) : "");
    setFormOpen(true);
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/attendance/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to delete attendance");
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setFormOpen(false);
      }
    } catch {
      setError("Failed to delete attendance");
    }
  }

  async function handleApproval(id: string, approvalStatus: "approved" | "rejected") {
    if (!isAdmin) return;
    setError(null);
    try {
      const res = await fetch(`/api/attendance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to update approval");
        return;
      }
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, approvalStatus } : r))
      );
    } catch {
      setError("Failed to update approval");
    }
  }

  async function submitQuickAttendance(action: "check-in" | "check-out") {
    if (!isViewingSelf) return;
    const isoDate = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const todayRecord = records.find((r) => new Date(r.date).toISOString().slice(0, 10) === isoDate);

    async function buildLocationReason(kind: "Check-in" | "Check-out") {
      if (typeof navigator === "undefined" || !navigator.geolocation) return undefined;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          });
        });
        const { latitude, longitude } = position.coords;
        let address = "";
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`,
            { headers: { Accept: "application/json" } }
          );
          if (res.ok) {
            const data = (await res.json()) as { display_name?: string };
            if (data.display_name) address = data.display_name;
          }
        } catch {
          // ignore reverse geocode failure
        }
        const coordPart = `(${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
        if (address) return `${kind} from ${address} ${coordPart}`;
        return `${kind} location ${coordPart}`;
      } catch {
        return undefined;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const reason = await buildLocationReason(action === "check-in" ? "Check-in" : "Check-out");
      if (action === "check-in") {
        if (todayRecord?.checkInAt) {
          setError("Already checked in today");
          setSubmitting(false);
          return;
        }
        if (todayRecord) {
          await fetch(`/api/attendance/${todayRecord.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "present", checkInAt: nowIso, ...(reason ? { reason } : {}) }),
          });
        } else {
          await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: isoDate,
              status: "present",
              checkInAt: nowIso,
              ...(reason ? { reason } : {}),
            }),
          });
        }
      } else {
        if (!todayRecord?.checkInAt) {
          setError("Check in first before checking out");
          setSubmitting(false);
          return;
        }
        if (todayRecord.checkOutAt) {
          setError("Already checked out today");
          setSubmitting(false);
          return;
        }
        await fetch(`/api/attendance/${todayRecord.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkOutAt: nowIso, ...(reason ? { reason } : {}) }),
        });
      }
      await loadRecords();
    } catch {
      setError("Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(value?: string) {
    if (!value) return "~";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "~";
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDuration(checkInAt?: string, checkOutAt?: string) {
    if (!checkInAt || !checkOutAt) return "~";
    const start = new Date(checkInAt).getTime();
    const end = new Date(checkOutAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "~";
    const minutes = Math.floor((end - start) / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayRecord = records.find((r) => new Date(r.date).toISOString().slice(0, 10) === todayIso);
  const hasCheckedIn = Boolean(todayRecord?.checkInAt);
  const hasCheckedOut = Boolean(todayRecord?.checkOutAt);

  const canAddOrEdit = isAdmin || (isEmployee && isViewingSelf);

  return (
    <Card className="shadow-sm min-w-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2 min-w-0 flex-wrap">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Attendance
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Review, approve, edit and add attendance for this employee."
              : isViewingSelf
                ? "Mark attendance, apply leave, and view history."
                : "Attendance records for this employee."}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isViewingSelf && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => submitQuickAttendance("check-in")}
                disabled={submitting || hasCheckedIn}
              >
                <LogIn className="h-4 w-4 mr-1" />
                {hasCheckedIn ? "Checked In" : "Check In"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => submitQuickAttendance("check-out")}
                disabled={submitting || !hasCheckedIn || hasCheckedOut}
              >
                <LogOut className="h-4 w-4 mr-1" />
                {hasCheckedOut ? "Checked Out" : "Check Out"}
              </Button>
            </>
          )}
          {canAddOrEdit && (
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setDate(new Date().toISOString().slice(0, 10));
                    setStatus("leave");
                    setLeaveType("");
                    setReason("");
                    setCheckInAt("");
                    setCheckOutAt("");
                  }}
                >
                  {isAdmin ? "Add attendance" : "Apply for attendance"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Edit attendance record" : isAdmin ? "Add attendance" : "Apply for attendance"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Status</label>
                      <Select value={status} onValueChange={(v: "present" | "absent" | "leave") => setStatus(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="leave" disabled={policyLeaveTypes.length === 0}>
                            Leave
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {status !== "leave" || editingId ? (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Date</label>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                      </div>
                    ) : (
                      <div className="space-y-1 col-span-1" />
                    )}
                  </div>
                  {status === "leave" && !editingId && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Leave Period (From ~ To)</label>
                      <DateRangePicker
                        value={leaveDateRange}
                        onChange={setLeaveDateRange}
                        placeholder="Select leave dates"
                        className="w-full"
                      />
                    </div>
                  )}
                  {status === "leave" && policyLeaveTypes.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Leave type</label>
                      <Select value={leaveType} onValueChange={setLeaveType} required={status === "leave"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          {policyLeaveTypes.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                              {currentEmployee && (
                                t.toLowerCase().includes("casual")
                                  ? ` (Balance: ${currentEmployee.casualLeaveBalance ?? 0})`
                                  : t.toLowerCase().includes("sick")
                                    ? ` (Balance: ${currentEmployee.sickLeaveBalance ?? 0})`
                                    : ""
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Check In (optional)</label>
                      <Input type="datetime-local" value={checkInAt} onChange={(e) => setCheckInAt(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Check Out (optional)</label>
                      <Input type="datetime-local" value={checkOutAt} onChange={(e) => setCheckOutAt(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
                    <Textarea rows={2} placeholder="Note for manager" value={reason} onChange={(e) => setReason(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Saving…" : editingId ? "Update" : "Submit"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
          <Button size="sm" variant="ghost" onClick={loadRecords} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="mt-2 min-w-0">
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
            {error}
          </div>
        )}
        <div className="overflow-x-auto -mx-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.date)}</TableCell>
                  <TableCell className="capitalize">{r.status}</TableCell>
                  <TableCell>{formatTime(r.checkInAt)}</TableCell>
                  <TableCell>{formatTime(r.checkOutAt)}</TableCell>
                  <TableCell>{formatDuration(r.checkInAt, r.checkOutAt)}</TableCell>
                  <TableCell>{r.leaveType || "~"}</TableCell>
                  <TableCell className="capitalize">{r.approvalStatus}</TableCell>
                  <TableCell className="max-w-[120px] truncate" title={r.reason || undefined}>
                    {r.reason || "~"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {isAdmin && r.approvalStatus === "pending" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleApproval(r.id, "approved")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleApproval(r.id, "rejected")}>
                            Reject
                          </Button>
                        </>
                      )}
                      {(isAdmin || (isEmployee && r.approvalStatus === "pending")) && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(r)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(r.id)}>
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {records.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No attendance records yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
