"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type PeopleListStatus = "active" | "dismissed" | "all";

function parseStatus(raw: string | null): PeopleListStatus {
  if (raw === "dismissed" || raw === "all") return raw;
  return "active";
}

export function PeopleStatusFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = parseStatus(searchParams?.get("status") ?? null);

  function setStatus(next: PeopleListStatus) {
    const p = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "active") p.delete("status");
    else p.set("status", next);
    const q = p.toString();
    const base = pathname ?? "/dashboard/people";
    router.push(q ? `${base}?${q}` : base, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <Label htmlFor="people-status-filter" className="text-xs text-muted-foreground sr-only">
        Filter by status
      </Label>
      <Select value={value} onValueChange={(v) => setStatus(v as PeopleListStatus)}>
        <SelectTrigger id="people-status-filter" className="h-10 w-full sm:w-[220px] rounded-xl">
          <SelectValue placeholder="Filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active only</SelectItem>
          <SelectItem value="dismissed">Dismissed (archived)</SelectItem>
          <SelectItem value="all">Everyone</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-[10px] text-muted-foreground max-w-[240px] leading-snug">
        Profiles removed permanently after dismissal are not stored and won&apos;t appear here.
      </p>
    </div>
  );
}
