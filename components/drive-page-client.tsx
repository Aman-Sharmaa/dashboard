"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Cloud,
  Folder,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Search,
  Filter,
  Upload,
  FolderPlus,
  Share2,
  Trash2,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  Users,
  List,
  LayoutGrid,
  Globe,
  Lock,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Visibility = "private" | "public" | "specific";
type Scope = "all" | "mine" | "shared" | "public";
type TypeFilter = "all" | "file" | "folder";
type ModifiedFilter = "all" | "today" | "last7" | "last30";

type DriveItem = {
  id: string;
  name: string;
  type: "file" | "folder";
  parentId: string | null;
  owner: string;
  visibility: Visibility;
  sharedWith: string[];
  mimeType: string | null;
  sizeInBytes: number;
  fileUrl: string | null;
  updatedAt: string | null;
  canEdit: boolean;
  isOwner: boolean;
  accessRequests?: {
    name: string;
    email: string;
    status: "pending" | "approved" | "rejected";
    requestedAt: string;
  }[];
};


type EmployeeOption = {
  id: string;
  name: string;
  email: string;
};

type BreadcrumbNode = { id: string; name: string };
type UploadHistoryItem = {
  id: string;
  name: string;
  status: "uploading" | "completed" | "failed";
  progress: number;
  message?: string;
};

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function iconForItem(item: DriveItem) {
  if (item.type === "folder") return Folder;
  const mime = item.mimeType || "";
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Video;
  if (mime.startsWith("audio/")) return Music;
  return FileText;
}

function getFileTypeLabel(item: DriveItem) {
  if (item.type === "folder") return "Folder";
  const mime = item.mimeType || "";
  if (mime) {
    if (mime.startsWith("image/")) return "Image";
    if (mime.startsWith("video/")) return "Video";
    if (mime.startsWith("audio/")) return "Audio";
    if (mime.includes("pdf")) return "PDF";
    if (mime.includes("spreadsheet") || mime.includes("excel")) return "Spreadsheet";
    if (mime.includes("word") || mime.includes("document")) return "Document";
    return mime.split("/")[1]?.toUpperCase() || "File";
  }
  const ext = item.name.split(".").pop()?.toLowerCase();
  return ext ? ext.toUpperCase() : "File";
}

function isPreviewSupported(item: DriveItem) {
  if (item.type !== "file" || !item.fileUrl) return false;
  const mime = item.mimeType || "";
  return (
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime.includes("pdf")
  );
}

export function DrivePageClient({ isAdmin, hideHeader }: { isAdmin: boolean; hideHeader?: boolean }) {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingName, setUploadingName] = useState("");
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | Visibility>("all");
  const [modifiedFilter, setModifiedFilter] = useState<ModifiedFilter>("all");
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbNode[]>([]);
  const [stats, setStats] = useState({ usedBytes: 0, maxBytes: 0, availableBytes: 0 });

  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [shareTarget, setShareTarget] = useState<DriveItem | null>(null);
  const [savingShare, setSavingShare] = useState(false);
  const [shareVisibility, setShareVisibility] = useState<Visibility>("private");
  const [shareUserIds, setShareUserIds] = useState<string[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<DriveItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<DriveItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentParentId = breadcrumbs.length ? breadcrumbs[breadcrumbs.length - 1].id : null;

  const usedPercent = useMemo(() => {
    if (!stats.maxBytes) return 0;
    return Math.min(100, Math.round((stats.usedBytes / stats.maxBytes) * 100));
  }, [stats.maxBytes, stats.usedBytes]);
  const filteredItems = useMemo(() => {
    if (modifiedFilter === "all") return items;
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return items.filter((item) => {
      if (!item.updatedAt) return false;
      const updatedAt = new Date(item.updatedAt).getTime();
      if (!Number.isFinite(updatedAt)) return false;
      if (modifiedFilter === "today") {
        return updatedAt >= startOfToday.getTime();
      }
      if (modifiedFilter === "last7") {
        return updatedAt >= now - 7 * 24 * 60 * 60 * 1000;
      }
      return updatedAt >= now - 30 * 24 * 60 * 60 * 1000;
    });
  }, [items, modifiedFilter]);

  const folderItems = useMemo(
    () => filteredItems.filter((item) => item.type === "folder"),
    [filteredItems]
  );
  const fileItems = useMemo(
    () => filteredItems.filter((item) => item.type === "file"),
    [filteredItems]
  );

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentParentId) params.set("parentId", currentParentId);
      if (search.trim()) params.set("q", search.trim());
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (visibilityFilter !== "all") params.set("visibility", visibilityFilter);
      params.set("scope", scope);

      const res = await fetch(`/api/drive?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load drive");
      const data = await res.json();
      setItems(data.items || []);
      setStats(data.stats || { usedBytes: 0, maxBytes: 0, availableBytes: 0 });
    } catch (error: any) {
      toast.error(error?.message || "Failed to load drive");
    } finally {
      setLoading(false);
    }
  }, [currentParentId, scope, search, typeFilter, visibilityFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetch("/api/employees?limit=500")
      .then((r) => (r.ok ? r.json() : { employees: [] }))
      .then((d) => {
        const list = (d.employees || []).map((e: any) => ({
          id: e.userId || e.id || String(e._id),
          name: e.name,
          email: e.email,
        }));
        setEmployees(list.filter((u: EmployeeOption) => !!u.id));
      })
      .catch(() => { });
  }, []);

  function openFolder(item: DriveItem) {
    if (item.type !== "folder") return;
    setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
  }

  function onUploadClick() {
    fileInputRef.current?.click();
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setUploading(true);
    setUploadProgress(0);
    setUploadingName(file.name);
    setUploadHistory((prev) => [
      { id: uploadId, name: file.name, status: "uploading", progress: 0 },
      ...prev.slice(0, 5),
    ]);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("name", file.name);
      if (currentParentId) fd.set("parentId", currentParentId);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/drive/files");
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const nextProgress = Math.min(100, Math.round((event.loaded / event.total) * 100));
          setUploadProgress(nextProgress);
          setUploadHistory((prev) =>
            prev.map((item) =>
              item.id === uploadId ? { ...item, progress: nextProgress } : item
            )
          );
        };
        xhr.onload = () => {
          const raw = xhr.responseText || "{}";
          let data: any = {};
          try {
            data = JSON.parse(raw);
          } catch {
            // Keep fallback data
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(data.message || "Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(fd);
      });

      setUploadProgress(100);
      setUploadHistory((prev) =>
        prev.map((item) =>
          item.id === uploadId
            ? { ...item, status: "completed", progress: 100, message: "Upload complete" }
            : item
        )
      );
      toast.success("File uploaded");
      fetchItems();
    } catch (error: any) {
      setUploadHistory((prev) =>
        prev.map((item) =>
          item.id === uploadId
            ? { ...item, status: "failed", message: error?.message || "Upload failed" }
            : item
        )
      );
      toast.error(error?.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadingName("");
      setUploadProgress(0);
    }
  }

  async function createFolder() {
    if (!folderName.trim()) {
      toast.error("Folder name is required");
      return;
    }
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName.trim(), parentId: currentParentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to create folder");
      toast.success("Folder created");
      setFolderDialogOpen(false);
      setFolderName("");
      fetchItems();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  }

  function openShare(item: DriveItem) {
    setShareTarget(item);
    setShareVisibility(item.visibility);
    setShareUserIds(item.sharedWith || []);
  }

  async function saveShare() {
    if (!shareTarget) return;
    setSavingShare(true);
    try {
      const payload = {
        visibility: shareVisibility,
        sharedWith: shareVisibility === "specific" ? shareUserIds : [],
      };
      const res = await fetch(`/api/drive/items/${shareTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update sharing");
      toast.success("Sharing updated");
      setShareTarget(null);
      fetchItems();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update sharing");
    } finally {
      setSavingShare(false);
    }
  }

  async function handleApproveRequest(email: string) {
    if (!shareTarget) return;
    try {
      const res = await fetch(`/api/drive/items/${shareTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approveEmail: email }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      toast.success(`Approved access for ${email}`);
      // Refresh share target or fetch items
      setShareTarget(prev => prev ? {
        ...prev,
        accessRequests: prev.accessRequests?.map(r => r.email === email ? { ...r, status: "approved" as const } : r)
      } : null);
      fetchItems();
    } catch (error: any) {
      toast.error(error?.message || "Error approving access");
    }
  }

  async function handleRejectRequest(email: string) {
    if (!shareTarget) return;
    try {
      const res = await fetch(`/api/drive/items/${shareTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectEmail: email }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      toast.success(`Rejected access for ${email}`);
      setShareTarget(prev => prev ? {
        ...prev,
        accessRequests: prev.accessRequests?.map(r => r.email === email ? { ...r, status: "rejected" as const } : r)
      } : null);
      fetchItems();
    } catch (error: any) {
      toast.error(error?.message || "Error rejecting access");
    }
  }

  function copySharedLink() {
    if (!shareTarget) return;
    const origin = window.location.origin.includes("localhost") ? "https://Webwrite" : window.location.origin;
    const link = `${origin}/drive/s/${shareTarget.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  }

  async function confirmDelete() {

    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/drive/items/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete");
      toast.success("Deleted");
      setDeleteTarget(null);
      fetchItems();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  function toggleSharedUser(userId: string, checked: boolean) {
    setShareUserIds((prev) => {
      if (checked) return prev.includes(userId) ? prev : [...prev, userId];
      return prev.filter((id) => id !== userId);
    });
  }

  function openFileFromGrid(item: DriveItem) {
    if (isPreviewSupported(item)) {
      setPreviewTarget(item);
      return;
    }
    if (item.fileUrl) {
      window.open(item.fileUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className={cn("space-y-6", hideHeader && "space-y-4")}>
      {!hideHeader && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Cloud className="h-6 w-6 text-primary" />
              Drive
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Store media, organize folders, and share files with private/public/specific access.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={fetchItems} disabled={loading} className="rounded-xl">
              <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setFolderDialogOpen(true)} className="rounded-xl">
              <FolderPlus className="h-4 w-4 mr-1.5" />
              New Folder
            </Button>
            <Button onClick={onUploadClick} disabled={uploading} className="rounded-xl">
              <Upload className={cn("h-4 w-4 mr-1.5", uploading && "animate-pulse")} />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={onFilePicked}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
            />
          </div>
        </div>
      )}
      {hideHeader && (
        <div className="flex justify-end mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={fetchItems} disabled={loading} className="rounded-xl">
              <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setFolderDialogOpen(true)} className="rounded-xl">
              <FolderPlus className="h-4 w-4 mr-1.5" />
              New Folder
            </Button>
            <Button onClick={onUploadClick} disabled={uploading} className="rounded-xl">
              <Upload className={cn("h-4 w-4 mr-1.5", uploading && "animate-pulse")} />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={onFilePicked}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
            />
          </div>
        </div>
      )}



      <Card className="rounded-2xl">
        <CardContent className="pt-6">
          <div className="space-y-4 mb-4">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search in Drive"
                className="pl-9 rounded-full h-11 bg-muted/60 border-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                  <SelectTrigger className="w-[130px] rounded-full h-9 bg-muted/60 border-none">
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Type</SelectItem>
                    <SelectItem value="folder">Folders</SelectItem>
                    <SelectItem value="file">Files</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={visibilityFilter}
                  onValueChange={(v) => setVisibilityFilter(v as "all" | Visibility)}
                >
                  <SelectTrigger className="w-[140px] rounded-full h-9 bg-muted/60 border-none">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    <SelectValue placeholder="People" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">People</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="specific">Specific</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={modifiedFilter} onValueChange={(v) => setModifiedFilter(v as ModifiedFilter)}>
                  <SelectTrigger className="w-[140px] rounded-full h-9 bg-muted/60 border-none">
                    <SelectValue placeholder="Modified" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Modified</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last7">Last 7 days</SelectItem>
                    <SelectItem value="last30">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
                  <SelectTrigger className="w-[135px] rounded-full h-9 bg-muted/60 border-none">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Location</SelectItem>
                    <SelectItem value="mine">My Drive</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center rounded-md border overflow-hidden">
                <Button
                  variant={layoutMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={() => setLayoutMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={layoutMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={() => setLayoutMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg"
              onClick={() => setBreadcrumbs([])}
            >
              Root
            </Button>
            {breadcrumbs.map((crumb, idx) => (
              <Button
                key={crumb.id}
                size="sm"
                variant="ghost"
                className="rounded-lg"
                onClick={() => setBreadcrumbs((prev) => prev.slice(0, idx + 1))}
              >
                / {crumb.name}
              </Button>
            ))}
          </div>

          {layoutMode === "grid" && (
            <div className="space-y-6">
              {folderItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Suggested folders</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    {folderItems.map((item) => (
                      <div
                        key={`folder-tile-${item.id}`}
                        className="relative rounded-xl border bg-muted/40 px-4 py-3 text-left hover:bg-muted/70 transition group"
                      >
                        <button
                          type="button"
                          onClick={() => openFolder(item)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Folder className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium truncate">{item.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">in My Drive</p>
                        </button>
                        {/* 3-dot menu on folder */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => openFolder(item)}>
                                <Folder className="h-4 w-4 mr-2" /> Open
                              </DropdownMenuItem>
                              {(item.canEdit || item.isOwner) && (
                                <DropdownMenuItem onClick={() => openShare(item)}>
                                  <Share2 className="h-4 w-4 mr-2" /> Share
                                </DropdownMenuItem>
                              )}
                              {item.isOwner && (
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(item)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Suggested files</h3>
                {fileItems.length === 0 ? (
                  <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
                    No files found.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {fileItems.map((item) => {
                      const Icon = iconForItem(item);
                      const isPreviewable = isPreviewSupported(item);
                      const isClickable = isPreviewable || !!item.fileUrl;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openFileFromGrid(item)}
                          disabled={!isClickable}
                          className={cn(
                            "rounded-xl border bg-card p-3 text-left transition",
                            isClickable
                              ? "hover:shadow-sm hover:border-primary/40 cursor-pointer"
                              : "opacity-70 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium truncate flex-1">{item.name}</p>
                          </div>

                          <div className="h-24 rounded-lg bg-muted/40 mb-3 flex items-center justify-center overflow-hidden text-xs text-muted-foreground">
                            {item.mimeType?.startsWith("image/") && item.fileUrl ? (
                              <img
                                src={item.fileUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : item.mimeType?.startsWith("video/") && item.fileUrl ? (
                              <video
                                src={item.fileUrl}
                                className="h-full w-full object-cover"
                                muted
                              />
                            ) : (
                              getFileTypeLabel(item)
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.updatedAt
                              ? `You opened · ${new Date(item.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                              : "Recently uploaded"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {layoutMode === "list" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead className="w-[130px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Loading drive...
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No files or folders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const Icon = iconForItem(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", item.type === "folder" ? "text-blue-600" : "text-muted-foreground")} />
                            {item.type === "folder" ? (
                              <button
                                type="button"
                                onClick={() => openFolder(item)}
                                className="font-medium hover:underline text-left"
                              >
                                {item.name}
                              </button>
                            ) : item.fileUrl ? (
                              <a href={item.fileUrl} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                                {item.name}
                              </a>
                            ) : (
                              <span className="font-medium">{item.name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isPreviewSupported(item) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() => setPreviewTarget(item)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Preview
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">~</span>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{getFileTypeLabel(item)}</TableCell>
                        <TableCell>{formatBytes(item.sizeInBytes)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.updatedAt
                            ? new Date(item.updatedAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                            : "~"}
                        </TableCell>
                        <TableCell>
                          {item.visibility === "private" && (
                            <Badge variant="secondary" className="rounded-full gap-1"><Lock className="h-3 w-3" /> Private</Badge>
                          )}
                          {item.visibility === "public" && (
                            <Badge variant="secondary" className="rounded-full gap-1 bg-emerald-50 text-emerald-700 border-emerald-200"><Globe className="h-3 w-3" /> Public</Badge>
                          )}
                          {item.visibility === "specific" && (
                            <Badge variant="secondary" className="rounded-full gap-1 bg-amber-50 text-amber-700 border-amber-200"><Users className="h-3 w-3" /> Specific</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {item.canEdit && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openShare(item)}>
                                <Share2 className="h-4 w-4" />
                              </Button>
                            )}
                            {item.canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            {!item.canEdit && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" disabled>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
            <DialogDescription>Organize your drive with folders.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="rounded-xl"
              placeholder="e.g. Brand Assets"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createFolder} disabled={creatingFolder} className="rounded-xl">
              {creatingFolder ? "Creating..." : "Create folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!shareTarget} onOpenChange={(o) => !o && setShareTarget(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Share “{shareTarget?.name}”</DialogTitle>
            <DialogDescription>
              Choose who can access this item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Access</Label>
              <Select value={shareVisibility} onValueChange={(v) => setShareVisibility(v as Visibility)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public (anyone with link)</SelectItem>
                  <SelectItem value="specific">Specific users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {shareVisibility === "specific" && (
              <div className="space-y-2">
                <Label>Select users</Label>
                <div className="max-h-52 overflow-y-auto rounded-xl border p-3 space-y-2">
                  {employees.map((emp) => {
                    const checked = shareUserIds.includes(emp.id);
                    return (
                      <label key={emp.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => toggleSharedUser(emp.id, next === true)}
                        />
                        <span>{emp.name}</span>
                        <span className="text-muted-foreground">({emp.email})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button variant="outline" className="w-full rounded-xl gap-2" onClick={copySharedLink}>
                <Share2 className="h-4 w-4" />
                Copy link (Webwrite)
              </Button>
            </div>

            {shareTarget?.accessRequests && shareTarget.accessRequests.length > 0 && (
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access Requests</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {shareTarget.accessRequests.map((req) => (
                    <div key={req.email} className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{req.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{req.email}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {req.status === "pending" ? (
                          <>
                            <Button size="sm" variant="outline" className="h-7 px-2 rounded-lg text-xs" onClick={() => handleApproveRequest(req.email)}>Approve</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 rounded-lg text-xs text-destructive" onClick={() => handleRejectRequest(req.email)}>Reject</Button>
                          </>
                        ) : (
                          <Badge variant="secondary" className="h-6 text-[10px] capitalize rounded-full">{req.status}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>


          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShareTarget(null)}>
              Cancel
            </Button>
            <Button onClick={saveShare} disabled={savingShare} className="rounded-xl">
              {savingShare ? "Saving..." : "Save access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-3xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>{previewTarget?.name}</DialogTitle>
            <DialogDescription>Asset preview with metadata</DialogDescription>
          </DialogHeader>

          {previewTarget && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-3 min-h-[320px] flex items-center justify-center">
                {previewTarget.mimeType?.startsWith("image/") && previewTarget.fileUrl && (
                  <img
                    src={previewTarget.fileUrl}
                    alt={previewTarget.name}
                    className="max-h-[60vh] w-auto rounded-lg object-contain"
                  />
                )}
                {previewTarget.mimeType?.startsWith("video/") && previewTarget.fileUrl && (
                  <video src={previewTarget.fileUrl} controls className="max-h-[60vh] w-full rounded-lg" />
                )}
                {previewTarget.mimeType?.startsWith("audio/") && previewTarget.fileUrl && (
                  <audio src={previewTarget.fileUrl} controls className="w-full" />
                )}
                {previewTarget.mimeType?.includes("pdf") && previewTarget.fileUrl && (
                  <iframe src={previewTarget.fileUrl} className="h-[60vh] w-full rounded-lg" />
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm font-medium">{getFileTypeLabel(previewTarget)}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Size</p>
                  <p className="text-sm font-medium">{formatBytes(previewTarget.sizeInBytes)}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Modified</p>
                  <p className="text-sm font-medium">
                    {previewTarget.updatedAt
                      ? new Date(previewTarget.updatedAt).toLocaleString()
                      : "~"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete item"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={confirmDelete}
        isLoading={deleting}
      />
    </div>
  );
}
