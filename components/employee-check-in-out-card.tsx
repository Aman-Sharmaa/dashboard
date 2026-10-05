"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, LogOut, Clock } from "lucide-react";

function formatTime(iso?: string) {
  if (!iso) return "~";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "~";
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmployeeCheckInOutCard() {
  const [records, setRecords] = useState<{ id: string; date: string; checkInAt?: string; checkOutAt?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRecords() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance");
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to load attendance");
        return;
      }
      setRecords(
        (data.attendance || []).map((r: { id: string; date: string; checkInAt?: string; checkOutAt?: string }) => ({
          id: r.id,
          date: r.date,
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

  useEffect(() => {
    loadRecords();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = records.find((r) => new Date(r.date).toISOString().slice(0, 10) === today);
  const hasCheckedIn = Boolean(todayRecord?.checkInAt);
  const hasCheckedOut = Boolean(todayRecord?.checkOutAt);

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
          {
            headers: {
              "Accept": "application/json",
            },
          }
        );
        if (res.ok) {
          const data = (await res.json()) as { display_name?: string };
          if (data.display_name) {
            address = data.display_name;
          }
        }
      } catch {
        // ignore reverse geocode failure
      }
      const coordPart = `(${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
      if (address) {
        return `${kind} from ${address} ${coordPart}`;
      }
      return `${kind} location ${coordPart}`;
    } catch {
      return undefined;
    }
  }

  async function submitQuickAttendance(action: "check-in" | "check-out") {
    const nowIso = new Date().toISOString();
    const isCheckIn = action === "check-in";

    setSubmitting(true);
    setError(null);
    try {
      const reason = await buildLocationReason(isCheckIn ? "Check-in" : "Check-out");
      let res;

      if (isCheckIn) {
        if (todayRecord?.checkInAt) {
          setError("You have already checked in today");
          setSubmitting(false);
          return;
        }
        if (todayRecord) {
          res = await fetch(`/api/attendance/${todayRecord.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "present", checkInAt: nowIso, ...(reason ? { reason } : {}) }),
          });
        } else {
          res = await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: today,
              status: "present",
              checkInAt: nowIso,
              ...(reason ? { reason } : {}),
            }),
          });
        }
      } else {
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
          body: JSON.stringify({ checkOutAt: nowIso, ...(reason ? { reason } : {}) }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to submit attendance");
        return;
      }
      await loadRecords();
    } catch {
      setError("Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30">
        <CardContent className="pt-6 pb-6">
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              variant="default"
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px] h-11"
              onClick={() => submitQuickAttendance("check-in")}
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
              onClick={() => submitQuickAttendance("check-out")}
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
  );
}
