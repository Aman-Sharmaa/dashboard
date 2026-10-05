"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Plus, Search, Building2, ChevronRight, MoreHorizontal, Pencil, Trash2, ExternalLink, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type ClientRow = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  isActive?: boolean;
};

type ClientFull = ClientRow & {
  designation?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyWebsite?: string;
  gstin?: string;
  pan?: string;
  taxAddress?: string;
  notes?: string;
};

type Props = {
  clients: ClientRow[];
  isAdmin: boolean;
};

export function ProjectsClientsClient({ clients: initialClients, isAdmin }: Props) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    companyName: "",
    phone: "",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ClientFull | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");

  const filtered = clients.filter((c) => {
    const matchesSearch =
      !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && c.isActive !== false) ||
      (statusFilter === "inactive" && c.isActive === false);
    return matchesSearch && matchesStatus;
  });

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.companyName) {
      toast.error("Name, email and company name are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to add client");
        return;
      }
      toast.success("Client added");
      setOpen(false);
      setForm({ name: "", email: "", companyName: "", phone: "" });
      setClients((prev) => [
        ...prev,
        {
          id: data.client.id,
          name: data.client.name,
          email: data.client.email,
          companyName: data.client.companyName,
          isActive: true,
        },
      ]);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function openEdit(clientId: string) {
    setEditId(clientId);
    setEditForm(null);
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();
      if (!res.ok || !data.client) {
        toast.error("Failed to load client");
        setEditId(null);
        return;
      }
      setEditForm({
        id: data.client.id,
        name: data.client.name,
        email: data.client.email,
        companyName: data.client.companyName,
        phone: data.client.phone,
        designation: data.client.designation,
        companyAddress: data.client.companyAddress,
        companyPhone: data.client.companyPhone,
        companyWebsite: data.client.companyWebsite,
        gstin: data.client.gstin,
        pan: data.client.pan,
        taxAddress: data.client.taxAddress,
        notes: data.client.notes,
        isActive: data.client.isActive,
      });
    } catch {
      toast.error("Failed to load client");
      setEditId(null);
    }
  }

  async function handleEditClient(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editForm || !editForm.name || !editForm.email || !editForm.companyName) {
      toast.error("Name, email and company name are required");
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/clients/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to update client");
        return;
      }
      toast.success("Client updated");
      setEditId(null);
      setEditForm(null);
      setClients((prev) =>
        prev.map((c) =>
          c.id === editId
            ? {
                id: data.client.id,
                name: data.client.name,
                email: data.client.email,
                companyName: data.client.companyName,
                phone: data.client.phone,
                isActive: data.client.isActive,
              }
            : c
        )
      );
    } catch {
      toast.error("Something went wrong");
    } finally {
      setEditSaving(false);
    }
  }

  function openDelete(c: ClientRow) {
    setDeleteId(c.id);
    setDeleteName(c.companyName);
  }

  async function handleToggleActive(c: ClientRow) {
    const nextActive = c.isActive === false;
    try {
      const res = await fetch(`/api/clients/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to update client");
        return;
      }
      toast.success(nextActive ? "Client marked as active" : "Client marked as inactive");
      setClients((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, isActive: nextActive } : x))
      );
      if (editForm?.id === c.id) setEditForm((f) => f ? { ...f, isActive: nextActive } : null);
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function handleDeleteClient() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "Failed to delete client");
        return;
      }
      toast.success("Client deleted");
      setDeleteId(null);
      setDeleteName("");
      setClients((prev) => prev.filter((c) => c.id !== deleteId));
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial sm:justify-end">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              className="rounded-xl"
              onClick={() => setStatusFilter("all")}
            >
              All
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              size="sm"
              className="rounded-xl"
              onClick={() => setStatusFilter("active")}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === "inactive" ? "default" : "outline"}
              size="sm"
              className="rounded-xl"
              onClick={() => setStatusFilter("inactive")}
            >
              Inactive
            </Button>
            {isAdmin && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-xl sm:ml-auto">
                    <Plus className="h-4 w-4 mr-1.5" /> Add client
                  </Button>
                </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add client</DialogTitle>
                <DialogDescription>Create a new client. You can add more details on the client page.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddClient} className="space-y-4">
                <div className="space-y-2">
                  <Label>Contact name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="john@company.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company name *</Label>
                  <Input
                    value={form.companyName}
                    onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                    placeholder="Acme Inc"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+91..."
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Adding..." : "Add client"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[280px]">Client / Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {clients.length === 0 ? "No clients yet. Add a client to get started." : "No clients match your search or filter."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{c.companyName}</p>
                        <p className="text-xs text-muted-foreground">{c.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{c.email}</p>
                    {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                  </TableCell>
                  <TableCell>
                    {c.isActive === false ? (
                      <Badge variant="secondary" className="font-normal">Inactive</Badge>
                    ) : (
                      <Badge variant="default" className="bg-emerald-600 font-normal">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/projects/clients/${c.id}`} className="gap-1">
                          View <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/projects/clients/${c.id}`} className="flex items-center gap-2 cursor-pointer">
                                <ExternalLink className="h-4 w-4" />
                                View details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => openEdit(c.id)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit client
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleToggleActive(c)}>
                              {c.isActive === false ? (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Mark as active
                                </>
                              ) : (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Mark as inactive
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                              onClick={() => openDelete(c)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete client
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit client dialog */}
      <Dialog open={!!editId} onOpenChange={(o) => !o && (setEditId(null), setEditForm(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit client</DialogTitle>
            <DialogDescription>Update client details.</DialogDescription>
          </DialogHeader>
          {editForm && (
            <form onSubmit={handleEditClient} className="space-y-4">
              <div className="space-y-2">
                <Label>Contact name *</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => f && { ...f, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => f && { ...f, email: e.target.value })}
                  placeholder="john@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Company name *</Label>
                <Input
                  value={editForm.companyName}
                  onChange={(e) => setEditForm((f) => f && { ...f, companyName: e.target.value })}
                  placeholder="Acme Inc"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editForm.phone ?? ""}
                  onChange={(e) => setEditForm((f) => f && { ...f, phone: e.target.value || undefined })}
                  placeholder="+91..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => (setEditId(null), setEditForm(null))}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && (setDeleteId(null), setDeleteName(""))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteName}</strong>? This cannot be undone. Projects and data linked to this client may be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => (setDeleteId(null), setDeleteName(""))} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteClient} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

     
    </>
  );
}
