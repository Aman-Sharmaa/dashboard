"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  mode: "admin" | "employee";
  /** Merged visibility used to render this page */
  visibility: Record<string, boolean>;
  labels: Record<string, string>;
};

export function DashboardCustomizeBar({ mode, visibility, labels }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<Record<string, boolean>>(visibility);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLocal(visibility);
  }, [visibility]);

  const mergedKeys = Object.keys({ ...labels, ...visibility }).filter((k) => labels[k]);

  return (
    <div className="rounded-xl border bg-muted/20 mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          Dashboard layout
          <span className="text-xs font-normal text-muted-foreground">
            Show or hide sections on <code className="text-[11px]">/dashboard</code>
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open && (
        <div className="border-t px-4 py-4 space-y-4 bg-background/80">
          <p className="text-xs text-muted-foreground">
            {mode === "admin"
              ? "Choose which overview blocks appear for your admin home. Preferences are saved to your account."
              : "Choose which overview blocks appear on your home. Preferences are saved to your account."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {mergedKeys.map((key) => (
              <div
                key={key}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-lg border p-3",
                  local[key] === false && "opacity-70"
                )}
              >
                <Label htmlFor={`dash-widget-${key}`} className="text-sm leading-snug cursor-pointer">
                  {labels[key] || key}
                </Label>
                <Switch
                  id={`dash-widget-${key}`}
                  checked={local[key] !== false}
                  onCheckedChange={(on) => setLocal((prev) => ({ ...prev, [key]: on }))}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                setLocal(visibility);
                toast.message("Reverted to saved layout");
              }}
            >
              Reset view
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    const res = await fetch("/api/user/preferences", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ dashboardWidgetPrefs: local }),
                    });
                    if (!res.ok) throw new Error();
                    toast.success("Dashboard layout saved");
                    router.refresh();
                  } catch {
                    toast.error("Could not save layout");
                  }
                });
              }}
            >
              Save layout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
