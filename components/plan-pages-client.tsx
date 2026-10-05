"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Plus,
    Pencil,
    Trash2,
    FileText,
    FolderPlus,
    Folder,
    ChevronRight,
    ArrowLeft,
    Search,
    Users,
    Home,
    Pin,
    LayoutPanelLeft,
    MoreVertical,
    Eye,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RichTextDisplay } from "@/components/rich-text-editor";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
    content?: string;
    visibility: "me" | "org" | "shared";
    createdBy: string;
    sharedWith: string[];
    isPinned?: boolean;
    isPinnedToSidebar?: boolean;
    createdAt: string;
};

type SubPlan = {
    _id: string;
    name: string;
    visibility: "me" | "org" | "shared";
    createdBy: string;
    sharedWith: string[];
    isPinned?: boolean;
    isPinnedToSidebar?: boolean;
    createdAt: string;
};

interface PlanPagesClientProps {
    planId: string;
    planName: string;
}

export function PlanPagesClient({ planId, planName }: PlanPagesClientProps) {
    const router = useRouter();
    const [pages, setPages] = useState<PlanPage[]>([]);
    const [subPlans, setSubPlans] = useState<SubPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [parentId, setParentId] = useState<string | null>(null);

    const [pageDialogOpen, setPageDialogOpen] = useState(false);
    const [previewPage, setPreviewPage] = useState<PlanPage | null>(null);
    const [editingPageId, setEditingPageId] = useState<string | null>(null);
    const [pageName, setPageName] = useState("");
    const [visibility, setVisibility] = useState<"me" | "org" | "shared">("org");
    const [sharedWith, setSharedWith] = useState<string[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    const [subPlanDialogOpen, setSubPlanDialogOpen] = useState(false);
    const [editingSubPlanId, setEditingSubPlanId] = useState<string | null>(null);
    const [subPlanName, setSubPlanName] = useState("");

    const [deletePageId, setDeletePageId] = useState<string | null>(null);
    const [deleteSubPlanId, setDeleteSubPlanId] = useState<string | null>(null);
    const [mainPlanDeleteOpen, setMainPlanDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [mainPlanEditOpen, setMainPlanEditOpen] = useState(false);
    const [mainPlanNewName, setMainPlanNewName] = useState(planName);

    useEffect(() => {
        setMainPlanNewName(planName);
    }, [planName]);

    useEffect(() => {
        load();
        loadUsers();
    }, [planId]);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(`/api/plans/${planId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to load details");
            setPages((data.pages || []).sort((a: any, b: any) => {
                if (a.isPinnedToSidebar && !b.isPinnedToSidebar) return -1;
                if (!a.isPinnedToSidebar && b.isPinnedToSidebar) return 1;
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name);
            }));
            setSubPlans((data.subPlans || []).sort((a: any, b: any) => {
                if (a.isPinnedToSidebar && !b.isPinnedToSidebar) return -1;
                if (!a.isPinnedToSidebar && b.isPinnedToSidebar) return 1;
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name);
            }));
            setParentId(data.plan.parentId || null);
            setMainPlanNewName(data.plan.name);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to load details");
        } finally {
            setLoading(false);
        }
    }

    async function togglePin(type: "plan" | "page", id: string, pinType: "pin" | "sidebar", currentValue: boolean) {
        try {
            const endpoint = type === "plan" ? `/api/plans/${id}` : `/api/plans/pages/${id}`;
            const field = pinType === "pin" ? "isPinned" : "isPinnedToSidebar";
            const res = await fetch(endpoint, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: !currentValue }),
            });
            if (!res.ok) throw new Error("Failed to update pin");
            toast.success(!currentValue ? "Pinned successfully" : "Unpinned successfully");

            // Dispatch custom event for sidebar reactivity
            window.dispatchEvent(new CustomEvent("pinned-items-updated"));

            load();
        } catch (err) {
            toast.error("Failed to update pin");
        }
    }

    async function onMainPlanEdit(e: React.FormEvent) {
        e.preventDefault();
        try {
            const res = await fetch(`/api/plans/${planId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: mainPlanNewName.trim() }),
            });
            if (!res.ok) throw new Error("Failed to update document name");
            toast.success("Document name updated");
            setMainPlanEditOpen(false);
            router.refresh();
            load();
        } catch (err) {
            toast.error("Failed to update document name");
        }
    }

    async function loadUsers() {
        try {
            const res = await fetch("/api/employees");
            const data = await res.json();
            setUsers(data.employees || []);
        } catch (e) {
            console.error("Failed to load users", e);
        }
    }

    async function openAddPage() {
        try {
            const res = await fetch(`/api/plans/${planId}/pages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Untitled Document",
                    visibility: "org",
                    sharedWith: [],
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to create document");

            toast.success("Document created");
            router.push(`/dashboard/projects/plans/pages/${data.page._id}/edit`);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to create document");
        }
    }

    function openEditPage(page: PlanPage) {
        setEditingPageId(page._id);
        setPageName(page.name);
        setVisibility(page.visibility || "org");
        setSharedWith(page.sharedWith || []);
        setPageDialogOpen(true);
    }

    async function onPageSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            const url = `/api/plans/pages/${editingPageId}`;
            const method = "PUT";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: pageName.trim(), visibility, sharedWith }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to save page");

            toast.success("Page updated");
            setPageDialogOpen(false);
            load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to save page");
        }
    }

    async function deletePage(id: string) {
        setDeletePageId(id);
    }

    async function confirmDeletePage() {
        if (!deletePageId) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/plans/pages/${deletePageId}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to delete page");
            }
            toast.success("Page deleted");
            load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to delete page");
        } finally {
            setIsDeleting(false);
            setDeletePageId(null);
        }
    }

    function openAddSubPlan() {
        setEditingSubPlanId(null);
        setSubPlanName("");
        setVisibility("org");
        setSharedWith([]);
        setSubPlanDialogOpen(true);
    }

    async function onSubPlanSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            const url = editingSubPlanId ? `/api/plans/${editingSubPlanId}` : `/api/plans`;
            const method = editingSubPlanId ? "PUT" : "POST";
            const body = editingSubPlanId
                ? { name: subPlanName.trim(), visibility, sharedWith }
                : { name: subPlanName.trim(), parentId: planId, visibility, sharedWith };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to save sub-folder");

            toast.success(editingSubPlanId ? "Sub-folder updated" : "Sub-folder created");
            setSubPlanDialogOpen(false);
            load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to save sub-folder");
        }
    }

    async function deleteSubPlan(id: string) {
        setDeleteSubPlanId(id);
    }

    async function confirmDeleteSubPlan() {
        if (!deleteSubPlanId) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/plans/${deleteSubPlanId}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to delete sub-folder");
            }
            toast.success("Sub-folder deleted");
            load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to delete sub-folder");
        } finally {
            setIsDeleting(false);
            setDeleteSubPlanId(null);
        }
    }

    async function deleteMainPlan() {
        setMainPlanDeleteOpen(true);
    }

    async function confirmDeleteMainPlan() {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to delete document");
            toast.success("Document deleted successfully");
            router.push("/dashboard/projects/plans");
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to delete document");
        } finally {
            setIsDeleting(false);
            setMainPlanDeleteOpen(false);
        }
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            if (parentId) {
                                router.push(`/view-plan/${parentId}`);
                            } else {
                                router.push("/dashboard/projects/plans");
                            }
                        }}
                        className="rounded-full"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{planName}</h1>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setMainPlanEditOpen(true)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-muted-foreground">Hierarchy: Documents {parentId ? " / Sub-folder" : ""} / {planName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/projects/plans")} className="rounded-xl h-9 w-9" title="Back to Documents">
                        <Home className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={openAddSubPlan} className="rounded-xl h-9 text-xs font-semibold gap-1.5 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-50">
                        <FolderPlus className="h-4 w-4" />
                        New Sub-folder
                    </Button>
                    <Button onClick={openAddPage} className="rounded-xl h-9 text-xs font-semibold gap-1.5 shadow-sm px-4 bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Plus className="h-4 w-4" />
                        Add Document
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem className="text-destructive font-semibold text-xs cursor-pointer rounded-lg" onClick={deleteMainPlan}>
                                Delete Entire Document
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="animate-pulse h-[160px]">
                            <div className="p-5 h-full bg-muted/20" />
                        </Card>
                    ))
                ) : (
                    <>
                        {subPlans.map((sub) => (
                            <Card
                                key={sub._id}
                                className={cn(
                                    "group relative hover:border-primary/50 transition-all duration-200 cursor-pointer overflow-hidden shadow-sm hover:shadow-md h-full border-blue-100 dark:border-blue-900/30",
                                    sub.isPinned && "bg-blue-50/40 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30"
                                )}
                                onClick={() => router.push(`/view-plan/${sub._id}`)}
                            >
                                <CardContent className="p-5 flex flex-col h-full space-y-4 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10">
                                    <div className="flex items-start justify-between">
                                        <div className={cn("flex items-center gap-3 transition-colors", sub.isPinned ? "text-blue-600 dark:text-blue-400" : "text-blue-600/70 dark:text-blue-400/70")}>
                                            <div className={cn("p-2 rounded-lg transition-all", sub.isPinned ? "bg-blue-200 dark:bg-blue-800/60" : "bg-blue-100 dark:bg-blue-900/40")}>
                                                <Folder className={cn("h-6 w-6 transition-all", sub.isPinned ? "fill-current scale-110" : "fill-current/50")} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-lg truncate leading-none mb-1 group-hover:text-primary transition-colors">
                                                    {sub.name}
                                                </h3>
                                                <div className="text-[10px] uppercase font-bold tracking-widest opacity-60">Sub-folder</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/80">
                                                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                                    <DropdownMenuItem onClick={(e) => togglePin("plan", sub._id, "pin", !!sub.isPinned)} className="gap-2 cursor-pointer">
                                                        <Pin className={cn("h-4 w-4", sub.isPinned && "fill-current text-blue-600")} />
                                                        <span>{sub.isPinned ? "Unpin from main" : "Pin to main"}</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => togglePin("plan", sub._id, "sidebar", !!sub.isPinnedToSidebar)} className="gap-2 cursor-pointer">
                                                        <LayoutPanelLeft className={cn("h-4 w-4", sub.isPinnedToSidebar && "fill-current text-blue-600")} />
                                                        <span>{sub.isPinnedToSidebar ? "Remove from sidebar" : "Pin to sidebar"}</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { setEditingSubPlanId(sub._id); setSubPlanName(sub.name); setSubPlanDialogOpen(true); }} className="gap-2 cursor-pointer">
                                                        <Pencil className="h-4 w-4" />
                                                        <span>Rename Folder</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => deleteSubPlan(sub._id)} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                        <span>Delete Folder</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-blue-100/50 dark:border-blue-900/20 mt-auto">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            Open Folder
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-blue-400" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {pages.map((page) => (
                            <Card
                                key={page._id}
                                className={cn(
                                    "group relative hover:border-primary/50 transition-all duration-200 cursor-pointer overflow-hidden shadow-sm hover:shadow-md h-full",
                                    page.isPinned && "bg-blue-50/40 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30"
                                )}
                                onClick={() => router.push(`/view-page/${page._id}`)}
                            >
                                <CardContent className="p-5 flex flex-col h-full space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-lg transition-all", page.isPinned ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "bg-primary/5 text-primary")}>
                                                <FileText className={cn("h-6 w-6 transition-all", page.isPinned && "scale-110")} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-lg truncate leading-none mb-1 group-hover:text-primary transition-colors">
                                                    {page.name}
                                                </h3>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(page.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/80">
                                                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                                    <DropdownMenuItem onClick={(e) => togglePin("page", page._id, "pin", !!page.isPinned)} className="gap-2 cursor-pointer">
                                                        <Pin className={cn("h-4 w-4", page.isPinned && "fill-current text-blue-600")} />
                                                        <span>{page.isPinned ? "Unpin from main" : "Pin to main"}</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => togglePin("page", page._id, "sidebar", !!page.isPinnedToSidebar)} className="gap-2 cursor-pointer">
                                                        <LayoutPanelLeft className={cn("h-4 w-4", page.isPinnedToSidebar && "fill-current text-blue-600")} />
                                                        <span>{page.isPinnedToSidebar ? "Remove from sidebar" : "Pin to sidebar"}</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setPreviewPage(page)} className="gap-2 cursor-pointer">
                                                        <Eye className="h-4 w-4" />
                                                        <span>Preview</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEditPage(page)} className="gap-2 cursor-pointer">
                                                        <Pencil className="h-4 w-4" />
                                                        <span>Edit Document</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => deletePage(page._id)} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                        <span>Delete Document</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t mt-auto">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider",
                                                page.visibility === "org" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                                    page.visibility === "shared" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                        "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                                            )}>
                                                {page.visibility}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1 group-hover:text-primary transition-colors">
                                            View <ChevronRight className="h-3 w-3" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {!loading && pages.length === 0 && subPlans.length === 0 && (
                            <div className="col-span-full border-2 border-dashed rounded-3xl py-24 text-center space-y-4 opacity-70">
                                <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                                    <Folder className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold text-lg text-foreground">Empty Document</p>
                                    <p className="text-sm text-muted-foreground">Create sub-folders or documents to get started.</p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Document Dialog (for settings/metadata phase) */}
            <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Document Settings</DialogTitle>
                        <DialogDescription>
                            Update the visibility and sharing settings for this document.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onPageSubmit} className="space-y-6 pt-4">
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold">Document Title</Label>
                            <Input
                                placeholder="e.g. Executive Summary"
                                className="h-12 text-lg"
                                value={pageName}
                                onChange={(e) => setPageName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-semibold">Visibility & Sharing</Label>
                            <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                                <SelectTrigger className="h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="me">Only me (Private)</SelectItem>
                                    <SelectItem value="org">Organisation (Everyone)</SelectItem>
                                    <SelectItem value="shared">Share with specific members</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {visibility === "shared" && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-sm font-semibold">Select Members</Label>
                                <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-3 border rounded-lg">
                                    {users.filter((u: any) => u.userId).map((u: any) => (
                                        <div key={u.userId} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`user-${u.userId}`}
                                                checked={sharedWith.includes(u.userId)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSharedWith([...sharedWith, u.userId]);
                                                    else setSharedWith(sharedWith.filter(id => id !== u.userId));
                                                }}
                                            />
                                            <label htmlFor={`user-${u.userId}`} className="text-sm cursor-pointer">{u.name}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="pt-4">
                            <Button type="submit" size="lg" className="w-full" disabled={!pageName.trim()}>
                                {editingPageId ? "Update Document" : "Create Document"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Sub-plan Dialog */}
            <Dialog open={subPlanDialogOpen} onOpenChange={setSubPlanDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{editingSubPlanId ? "Edit Sub-folder" : "New Sub-folder"}</DialogTitle>
                        <DialogDescription>
                            Create a sub-folder to organize your documents.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onSubPlanSubmit} className="space-y-6 pt-4">
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold">Sub-folder Name</Label>
                            <Input
                                placeholder="e.g. Q1 Operations"
                                className="h-12 text-lg"
                                value={subPlanName}
                                onChange={(e) => setSubPlanName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-semibold">Visibility & Sharing</Label>
                            <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                                <SelectTrigger className="h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="me">Only me (Private)</SelectItem>
                                    <SelectItem value="org">Organisation (Everyone)</SelectItem>
                                    <SelectItem value="shared">Share with specific members</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {visibility === "shared" && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-sm font-semibold">Select Members</Label>
                                <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-3 border rounded-lg">
                                    {users.filter((u: any) => u.userId).map((u: any) => (
                                        <div key={u.userId} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`sub-user-${u.userId}`}
                                                checked={sharedWith.includes(u.userId)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSharedWith([...sharedWith, u.userId]);
                                                    else setSharedWith(sharedWith.filter(id => id !== u.userId));
                                                }}
                                            />
                                            <label htmlFor={`sub-user-${u.userId}`} className="text-sm cursor-pointer">{u.name}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="pt-4">
                            <Button type="submit" size="lg" className="w-full" disabled={!subPlanName.trim()}>
                                {editingSubPlanId ? "Update Sub-folder" : "Create Sub-folder"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deletePageId}
                onOpenChange={(open) => !open && setDeletePageId(null)}
                title="Delete Page"
                description="Are you sure you want to delete this page? This action cannot be undone."
                onConfirm={confirmDeletePage}
                isLoading={isDeleting}
            />

            <ConfirmDialog
                open={!!deleteSubPlanId}
                onOpenChange={(open) => !open && setDeleteSubPlanId(null)}
                title="Delete Sub-folder"
                description="Delete this sub-folder and all its contents? This action cannot be undone."
                onConfirm={confirmDeleteSubPlan}
                isLoading={isDeleting}
            />

            <ConfirmDialog
                open={mainPlanDeleteOpen}
                onOpenChange={setMainPlanDeleteOpen}
                title="Delete Document"
                description="Are you sure you want to delete this entire document and all its contents? This action cannot be undone."
                onConfirm={confirmDeleteMainPlan}
                isLoading={isDeleting}
            />

            {/* Preview Modal */}
            <Dialog open={!!previewPage} onOpenChange={(open) => !open && setPreviewPage(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
                    <DialogHeader className="p-6 border-b shrink-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <FileText className="h-6 w-6 text-primary" />
                            {previewPage?.name}
                        </DialogTitle>
                        <DialogDescription className="flex items-center gap-2 text-xs">
                            <span>Created at: {previewPage && new Date(previewPage.createdAt).toLocaleString()}</span>
                            <span>•</span>
                            <span className="capitalize">Visibility: {previewPage?.visibility}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-zinc-950 prose prose-slate max-w-none">
                        {previewPage?.content ? (
                            <RichTextDisplay html={previewPage.content} />
                        ) : (
                            <p className="text-muted-foreground text-center py-12 italic">No content in this document yet.</p>
                        )}
                    </div>
                    <DialogFooter className="p-4 border-t bg-muted/20 shrink-0 gap-2 flex-row justify-end">
                        <Button variant="outline" size="sm" onClick={() => setPreviewPage(null)} className="rounded-xl text-xs font-semibold">
                            Close Preview
                        </Button>
                        <Button size="sm" onClick={() => {
                            if (previewPage) {
                                router.push(`/dashboard/projects/plans/pages/${previewPage._id}/edit`);
                                setPreviewPage(null);
                            }
                        }} className="rounded-xl text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
                            <Pencil className="h-3.5 w-3.5" />
                            Edit Document
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Main Plan Edit Dialog */}
            <Dialog open={mainPlanEditOpen} onOpenChange={setMainPlanEditOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Edit Document Name</DialogTitle>
                        <DialogDescription>
                            Change the name of this document.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onMainPlanEdit} className="space-y-6 pt-4">
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold">Document Name</Label>
                            <Input
                                placeholder="e.g. Project X - Initial Phase"
                                className="h-12 text-lg"
                                value={mainPlanNewName}
                                onChange={(e) => setMainPlanNewName(e.target.value)}
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="submit" size="lg" className="w-full" disabled={!mainPlanNewName.trim()}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
