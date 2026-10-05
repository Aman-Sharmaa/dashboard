"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Receipt, Trash2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

type PaymentPhase = { name: string; percentage: number; amount: number; remark?: string; status?: string; billGeneratedAt?: string | null };

type PaymentRow = {
  id: string;
  client: { id: string; name: string; companyName: string };
  project: { id: string; name: string } | null;
  product: { id: string; name: string; kind: string } | null;
  totalAmount: number;
  currency: string;
  billingCycle: string;
  status: string;
  phases?: PaymentPhase[];
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
};

type ClientRow = { id: string; name: string; companyName: string };
type ProjectRow = { id: string; name: string; client: string };

const BILLING_CYCLES: { value: string; label: string }[] = [
  { value: "one_time", label: "One time" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "phases", label: "Phases" },
];

const PAYMENT_STATUS: { value: string; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

type Props = {
  isAdmin: boolean;
};

export function ProjectsPaymentsClient({ isAdmin }: Props) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterClientId, setFilterClientId] = useState<string>("");
  const [filterProjectId, setFilterProjectId] = useState<string>("");
  const [filterBillingCycle, setFilterBillingCycle] = useState<string>("");
  const filterOnce = useRef(true);
  const [products, setProducts] = useState<{ _id: string; name: string; kind: string }[]>([]);
  const [form, setForm] = useState({
    clientId: "",
    projectId: "",
    productId: "",
    totalAmount: "",
    currency: "INR",
    billingCycle: "one_time",
    status: "draft",
    notes: "",
    phases: [] as PaymentPhase[],
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/clients").then((r) => r.json()).then((d) => setClients(d.clients || [])),
      fetch("/api/projects").then((r) => r.json()).then((d) => {
        const list = (d.projects || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          client: p.client,
        }));
        setProjects(list);
      }),
      fetch("/api/products").then((r) => r.json()).then((d) => setProducts(d.products || [])),
      fetch("/api/project-payments").then((r) => r.json()).then((d) => setPayments(d.payments || [])),
    ]).catch(() => toast.error("Failed to load data")).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (filterOnce.current) {
      filterOnce.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (filterClientId) params.set("clientId", filterClientId);
    if (filterProjectId) params.set("projectId", filterProjectId);
    if (filterBillingCycle) params.set("billingCycle", filterBillingCycle);
    fetch(`/api/project-payments?${params}`)
      .then((r) => r.json())
      .then((data) => setPayments(data.payments || []))
      .catch(() => toast.error("Failed to load payments"));
  }, [filterClientId, filterProjectId, filterBillingCycle]);

  function openAdd() {
    setForm({
      clientId: "",
      projectId: "",
      productId: "",
      totalAmount: "",
      currency: "INR",
      billingCycle: "one_time",
      status: "draft",
      notes: "",
      phases: [],
    });
    setOpen(true);
  }

  function addPhase() {
    const nextNum = form.phases.length + 1;
    setForm((f) => ({
      ...f,
      phases: [...f.phases, { name: `Phase ${nextNum}`, percentage: 0, amount: 0, remark: "" }],
    }));
  }

  function updatePhase(index: number, field: keyof PaymentPhase, value: string | number) {
    setForm((f) => {
      const next = f.phases.map((p, i) => (i === index ? { ...p, [field]: value } : p));
      const phase = next[index];
      const total = Number(form.totalAmount) || 0;
      if (phase && total > 0 && (field === "percentage" || field === "amount")) {
        if (field === "percentage") {
          const pct = Number(value) || 0;
          next[index] = { ...phase, amount: Math.round((total * pct) / 100) };
        } else {
          const amt = Number(value) || 0;
          next[index] = { ...phase, percentage: total ? Math.round((amt / total) * 1000) / 10 : 0 };
        }
      }
      return { ...f, phases: next };
    });
  }

  function removePhase(index: number) {
    setForm((f) => ({ ...f, phases: f.phases.filter((_, i) => i !== index) }));
  }

  const phasesTotalPercent = form.phases.reduce((s, p) => s + (Number(p.percentage) || 0), 0);

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.totalAmount) {
      toast.error("Client and total amount are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/project-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          projectId: form.projectId || null,
          productId: form.productId || null,
          totalAmount: Number(form.totalAmount),
          currency: form.currency,
          billingCycle: form.billingCycle,
          status: form.status,
          notes: form.notes || undefined,
          phases: form.billingCycle === "phases" && form.phases.length > 0 ? form.phases : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to create");
      }
      const data = await res.json();
      setPayments((prev) => [data.payment, ...prev]);
      setOpen(false);
      toast.success("Payment created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create payment");
    } finally {
      setSaving(false);
    }
  }

  const filteredProjects = form.clientId
    ? projects.filter((p) => p.client === form.clientId)
    : projects;

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground text-sm">Client</Label>
          <Select value={filterClientId || "all"} onValueChange={(v) => setFilterClientId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.companyName || c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground text-sm">Project</Label>
          <Select value={filterProjectId || "all"} onValueChange={(v) => setFilterProjectId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground text-sm">Billing cycle</Label>
          <Select value={filterBillingCycle || "all"} onValueChange={(v) => setFilterBillingCycle(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All cycles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cycles</SelectItem>
              {BILLING_CYCLES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} className="ml-auto">
            <Plus className="h-4 w-4" />
            Add payment
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payments
          </CardTitle>
          <CardDescription>
            Project payments use a separate schema (client, project, amount, billing cycle, status). Manage from here or from client detail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6">
              No payments yet. {isAdmin && "Click Add payment to create one."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Product / Service</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/projects/clients/${p.client.id}`}
                        className="text-primary hover:underline"
                      >
                        {p.client.companyName || p.client.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {p.project ? (
                        <Link
                          href={`/dashboard/projects/clients/${p.client.id}/projects/${p.project.id}`}
                          className="text-primary hover:underline"
                        >
                          {p.project.name}
                        </Link>
                      ) : (
                        "~"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.product ? `${p.product.name} (${p.product.kind})` : "~"}
                    </TableCell>
                    <TableCell>
                      {p.currency === "INR" ? "₹" : p.currency}{" "}
                      {Number(p.totalAmount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {BILLING_CYCLES.find((c) => c.value === p.billingCycle)?.label ?? p.billingCycle}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          p.status === "paid"
                            ? "text-green-600"
                            : p.status === "overdue"
                              ? "text-red-600"
                              : ""
                        }
                      >
                        {PAYMENT_STATUS.find((s) => s.value === p.status)?.label ?? p.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "~"}
                    </TableCell>
                    <TableCell className="text-right flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/projects/payments/${p.id}/bill`}>
                          Bill
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/invoices?tab=create&fromPayment=${p.id}`}>
                          <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                          Invoice
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add payment</DialogTitle>
            <DialogDescription>
              Create a new project payment (separate schema). Link to client and optionally to a project.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => setForm((f) => ({ ...f, clientId: v, projectId: "" }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.companyName || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Select
                value={form.projectId || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, projectId: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product / Service (optional)</Label>
              <Select
                value={form.productId || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, productId: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {products.map((pr) => (
                    <SelectItem key={pr._id} value={pr._id}>
                      {pr.name} ({pr.kind})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.totalAmount}
                  onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Billing cycle</Label>
                <Select
                  value={form.billingCycle}
                  onValueChange={(v) => setForm((f) => ({ ...f, billingCycle: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.billingCycle === "phases" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Phases</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPhase} className="gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    Add phase
                  </Button>
                </div>
                {form.phases.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No phases. Click &quot;Add phase&quot; to add a phase.</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[100px]">Phase</TableHead>
                          <TableHead className="w-[70px]">%</TableHead>
                          <TableHead className="w-[100px]">Amount</TableHead>
                          <TableHead>Remark</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.phases.map((phase, index) => (
                          <TableRow key={index}>
                            <TableCell className="p-1.5">
                              <Input
                                value={phase.name}
                                onChange={(e) => updatePhase(index, "name", e.target.value)}
                                placeholder="Phase 1"
                                className="h-8 rounded-lg text-sm"
                              />
                            </TableCell>
                            <TableCell className="p-1.5">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={phase.percentage || ""}
                                onChange={(e) => updatePhase(index, "percentage", e.target.value)}
                                className="h-8 rounded-lg w-16 text-sm"
                              />
                            </TableCell>
                            <TableCell className="p-1.5">
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={phase.amount || ""}
                                onChange={(e) => updatePhase(index, "amount", e.target.value)}
                                className="h-8 rounded-lg w-24 text-sm"
                              />
                            </TableCell>
                            <TableCell className="p-1.5">
                              <Input
                                value={phase.remark ?? ""}
                                onChange={(e) => updatePhase(index, "remark", e.target.value)}
                                placeholder="Remark"
                                className="h-8 rounded-lg text-sm"
                              />
                            </TableCell>
                            <TableCell className="p-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removePhase(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {form.phases.length > 0 && (
                  <p className={`text-xs ${phasesTotalPercent > 100 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    Total: {phasesTotalPercent.toFixed(1)}%
                    {phasesTotalPercent > 100 && " ~ cannot exceed 100%"}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || (form.billingCycle === "phases" && phasesTotalPercent > 100)}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
