"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewProjectClient } from "@/components/new-project-client";

type ClientRow = { id: string; companyName: string; name: string };
type EmployeeRow = { id: string; name: string; email: string };

type Props = {
  clients: ClientRow[];
  employees: EmployeeRow[];
};

export function NewProjectFromSidebar({ clients, employees }: Props) {
  const [clientId, setClientId] = useState<string>("");

  if (clients.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        No clients yet. Add a client first from Clients, then create a project.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Client *</Label>
        <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : v)}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select client</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.companyName || c.name || c.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {clientId ? (
        <NewProjectClient
          clientId={clientId}
          employees={employees}
          cancelHref="/dashboard/projects"
        />
      ) : null}
    </div>
  );
}
