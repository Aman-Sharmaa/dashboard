"use client";

import { useState } from "react";

type Props = {
  id: string;
  isDismissed: boolean;
};

export function EmployeeActions({ id, isDismissed }: Props) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: string, method: "PATCH" | "DELETE") {
    setLoadingAction(action);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "PATCH" ? JSON.stringify({ action }) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Action failed");
        return;
      }
      window.location.reload();
    } catch (e) {
      console.error(e);
      setError("Something went wrong");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-1.5">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => run("enableLogin", "PATCH")}
          disabled={loadingAction !== null}
          className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
        >
          {loadingAction === "enableLogin" ? "Enabling..." : "Enable OTP login"}
        </button>
        {!isDismissed ? (
          <button
            type="button"
            onClick={() => run("dismiss", "PATCH")}
            disabled={loadingAction !== null}
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
          >
            {loadingAction === "dismiss" ? "Dismissing..." : "Dismiss employee"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => run("activate", "PATCH")}
            disabled={loadingAction !== null}
            className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
          >
            {loadingAction === "activate" ? "Activating..." : "Activate employee"}
          </button>
        )}
        <button
          type="button"
          onClick={() => run("stopSalary", "PATCH")}
          disabled={loadingAction !== null}
          className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
        >
          {loadingAction === "stopSalary" ? "Stopping..." : "Stop salary"}
        </button>
        <button
          type="button"
          onClick={() => run("disableLogin", "PATCH")}
          disabled={loadingAction !== null}
          className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
        >
          {loadingAction === "disableLogin" ? "Disabling..." : "Disable login"}
        </button>
        <button
          type="button"
          onClick={() => run("delete", "DELETE")}
          disabled={loadingAction !== null}
          className="inline-flex items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          {loadingAction === "delete" ? "Deleting..." : "Delete employee"}
        </button>
      </div>
    </div>
  );
}

