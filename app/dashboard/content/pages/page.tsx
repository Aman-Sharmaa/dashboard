"use client";

import { useEffect, useState } from "react";
import {
  FileText, Plus, Pencil, Trash2, Loader2, ExternalLink,
  MoreHorizontal, Code2, Zap,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type CmsPageRow = {
  _id: string;
  title: string;
  slug: string;
  status: string;
  source?: "static";
  authorId?: { name: string; email: string };
  viewCount?: number;
  updatedAt: string;
};

export default function CmsPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<CmsPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<{ id: string; isStatic: boolean; slug: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [convertingSlug, setConvertingSlug] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setCurrentUser(data.user);
    } catch (e) { console.error("Failed to load user", e); }
  }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (authorFilter !== "all") params.append("authorId", authorFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/cms/pages?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const filteredPages = (data.pages || []).filter((p: any) => p.slug !== "about-us");
      setPages(filteredPages);

      const usersRes = await fetch("/api/employees");
      const usersData = await usersRes.json();
      setUsers(usersData.employees || []);
    } catch { toast.error("Failed to load pages"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); loadUser(); }, []);

  async function handleConvertToBuilder(slug: string, title: string) {
    setConvertingSlug(slug);
    try {
      const res = await fetch("/api/cms/pages/static/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to convert");
      toast.success(data.existing ? "Opening existing CMS page in builder…" : "Page converted! Opening builder…");
      router.push(`/dashboard/content/pages/${data.page._id}/edit`);
    } catch (e: any) {
      toast.error(e.message || "Failed to convert page");
      setConvertingSlug(null);
    }
  }

  function handleDelete(id: string, isStatic: boolean, slug: string) {
    setPageToDelete({ id, isStatic, slug });
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!pageToDelete) return;
    setIsDeleting(true);
    try {
      if (pageToDelete.isStatic) {
        const res = await fetch("/api/cms/pages/static/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: pageToDelete.slug }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed to delete"); }
      } else {
        const res = await fetch(`/api/cms/pages/${pageToDelete.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");
      }
      toast.success("Page deleted");
      load();
    } catch (e: any) { toast.error(e.message || "Failed to delete"); }
    finally { setIsDeleting(false); setDeleteConfirmOpen(false); setPageToDelete(null); }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b pb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pages</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage <span className="font-medium">CMS pages</span> and{" "}
            <span className="text-violet-600 font-medium">static pages</span> ~ convert any static page to the visual builder.
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/dashboard/content/pages/new">
            <Plus className="mr-2 h-4 w-4" /> Add Page
          </Link>
        </Button>
      </div>

      <Card className="bg-background/50 backdrop-blur-sm border shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Page title..."
                  className="w-full h-9 pl-9 pr-4 rounded-md border border-muted-foreground/20 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="static">Static Pages</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Author</Label>
              <Select value={authorFilter} onValueChange={setAuthorFilter}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="All authors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Authors</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Start Date</Label>
              <input
                type="date"
                className="w-full h-9 px-3 rounded-md border border-muted-foreground/20 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" className="h-9 flex-1"
                onClick={() => { setSearchQuery(""); setStatusFilter("all"); setAuthorFilter("all"); setStartDate(""); setEndDate(""); }}>
                Reset
              </Button>
              <Button size="sm" className="h-9 flex-1" onClick={load}>Filter</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> All Pages
          </CardTitle>
          <CardDescription>
            <span className="inline-flex items-center gap-1 text-violet-600"><Code2 className="w-3.5 h-3.5" /> Violet rows</span>{" "}
            = hardcoded static pages. Click <strong>Convert to Builder</strong> to edit them visually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No pages yet.{" "}
              <Link href="/dashboard/content/pages/new" className="text-primary hover:underline">
                Create your first page
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((p) => {
                  const isStatic = p.source === "static";
                  return (
                    <TableRow key={p._id} className={isStatic ? "bg-violet-50/50 dark:bg-violet-950/10" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isStatic && <Code2 className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
                          {p.title}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">/{p.slug}</TableCell>
                      <TableCell>
                        {isStatic ? (
                          <span className="text-xs text-muted-foreground italic">Hardcoded</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{p.authorId?.name || p.authorId?.email?.split("@")[0] || "Unknown"}</span>
                            <span className="text-[10px] text-muted-foreground">{p.authorId?.email || ""}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isStatic ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
                            <Code2 className="w-3 h-3" /> Static
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "published"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            }`}>
                            {p.status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {p.viewCount || 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <a href={`/${p.slug}`} target="_blank" title="View live">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isStatic ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleConvertToBuilder(p.slug, p.title)}
                                    disabled={convertingSlug === p.slug}
                                    className="text-violet-700 focus:text-violet-700 focus:bg-violet-50"
                                  >
                                    {convertingSlug === p.slug
                                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      : <Zap className="mr-2 h-4 w-4" />}
                                    Convert to Builder
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDelete(p._id, true, p.slug)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Page
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  {(currentUser?.role === "admin" || String((p as any).authorId?._id) === String(currentUser?.id)) ? (
                                    <>
                                      <DropdownMenuItem asChild>
                                        <Link href={`/dashboard/content/pages/${p._id}/edit`} className="flex items-center">
                                          <Pencil className="mr-2 h-4 w-4" /> Edit in Builder
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => handleDelete(p._id, false, p.slug)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <DropdownMenuItem disabled className="text-muted-foreground italic">
                                      Read Only (Not Owner)
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={pageToDelete?.isStatic ? "Delete Static Page" : "Delete Page"}
        description={
          pageToDelete?.isStatic
            ? `This will permanently delete the app/${pageToDelete?.slug}/ directory from your codebase. This cannot be undone.`
            : "Are you sure you want to delete this page? This action cannot be undone."
        }
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
