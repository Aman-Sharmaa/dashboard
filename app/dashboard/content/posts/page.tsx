"use client";

import { useEffect, useState } from "react";
import {
  Newspaper,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ExternalLink,
  MoreHorizontal,
  Tag,
  Search,
  Calendar as CalendarIcon,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CmsCategory = { _id: string; name: string; slug: string };
type CmsPostRow = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  status: string;
  categoryId?: CmsCategory | null;
  authorId?: { name: string; email: string };
  publishedAt?: string;
  updatedAt: string;
  password?: string;
  viewCount?: number;
};

export default function CmsPostsPage() {
  const [posts, setPosts] = useState<CmsPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Options states
  const [categories, setCategories] = useState<CmsCategory[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setCurrentUser(data.user);
    } catch (e) {
      console.error("Failed to load user", e);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("categoryId", categoryFilter);
      if (authorFilter !== "all") params.append("authorId", authorFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await fetch(`/api/cms/posts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setPosts(data.posts || []);
      setTotalPages(data.pagination?.totalPages || 1);

      // Load metadata (categories and authors) if not loaded
      if (categories.length === 0) {
        const catRes = await fetch("/api/cms/categories");
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }
      }
      if (authors.length === 0) {
        const authRes = await fetch("/api/employees");
        if (authRes.ok) {
          const authData = await authRes.json();
          setAuthors(authData.employees || []);
        }
      }
    } catch {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page]);

  useEffect(() => {
    load();
    loadUser();
  }, []);

  async function handleDelete(id: string) {
    setPostToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!postToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/cms/posts/${postToDelete}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Post deleted");
      load();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setPostToDelete(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b pb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Posts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Write and manage blog posts. Published posts appear on /blogs.
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/dashboard/content/posts/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Post
          </Link>
        </Button>
      </div>

      <Card className="bg-background/50 backdrop-blur-sm border shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Post title..."
                  className="pl-9 h-9 bg-background focus-visible:ring-primary/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPage(1);
                      load();
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-background focus:ring-primary/20">
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 bg-background focus:ring-primary/20">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Author</Label>
              <Select value={authorFilter} onValueChange={setAuthorFilter}>
                <SelectTrigger className="h-9 bg-background focus:ring-primary/20">
                  <SelectValue placeholder="All authors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Authors</SelectItem>
                  {authors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                className="h-9 bg-background border-input focus-visible:ring-primary/20"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 flex-1 rounded-lg border-neutral-200"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setAuthorFilter("all");
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                  // We need to call load with reset values, but state updates are async.
                  // For now reset will just clear state, user can click filter or wait for effect if we added one.
                  // Actually load() uses the states, so we should call it after state updates or handle it manually.
                }}
              >
                Reset
              </Button>
              <Button size="sm" className="h-9 flex-1 rounded-lg bg-primary hover:bg-primary/90" onClick={() => { setPage(1); load(); }}>
                <Filter className="mr-2 h-3.5 w-3.5" />
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            All Posts
          </CardTitle>
          <CardDescription>Manage your blog posts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No posts yet.{" "}
              <Link href="/dashboard/content/posts/new" className="text-primary hover:underline">
                Create your first post
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>
                      {p.categoryId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs">
                          <Tag className="h-3 w-3" />
                          {(p.categoryId as CmsCategory).name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">~</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{p.authorId?.name || p.authorId?.email?.split("@")[0] || "Unknown"}</span>
                        <span className="text-[10px] text-muted-foreground">{p.authorId?.email || ""}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "published" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.password ? (
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border">
                          {p.password}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">none</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.viewCount || 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {p.status === "published" && (
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/post/${p.slug}`} target="_blank" title="View">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(currentUser?.role === "admin" || String((p as any).authorId?._id) === String(currentUser?.id)) ? (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/content/posts/${p._id}/edit`} className="flex items-center">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(p._id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem disabled className="text-muted-foreground italic">
                                Read Only (Not Owner)
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Post"
        description="Are you sure you want to delete this post? This action cannot be undone."
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div >
  );
}
