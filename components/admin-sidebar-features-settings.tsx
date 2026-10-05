"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Eye } from "lucide-react";
import { ALL_FEATURES, getGroupedFeatures } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Admins only: choose which workspace sidebar modules stay visible.
 * Hidden keys are stored on the user as `adminSidebarHiddenFeatures`.
 */
export function AdminSidebarFeaturesSettings() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/user/preferences", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {})),
    ])
      .then(([me, prefs]) => {
        if (cancelled) return;
        setIsAdmin(me?.user?.role === "admin");
        const p = prefs as { adminSidebarHiddenFeatures?: unknown };
        setHidden(
          Array.isArray(p?.adminSidebarHiddenFeatures) ? (p.adminSidebarHiddenFeatures as string[]) : []
        );
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setVisible(featureKey: string, visible: boolean) {
    setHidden((prev) => {
      const s = new Set(prev);
      if (visible) s.delete(featureKey);
      else s.add(featureKey);
      return Array.from(s);
    });
  }

  function save() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminSidebarHiddenFeatures: hidden }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || "Save failed");
        }
        toast.success("Sidebar modules updated");
        router.refresh();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!isAdmin) return null;

  const groupedFeatures = getGroupedFeatures();
  const togglable = ALL_FEATURES.filter((f) => !f.alwaysOn);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-5 w-5 text-muted-foreground" />
          Admin sidebar ~ modules you see
        </CardTitle>
        <CardDescription>
          Turn off items you do not use; they disappear from your left navigation (Overview → Dashboard always stays). Other admins are unchanged.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedFeatures).map(([groupName, features]) => {
          const rows = features.filter((f) => !f.alwaysOn);
          if (rows.length === 0) return null;
          return (
            <div key={groupName}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {groupName}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rows.map((f) => {
                  const visible = !hidden.includes(f.key);
                  return (
                    <div
                      key={f.key}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3 bg-card"
                    >
                      <div className="min-w-0">
                        <Label htmlFor={`adm-sb-${f.key}`} className="text-sm font-medium cursor-pointer">
                          {f.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                      </div>
                      <Switch
                        id={`adm-sb-${f.key}`}
                        checked={visible}
                        onCheckedChange={(on) => setVisible(f.key, on)}
                        disabled={pending}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground">Overview</strong> (main dashboard) is always visible.{" "}
          {togglable.length} modules can be toggled.
        </div>

        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
          Save sidebar visibility
        </Button>
      </CardContent>
    </Card>
  );
}
