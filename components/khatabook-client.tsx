"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, Loader2, MapPin, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";

type KhatabookEntry = {
  id: string;
  date: string;
  revenue: number;
  expense: number;
  merchantAmount: number;
  expenseType: string;
  notes: string;
  imageUrl: string;
  area: { id: string; name: string } | null;
  profit: number;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      cell = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }

  row.push(cell.trim());
  if (row.some((v) => v !== "")) rows.push(row);
  return rows;
}

export function KhatabookClient() {
  const [entries, setEntries] = useState<KhatabookEntry[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [monthEntriesOpen, setMonthEntriesOpen] = useState(false);
  const [allEntriesOpen, setAllEntriesOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KhatabookEntry | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  const [selectedYear, setSelectedYear] = useState<number>(getCurrentYear());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [areasOpen, setAreasOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [creatingArea, setCreatingArea] = useState(false);
  const [deletingAreaId, setDeletingAreaId] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    const current = getCurrentYear();
    return Array.from({ length: 11 }, (_, i) => current - 5 + i).reverse();
  }, []);

  const employeeOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((e) => {
      const id = e.createdBy?.id;
      const name = e.createdBy?.name || e.createdBy?.email;
      if (id && name) map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [entries]);

  const [form, setForm] = useState({
    date: getToday(),
    revenue: "",
    expense: "",
    merchantAmount: "",
    expenseType: "",
    notes: "",
    areaId: "",
    imageUrl: "",
    imageFileName: "",
  });
  const [editForm, setEditForm] = useState({
    date: getToday(),
    revenue: "",
    expense: "",
    merchantAmount: "",
    expenseType: "",
    notes: "",
    areaId: "",
    imageUrl: "",
    imageFileName: "",
  });

  async function loadEntries() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("view", "custom");
      params.set("from", `${selectedYear}-01-01`);
      params.set("to", `${selectedYear}-12-31`);
      if (selectedArea !== "all") params.set("areaId", selectedArea);
      if (selectedEmployee !== "all") params.set("employeeId", selectedEmployee);

      const res = await fetch(`/api/khatabook?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to load entries");
        setEntries([]);
        return;
      }
      setEntries(data.entries || []);
    } catch {
      toast.error("Failed to load entries");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, [selectedYear, selectedArea, selectedEmployee]);

  async function loadAreas() {
    try {
      const res = await fetch("/api/khatabook/areas");
      const data = await res.json();
      if (res.ok) setAreas(data.areas.map((a: any) => ({ id: a._id, name: a.name })));
    } catch { }
  }

  useEffect(() => {
    loadAreas();
  }, []);

  async function handleCreateArea() {
    if (!newAreaName.trim()) return;
    setCreatingArea(true);
    try {
      const res = await fetch("/api/khatabook/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAreaName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("Area created");
      setNewAreaName("");
      await loadAreas();
    } catch (e: any) {
      toast.error(e.message || "Failed to create area");
    } finally {
      setCreatingArea(false);
    }
  }

  const [deleteAreaTargetId, setDeleteAreaTargetId] = useState<string | null>(null);

  async function executeDeleteArea() {
    if (!deleteAreaTargetId) return;
    setDeletingAreaId(deleteAreaTargetId);
    try {
      const res = await fetch(`/api/khatabook/areas?id=${deleteAreaTargetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete area");
      toast.success("Area deleted successfully");
      setDeleteAreaTargetId(null);
      await loadAreas();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete area");
    } finally {
      setDeletingAreaId(null);
    }
  }

  function handleDeleteArea(id: string) {
    setDeleteAreaTargetId(id);
  }

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUserRole(data?.user?.role || ""))
      .catch(() => setUserRole(""));
  }, []);

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/khatabook/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setForm((f) => ({ ...f, imageUrl: data.url, imageFileName: file.name }));
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreateEntry(e: FormEvent) {
    e.preventDefault();

    const revenue = Number(form.revenue || 0);
    const expense = Number(form.expense || 0);
    const merchantAmount = Number(form.merchantAmount || 0);
    if (Number.isNaN(revenue) || Number.isNaN(expense) || Number.isNaN(merchantAmount) || revenue < 0 || expense < 0 || merchantAmount < 0) {
      toast.error("All amounts must be valid positive numbers");
      return;
    }
    if (revenue === 0 && expense === 0 && merchantAmount === 0) {
      toast.error("Add at least revenue, expense or merchant amount paid");
      return;
    }
    if (expense > 0 && !form.expenseType.trim()) {
      toast.error("Expense type is required when adding expense");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/khatabook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          revenue,
          expense,
          merchantAmount,
          expenseType: form.expenseType.trim(),
          notes: form.notes.trim(),
          imageUrl: form.imageUrl || undefined,
          areaId: form.areaId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to create entry");
        return;
      }

      toast.success("Entry added");
      setOpen(false);
      setForm({
        date: getToday(),
        revenue: "",
        expense: "",
        merchantAmount: "",
        expenseType: "",
        notes: "",
        areaId: "",
        imageUrl: "",
        imageFileName: "",
      });
      await loadEntries();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function openMonthEntries(monthKey: string) {
    setActiveMonth(monthKey);
    setMonthEntriesOpen(true);
  }

  function openEditEntry(entry: KhatabookEntry) {
    setEditingEntry(entry);
    setEditForm({
      date: new Date(entry.date).toISOString().slice(0, 10),
      revenue: String(entry.revenue || 0),
      expense: String(entry.expense || 0),
      merchantAmount: String(entry.merchantAmount || 0),
      expenseType: entry.expenseType || "",
      notes: entry.notes || "",
      areaId: entry.area?.id || "",
      imageUrl: entry.imageUrl || "",
      imageFileName: "",
    });
  }

  async function uploadEditImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/khatabook/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setEditForm((f) => ({ ...f, imageUrl: data.url, imageFileName: file.name }));
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleUpdateEntry(e: FormEvent) {
    e.preventDefault();
    if (!editingEntry) return;

    const revenue = Number(editForm.revenue || 0);
    const expense = Number(editForm.expense || 0);
    const merchantAmount = Number(editForm.merchantAmount || 0);
    if (Number.isNaN(revenue) || Number.isNaN(expense) || Number.isNaN(merchantAmount) || revenue < 0 || expense < 0 || merchantAmount < 0) {
      toast.error("All amounts must be valid positive numbers");
      return;
    }
    if (revenue === 0 && expense === 0 && merchantAmount === 0) {
      toast.error("Add at least revenue, expense or merchant amount paid");
      return;
    }
    if (expense > 0 && !editForm.expenseType.trim()) {
      toast.error("Expense type is required when adding expense");
      return;
    }

    setEditing(true);
    try {
      const res = await fetch(`/api/khatabook/${editingEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editForm.date,
          revenue,
          expense,
          merchantAmount,
          expenseType: editForm.expenseType.trim(),
          notes: editForm.notes.trim(),
          imageUrl: editForm.imageUrl || undefined,
          areaId: editForm.areaId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to update entry");
        return;
      }
      toast.success("Entry updated");
      setEditingEntry(null);
      await loadEntries();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setEditing(false);
    }
  }

  async function handleDeleteEntry() {
    if (!deleteEntryId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/khatabook/${deleteEntryId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to delete entry");
        return;
      }
      toast.success("Entry deleted");
      setDeleteEntryId(null);
      await loadEntries();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkUpload() {
    if (!bulkFile) {
      toast.error("Select a CSV file first");
      return;
    }
    setBulkUploading(true);
    try {
      const raw = await bulkFile.text();
      const rows = parseCsv(raw);
      if (rows.length < 2) {
        toast.error("CSV must include header and at least one data row");
        return;
      }

      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const idx = {
        date: headers.indexOf("date"),
        revenue: headers.indexOf("revenue"),
        expense: headers.indexOf("expense"),
        expenseType: headers.indexOf("expenseType".toLowerCase()),
        notes: headers.indexOf("notes"),
        imageUrl: headers.indexOf("imageUrl".toLowerCase()),
      };

      if (idx.date === -1 || idx.revenue === -1 || idx.expense === -1) {
        toast.error("CSV requires columns: date,revenue,expense");
        return;
      }

      const payload = rows.slice(1).map((r) => ({
        date: r[idx.date] || undefined,
        revenue: Number(r[idx.revenue] || 0),
        expense: Number(r[idx.expense] || 0),
        merchantAmount: Number(r[headers.indexOf("merchantamount")] || 0),
        expenseType: idx.expenseType >= 0 ? r[idx.expenseType] : "",
        notes: idx.notes >= 0 ? r[idx.notes] : "",
        imageUrl: idx.imageUrl >= 0 ? r[idx.imageUrl] : "",
      }));

      const res = await fetch("/api/khatabook/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Bulk upload failed");
        return;
      }

      toast.success(`Bulk upload complete: ${data.inserted} rows inserted`);
      setBulkOpen(false);
      setBulkFile(null);
      await loadEntries();
    } catch {
      toast.error("Failed to process CSV");
    } finally {
      setBulkUploading(false);
    }
  }

  function downloadCsvTemplate() {
    const header = "date,revenue,expense,merchantAmount,expenseType,notes,imageUrl";
    const sample = [
      "2025-01-15,5000,1200,500,Marketing,Instagram campaign,",
      "2025-01-16,0,800,0,Transport,Client meeting travel,",
      "2025-02-01,7500,0,1000,,Payment received,",
    ];
    const csv = [header, ...sample].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "khatabook-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const monthlyRows = useMemo(() => {
    const map = new Map<string, { monthKey: string; revenue: number; expense: number; merchantAmount: number; entriesCount: number }>();

    entries
      .filter((e) => selectedArea === "all" || e.area?.id === selectedArea)
      .filter((e) => selectedEmployee === "all" || e.createdBy?.id === selectedEmployee)
      .forEach((entry) => {
        const d = new Date(entry.date);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const found = map.get(monthKey) || { monthKey, revenue: 0, expense: 0, merchantAmount: 0, entriesCount: 0 };
        found.revenue += entry.revenue || 0;
        found.expense += entry.expense || 0;
        found.merchantAmount += entry.merchantAmount || 0;
        found.entriesCount += 1;
        map.set(monthKey, found);
      });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        profit: row.revenue - (row.merchantAmount + row.expense),
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [entries, selectedEmployee]);

  const totals = useMemo(() => {
    return monthlyRows.reduce(
      (acc, row) => {
        acc.revenue += row.revenue;
        if (row.profit >= 0) acc.profit += row.profit;
        else acc.loss += Math.abs(row.profit);
        return acc;
      },
      { revenue: 0, profit: 0, loss: 0 }
    );
  }, [monthlyRows]);

  const activeMonthEntries = useMemo(() => {
    if (!activeMonth) return [];
    return entries
      .filter((entry) => {
        const d = new Date(entry.date);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const isSameMonth = monthKey === activeMonth;
        const isSameEmployee = selectedEmployee === "all" || entry.createdBy?.id === selectedEmployee;
        const isSameArea = selectedArea === "all" || entry.area?.id === selectedArea;
        return isSameMonth && isSameEmployee && isSameArea;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, activeMonth, selectedEmployee]);

  const activeMonthTotals = useMemo(() => {
    return activeMonthEntries.reduce(
      (acc, entry) => {
        acc.revenue += entry.revenue || 0;
        acc.merchantAmount += entry.merchantAmount || 0;
        acc.expense += entry.expense || 0;
        acc.profit += entry.profit || 0;
        return acc;
      },
      { revenue: 0, merchantAmount: 0, expense: 0, profit: 0 }
    );
  }, [activeMonthEntries]);

  const allEntriesRows = useMemo(() => {
    return [...entries].sort((a, b) => {
      const aName = a.createdBy?.name || a.createdBy?.email || "";
      const bName = b.createdBy?.name || b.createdBy?.email || "";
      const byEmployee = aName.localeCompare(bName);
      if (byEmployee !== 0) return byEmployee;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [entries]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Revenue</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatINR(totals.revenue)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Profit</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-600">{formatINR(totals.profit)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Loss</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-red-600">{formatINR(totals.loss)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/20 p-3">
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-[140px] rounded-xl">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employeeOptions.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedArea} onValueChange={setSelectedArea}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <SelectValue placeholder="All Areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area.id} value={area.id}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {userRole === "admin" && (
            <Button variant="outline" className="rounded-xl" onClick={() => setAreasOpen(true)}>
              <MapPin className="h-4 w-4 mr-2" />
              Manage Areas
            </Button>
          )}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Gram Books Entry</DialogTitle>
                <DialogDescription>Add revenue, expense, merchant paid and notes.</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateEntry} className="space-y-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="rounded-xl"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Revenue</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.revenue}
                      onChange={(e) => setForm((f) => ({ ...f, revenue: e.target.value }))}
                      placeholder="0"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Area</Label>
                    <Select value={form.areaId} onValueChange={(v) => setForm((f) => ({ ...f, areaId: v }))}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select Area" />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Expense</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.expense}
                      onChange={(e) => setForm((f) => ({ ...f, expense: e.target.value }))}
                      placeholder="0"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Merchant Amount Paid</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.merchantAmount}
                    onChange={(e) => setForm((f) => ({ ...f, merchantAmount: e.target.value }))}
                    placeholder="0"
                    className="rounded-xl"
                  />
                </div>

                <div className="rounded-xl border p-3 bg-muted/30">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span>P&L Preview</span>
                    <span className={Number(form.revenue || 0) - (Number(form.merchantAmount || 0) + Number(form.expense || 0)) < 0 ? "text-red-600" : "text-emerald-600"}>
                      {formatINR(Number(form.revenue || 0) - (Number(form.merchantAmount || 0) + Number(form.expense || 0)))}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Logic: Revenue - (Merchant + Expense)</p>
                </div>

                <div className="space-y-2">
                  <Label>Expense Type</Label>
                  <Input
                    value={form.expenseType}
                    onChange={(e) => setForm((f) => ({ ...f, expenseType: e.target.value }))}
                    placeholder="e.g. Marketing, Salary, Utilities"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Add notes"
                    rows={3}
                    className="rounded-xl resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Upload Image (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        uploadImage(file);
                      }}
                      className="rounded-xl"
                    />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                  {form.imageUrl && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Upload className="h-3.5 w-3.5" />
                      {form.imageFileName || "Image uploaded"}
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || uploading}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Entry"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Upload Previous Entries</DialogTitle>
                <DialogDescription>
                  Upload old records using CSV columns: date,revenue,expense,merchantAmount,expenseType,notes,imageUrl
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Button variant="ghost" className="px-0" onClick={downloadCsvTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV template
                </Button>
                <div className="space-y-2">
                  <Label>CSV file</Label>
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                    className="rounded-xl"
                  />
                  {bulkFile && (
                    <p className="text-xs text-muted-foreground">{bulkFile.name}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkUpload} disabled={bulkUploading || !bulkFile}>
                  {bulkUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload Entries"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading monthly data...</p>
        ) : monthlyRows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No entries found for this filter.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Expense</TableHead>
                <TableHead>Profit / Loss</TableHead>
                <TableHead>Entries</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyRows.map((row) => (
                <TableRow key={row.monthKey}>
                  <TableCell>{new Date(`${row.monthKey}-01`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</TableCell>
                  <TableCell className="tabular-nums">{formatINR(row.revenue)}</TableCell>
                  <TableCell className="tabular-nums">{formatINR(row.expense)}</TableCell>
                  <TableCell className={`tabular-nums font-medium ${row.profit < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {formatINR(row.profit)}
                  </TableCell>
                  <TableCell>{row.entriesCount}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openMonthEntries(row.monthKey)}>
                      Manage Entries
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={monthEntriesOpen} onOpenChange={setMonthEntriesOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Entries {activeMonth ? `(${activeMonth})` : ""}</DialogTitle>
            <DialogDescription>Edit or delete individual entries for this month.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border max-h-[420px] overflow-auto">
            {activeMonthEntries.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No entries in this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Merchant Paid</TableHead>
                    <TableHead>Expense</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Expense Type</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Photo</TableHead>
                    {userRole === "admin" && <TableHead>Employee</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeMonthEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.date).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="tabular-nums">{formatINR(entry.revenue || 0)}</TableCell>
                      <TableCell className="tabular-nums font-medium text-orange-600">{formatINR(entry.merchantAmount || 0)}</TableCell>
                      <TableCell className="tabular-nums">{formatINR(entry.expense || 0)}</TableCell>
                      <TableCell className={`tabular-nums font-medium ${entry.profit < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatINR(entry.profit)}
                      </TableCell>
                      <TableCell>{entry.expenseType || "~"}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={entry.notes || ""}>
                        {entry.notes || "~"}
                      </TableCell>
                      <TableCell>
                        {entry.imageUrl ? (
                          <a href={entry.imageUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                            View
                          </a>
                        ) : (
                          "~"
                        )}
                      </TableCell>
                      {userRole === "admin" && (
                        <TableCell>
                          {entry.createdBy?.name || entry.createdBy?.email || "~"}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditEntry(entry)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteEntryId(entry.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="sticky bottom-0 bg-muted/90 font-bold border-t-2">
                  <TableRow>
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="tabular-nums">{formatINR(activeMonthTotals.revenue)}</TableCell>
                    <TableCell className="tabular-nums text-orange-600">{formatINR(activeMonthTotals.merchantAmount)}</TableCell>
                    <TableCell className="tabular-nums">{formatINR(activeMonthTotals.expense)}</TableCell>
                    <TableCell className={`tabular-nums ${activeMonthTotals.profit < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatINR(activeMonthTotals.profit)}
                    </TableCell>
                    <TableCell colSpan={4}></TableCell>
                    <TableCell className="text-right">
                      {activeMonthEntries.length} entries
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={allEntriesOpen} onOpenChange={setAllEntriesOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>All Entries by Employees</DialogTitle>
            <DialogDescription>Admin-only complete entry list grouped by employee.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border max-h-[520px] overflow-auto">
            {allEntriesRows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No entries found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Expense</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Expense Type</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allEntriesRows.map((entry) => (
                    <TableRow key={`all-${entry.id}`}>
                      <TableCell>{entry.createdBy?.name || entry.createdBy?.email || "~"}</TableCell>
                      <TableCell>{new Date(entry.date).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="tabular-nums">{formatINR(entry.revenue || 0)}</TableCell>
                      <TableCell className="tabular-nums">{formatINR(entry.expense || 0)}</TableCell>
                      <TableCell className={`tabular-nums font-medium ${entry.profit < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatINR(entry.profit || 0)}
                      </TableCell>
                      <TableCell>{entry.expenseType || "~"}</TableCell>
                      <TableCell className="max-w-[280px] truncate" title={entry.notes || ""}>
                        {entry.notes || "~"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingEntry} onOpenChange={(openState) => !openState && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
            <DialogDescription>Update selected entry details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateEntry} className="space-y-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                className="rounded-xl"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Revenue</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.revenue}
                  onChange={(e) => setEditForm((f) => ({ ...f, revenue: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Expense</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.expense}
                  onChange={(e) => setEditForm((f) => ({ ...f, expense: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Merchant Amount Paid</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={editForm.merchantAmount}
                onChange={(e) => setEditForm((f) => ({ ...f, merchantAmount: e.target.value }))}
                className="rounded-xl"
              />
            </div>

            <div className="rounded-xl border p-3 bg-muted/30">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>P&L Preview</span>
                <span className={Number(editForm.revenue || 0) - (Number(editForm.merchantAmount || 0) + Number(editForm.expense || 0)) < 0 ? "text-red-600" : "text-emerald-600"}>
                  {formatINR(Number(editForm.revenue || 0) - (Number(editForm.merchantAmount || 0) + Number(editForm.expense || 0)))}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Logic: Revenue - (Merchant + Expense)</p>
            </div>

            <div className="space-y-2">
              <Label>Expense Type</Label>
              <Input
                value={editForm.expenseType}
                onChange={(e) => setEditForm((f) => ({ ...f, expenseType: e.target.value }))}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="rounded-xl resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Upload Image (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    uploadEditImage(file);
                  }}
                  className="rounded-xl"
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {editForm.imageUrl && (
                <a href={editForm.imageUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                  Uploaded image link
                </a>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingEntry(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editing || uploading}>
                {editing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={areasOpen} onOpenChange={setAreasOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Areas</DialogTitle>
            <DialogDescription>Add or remove areas for Gram Books entries.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="New area name..."
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateArea()}
              />
              <Button onClick={handleCreateArea} disabled={creatingArea || !newAreaName.trim()}>
                {creatingArea ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-auto rounded-md border p-2">
              {areas.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No areas created yet.</p>
              ) : (
                areas.map((area) => (
                  <div key={area.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50">
                    <span className="text-sm font-medium">{area.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteArea(area.id)}
                      disabled={deletingAreaId === area.id}
                    >
                      {deletingAreaId === area.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteEntryId}
        onOpenChange={(openState) => !openState && setDeleteEntryId(null)}
        title="Delete Entry"
        description="Are you sure you want to delete this Gram Books entry? This cannot be undone."
        onConfirm={handleDeleteEntry}
        isLoading={deleting}
      />

      <ConfirmDialog
        open={!!deleteAreaTargetId}
        onOpenChange={(openState) => !openState && setDeleteAreaTargetId(null)}
        title="Delete Area"
        description="Are you sure you want to delete this area? This action cannot be undone."
        onConfirm={executeDeleteArea}
        isLoading={!!deletingAreaId}
      />
    </div>
  );
}
