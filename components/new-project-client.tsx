"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** Payload for create project. assignedMemberIds must be only the selected member IDs, never all. */
type CreateProjectPayload = {
  clientId: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  maintenanceStartDate?: string;
  maintenanceEndDate?: string;
  assignedMemberIds: string[];
  status: string;
  budget?: number;
  managerId?: string;
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Props = {
  clientId: string;
  employees: { id: string; name: string; email: string }[];
  /** Override cancel link (e.g. /dashboard/projects when creating from sidebar) */
  cancelHref?: string;
};

export function NewProjectClient({ clientId, employees, cancelHref }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maintenanceStartDate, setMaintenanceStartDate] = useState("");
  const [maintenanceEndDate, setMaintenanceEndDate] = useState("");
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [status, setStatus] = useState("active");
  const [budget, setBudget] = useState("");
  const [managerId, setManagerId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    setSaving(true);
    try {
      const payload: CreateProjectPayload = {
        clientId,
        name: name.trim(),
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        maintenanceStartDate: maintenanceStartDate || undefined,
        maintenanceEndDate: maintenanceEndDate || undefined,
        assignedMemberIds: [...assignedIds],
        status,
        budget: budget ? Number(budget) : undefined,
        managerId: managerId && managerId !== "none" ? managerId : undefined,
      };
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to create project");
        return;
      }
      toast.success("Project created");
      router.push(`/dashboard/projects/clients/${clientId}/projects/${data.project.id}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function setMemberChecked(id: string, checked: boolean) {
    setAssignedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Project name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Brief description (formatting, links…)"
              minHeight="100px"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget (₹)</Label>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 50000"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Maintenance start</Label>
              <Input
                type="date"
                value={maintenanceStartDate}
                onChange={(e) => setMaintenanceStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Maintenance end</Label>
              <Input
                type="date"
                value={maintenanceEndDate}
                onChange={(e) => setMaintenanceEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Project Manager</Label>
            <Select value={managerId || "none"} onValueChange={(v) => setManagerId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No manager</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assign team members</Label>
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees found.</p>
            ) : (
              <ScrollArea className="h-[200px] w-full rounded-xl border border-input p-2">
                <div className="space-y-2">
                  {employees.map((emp) => {
                    const isChecked = assignedIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => setMemberChecked(emp.id, !!checked)}
                        />
                        <span className="text-sm font-medium">{emp.name}</span>
                        <span className="text-xs text-muted-foreground truncate">{emp.email}</span>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
            <p className="text-xs text-muted-foreground">Check each member to assign. Only checked members are sent.</p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create project"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={cancelHref ?? `/dashboard/projects/clients/${clientId}`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
