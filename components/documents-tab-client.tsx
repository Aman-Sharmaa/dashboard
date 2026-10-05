"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import {
  FileText,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Pin,
  PinOff,
  MoreHorizontal,
  Globe,
  Lock,
  Users,
  Clock,
  Edit3,
  Eye,
  Printer,
  Copy,
  Check,
  Calendar,
  Building2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RichTextEditor, RichTextDisplay } from "@/components/rich-text-editor";

type DocItem = {
  id: string;
  title: string;
  content: string;
  owner: string;
  ownerName: string;
  visibility: "private" | "public" | "specific";
  sharedWith: string[];
  tags: string[];
  isPinned: boolean;
  updatedAt: string | null;
  createdAt: string | null;
  isOwner: boolean;
};

function visibilityIcon(v: string) {
  if (v === "public") return <Globe className="h-3 w-3 text-emerald-500" />;
  if (v === "specific") return <Users className="h-3 w-3 text-blue-500" />;
  return <Lock className="h-3 w-3 text-muted-foreground" />;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function DocumentsTabClient({ isAdmin }: { isAdmin: boolean }) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // New/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editId, setEditId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [saving, setSaving] = useState(false);

  // View dialog
  const [viewDoc, setViewDoc] = useState<DocItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<DocItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/documents?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load documents");
      const data = await res.json();
      setDocs(data.documents || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  function openCreate() {
    setDialogMode("create");
    setEditId(null);
    setFormTitle("");
    setFormContent("");
    setDialogOpen(true);
  }

  function openEdit(doc: DocItem) {
    setDialogMode("edit");
    setEditId(doc.id);
    setFormTitle(doc.title);
    setFormContent(doc.content);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      if (dialogMode === "create") {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle.trim(), content: formContent }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || "Failed to create document");
        }
        toast.success("Document created successfully! 📄");
      } else {
        const res = await fetch(`/api/documents/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle.trim(), content: formContent }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || "Failed to update document");
        }
        toast.success("Document updated successfully! 💾");
      }
      setDialogOpen(false);
      fetchDocs();
    } catch (err: any) {
      toast.error(err?.message || "Error saving document");
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(doc: DocItem) {
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !doc.isPinned }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(doc.isPinned ? "Unpinned document" : "Pinned document 📌");
      fetchDocs();
    } catch {
      toast.error("Failed to update pin");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Document deleted");
      setDeleteTarget(null);
      fetchDocs();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  const pinnedDocs = docs.filter((d) => d.isPinned);
  const regularDocs = docs.filter((d) => !d.isPinned);

  const viewDocStats = useMemo(() => {
    if (!viewDoc?.content) return { words: 0, readingTime: 1 };
    const text = stripHtml(viewDoc.content);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { words, readingTime };
  }, [viewDoc?.content]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Document link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by title or keywords…"
            className="pl-9 rounded-xl h-10 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocs}
            disabled={loading}
            className="rounded-xl h-9 px-3 text-xs font-semibold shadow-2xs gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={openCreate}
            className="rounded-xl h-9 px-3.5 text-xs font-semibold gap-1.5 shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            New Document
          </Button>
        </div>
      </div>

      {/* Pinned section */}
      {pinnedDocs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <Pin className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
            Pinned Documents ({pinnedDocs.length})
          </h3>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pinnedDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onView={setViewDoc}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onTogglePin={togglePin}
              />
            ))}
          </div>
        </div>
      )}

      {/* All documents */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
          {pinnedDocs.length > 0 ? "All Documents" : "Documents"} ({docs.length})
        </h3>
        {loading ? (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 rounded-2xl border bg-white animate-pulse" />
            ))}
          </div>
        ) : regularDocs.length === 0 && pinnedDocs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-12 text-center bg-neutral-50/50 dark:bg-neutral-900/50">
            <FileText className="h-10 w-10 mx-auto text-neutral-300 dark:text-neutral-700 mb-3" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              No documents created yet
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Write project documentation, notes, SOPs, and share them across your team.
            </p>
            <Button size="sm" onClick={openCreate} className="rounded-xl text-xs font-semibold gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Create Document
            </Button>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {regularDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onView={setViewDoc}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onTogglePin={togglePin}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
              {dialogMode === "create" ? "New Document" : "Edit Document"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {dialogMode === "create"
                ? "Draft a rich text document with formatting, tables, code blocks, and media."
                : "Modify document title and body content."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Document Title *
              </label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Q3 Strategic Roadmap & Operational Guidelines"
                className="rounded-xl text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Document Content
              </label>
              <RichTextEditor value={formContent} onChange={setFormContent} />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              {saving ? "Saving…" : dialogMode === "create" ? "Create Document" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Modal */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-neutral-100 dark:border-neutral-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {visibilityIcon(viewDoc?.visibility || "private")}
                  <span className="capitalize">{viewDoc?.visibility || "private"}</span>
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  {viewDocStats.readingTime} min read ({viewDocStats.words} words)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="rounded-xl h-7 text-xs font-semibold gap-1 shadow-2xs"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="rounded-xl h-7 text-xs font-semibold gap-1 shadow-2xs"
                >
                  <Printer className="h-3 w-3" />
                  <span>Print</span>
                </Button>
              </div>
            </div>

            <div>
              <DialogTitle className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight">
                {viewDoc?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <span>By {viewDoc?.ownerName || "Team"}</span>
                <span>·</span>
                <span>
                  Updated {viewDoc?.updatedAt ? new Date(viewDoc.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "~"}
                </span>
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="py-6 min-h-[300px]">
            {viewDoc?.content ? (
              <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-li:leading-relaxed prose-img:rounded-xl">
                <RichTextDisplay html={viewDoc.content} />
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <BookOpen className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                Empty document content
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              {(viewDoc?.isOwner || isAdmin) && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (viewDoc) openEdit(viewDoc);
                    setViewDoc(null);
                  }}
                  className="rounded-xl text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Document
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewDoc(null)}
              className="rounded-xl text-xs font-semibold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Document?"
        description={`Are you sure you want to permanently delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete Document"}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}

/* ── Document Card ── */
function DocumentCard({
  doc,
  onView,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  doc: DocItem;
  onView: (d: DocItem) => void;
  onEdit: (d: DocItem) => void;
  onDelete: (d: DocItem) => void;
  onTogglePin: (d: DocItem) => void;
}) {
  const preview = stripHtml(doc.content).slice(0, 140);

  return (
    <div className="relative rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group flex flex-col justify-between h-48">
      {/* Pin indicator */}
      {doc.isPinned && (
        <div className="absolute top-3 left-3 h-5 w-5 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200/60 shadow-2xs">
          <Pin className="h-3 w-3 fill-orange-500 text-orange-500" />
        </div>
      )}

      <button
        type="button"
        onClick={() => onView(doc)}
        className={cn("w-full text-left flex-1 min-w-0 space-y-1.5", doc.isPinned && "pt-4")}
      >
        <div className="flex items-start gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="h-4 w-4" />
          </div>
          <h4 className="font-bold text-xs text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug">
            {doc.title}
          </h4>
        </div>

        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed pt-1">
          {preview || "No content written yet"}
        </p>
      </button>

      {/* Card Footer */}
      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            {visibilityIcon(doc.visibility)}
            <span className="capitalize">{doc.visibility}</span>
          </span>
          <span>·</span>
          <span>
            {doc.updatedAt
              ? new Date(doc.updatedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : "~"}
          </span>
        </div>

        <span className="font-semibold text-neutral-500 truncate max-w-[80px]">
          {doc.ownerName}
        </span>
      </div>

      {/* 3-dot action menu */}
      <div
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl p-1">
            <DropdownMenuItem
              onClick={() => onView(doc)}
              className="text-xs rounded-lg gap-2 cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" /> View
            </DropdownMenuItem>
            {doc.isOwner && (
              <DropdownMenuItem
                onClick={() => onEdit(doc)}
                className="text-xs rounded-lg gap-2 cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
            )}
            {doc.isOwner && (
              <DropdownMenuItem
                onClick={() => onTogglePin(doc)}
                className="text-xs rounded-lg gap-2 cursor-pointer"
              >
                {doc.isPinned ? (
                  <>
                    <PinOff className="h-3.5 w-3.5" /> Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-3.5 w-3.5" /> Pin
                  </>
                )}
              </DropdownMenuItem>
            )}
            {doc.isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs rounded-lg gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                  onClick={() => onDelete(doc)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
