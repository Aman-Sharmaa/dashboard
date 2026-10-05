"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package, Search, Plus, Pencil, Trash2, RefreshCw,
  Loader2, User, DollarSign, ArrowDownUp, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AssetItem {
  id: string;
  assetName: string;
  assetId: string;
  assetCost: number;
  givenDate: string | null;
  takenDate: string | null;
  employee: {
    id: string;
    name: string;
    email: string;
    designation?: string;
    department?: string;
  } | null;
  createdAt: string;
}

interface AssetStats {
  total: number;
  assigned: number;
  returned: number;
  totalCost: number;
}

interface EmployeeOption {
  id: string;
  name: string;
  email: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [stats, setStats] = useState<AssetStats>({ total: 0, assigned: 0, returned: 0, totalCost: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all__");

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssetItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    assetName: "",
    assetId: "",
    assetCost: "",
    givenDate: "",
    takenDate: "",
    employeeId: "",
  });

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "__all__") params.set("status", statusFilter);
      const res = await fetch(`/api/assets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
        setStats(data.stats || { total: 0, assigned: 0, returned: 0, totalCost: 0 });
      }
    } catch {
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    fetch("/api/employees?limit=500")
      .then((r) => r.ok ? r.json() : { employees: [] })
      .then((d) => {
        const emps = (d.employees || []).map((e: any) => ({
          id: e.id || String(e._id),
          name: e.name,
          email: e.email,
        }));
        setEmployees(emps);
      })
      .catch(() => { });
  }, []);

  function openAdd() {
    setEditingAsset(null);
    setForm({ assetName: "", assetId: "", assetCost: "", givenDate: "", takenDate: "", employeeId: "" });
    setDialogOpen(true);
  }

  function openEdit(asset: AssetItem) {
    setEditingAsset(asset);
    setForm({
      assetName: asset.assetName,
      assetId: asset.assetId,
      assetCost: String(asset.assetCost),
      givenDate: asset.givenDate || "",
      takenDate: asset.takenDate || "",
      employeeId: asset.employee?.id || "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingAsset(null);
  }

  async function handleSubmit() {
    if (!form.assetName.trim()) { toast.error("Asset name is required"); return; }
    if (!form.assetId.trim()) { toast.error("Asset ID is required"); return; }
    if (!form.givenDate) { toast.error("Given date is required"); return; }
    if (!form.employeeId && !editingAsset) { toast.error("Select an employee"); return; }

    setSaving(true);
    try {
      const payload = {
        assetName: form.assetName.trim(),
        assetId: form.assetId.trim(),
        assetCost: parseFloat(form.assetCost) || 0,
        givenDate: form.givenDate,
        takenDate: form.takenDate || null,
      };

      if (editingAsset) {
        const res = await fetch(`/api/assets/${editingAsset.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success("Asset updated");
          closeDialog();
          loadAssets();
        } else {
          const d = await res.json();
          toast.error(d.message || "Failed to update");
        }
      } else {
        const empId = form.employeeId;
        const res = await fetch(`/api/employees/${empId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success("Asset added");
          closeDialog();
          loadAssets();
        } else {
          const d = await res.json();
          toast.error(d.message || "Failed to add");
        }
      }
    } catch {
      toast.error("Failed to save asset");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/assets/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Asset deleted");
        loadAssets();
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function formatDate(d: string | null) {
    if (!d) return "~";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatCurrency(n: number) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`.replace(/\.0L$/, "L");
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
    return `₹${n.toLocaleString("en-IN")}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Assets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track company assets assigned to employees.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAssets} disabled={loading} className="rounded-xl gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </Button>
          <Button onClick={openAdd} className="rounded-xl gap-1.5">
            <Plus className="h-4 w-4" /> Add Asset
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Assets</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Assigned</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-emerald-600">{stats.assigned}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><ArrowDownUp className="h-3 w-3 text-amber-600" /> Returned</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-amber-600">{stats.returned}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><DollarSign className="h-3 w-3 text-blue-600" /> Total Value</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalCost)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Status</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No assets found.</p>
              <Button variant="outline" size="sm" onClick={openAdd} className="rounded-xl gap-1.5 mt-2">
                <Plus className="h-3.5 w-3.5" /> Add your first asset
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Given</TableHead>
                    <TableHead>Returned</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.assetName}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{a.assetId}</TableCell>
                      <TableCell>
                        {a.employee ? (
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
                              {a.employee.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{a.employee.name}</p>
                              {a.employee.department && (
                                <p className="text-[10px] text-muted-foreground truncate">{a.employee.department}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">~</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">₹{a.assetCost.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs">{formatDate(a.givenDate)}</TableCell>
                      <TableCell className="text-xs">{formatDate(a.takenDate)}</TableCell>
                      <TableCell>
                        {a.takenDate ? (
                          <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Returned</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Assigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => openEdit(a)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive" onClick={() => setDeleteTarget(a)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingAsset ? "Edit Asset" : "Add Asset"}</DialogTitle>
            <DialogDescription>
              {editingAsset ? "Update asset details." : "Add a new asset and assign it to an employee."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!editingAsset && (
              <div className="space-y-1.5">
                <Label className="text-xs">Assign to Employee</Label>
                <Select value={form.employeeId} onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        <span className="flex items-center gap-2">
                          <User className="h-3 w-3" /> {e.name}
                          <span className="text-muted-foreground text-xs">({e.email})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Asset Name</Label>
                <Input value={form.assetName} onChange={(e) => setForm((f) => ({ ...f, assetName: e.target.value }))} placeholder="e.g. MacBook Pro" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Asset ID</Label>
                <Input value={form.assetId} onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))} placeholder="e.g. LP-001" className="rounded-xl font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Asset Cost (₹)</Label>
              <Input type="number" min={0} step={0.01} value={form.assetCost} onChange={(e) => setForm((f) => ({ ...f, assetCost: e.target.value }))} placeholder="0" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Given Date</Label>
                <Input type="date" value={form.givenDate} onChange={(e) => setForm((f) => ({ ...f, givenDate: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Returned Date (optional)</Label>
                <Input type="date" value={form.takenDate} onChange={(e) => setForm((f) => ({ ...f, takenDate: e.target.value }))} className="rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="rounded-xl">
              {saving ? "Saving..." : editingAsset ? "Update" : "Add Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Asset"
        description={`Are you sure you want to delete "${deleteTarget?.assetName}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        isLoading={deleting}
      />
    </div>
  );
}
