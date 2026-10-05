"use client";

import { useEffect, useMemo, useState } from "react";
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LogIn, LogOut, Clock } from "lucide-react";

type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail?: string;
  date: string;
  status: string;
  leaveType?: string;
  isPaid?: boolean;
  approvalStatus: string;
  reason?: string;
  checkInAt?: string;
  checkOutAt?: string;
};

type Employee = {
  id: string;
  name: string;
  email: string;
  title?: string;
  department?: string;
};

type Props = {
  userRole: string;
  employeeId: string | null;
  userEmail: string;
};

export function AttendancePageClient({ userRole, employeeId, userEmail }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policyLeaveTypes, setPolicyLeaveTypes] = useState<string[]>([]);
  const [weeklyOffDays, setWeeklyOffDays] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [currentMonth, setCurrentMonth] = useState<number>(
    new Date().getMonth()
  );
  const [currentYear, setCurrentYear] = useState<number>(
    new Date().getFullYear()
  );
  const [date, setDate] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [status, setStatus] = useState<"present" | "absent" | "leave">("leave");
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(employeeId);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [checkInAt, setCheckInAt] = useState<string>("");
  const [checkOutAt, setCheckOutAt] = useState<string>("");
  const [currentEmployee, setCurrentEmployee] = useState<{
    casualLeaveBalance?: number;
    sickLeaveBalance?: number;
  } | null>(null);

  async function loadEmployees() {
    if (userRole !== "admin") return;
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (res.ok && data.employees) {
        setEmployees(data.employees);
      }
    } catch {
      // ignore
    }
  }

  async function loadRecords() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (userRole === "admin" && selectedEmployeeId) {
        params.set("employeeId", selectedEmployeeId);
      }
      const res = await fetch(
        `/api/attendance${params.toString() ? `?${params.toString()}` : ""}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to load attendance");
        return;
      }
      setRecords(
        (data.attendance || []).map((r: any) => ({
          ...r,
          date: r.date,
          checkInAt: r.checkInAt,
          checkOutAt: r.checkOutAt,
        }))
      );
    } catch (e) {
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
        // Leave types are dynamic from workspace policy only; no defaults
        setPolicyLeaveTypes(Array.isArray(settings.leaveTypes) ? settings.leaveTypes : []);
        setWeeklyOffDays(settings.weeklyOffDays || []);
      } else {
        setPolicyLeaveTypes([]);
      }
    } catch {
      setPolicyLeaveTypes([]);
    }
  }

  async function loadCurrentEmployee() {
    if (userRole !== "employee") return;
    try {
      // Get employee by email
      const res = await fetch("/api/employees");
      if (!res.ok) return;
      const data = await res.json();
      if (data.employees) {
        const emp = data.employees.find((e: Employee) => e.email === userEmail);
        if (emp) {
          // Fetch full employee details including leave balances
          const empRes = await fetch(`/api/employees/${emp.id}`);
          if (empRes.ok) {
            const empData = await empRes.json();
            if (empData.employee) {
              setCurrentEmployee({
                casualLeaveBalance: empData.employee.casualLeaveBalance || 0,
                sickLeaveBalance: empData.employee.sickLeaveBalance || 0,
              });
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  async function loadSelectedEmployee() {
    if (userRole !== "admin") return;
    const id = selectedEmployeeId || employeeId;
    if (!id) return;
    try {
      const res = await fetch(`/api/employees/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.employee) {
          setCurrentEmployee({
            casualLeaveBalance: data.employee.casualLeaveBalance || 0,
            sickLeaveBalance: data.employee.sickLeaveBalance || 0,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadRecords();
    loadWorkspacePolicy();
    loadEmployees();
    loadCurrentEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When no leave types are configured, clear leave selection so employee cannot apply
  useEffect(() => {
    if (policyLeaveTypes.length === 0 && status === "leave") {
      setStatus("present");
      setLeaveType("");
    }
  }, [policyLeaveTypes.length, status]);

  useEffect(() => {
    loadRecords();
    if (userRole === "admin") {
      loadSelectedEmployee();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId]);

  // Keep form date in sync with selected calendar date
  useEffect(() => {
    if (selectedDate) {
      const iso = selectedDate.toISOString().slice(0, 10);
      setDate(iso);
    }
  }, [selectedDate]);

  const weekdayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

  function getLeaveDates(from: string, to: string): string[] {
    const start = new Date(from);
    const end = new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
    const dates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const weekdayKey = weekdayKeys[cursor.getDay()] || "sunday";
      if (!weeklyOffDays.includes(weekdayKey)) {
        dates.push(cursor.toISOString().slice(0, 10));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  const leaveDaysCount = useMemo(() => {
    if (status !== "leave" || editingId) return 0;
    if (!date) return 0;
    const to = dateTo || date;
    return getLeaveDates(date, to).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, dateTo, status, editingId, weeklyOffDays]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (userRole !== "employee" && userRole !== "admin") return;

    if (!editingId && userRole === "admin" && !selectedEmployeeId) {
      setError("Please select an employee");
      return;
    }

    if (status === "leave") {
      if (policyLeaveTypes.length === 0) {
        setError("Leave is not available. No leave types are configured in workspace policy.");
        return;
      }
      if (!leaveType) {
        setError("Please select a leave type");
        return;
      }

      const isCasual = leaveType.toLowerCase().includes("casual");
      const isSick = leaveType.toLowerCase().includes("sick");
      const isUnpaid = leaveType.toLowerCase().includes("unpaid");

      const daysNeeded = leaveDaysCount || 1;

      // We allow team members to take leave even if they don't have enough balance.
      // The logic to block insufficient balance has been removed.
    }

    setSubmitting(true);
    setError(null);
    try {
      const isEditing = Boolean(editingId);

      // For leave with date range (non-editing), create multiple records
      if (!isEditing && status === "leave" && dateTo && dateTo > date) {
        const dates = getLeaveDates(date, dateTo);
        if (dates.length === 0) {
          setError("No working days in the selected range");
          setSubmitting(false);
          return;
        }

        let failedCount = 0;
        for (const d of dates) {
          const body: any = {
            date: d,
            status: "leave",
            leaveType: leaveType || undefined,
            reason: reason || undefined,
          };
          if (userRole === "admin" && selectedEmployeeId) {
            body.employeeId = selectedEmployeeId;
          }
          const res = await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) failedCount++;
        }

        if (failedCount > 0) {
          setError(`${dates.length - failedCount} of ${dates.length} leave days applied. ${failedCount} failed.`);
        }
      } else {
        // Single date submit (or editing)
        const url = isEditing ? `/api/attendance/${editingId}` : "/api/attendance";
        const method = isEditing ? "PUT" : "POST";

        const body: any = {
          date,
          status,
          leaveType: leaveType || undefined,
          reason: reason || undefined,
        };

        if (!isEditing && userRole === "admin" && selectedEmployeeId) {
          body.employeeId = selectedEmployeeId;
        }

        if (isEditing || checkInAt) {
          body.checkInAt = checkInAt && checkInAt.trim()
            ? new Date(checkInAt).toISOString()
            : undefined;
        }

        if (isEditing || checkOutAt) {
          body.checkOutAt = checkOutAt && checkOutAt.trim()
            ? new Date(checkOutAt).toISOString()
            : undefined;
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

      setDate("");
      setDateTo("");
      setLeaveType("");
      setReason("");
      setCheckInAt("");
      setCheckOutAt("");
      setEditingId(null);
      await loadRecords();
      await loadCurrentEmployee();
      if (userRole === "admin") {
        await loadSelectedEmployee();
      }
    } catch {
      setError("Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(record: AttendanceRecord) {
    // Employees can only edit pending records, admins can edit any
    if (userRole === "employee" && record.approvalStatus !== "pending") return;
    setEditingId(record.id);
    // Convert stored date to yyyy-MM-dd for input
    const d = new Date(record.date);
    const iso = Number.isNaN(d.getTime())
      ? ""
      : d.toISOString().slice(0, 10);
    setDate(iso);
    setDateTo("");
    setStatus(record.status as "present" | "absent" | "leave");
    setLeaveType(record.leaveType || "");
    setReason(record.reason || "");

    // Set check-in/check-out times
    if (record.checkInAt) {
      const checkInDate = new Date(record.checkInAt);
      const checkInTime = checkInDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
      setCheckInAt(checkInTime);
    } else {
      setCheckInAt("");
    }

    if (record.checkOutAt) {
      const checkOutDate = new Date(record.checkOutAt);
      const checkOutTime = checkOutDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
      setCheckOutAt(checkOutTime);
    } else {
      setCheckOutAt("");
    }

    setFormOpen(true);
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/attendance/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to delete attendance");
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setDate("");
        setLeaveType("");
        setReason("");
      }
    } catch {
      setError("Failed to delete attendance");
    }
  }

  async function handleApproval(id: string, approvalStatus: "approved" | "rejected") {
    if (userRole !== "admin") return;
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
      // Reload leave balances after approval/rejection
      await loadSelectedEmployee();
    } catch {
      setError("Failed to update approval");
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
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const isEmployee = userRole === "employee";
  const isAdmin = userRole === "admin";
  // Admin can do self-attendance when they have an employee profile and are viewing their own record
  const isAdminSelf =
    isAdmin &&
    Boolean(employeeId) &&
    (selectedEmployeeId === employeeId || selectedEmployeeId === null);
  const canDoSelfAttendance = isEmployee || isAdminSelf;

  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Get today's attendance record
  const todayRecord = records.find((r) => {
    const recordDate = new Date(r.date).toISOString().slice(0, 10);
    const todayDate = today.toISOString().slice(0, 10);
    return recordDate === todayDate;
  });

  const hasCheckedIn = todayRecord?.checkInAt ? true : false;
  const hasCheckedOut = todayRecord?.checkOutAt ? true : false;

  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString(
    "en-IN",
    { month: "long" }
  );

  // Map of YYYY-MM-DD -> attendance record for coloring the calendar
  const attendanceByDate = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    records.forEach((r) => {
      const d = new Date(r.date);
      if (!Number.isNaN(d.getTime())) {
        const iso = d.toISOString().slice(0, 10);
        // Keep the first one we see for that date
        if (!map[iso]) {
          map[iso] = r;
        }
      }
    });
    return map;
  }, [records]);

  function buildCalendarDays() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startWeekday = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i += 1) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      days.push(d);
    }
    return days;
  }

  const calendarDays = buildCalendarDays();

  function isSameDay(a: Date | null, b: Date | null) {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function handleDayClick(day: number | null) {
    if (!day) return;
    const cellDate = new Date(currentYear, currentMonth, day);
    const weekdayKey = weekdayKeys[cellDate.getDay()] || "sunday";
    const isWeeklyOff = weeklyOffDays.includes(weekdayKey);

    // Do not allow selecting weekly off days from company policy
    if (isWeeklyOff) return;

    setSelectedDate(cellDate);
  }

  function handleMonthChange(offset: number) {
    const d = new Date(currentYear, currentMonth + offset, 1);
    setCurrentMonth(d.getMonth());
    setCurrentYear(d.getFullYear());
  }

  function handleToday() {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDate(now);
  }

  async function submitQuickAttendance(action: "check-in" | "check-out") {
    if (!canDoSelfAttendance) return;

    const isoDate = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const isCheckIn = action === "check-in";

    // Find today's attendance record
    const todayRecord = records.find((r) => {
      const recordDate = new Date(r.date).toISOString().slice(0, 10);
      return recordDate === isoDate;
    });

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
      let res;
      let data;
      const reason = await buildLocationReason(isCheckIn ? "Check-in" : "Check-out");

      if (isCheckIn) {
        // Check-in: create or update record with check-in time
        if (todayRecord?.checkInAt) {
          setError("You have already checked in today");
          setSubmitting(false);
          return;
        }
        if (todayRecord) {
          // Update existing record with check-in time
          res = await fetch(`/api/attendance/${todayRecord.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "present",
              checkInAt: nowIso,
              ...(reason ? { reason } : {}),
            }),
          });
        } else {
          // Create new record
          res = await fetch("/api/attendance", {
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
        // Check-out: update existing record with check-out time
        if (!todayRecord || !todayRecord.checkInAt) {
          setError("Please check in first before checking out");
          setSubmitting(false);
          return;
        }
        if (todayRecord.checkOutAt) {
          setError("You have already checked out today");
          setSubmitting(false);
          return;
        }
        res = await fetch(`/api/attendance/${todayRecord.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkOutAt: nowIso,
            ...(reason ? { reason } : {}),
          }),
        });
      }

      data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to submit attendance");
        return;
      }
      await loadRecords();
    } catch (err) {
      setError("Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickCheckIn() {
    await submitQuickAttendance("check-in");
  }

  async function handleQuickCheckOut() {
    await submitQuickAttendance("check-out");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            {canDoSelfAttendance
              ? "Mark your daily attendance, apply leave, and track history."
              : isAdmin
                ? "Review, edit and approve attendance records across the team."
                : "Review attendance records."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && employees.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Employee:
              </label>
              <Select
                value={selectedEmployeeId || "all"}
                onValueChange={(value) => {
                  setSelectedEmployeeId(value === "all" ? null : value);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Signed in as <span className="font-medium">{userEmail}</span> ({userRole})
          </div>
        </div>
      </div>

      {/* Check In / Check Out – prominent buttons for employees */}
      {canDoSelfAttendance && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Today&apos;s attendance</h3>
                  <p className="text-sm text-muted-foreground">
                    {hasCheckedIn && hasCheckedOut
                      ? `You checked in at ${formatTime(todayRecord?.checkInAt)} and out at ${formatTime(todayRecord?.checkOutAt)}`
                      : hasCheckedIn
                        ? `Checked in at ${formatTime(todayRecord?.checkInAt)} ~ tap Check Out when you leave`
                        : "Tap Check In when you start work"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="default"
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px] h-11"
                  onClick={handleQuickCheckIn}
                  disabled={submitting || hasCheckedIn}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">Saving...</span>
                  ) : hasCheckedIn ? (
                    <span className="flex items-center gap-2 text-emerald-100">
                      <LogIn className="h-4 w-4" /> Checked In
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" /> Check In
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white min-w-[140px] h-11"
                  onClick={handleQuickCheckOut}
                  disabled={submitting || !hasCheckedIn || hasCheckedOut}
                >
                  {hasCheckedOut ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <LogOut className="h-4 w-4" /> Checked Out
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" /> Check Out
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top card: mark today + calendar */}
      <Card className="border bg-muted/40">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">
              Mark attendance for today ({todayLabel})
            </CardTitle>
            <CardDescription className="text-xs">
              You can mark or update your attendance for today directly from here.
            </CardDescription>
          </div>
          {canDoSelfAttendance && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-black text-white hover:bg-neutral-900"
                  onClick={handleQuickCheckIn}
                  disabled={submitting || hasCheckedIn}
                >
                  {submitting ? "Saving..." : hasCheckedIn ? "Checked In" : "Check In"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-black text-black hover:bg-black hover:text-white"
                  onClick={handleQuickCheckOut}
                  disabled={submitting || !hasCheckedIn || hasCheckedOut}
                >
                  {hasCheckedOut ? "Checked Out" : "Check Out"}
                </Button>
              </div>
              {(hasCheckedIn || hasCheckedOut) && (
                <div className="text-xs text-muted-foreground">
                  {hasCheckedIn && (
                    <span>Checked in: {formatTime(todayRecord?.checkInAt)}</span>
                  )}
                  {hasCheckedIn && hasCheckedOut && <span> • </span>}
                  {hasCheckedOut && (
                    <span>Checked out: {formatTime(todayRecord?.checkOutAt)}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2 text-xs mb-1">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 border-black text-black hover:bg-black hover:text-white"
                onClick={() => handleMonthChange(-1)}
              >
                ←
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 border-black text-black hover:bg-black hover:text-white"
                onClick={() => handleMonthChange(1)}
              >
                →
              </Button>
              <span className="font-medium">
                {monthLabel} {currentYear}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs border-black text-black hover:bg-black hover:text-white"
              onClick={handleToday}
            >
              Today
            </Button>
          </div>

          <div className="rounded-lg border bg-background/60 p-3">
            <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground mb-2">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return <div key={idx} />;
                }
                const cellDate = new Date(currentYear, currentMonth, day);
                const isToday = isSameDay(cellDate, today);
                const isSelected = isSameDay(cellDate, selectedDate);
                const weekdayKey =
                  weekdayKeys[cellDate.getDay()] || "sunday";
                const isWeeklyOff = weeklyOffDays.includes(weekdayKey);

                const iso = cellDate.toISOString().slice(0, 10);
                const dayRecord = attendanceByDate[iso];
                const isLeave = dayRecord?.status === "leave";

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={[
                      "h-8 w-8 flex items-center justify-center rounded-md border text-xs transition-colors",
                      isSelected
                        ? "bg-black text-white border-black"
                        : isLeave
                          ? "bg-red-100 text-red-700 border-red-400"
                          : isToday
                            ? "border-black/60 text-black bg-muted/40"
                            : isWeeklyOff
                              ? "border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground"
                              : "border-transparent hover:border-muted-foreground/40 hover:bg-muted/30",
                    ].join(" ")}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {(isEmployee || isAdmin) && (
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Attendance actions</h2>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                className="bg-black text-white hover:bg-neutral-900"
                onClick={() => {
                  setEditingId(null);
                  setStatus("leave");
                  setLeaveType("");
                  setReason("");
                  setCheckInAt("");
                  setCheckOutAt("");
                  setDateTo("");
                  setSelectedDate(today);
                }}
              >
                Apply / Edit attendance
              </Button>
            </DialogTrigger>
          </div>

          <DialogContent className="bg-white border border-neutral-200 sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base">
                {editingId ? "Edit attendance record" : "Apply for attendance"}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                handleSubmit(e).then(() => {
                  if (!submitting) {
                    setFormOpen(false);
                  }
                });
              }}
              className="space-y-4"
            >
              {isAdmin && !editingId && employees.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={selectedEmployeeId || ""}
                    onValueChange={(value) => setSelectedEmployeeId(value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1 mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Status
                </label>
                <Select value={status} onValueChange={(v: any) => { setStatus(v); if (v !== "leave") setDateTo(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="leave" disabled={policyLeaveTypes.length === 0}>
                      Leave {policyLeaveTypes.length === 0 ? "(not configured)" : ""}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {policyLeaveTypes.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Leave cannot be applied ~ no leave types configured in workspace policy. Ask your admin to add leave types in Settings → Workspace policy.
                  </p>
                )}
              </div>
              {status === "leave" && !editingId ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => { setDate(e.target.value); if (dateTo && e.target.value > dateTo) setDateTo(""); }}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      To Date
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      min={date}
                      placeholder="Same as From"
                    />
                    <p className="text-xs text-muted-foreground">Leave empty for single day</p>
                  </div>
                  {leaveDaysCount > 0 && (
                    <div className="md:col-span-2">
                      <div className="text-xs font-medium bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                        {leaveDaysCount} working day{leaveDaysCount > 1 ? "s" : ""} will be applied
                        {weeklyOffDays.length > 0 && " (weekly offs excluded)"}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              )}
              {status === "leave" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Leave type {status === "leave" && <span className="text-red-500">*</span>}
                  </label>
                  {policyLeaveTypes.length > 0 ? (
                    <>
                      <Select
                        value={leaveType}
                        onValueChange={(v) => setLeaveType(v)}
                        required={status === "leave"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          {policyLeaveTypes.map((t) => {
                            // Map leave types to balances
                            const isCasual = t.toLowerCase().includes("casual");
                            const isSick = t.toLowerCase().includes("sick");
                            const isUnpaid = t.toLowerCase().includes("unpaid");

                            let balanceText = "";
                            if (isCasual && currentEmployee) {
                              balanceText = ` (Balance: ${currentEmployee.casualLeaveBalance || 0})`;
                            } else if (isSick && currentEmployee) {
                              balanceText = ` (Balance: ${currentEmployee.sickLeaveBalance || 0})`;
                            } else if (isUnpaid) {
                              balanceText = " (No balance limit)";
                            }

                            return (
                              <SelectItem key={t} value={t}>
                                {t}{balanceText}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {currentEmployee && (
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <div>Casual Leave Balance: {currentEmployee.casualLeaveBalance || 0}</div>
                          <div>Sick Leave Balance: {currentEmployee.sickLeaveBalance || 0}</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      No leave types configured. Contact your admin to add leave types in Settings → Workspace policy.
                    </p>
                  )}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Check In Time (optional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={checkInAt}
                    onChange={(e) => setCheckInAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Check Out Time (optional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={checkOutAt}
                    onChange={(e) => setCheckOutAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Reason (optional)
                </label>
                <Textarea
                  rows={3}
                  placeholder="Add a short note for your manager"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                    setDate("");
                    setDateTo("");
                    setLeaveType("");
                    setReason("");
                    setCheckInAt("");
                    setCheckOutAt("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? editingId
                      ? "Updating..."
                      : leaveDaysCount > 1
                        ? `Applying ${leaveDaysCount} days...`
                        : "Submitting..."
                    : editingId
                      ? "Update attendance"
                      : leaveDaysCount > 1
                        ? `Apply leave for ${leaveDaysCount} days`
                        : "Submit attendance"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {isEmployee ? "Your attendance history" : "Attendance records"}
          </h2>
          <div className="flex items-center gap-2">
            {canDoSelfAttendance && (
              <>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="bg-black text-white hover:bg-neutral-900"
                  onClick={handleQuickCheckIn}
                  disabled={submitting || hasCheckedIn}
                >
                  {submitting ? "Saving..." : hasCheckedIn ? "Checked In" : "Check In"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-black text-black hover:bg-black hover:text-white"
                  onClick={handleQuickCheckOut}
                  disabled={submitting || !hasCheckedIn || hasCheckedOut}
                >
                  {hasCheckedOut ? "Checked Out" : "Check Out"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-black text-black hover:bg-black hover:text-white"
                  onClick={() => {
                    setEditingId(null);
                    setStatus("leave");
                    setLeaveType("");
                    setReason("");
                    setDateTo("");
                    setSelectedDate(today);
                  }}
                >
                  Apply Leave
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadRecords}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && <TableHead>Employee</TableHead>}
              {isEmployee ? (
                <>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Remarks</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                {isAdmin && (
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {r.employeeName || r.employeeEmail || r.employeeId}
                      </span>
                      {r.employeeEmail && (
                        <span className="text-xs text-muted-foreground">
                          {r.employeeEmail}
                        </span>
                      )}
                    </div>
                  </TableCell>
                )}

                {isEmployee ? (
                  <>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell className="capitalize">{r.status}</TableCell>
                    <TableCell>{formatTime(r.checkInAt)}</TableCell>
                    <TableCell>{formatTime(r.checkOutAt)}</TableCell>
                    <TableCell>
                      {formatDuration(r.checkInAt, r.checkOutAt)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {r.reason || "~"}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell className="capitalize">{r.status}</TableCell>
                    <TableCell>{formatTime(r.checkInAt)}</TableCell>
                    <TableCell>{formatTime(r.checkOutAt)}</TableCell>
                    <TableCell>
                      {formatDuration(r.checkInAt, r.checkOutAt)}
                    </TableCell>
                    <TableCell>{r.leaveType || "~"}</TableCell>
                    <TableCell className="capitalize">
                      {r.approvalStatus}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {r.reason || "~"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {isAdmin && r.approvalStatus === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproval(r.id, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproval(r.id, "rejected")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {isAdmin && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(r)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(r.id)}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
            {records.length === 0 && !loading && (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 10 : 6}
                  className="text-center text-xs text-muted-foreground py-6"
                >
                  No attendance records yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableCaption className="text-xs">
            Attendance is stored per employee per date. Updating the same date will overwrite the previous entry.
          </TableCaption>
        </Table>
      </div>
    </div>
  );
}

