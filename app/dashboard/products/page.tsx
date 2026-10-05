"use client";

import { useEffect, useState } from "react";
import { Boxes, Briefcase, Plus, MoreHorizontal, Pencil, Trash2, Loader2, RefreshCw, CheckCircle2, XCircle, Play } from "lucide-react";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ConfirmDialog } from "@/components/confirm-dialog";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  kind: z.enum(["product", "service"]),
  description: z.string().optional(),
  externalRevenueApiUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  externalRevenueJwtToken: z.string().optional(),
});

type UiProduct = {
  _id: string;
  name: string;
  slug: string;
  kind: "product" | "service";
  description?: string;
  externalRevenueApiUrl?: string;
  externalRevenueJwtToken?: string;
};

type GoalRow = {
  id: string;
  year: number;
  targetAmount: number;
  business: { id: string; name: string; kind: "product" | "service" } | null;
};

export default function ProductServiceManagementPage() {
  const [items, setItems] = useState<UiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      kind: "product",
      description: "",
      externalRevenueApiUrl: "",
      externalRevenueJwtToken: "",
    },
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch products");
      setItems(data.products || []);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const res = await fetch(
        editingId ? `/api/products/${editingId}` : "/api/products",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to save");

      toast.success(editingId ? "Entry updated" : "Entry added");
      setDialogOpen(false);
      setEditingId(null);
      form.reset();
      load();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
  }

  async function handleDelete(id: string) {
    setItemToDelete(id);
  }

  async function confirmDelete() {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${itemToDelete}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Entry deleted");
      setItemToDelete(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  }

  const products = items.filter((i) => i.kind === "product");
  const services = items.filter((i) => i.kind === "service");
  const [syncing, setSyncing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncStatus, setSyncStatus] = useState<Record<string, { syncing: boolean; lastSync?: Date }>>({});
  const currentYear = new Date().getFullYear();
  const [goalYear, setGoalYear] = useState<number>(currentYear);
  const [goalsByBusiness, setGoalsByBusiness] = useState<Record<string, GoalRow>>({});
  const [goalDrafts, setGoalDrafts] = useState<Record<string, string>>({});
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goalSaving, setGoalSaving] = useState<string | null>(null);

  async function loadGoals(year: number) {
    setGoalsLoading(true);
    try {
      const res = await fetch(`/api/goals?year=${year}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to load goals");
        return;
      }
      const goals: GoalRow[] = data.goals || [];
      const byBusiness: Record<string, GoalRow> = {};
      const drafts: Record<string, string> = {};
      goals.forEach((g) => {
        if (!g.business?.id) return;
        byBusiness[g.business.id] = g;
        drafts[g.business.id] = String(g.targetAmount || 0);
      });
      setGoalsByBusiness(byBusiness);
      setGoalDrafts((prev) => ({ ...prev, ...drafts }));
    } catch {
      toast.error("Failed to load goals");
    } finally {
      setGoalsLoading(false);
    }
  }

  useEffect(() => {
    loadGoals(goalYear);
  }, [goalYear]);

  async function saveGoalForBusiness(businessId: string) {
    const targetAmount = Number(goalDrafts[businessId] || 0);
    if (!Number.isFinite(targetAmount) || targetAmount < 0) {
      toast.error("Enter valid goal amount");
      return;
    }
    setGoalSaving(businessId);
    try {
      const existing = goalsByBusiness[businessId];
      if (existing) {
        const res = await fetch(`/api/goals/${existing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetAmount }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to update goal");
      } else {
        const res = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year: goalYear, businessId, targetAmount }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to add goal");
      }
      await loadGoals(goalYear);
      toast.success("Goal saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save goal");
    } finally {
      setGoalSaving(null);
    }
  }

  async function removeGoalForBusiness(businessId: string) {
    const existing = goalsByBusiness[businessId];
    if (!existing) {
      setGoalDrafts((prev) => ({ ...prev, [businessId]: "" }));
      return;
    }
    setGoalSaving(businessId);
    try {
      const res = await fetch(`/api/goals/${existing.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to remove goal");
      setGoalDrafts((prev) => ({ ...prev, [businessId]: "" }));
      await loadGoals(goalYear);
      toast.success("Goal removed");
    } catch (e: any) {
      toast.error(e.message || "Failed to remove goal");
    } finally {
      setGoalSaving(null);
    }
  }

  async function handleSyncExternalRevenue(productId?: string): Promise<void> {
    const key = productId || "all";
    setSyncStatus((prev) => ({ ...prev, [key]: { syncing: true } }));
    setSyncing(true);
    try {
      const url = productId
        ? `/api/products/sync-external-revenue?productId=${productId}`
        : "/api/products/sync-external-revenue";
      const res = await fetch(url, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to sync");
      toast.success(data.message || "External revenue synced successfully");
      setSyncStatus((prev) => ({ ...prev, [key]: { syncing: false, lastSync: new Date() } }));
    } catch (e: any) {
      toast.error(e.message || "Failed to sync external revenue");
      setSyncStatus((prev) => ({ ...prev, [key]: { syncing: false } }));
    } finally {
      setSyncing(false);
    }
  }

  async function handleTestConnection() {
    const apiUrl = form.watch("externalRevenueApiUrl");
    const jwtToken = form.watch("externalRevenueJwtToken");

    if (!apiUrl || !jwtToken) {
      toast.error("Please enter both API URL and JWT Token");
      return;
    }

    setTestingConnection(true);
    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${jwtToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate response format
      if (!data.totalRevenue || !data.monthlyRevenue) {
        throw new Error("Invalid response format. Expected { totalRevenue, monthlyRevenue }");
      }

      const monthCount = Object.keys(data.monthlyRevenue || {}).length;
      toast.success(
        `Connection successful! Found ${monthCount} months of revenue data. Total: ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(data.totalRevenue || 0)}`
      );
    } catch (e: any) {
      toast.error(`Connection failed: ${e.message}`);
    } finally {
      setTestingConnection(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b pb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Business Offerings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Orchestrate your company's core offerings and team focus areas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Goal year</span>
            <Select value={String(goalYear)} onValueChange={(v) => setGoalYear(Number(v))}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 7 }, (_, i) => currentYear - 3 + i).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              handleSyncExternalRevenue();
            }}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" /> Sync External Revenue
              </>
            )}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingId(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white border border-neutral-200/70 shadow-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Entry" : "Add New Entry"}</DialogTitle>
                <DialogDescription>
                  Fill in the details for your product or service.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Gram" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. gram" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kind"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kind</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select kind" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Short summary..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="text-sm font-semibold">External Revenue API (Optional)</h4>
                    <p className="text-xs text-muted-foreground">
                      Configure an external API to automatically fetch revenue data for this product/service.
                    </p>
                    <FormField
                      control={form.control}
                      name="externalRevenueApiUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API URL</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                type="url"
                                placeholder="https://api.example.com/revenue"
                                {...field}
                                className="flex-1"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="externalRevenueJwtToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>JWT Token</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter JWT token for authentication"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestConnection}
                        disabled={testingConnection || !form.watch("externalRevenueApiUrl") || !form.watch("externalRevenueJwtToken")}
                        className="w-full"
                      >
                        {testingConnection ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Test Connection
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Test the API connection before saving. The API should return: {"{"} totalRevenue, monthlyRevenue: {"{"} "January": amount, ... {"}"} {"}"}
                    </p>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingId ? "Save Changes" : "Create Entry"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border bg-background/50 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 px-6 py-5">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2 font-bold">
                <Boxes className="h-5 w-5 text-primary" /> Products
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Core SaaS offerings and internal tools.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="pl-6 text-[10px] font-bold uppercase tracking-wider">Product Name</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Identifier</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">External API</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Yearly Goal ({goalYear})</TableHead>
                  <TableHead className="text-right pr-6 text-[10px] font-bold uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground italic h-32">No products found</TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p._id} className="group border-b last:border-0 hover:bg-muted/10 transition-colors">
                      <TableCell className="pl-6 py-4 font-bold text-sm">{p.name}</TableCell>
                      <TableCell className="py-4 font-mono text-[10px] text-muted-foreground bg-muted/20 px-2 rounded-md inline-block mt-3 ml-2">{p.slug}</TableCell>
                      <TableCell className="py-4">
                        {p.externalRevenueApiUrl && p.externalRevenueJwtToken ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs text-muted-foreground">Configured</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not configured</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={goalDrafts[p._id] ?? ""}
                            onChange={(e) =>
                              setGoalDrafts((prev) => ({ ...prev, [p._id]: e.target.value }))
                            }
                            placeholder="0"
                            className="h-8 w-[130px]"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => saveGoalForBusiness(p._id)}
                            disabled={goalSaving === p._id || goalsLoading}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => removeGoalForBusiness(p._id)}
                            disabled={goalSaving === p._id || goalsLoading}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        <div className="flex justify-end gap-1 items-center">
                          {p.externalRevenueApiUrl && p.externalRevenueJwtToken && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              onClick={() => handleSyncExternalRevenue(p._id)}
                              disabled={syncStatus[p._id]?.syncing}
                              title="Sync external revenue"
                            >
                              {syncStatus[p._id]?.syncing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => {
                            setEditingId(p._id);
                            form.reset({
                              name: p.name,
                              slug: p.slug,
                              kind: "product",
                              description: p.description || "",
                              externalRevenueApiUrl: p.externalRevenueApiUrl || "",
                              externalRevenueJwtToken: p.externalRevenueJwtToken || "",
                            });
                            setDialogOpen(true);
                          }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(p._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-background/50 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 px-6 py-5">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2 font-bold">
                <Briefcase className="h-5 w-5 text-primary" /> Services
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Managed service lines and consulting focus.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="pl-6 text-[10px] font-bold uppercase tracking-wider">Service Name</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Identifier</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">External API</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Yearly Goal ({goalYear})</TableHead>
                  <TableHead className="text-right pr-6 text-[10px] font-bold uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground italic h-32">No services found</TableCell>
                  </TableRow>
                ) : (
                  services.map((s) => (
                    <TableRow key={s._id} className="group border-b last:border-0 hover:bg-muted/10 transition-colors">
                      <TableCell className="pl-6 py-4 font-bold text-sm">{s.name}</TableCell>
                      <TableCell className="py-4 font-mono text-[10px] text-muted-foreground bg-muted/20 px-2 rounded-md inline-block mt-3 ml-2">{s.slug}</TableCell>
                      <TableCell className="py-4">
                        {s.externalRevenueApiUrl && s.externalRevenueJwtToken ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs text-muted-foreground">Configured</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not configured</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={goalDrafts[s._id] ?? ""}
                            onChange={(e) =>
                              setGoalDrafts((prev) => ({ ...prev, [s._id]: e.target.value }))
                            }
                            placeholder="0"
                            className="h-8 w-[130px]"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => saveGoalForBusiness(s._id)}
                            disabled={goalSaving === s._id || goalsLoading}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => removeGoalForBusiness(s._id)}
                            disabled={goalSaving === s._id || goalsLoading}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        <div className="flex justify-end gap-1 items-center">
                          {s.externalRevenueApiUrl && s.externalRevenueJwtToken && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              onClick={() => handleSyncExternalRevenue(s._id)}
                              disabled={syncStatus[s._id]?.syncing}
                              title="Sync external revenue"
                            >
                              {syncStatus[s._id]?.syncing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => {
                            setEditingId(s._id);
                            form.reset({
                              name: s.name,
                              slug: s.slug,
                              kind: "service",
                              description: s.description || "",
                              externalRevenueApiUrl: s.externalRevenueApiUrl || "",
                              externalRevenueJwtToken: s.externalRevenueJwtToken || "",
                            });
                            setDialogOpen(true);
                          }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(s._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── External Revenue API Reference ── */}
      <Card className="rounded-2xl border bg-muted/30 shadow-sm">
        <CardHeader className="border-b bg-muted/20 px-6 py-5">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">External Revenue API ~ Expected JSON Format</CardTitle>
          </div>
          <CardDescription className="text-xs mt-1">
            Your external API endpoint must return the following JSON structure when called with a{" "}
            <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">GET</code> request and a{" "}
            <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">Authorization: Bearer &lt;token&gt;</code> header.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-5 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Full example */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full response shape</p>
              <pre className="rounded-xl bg-zinc-950 text-zinc-100 text-[12px] leading-relaxed p-4 overflow-x-auto whitespace-pre font-mono border border-zinc-800">
                {`{
  "totalRevenue": 1250000,
  "monthlyRevenue": {
    "January":  120000,
    "February": 95000,
    "March":    140000,
    "April":    110000,
    "May":      130000,
    "June":     160000,
    "July":     145000,
    "August":   175000,
    "September":155000,
    "October":  0,
    "November": 0,
    "December": 0
  }
}`}
              </pre>
            </div>

            {/* Field breakdown */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Field reference</p>
              <div className="space-y-3">
                <div className="rounded-lg border bg-background p-3">
                  <code className="font-mono text-[12px] text-primary">totalRevenue</code>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">number (required)</span> ~ Total revenue for the current year in the smallest unit (e.g. INR paise or full rupees ~ be consistent).
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <code className="font-mono text-[12px] text-primary">monthlyRevenue</code>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">object (required)</span> ~ Keys are full English month names (January … December). Values are numbers. Missing months default to <code className="font-mono bg-muted px-0.5 rounded">0</code>.
                  </p>
                </div>
                <div className="rounded-lg border bg-amber-50 border-amber-200 p-3">
                  <p className="text-xs font-medium text-amber-800">⚠ Notes</p>
                  <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc list-inside">
                    <li>The API must respond to a <code className="font-mono">GET</code> request</li>
                    <li>Authentication via <code className="font-mono">Authorization: Bearer &lt;JWT&gt;</code> header</li>
                    <li>Must return <code className="font-mono">Content-Type: application/json</code></li>
                    <li>Both <code className="font-mono">totalRevenue</code> and <code className="font-mono">monthlyRevenue</code> are required fields</li>
                    <li>Use the "Test Connection" button before saving to validate</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        title="Delete Entry"
        description="Are you sure you want to delete this entry? This action cannot be undone."
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        variant="destructive"
      />
    </div>
  );
}
