"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function LeaveResetButton({ employeeId }: { employeeId: string }) {
  const [resetting, setResetting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveManualOverride: false }),
      });
      if (!res.ok) throw new Error("Failed to reset");
      toast.success("Leave balances reset to auto-calculation");
      setConfirmOpen(false);
      window.location.reload();
    } catch {
      toast.error("Failed to reset leaves");
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Reset Leave Balances?"
        description="Reset leave balances to auto-calculation based on hiring date and company policy?"
        confirmLabel={resetting ? "Resetting..." : "Reset to Policy"}
        variant="warning"
        isLoading={resetting}
        onConfirm={handleReset}
      />
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={resetting}
        className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-2.5 py-1.5 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
        title="Reset to auto-calculation"
      >
        <RotateCcw className="h-3 w-3" />
        Auto
      </button>
    </>
  );
}
