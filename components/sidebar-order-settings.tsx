"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_SIDEBAR_SECTION_ORDER } from "@/lib/sidebar-sections";

export function SidebarOrderSettings() {
  const [order, setOrder] = useState<string[]>([...DEFAULT_SIDEBAR_SECTION_ORDER]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/user/preferences", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.sidebarSectionOrder?.length) {
          setOrder(data.sidebarSectionOrder);
        } else {
          setOrder([...DEFAULT_SIDEBAR_SECTION_ORDER]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      const t = next[i];
      next[i] = next[j];
      next[j] = t;
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sidebarSectionOrder: order }),
        });
        if (!res.ok) throw new Error();
        toast.success("Sidebar order saved");
      } catch {
        toast.error("Could not save sidebar order");
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading navigation preferences…
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sidebar order</CardTitle>
        <CardDescription>
          Choose how groups appear in the left navigation (DevOps, Work, Finance, etc.). Applies to your account only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="rounded-lg border divide-y">
          {order.map((label, i) => (
            <li
              key={label}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-card text-sm"
            >
              <span className="font-medium">{label}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={i === order.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOrder([...DEFAULT_SIDEBAR_SECTION_ORDER])}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset default
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={save}>
            {pending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Save order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
