"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { ExpandableDescription } from "@/components/expandable-description";
import dynamic from "next/dynamic";

import {
  Plus,
  Search,
  SlidersHorizontal,
  Calendar,
  Layers,
  X,
  Trash2,
  Compass,
  User,
  Briefcase,
  Globe,
  GlobeLock,
  ExternalLink,
  Settings2,
  GripVertical,
  Pencil,
  Loader2,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";

// Dynamically import the rich text editor so it doesn't bloat the board bundle
const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[80px] rounded-lg border border-zinc-200 flex items-center justify-center text-xs text-zinc-400">
        Loading editor…
      </div>
    ),
  }
);

type Project = { id: string; name: string };

type RoadmapItem = {
  id: string;
  title: string;
  description?: string;
  status: string;
  targetDate?: string | null;
  impactScore?: number | null;
  theme?: string;
  createdBy?: string;
  createdByName?: string;
  completed?: boolean;
  completedBy?: string;
  completedByName?: string;
  completedAt?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  createdAt?: string;
};

type RoadmapColumn = {
  id: string;
  key: string;
  label: string;
  color: string;
  order: number;
};

const THEMES = [
  "🚀 Expand horizons",
  "🌱 Increase revenue",
  "🤝 Win enterprise customers",
  "💙 Delight users",
];

// ── Shimmer skeleton card ────────────────────────────────────────────────────
function ShimmerCard() {
  return (
    <div className="bg-white border border-zinc-200/80 rounded-xl p-4 animate-pulse space-y-3">
      <div className="h-3.5 bg-zinc-200 rounded-md w-3/4" />
      <div className="h-3 bg-zinc-100 rounded-md w-full" />
      <div className="h-3 bg-zinc-100 rounded-md w-2/3" />
      <div className="pt-3 border-t border-zinc-100 flex justify-between">
        <div className="h-3 bg-zinc-200 rounded-full w-24" />
        <div className="h-3 bg-zinc-100 rounded-full w-16" />
      </div>
    </div>
  );
}

function ShimmerColumn() {
  return (
    <div className="bg-zinc-50/70 border border-zinc-200 rounded-xl flex flex-col">
      <div className="p-3 border-b border-zinc-200/60 flex items-center gap-2 bg-white rounded-t-xl animate-pulse">
        <div className="h-2 w-2 rounded-full bg-zinc-200" />
        <div className="h-3.5 bg-zinc-200 rounded w-16" />
        <div className="h-4 w-6 bg-zinc-100 rounded-full ml-1" />
      </div>
      <div className="p-3 space-y-3 flex-1">
        {[1, 2].map((i) => <ShimmerCard key={i} />)}
      </div>
    </div>
  );
}

// ── Impact colour helper ─────────────────────────────────────────────────────
function getImpactColor(score: number | null | undefined) {
  if (score == null) return "text-zinc-400";
  if (score >= 75) return "text-emerald-600";
  if (score >= 35) return "text-amber-600";
  return "text-rose-500";
}

// ── Avatar initials ──────────────────────────────────────────────────────────
function Avatar({ name, url }: { name?: string; url?: string }) {
  if (url) {
    return (
      <div className="h-5 w-5 rounded-full overflow-hidden relative bg-zinc-200 shrink-0">
        <Image src={url} alt={name || "User"} fill className="object-cover" sizes="20px" />
      </div>
    );
  }

  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold shrink-0">
      {initials}
    </span>
  );
}

// ── Column Manager Dialog ─────────────────────────────────────────────────────
function RoadmapColumnManagerDialog({
  open,
  onClose,
  columns,
  onColumnsChange,
}: {
  open: boolean;
  onClose: () => void;
  columns: RoadmapColumn[];
  onColumnsChange: (cols: RoadmapColumn[]) => void;
}) {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingCol, setEditingCol] = useState<RoadmapColumn | null>(null);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#71717a");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localCols, setLocalCols] = useState<RoadmapColumn[]>(columns);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => { setLocalCols(columns); }, [columns]);

  function resetForm() { setLabel(""); setColor("#71717a"); setEditingCol(null); }

  async function handleCreate() {
    if (!label.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/roadmap/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), color }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to create column"); return; }
      const updated = [...localCols, data.column];
      setLocalCols(updated);
      onColumnsChange(updated);
      resetForm();
      setMode("list");
      toast.success("Column created");
    } catch { toast.error("Failed to create column"); }
    finally { setSaving(false); }
  }

  async function handleEdit() {
    if (!editingCol || !label.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/roadmap/columns/${editingCol.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), color }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to update column"); return; }
      const updated = localCols.map((c) =>
        c.id === editingCol.id ? { ...c, label: label.trim(), color } : c
      );
      setLocalCols(updated);
      onColumnsChange(updated);
      resetForm();
      setMode("list");
      toast.success("Column updated");
    } catch { toast.error("Failed to update column"); }
    finally { setSaving(false); }
  }

  async function handleDelete(col: RoadmapColumn) {
    setDeletingId(col.id);
    try {
      const res = await fetch(`/api/roadmap/columns/${col.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to delete column"); return; }
      const updated = localCols.filter((c) => c.id !== col.id);
      setLocalCols(updated);
      onColumnsChange(updated);
      toast.success("Column deleted");
    } catch { toast.error("Failed to delete column"); }
    finally { setDeletingId(null); }
  }

  function handleDragStart(idx: number) { setDragIdx(idx); }
  function handleDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); setDragOverIdx(idx); }

  async function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...localCols];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    const withOrder = reordered.map((c, i) => ({ ...c, order: i }));
    setLocalCols(withOrder);
    onColumnsChange(withOrder);
    setDragIdx(null);
    setDragOverIdx(null);
    try {
      await fetch("/api/roadmap/columns/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: withOrder.map((c) => c.id) }),
      });
    } catch { /* silent */ }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm">
            <Settings2 className="h-4 w-4 text-primary" />
            Manage Roadmap Columns
          </h3>
          <button onClick={() => { onClose(); resetForm(); setMode("list"); }} className="text-zinc-400 hover:text-zinc-600 p-1 hover:bg-zinc-100 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {mode === "list" ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Drag to reorder columns. Delete is only allowed when the column is empty.
              </p>

              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {localCols.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">No columns yet.</p>
                )}
                {localCols.map((col, idx) => (
                  <div
                    key={col.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-white transition-all cursor-grab active:cursor-grabbing",
                      dragOverIdx === idx ? "border-primary bg-primary/5 shadow-md" : "border-zinc-200 hover:border-zinc-300"
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-zinc-300 shrink-0" />
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                    <span className="flex-1 text-sm font-medium text-zinc-800 truncate">{col.label}</span>
                    <span className="text-[10px] text-zinc-400 font-mono shrink-0">#{idx + 1}</span>
                    <button
                      onClick={() => { setEditingCol(col); setLabel(col.label); setColor(col.color); setMode("edit"); }}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(col)}
                      disabled={deletingId === col.id}
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                      title="Delete (only if empty)"
                    >
                      {deletingId === col.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                <button onClick={() => { onClose(); resetForm(); setMode("list"); }} className="px-4 py-2 text-sm rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors text-zinc-600">
                  Close
                </button>
                <button
                  onClick={() => { resetForm(); setMode("create"); }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Column
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-700 font-semibold text-xs">Column Name *</Label>
                <Input
                  placeholder="e.g. In Review, Shipped, Won't Fix..."
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (mode === "create" ? handleCreate() : handleEdit())}
                  className="rounded-xl"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-700 font-semibold text-xs">Column Colour</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-14 rounded-lg border border-zinc-200 cursor-pointer p-0.5"
                  />
                  <span className="text-xs text-zinc-500 font-mono">{color}</span>
                  {/* Preset colours */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {["#2563eb", "#d97706", "#e11d48", "#71717a", "#16a34a", "#7c3aed", "#0891b2"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={cn("h-5 w-5 rounded-full border-2 transition-all", color === c ? "border-zinc-900 scale-110" : "border-transparent hover:scale-110")}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                <button onClick={() => { resetForm(); setMode("list"); }} className="px-4 py-2 text-sm rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors text-zinc-600">
                  Back
                </button>
                <button
                  onClick={mode === "create" ? handleCreate : handleEdit}
                  disabled={saving || !label.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "create" ? "Create Column" : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function RoadmapBoard() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [columns, setColumns] = useState<RoadmapColumn[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTheme, setFilterTheme] = useState("all");
  const [filterCreator, setFilterCreator] = useState("all");
  const [filterProject, setFilterProject] = useState("all");

  // Settings
  const [isPublic, setIsPublic] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canAddItem, setCanAddItem] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [completionSaving, setCompletionSaving] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("now");
  const [targetDate, setTargetDate] = useState("");
  const [impactScore, setImpactScore] = useState(50);
  const [theme, setTheme] = useState(THEMES[0]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectName, setSelectedProjectName] = useState("");

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchItems = async () => {
    try {
      const res = await fetch("/api/roadmap");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data.items || []);
      setEmployees(data.employees || []);
    } catch (err: any) {
      toast.error(err.message || "Could not load roadmap");
    } finally {
      setLoading(false);
    }
  };

  const fetchColumns = async () => {
    try {
      const res = await fetch("/api/roadmap/columns");
      if (res.ok) {
        const data = await res.json();
        setColumns(data.columns || []);
      }
    } catch {}
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) return;
      const data = await res.json();
      setProjects((data.projects || []).map((p: any) => ({ id: p.id, name: p.name })));
    } catch {}
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/roadmap/settings");
      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.isPublic);
        setIsAdmin(data.isAdmin);
        // All authenticated users (isAuthenticated or isAdmin) can add items
        setCanAddItem(data.isAuthenticated || data.isAdmin);
      }
    } catch {}
  };

  useEffect(() => {
    fetchItems();
    fetchColumns();
    fetchProjects();
    fetchSettings();
  }, []);

  const togglePublicRoadmap = async () => {
    setTogglingPublic(true);
    try {
      const res = await fetch("/api/roadmap/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.isPublic);
        toast.success(data.isPublic ? "Roadmap is now public" : "Roadmap is now private");
      }
    } catch {
      toast.error("Failed to update public setting");
    } finally {
      setTogglingPublic(false);
    }
  };

  // ── Unique creators list ────────────────────────────────────────────────────
  const creators = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((i) => {
      if (i.createdBy && i.createdByName) map.set(i.createdBy, i.createdByName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  // ── Filtered items ──────────────────────────────────────────────────────────
  const filteredItems = useMemo(() =>
    items.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !item.title.toLowerCase().includes(q) &&
          !(item.description?.toLowerCase().includes(q))
        ) return false;
      }
      if (filterTheme !== "all" && item.theme !== filterTheme) return false;
      if (filterCreator !== "all" && item.createdBy !== filterCreator) return false;
      if (filterProject !== "all" && item.projectId !== filterProject) return false;
      return true;
    }),
    [items, searchQuery, filterTheme, filterCreator, filterProject]
  );

  // ── Modal helpers ───────────────────────────────────────────────────────────
  const resetForm = () => {
    setTitle(""); setDescription(""); setStatus(columns[0]?.key || "now");
    setTargetDate(""); setImpactScore(50); setTheme(THEMES[0]);
    setSelectedProjectId(""); setSelectedProjectName("");
  };

  const openAdd = (colKey: string) => {
    setEditingItem(null);
    resetForm();
    setStatus(colKey);
    setIsModalOpen(true);
  };

  const openEdit = (item: RoadmapItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setStatus(item.status);
    setTargetDate(item.targetDate ? new Date(item.targetDate).toISOString().split("T")[0] : "");
    setImpactScore(item.impactScore ?? 50);
    setTheme(item.theme || THEMES[0]);
    setSelectedProjectId(item.projectId || "");
    setSelectedProjectName(item.projectName || "");
    setIsModalOpen(true);
  };

  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const proj = projects.find((p) => p.id === id);
    setSelectedProjectId(id);
    setSelectedProjectName(proj?.name || "");
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }

    const payload = {
      title, description, status,
      targetDate: targetDate || null,
      impactScore: Number(impactScore),
      theme,
      projectId: selectedProjectId || null,
      projectName: selectedProjectName || null,
    };

    try {
      if (editingItem) {
        const res = await fetch(`/api/roadmap/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success("Roadmap item updated");
      } else {
        const res = await fetch("/api/roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast.success("Roadmap item created");
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Error saving item");
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);

  const executeDelete = async () => {
    if (!editingItem) return;
    setDeletingItem(true);
    try {
      const res = await fetch(`/api/roadmap/${editingItem.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Roadmap item deleted successfully");
      setDeleteConfirmOpen(false);
      setIsModalOpen(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Error deleting");
    } finally {
      setDeletingItem(false);
    }
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const toggleComplete = async () => {
    if (!editingItem) return;
    setCompletionSaving(true);
    try {
      const res = await fetch(`/api/roadmap/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !editingItem.completed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update completion status");
      setEditingItem(data.item);
      setItems((current) => current.map((item) => item.id === data.item.id ? data.item : item));
      toast.success(data.item.completed ? "Marked as complete" : "Marked as incomplete");
    } catch (err: any) {
      toast.error(err.message || "Could not update completion status");
    } finally {
      setCompletionSaving(false);
    }
  };

  // Determine active column color for modal form
  const activeColColor = columns.find((c) => c.key === status)?.color || "#2563eb";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      {/* Delete Item Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Roadmap Item?"
        description="Are you sure you want to permanently delete this roadmap initiative?"
        confirmLabel={deletingItem ? "Deleting..." : "Delete Item"}
        variant="destructive"
        isLoading={deletingItem}
        onConfirm={executeDelete}
      />

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            Product Roadmap
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Map initiatives to themes and track them across quarters.
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {/* Manage Columns */}
            <button
              onClick={() => setColumnManagerOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-all"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Manage Columns
            </button>

            <button
              onClick={togglePublicRoadmap}
              disabled={togglingPublic}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                isPublic
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {isPublic ? <Globe className="h-3.5 w-3.5" /> : <GlobeLock className="h-3.5 w-3.5" />}
              {isPublic ? "Publicly Shared" : "Private Board"}
            </button>
            {isPublic && (
              <a
                href="/roadmap"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Public Page
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2 pb-4 shrink-0">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <Input
            placeholder="Search initiatives..."
            className="pl-8 h-8 text-xs rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 text-zinc-500">
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </div>

        {/* Theme filter */}
        <select
          value={filterTheme}
          onChange={(e) => setFilterTheme(e.target.value)}
          className="bg-white border border-zinc-200 rounded-lg text-xs h-8 px-2.5 text-zinc-700 outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All themes</option>
          {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Creator filter */}
        <select
          value={filterCreator}
          onChange={(e) => setFilterCreator(e.target.value)}
          className="bg-white border border-zinc-200 rounded-lg text-xs h-8 px-2.5 text-zinc-700 outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All creators</option>
          {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Project filter */}
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="bg-white border border-zinc-200 rounded-lg text-xs h-8 px-2.5 text-zinc-700 outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* ── Board ── */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
            {[1, 2, 3, 4].map((i) => <ShimmerColumn key={i} />)}
          </div>
        ) : (
          <div
            className="flex gap-4 h-full overflow-x-auto pb-2 scrollbar-none"
            style={{ gridAutoColumns: "280px" }}
          >
            {columns.map((col) => {
              const colItems = filteredItems.filter((i) => i.status === col.key);
              return (
                <div
                  key={col.key}
                  className="bg-zinc-50/70 border border-zinc-200 rounded-xl flex flex-col overflow-hidden flex-shrink-0 w-[280px] min-w-[240px]"
                >
                  {/* Column header */}
                  <div className="p-3 border-b border-zinc-200/60 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                      <span className="font-semibold text-sm text-zinc-800">{col.label}</span>
                      <span className="bg-zinc-100 text-zinc-600 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                        {colItems.length}
                      </span>
                    </div>
                    {canAddItem && (
                      <button
                        onClick={() => openAdd(col.key)}
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-none">
                    {colItems.length === 0 ? (
                      <button
                        onClick={() => canAddItem && openAdd(col.key)}
                        className="w-full text-center py-8 border border-dashed border-zinc-200 rounded-lg bg-zinc-50 text-zinc-400 text-xs hover:border-zinc-300 hover:text-zinc-500 transition-colors"
                      >
                        {canAddItem ? "+ Add initiative" : "No initiatives yet"}
                      </button>
                    ) : (
                      colItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => openEdit(item)}
                          className="bg-white border border-zinc-200/80 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer group"
                        >
                          <h4 className={cn(
                            "font-semibold transition-colors text-sm line-clamp-1",
                            item.completed
                              ? "text-zinc-500 line-through decoration-zinc-400"
                              : "text-zinc-900 group-hover:text-primary"
                          )}>
                            {item.title}
                          </h4>
                          {item.completed && item.completedByName && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed by {item.completedByName}
                            </div>
                          )}
                          {item.description && (
                            <ExpandableDescription html={item.description} />
                          )}

                          {/* Project badge */}
                          {item.projectName && (
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-violet-700 bg-violet-50 border border-violet-100 rounded-md px-2 py-0.5 w-fit">
                              <Briefcase className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate max-w-[120px]">{item.projectName}</span>
                            </div>
                          )}

                          <div className="mt-3 pt-2.5 border-t border-zinc-100 space-y-1.5">
                            {item.theme && (
                              <div className="text-[10px] text-zinc-700 font-medium bg-zinc-50 border border-zinc-100 rounded px-2 py-0.5 w-fit">
                                {item.theme}
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[10px]">
                              {/* Creator */}
                              {item.createdByName && (
                                <div className="flex items-center gap-1 text-zinc-500">
                                  <Avatar
                                    name={item.createdByName}
                                    url={employees.find(e => e.id === item.createdBy || e.name === item.createdByName)?.avatarUrl}
                                  />
                                  <span className="truncate max-w-[80px]">{item.createdByName}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 ml-auto">
                                {/* Impact */}
                                {item.impactScore != null && (
                                  <span className={`font-semibold ${getImpactColor(item.impactScore)}`}>
                                    ↑{item.impactScore}
                                  </span>
                                )}
                                {/* Date */}
                                {item.targetDate && (
                                  <span className="flex items-center gap-1 text-zinc-400">
                                    <Calendar className="h-2.5 w-2.5 shrink-0" />
                                    {new Date(item.targetDate).toLocaleDateString("en-US", {
                                      month: "short", day: "numeric", year: "2-digit",
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Fixed add button at bottom (all team members) */}
                  {canAddItem && (
                    <div className="px-3 py-2 border-t border-zinc-100 bg-white/80 shrink-0">
                      <button
                        onClick={() => openAdd(col.key)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add new column shortcut (admin) */}
            {isAdmin && (
              <div className="flex-shrink-0 w-[200px]">
                <button
                  onClick={() => setColumnManagerOpen(true)}
                  className="h-full w-full min-h-[120px] border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 hover:border-zinc-300 hover:text-zinc-600 hover:bg-zinc-50/50 transition-all flex flex-col items-center justify-center gap-2 text-xs font-medium"
                >
                  <Plus className="h-5 w-5" />
                  Add Column
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Item Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm">
                <Layers className="h-4.5 w-4.5 text-primary" />
                {editingItem ? "Edit initiative" : "New initiative"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 p-1 hover:bg-zinc-100 rounded-lg transition-colors">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Title */}
              <div className="space-y-1">
                <Label className="text-zinc-700 font-semibold text-xs">Initiative Title *</Label>
                <Input
                  placeholder="e.g. Expand premium pricing tiers"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-lg h-9 border-zinc-200 text-sm"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label className="text-zinc-700 font-semibold text-xs">Description</Label>
                <RichTextEditor
                  value={description}
                  onChange={(html) => setDescription(html)}
                  placeholder="High-level summary of what this accomplishes…"
                  minHeight="80px"
                />
              </div>

              {/* Status + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-zinc-700 font-semibold text-xs">Roadmap Phase</Label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg text-sm h-9 px-2.5 outline-none focus:border-primary appearance-none pr-8"
                    >
                      {columns.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="h-2 w-2 rounded-full block" style={{ backgroundColor: activeColColor }} />
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-700 font-semibold text-xs">Target Date</Label>
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="rounded-lg h-9 border-zinc-200 text-sm"
                  />
                </div>
              </div>

              {/* Theme + Project */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-zinc-700 font-semibold text-xs">Theme Focus</Label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-lg text-sm h-9 px-2.5 outline-none focus:border-primary"
                  >
                    {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-700 font-semibold text-xs flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Assign Project
                  </Label>
                  <select
                    value={selectedProjectId}
                    onChange={handleProjectSelect}
                    className="w-full bg-white border border-zinc-200 rounded-lg text-sm h-9 px-2.5 outline-none focus:border-primary"
                  >
                    <option value="">No project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Impact Score */}
              <div className="space-y-1">
                <Label className="text-zinc-700 font-semibold text-xs flex justify-between">
                  <span>Impact Score</span>
                  <span className={`font-bold ${getImpactColor(impactScore)}`}>{impactScore} / 100</span>
                </Label>
                <div className="flex items-center gap-3 py-1">
                  <input
                    type="range"
                    min="0" max="100"
                    value={impactScore}
                    onChange={(e) => setImpactScore(Number(e.target.value))}
                    className="flex-1 accent-primary h-1.5 rounded-full bg-zinc-200 appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Creator info (read-only in edit mode) */}
              {editingItem?.createdByName && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-100">
                  <User className="h-3.5 w-3.5" />
                  <span>Created by <strong className="text-zinc-700">{editingItem.createdByName}</strong></span>
                </div>
              )}

              {editingItem && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={toggleComplete}
                    disabled={completionSaving}
                    className={cn(
                      "w-full rounded-lg h-9 text-xs gap-1.5",
                      editingItem.completed && "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    )}
                  >
                    {completionSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    {editingItem.completed ? "Mark as incomplete" : "Mark as complete"}
                  </Button>
                  {editingItem.completed && editingItem.completedByName && (
                    <p className="text-center text-[11px] text-zinc-500">
                      Completed by <strong className="text-zinc-700">{editingItem.completedByName}</strong>
                      {editingItem.completedAt && ` on ${new Date(editingItem.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                    </p>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
                {editingItem ? (
                  <Button type="button" variant="ghost" onClick={handleDelete} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg gap-1.5 h-9 px-3 text-xs">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                ) : <div />}
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-lg h-9 px-4 text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg h-9 px-5 text-xs">
                    {editingItem ? "Save Changes" : "Create"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Column Manager Dialog ── */}
      <RoadmapColumnManagerDialog
        open={columnManagerOpen}
        onClose={() => setColumnManagerOpen(false)}
        columns={columns}
        onColumnsChange={(updated) => setColumns(updated)}
      />
    </div>
  );
}
