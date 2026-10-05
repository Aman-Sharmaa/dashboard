"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Package, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

type AssetRow = {
  id: string;
  employeeId: string;
  assetName: string;
  assetId: string;
  assetCost: number;
  givenDate: string | null;
  takenDate: string | null;
};

type Props = {
  employeeId: string;
  isAdmin: boolean;
};

export function EmployeeAssetsSection({ employeeId, isAdmin }: Props) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<AssetRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    assetName: "",
    assetId: "",
    assetCost: "",
    givenDate: "",
    takenDate: "",
  });

  const loadAssets = useCallback(async (cacheBust = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/employees/${encodeURIComponent(employeeId)}/assets${cacheBust ? `?_t=${Date.now()}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to load assets");
        setAssets([]);
        return;
      }
      setAssets(data.assets || []);
    } catch {
      setError("Failed to load assets");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  function openAdd() {
    setEditingId(null);
    setForm({
      assetName: "",
      assetId: "",
      assetCost: "",
      givenDate: "",
      takenDate: "",
    });
    setDialogOpen(true);
  }

  function openEdit(asset: AssetRow) {
    setEditingId(asset.id);
    setForm({
      assetName: asset.assetName,
      assetId: asset.assetId,
      assetCost: String(asset.assetCost),
      givenDate: asset.givenDate || "",
      takenDate: asset.takenDate || "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ assetName: "", assetId: "", assetCost: "", givenDate: "", takenDate: "" });
  }

  async function handleSubmit() {
    const name = form.assetName.trim();
    const aid = form.assetId.trim();
    const cost = parseFloat(form.assetCost);
    if (!name) {
      setError("Asset name is required.");
      return;
    }
    if (!aid) {
      setError("Asset ID is required.");
      return;
    }
    if (!form.givenDate) {
      setError("Asset given date is required.");
      return;
    }
    const givenDate = new Date(form.givenDate);
    if (Number.isNaN(givenDate.getTime())) {
      setError("Invalid given date.");
      return;
    }
    const payload = {
      assetName: name,
      assetId: aid,
      assetCost: Number.isNaN(cost) ? 0 : cost,
      givenDate: form.givenDate,
      takenDate: form.takenDate && form.takenDate.trim() ? form.takenDate.trim() : null,
    };

    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        const res = await fetch(`/api/assets/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          closeDialog();
          await loadAssets(true);
        } else {
          setError(data.message || "Failed to update asset");
        }
      } else {
        const res = await fetch(`/api/employees/${employeeId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          closeDialog();
          setAssets((prev) => [
            {
              id: data.asset.id,
              employeeId: data.asset.employeeId,
              assetName: data.asset.assetName,
              assetId: data.asset.assetId,
              assetCost: data.asset.assetCost,
              givenDate: data.asset.givenDate,
              takenDate: data.asset.takenDate,
            },
            ...prev,
          ]);
          await loadAssets(true);
        } else {
          setError(data.message || "Failed to add asset");
        }
      }
    } catch {
      setError("Failed to save asset");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(asset: AssetRow) {
    setAssetToDelete(asset);
  }

  async function confirmDelete() {
    if (!assetToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${assetToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== assetToDelete.id));
        await loadAssets(true);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to delete asset");
      }
    } catch {
      setError("Failed to delete asset");
    } finally {
      setIsDeleting(false);
      setAssetToDelete(null);
    }
  }

  function formatDate(d: string | null) {
    if (!d) return "~";
    const date = new Date(d);
    return Number.isNaN(date.getTime()) ? "~" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <Card className="shadow-sm min-w-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2 min-w-0 flex-wrap">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Assets
          </CardTitle>
          <CardDescription>
            Assets assigned to this employee. Asset name, ID, cost, given date, and return (taken) date.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => loadAssets(true)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {isAdmin && (
            <Button variant="default" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add asset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="mt-2 min-w-0">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : assets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No assets assigned yet. {isAdmin && "Click “Add asset” to add one."}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset name</TableHead>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Asset cost</TableHead>
                  <TableHead>Given date</TableHead>
                  <TableHead>Taken date</TableHead>
                  {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.assetName}</TableCell>
                    <TableCell className="font-mono text-sm">{a.assetId}</TableCell>
                    <TableCell>₹{a.assetCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{formatDate(a.givenDate)}</TableCell>
                    <TableCell>{formatDate(a.takenDate)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(a)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(a)}
                            disabled={deletingId === a.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit asset" : "Add asset"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Update asset details." : "Add an asset assigned to this employee."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Asset name</Label>
                <Input
                  value={form.assetName}
                  onChange={(e) => setForm((f) => ({ ...f, assetName: e.target.value }))}
                  placeholder="e.g. Laptop"
                />
              </div>
              <div className="space-y-2">
                <Label>Asset ID</Label>
                <Input
                  value={form.assetId}
                  onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))}
                  placeholder="e.g. LP-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Asset cost (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.assetCost}
                  onChange={(e) => setForm((f) => ({ ...f, assetCost: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Asset given date</Label>
                <Input
                  type="date"
                  value={form.givenDate}
                  onChange={(e) => setForm((f) => ({ ...f, givenDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Asset taken date (optional)</Label>
                <Input
                  type="date"
                  value={form.takenDate}
                  onChange={(e) => setForm((f) => ({ ...f, takenDate: e.target.value }))}
                  placeholder="Leave empty if still with employee"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving…" : editingId ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!assetToDelete}
        onOpenChange={(open) => !open && setAssetToDelete(null)}
        title="Remove Asset"
        description={`Are you sure you want to remove the asset "${assetToDelete?.assetName}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </Card>
  );
}
