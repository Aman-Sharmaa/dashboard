"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Search,
  Grid3X3,
  List,
  Clock,
  Users,
  Globe,
  Lock,
  MoreVertical,
  FolderOpen,
  Folder,
  Star,
  StarOff,
  LayoutGrid,
  ChevronRight,
  FolderPlus,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type PlanPage = {
  _id: string;
  planId: string;
  name: string;
  url?: string;
  projectId?: string;
  order: number;
};

type PlanNode = {
  _id: string;
  name: string;
  parentId?: string | null;
  visibility: "me" | "org" | "shared";
  createdBy: string;
  sharedWith: string[];
  order: number;
  pages: PlanPage[];
  children: PlanNode[];
  createdAt: string;
  updatedAt: string;
};

function formatRelativeDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: diffDays > 365 ? "numeric" : undefined });
}

function VisibilityIcon({ visibility }: { visibility: string }) {
  if (visibility === "org") return <Globe className="h-3 w-3" />;
  if (visibility === "shared") return <Users className="h-3 w-3" />;
  return <Lock className="h-3 w-3" />;
}

export function PlansPageClient() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [parentPlanId, setParentPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [visibility, setVisibility] = useState<"me" | "org" | "shared">("org");
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("all");

  const searchParams = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (userFilter !== "all") params.append("createdBy", userFilter);
      const [plansRes, usersRes] = await Promise.all([
        fetch(`/api/plans?${params.toString()}`),
        fetch("/api/employees"),
      ]);
      const plansData = await plansRes.json();
      const usersData = await usersRes.json();
      if (!plansRes.ok) throw new Error(plansData.message || "Failed to load documents");
      setPlans(plansData.plans || []);
      setUsers(usersData.employees || []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, userFilter]);

  useEffect(() => { load(); }, []);

  function openAddPlan(parentId: string | null = null) {
    setEditingPlanId(null);
    setParentPlanId(parentId);
    setPlanName("");
    setVisibility("org");
    setSharedWith([]);
    setPlanDialogOpen(true);
  }

  function openEditPlan(node: PlanNode) {
    setEditingPlanId(node._id);
    setParentPlanId(node.parentId || null);
    setPlanName(node.name);
    setVisibility(node.visibility || "org");
    setSharedWith(node.sharedWith || []);
    setPlanDialogOpen(true);
  }

  async function onPlanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!planName.trim()) return;
    try {
      const isEditing = !!editingPlanId;
      const url = isEditing ? `/api/plans/${editingPlanId}` : "/api/plans";
      const method = isEditing ? "PUT" : "POST";
      const body = { name: planName.trim(), visibility, sharedWith, parentId: parentPlanId || undefined };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save document");
      toast.success(isEditing ? "Document updated" : "Document created");
      setPlanDialogOpen(false);
      if (isEditing) { load(); } else { router.push(`/view-plan/${data.plan._id}`); }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save document");
    }
  }

  async function confirmDeletePlan() {
    if (!deletePlanId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/plans/${deletePlanId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete document");
      toast.success("Document deleted");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete document");
    } finally {
      setIsDeleting(false);
      setDeletePlanId(null);
    }
  }

  const filteredPlans = plans.filter((p) =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Distinguish Folders vs Files
  const folders = filteredPlans.filter(
    (p) => (p.children && p.children.length > 0) || (p.pages && p.pages.length > 0) || p.parentId === null
  );
  const documents = filteredPlans.filter(
    (p) => !folders.some((f) => f._id === p._id)
  );

  return (
    <div className="space-y-6 w-full pb-16">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-violet-600" />
            Documents &amp; Plans
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Create, organise, and collaborate on project documentation and folders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200/60">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                viewMode === "grid" ? "bg-white text-neutral-900 shadow-2xs" : "text-neutral-500 hover:text-neutral-900"
              )}
              title="Grid View"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                viewMode === "list" ? "bg-white text-neutral-900 shadow-2xs" : "text-neutral-500 hover:text-neutral-900"
              )}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button onClick={() => openAddPlan(null)} size="sm" className="h-8 rounded-xl gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-xs">
            <Plus className="h-3.5 w-3.5" />
            New Document / Folder
          </Button>
        </div>
      </div>

      {/* ── Search & Filters Row ── */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <Input
            placeholder="Search documents and folders..."
            className="pl-9 h-9 text-xs rounded-xl bg-white border-neutral-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </div>

        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-auto min-w-[150px] h-9 text-xs bg-white border-neutral-200 rounded-xl">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Team Members</SelectItem>
            {users.filter((u: any) => u.userId || u.id).map((u: any) => (
              <SelectItem key={u.userId || u.id} value={u.userId || u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={load} size="sm" className="h-9 px-3 rounded-xl border-neutral-200 text-xs">
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 border-2 border-dashed rounded-2xl bg-white border-neutral-200 text-center p-6">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm text-neutral-900">No documents or folders found</p>
            <p className="text-xs text-neutral-500 max-w-sm">Create your first document or folder to organize project docs.</p>
          </div>
          <Button onClick={() => openAddPlan(null)} size="sm" className="rounded-xl gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold">
            <Plus className="h-3.5 w-3.5" /> Create Document
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* ── Compact Grid View (Google Drive / Apple Finder style) ── */
        <div className="space-y-6">
          {/* Folders Section */}
          {folders.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" /> Folders ({folders.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {folders.map((node) => {
                  const creator = users.find((u: any) => (u.userId || u.id) === node.createdBy);
                  const itemCount = (node.pages?.length || 0) + (node.children?.length || 0);

                  return (
                    <div
                      key={node._id}
                      onClick={() => router.push(`/view-plan/${node._id}`)}
                      className="group p-3 rounded-xl border border-neutral-200/80 bg-white hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2.5 relative"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0">
                          <Folder className="h-4 w-4 fill-amber-500/20" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-neutral-800 truncate group-hover:text-amber-700 transition-colors">
                            {node.name}
                          </p>
                          <span className="text-[10px] text-neutral-400 truncate block">
                            {itemCount} item{itemCount === 1 ? "" : "s"} · {formatRelativeDate(node.updatedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Dropdown Menu */}
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-6 w-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36 rounded-xl">
                            <DropdownMenuItem onClick={() => router.push(`/view-plan/${node._id}`)} className="text-xs gap-2">
                              <FolderOpen className="h-3.5 w-3.5 text-amber-500" /> Open
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditPlan(node)} className="text-xs gap-2">
                              <Pencil className="h-3.5 w-3.5 text-neutral-500" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeletePlanId(node._id)} className="text-xs gap-2 text-red-600 focus:text-red-700 focus:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Files / Documents Section */}
          {documents.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-600" /> Documents &amp; Files ({documents.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {documents.map((node) => {
                  const creator = users.find((u: any) => (u.userId || u.id) === node.createdBy);

                  return (
                    <div
                      key={node._id}
                      onClick={() => router.push(`/view-plan/${node._id}`)}
                      className="group p-3 rounded-xl border border-neutral-200/80 bg-white hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2.5 relative"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-neutral-800 truncate group-hover:text-blue-700 transition-colors">
                            {node.name}
                          </p>
                          <span className="text-[10px] text-neutral-400 truncate block">
                            {creator?.name || "You"} · {formatRelativeDate(node.updatedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Dropdown Menu */}
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-6 w-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36 rounded-xl">
                            <DropdownMenuItem onClick={() => router.push(`/view-plan/${node._id}`)} className="text-xs gap-2">
                              <FolderOpen className="h-3.5 w-3.5 text-blue-500" /> Open
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditPlan(node)} className="text-xs gap-2">
                              <Pencil className="h-3.5 w-3.5 text-neutral-500" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeletePlanId(node._id)} className="text-xs gap-2 text-red-600 focus:text-red-700 focus:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Compact Table List View ── */
        <div className="rounded-2xl border border-neutral-200 overflow-hidden bg-white shadow-2xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50/80 text-neutral-500 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[10px]">Name</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[10px] w-28">Type</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[10px] w-28">Visibility</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[10px] w-36">Created By</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[10px] w-32 hidden sm:table-cell">Updated</th>
                <th className="px-4 py-2.5 w-12 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredPlans.map((node) => {
                const isFolder = (node.children && node.children.length > 0) || (node.pages && node.pages.length > 0) || node.parentId === null;
                const creator = users.find((u: any) => (u.userId || u.id) === node.createdBy);

                return (
                  <tr
                    key={node._id}
                    className="hover:bg-neutral-50/70 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/view-plan/${node._id}`)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "h-6 w-6 rounded-md flex items-center justify-center shrink-0 border",
                          isFolder ? "bg-amber-50 text-amber-600 border-amber-200/70" : "bg-blue-50 text-blue-600 border-blue-200/70"
                        )}>
                          {isFolder ? <Folder className="h-3.5 w-3.5 fill-amber-500/20" /> : <FileText className="h-3.5 w-3.5" />}
                        </div>
                        <span className="font-semibold text-neutral-800 group-hover:text-violet-700 transition-colors truncate">
                          {node.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500 font-medium">
                      {isFolder ? "Folder" : "Document"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide",
                        node.visibility === "org" ? "bg-blue-50 text-blue-700 border border-blue-200/60" :
                        node.visibility === "shared" ? "bg-amber-50 text-amber-700 border border-amber-200/60" :
                        "bg-neutral-100 text-neutral-600"
                      )}>
                        {node.visibility}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600 text-xs">
                      {creator?.name || "You"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-400 text-[11px] hidden sm:table-cell">
                      {formatRelativeDate(node.updatedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-6 w-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 rounded-xl">
                          <DropdownMenuItem onClick={() => router.push(`/view-plan/${node._id}`)} className="text-xs gap-2">
                            <FolderOpen className="h-3.5 w-3.5 text-blue-500" /> Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditPlan(node)} className="text-xs gap-2">
                            <Pencil className="h-3.5 w-3.5 text-neutral-500" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeletePlanId(node._id)} className="text-xs gap-2 text-red-600 focus:text-red-700 focus:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <form onSubmit={onPlanSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {editingPlanId ? "Rename Document / Folder" : "New Document / Folder"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Enter a title and set visibility permissions across team members.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Title *</Label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Q3 Roadmap, Design Specs, Sprint Docs"
                  className="rounded-xl h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Visibility</Label>
                <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                  <SelectTrigger className="rounded-xl h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org">Entire Organization</SelectItem>
                    <SelectItem value="shared">Specific Team Members</SelectItem>
                    <SelectItem value="me">Private (Only Me)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setPlanDialogOpen(false)} className="rounded-xl h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold">
                {editingPlanId ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={!!deletePlanId}
        onOpenChange={(open) => !open && setDeletePlanId(null)}
        title="Delete Document / Folder"
        description="Are you sure you want to delete this document? All associated subpages will be removed permanently."
        onConfirm={confirmDeletePlan}
        isLoading={isDeleting}
      />
    </div>
  );
}
