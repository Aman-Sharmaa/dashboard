"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  LayoutGrid,
  List,
  User,
  Mail,
  Phone,
  Clock3,
  MapPin,
  Briefcase,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Employee = {
  _id: string;
  name: string;
  email?: string;
  title?: string;
  department?: string;
  manager?: string;
  location?: string;
  type?: string;
  employeeId?: number;
  phone?: string;
  avatarUrl?: string;
  dateOfHiring?: string | null;
  isDismissed?: boolean;
  assignedProduct?: string;
  assignedService?: string;
  isOutsider?: boolean;
  workStartTime?: string;
  workEndTime?: string;
};

type TreeNode = {
  employee: Employee;
  children: TreeNode[];
};

function buildTree(employees: Employee[]): TreeNode[] {
  const byId = new Map<string, Employee>();
  const byName = new Map<string, Employee>();
  employees.forEach((e) => {
    byId.set(e._id, e);
    if (e.name?.trim()) byName.set(e.name.trim().toLowerCase(), e);
  });

  function makeNode(emp: Employee): TreeNode {
    const children = employees
      .filter((e) => {
        const mgr = e.manager?.trim();
        if (!mgr) return false;
        return mgr === emp._id || byName.get(mgr.toLowerCase())?._id === emp._id;
      })
      .map(makeNode)
      .sort((a, b) => (a.employee.name ?? "").localeCompare(b.employee.name ?? ""));
    return { employee: emp, children };
  }

  const roots = employees.filter((e) => {
    const mgr = e.manager?.trim();
    if (!mgr) return true;
    const byIdMatch = byId.has(mgr);
    const byNameMatch = byName.has(mgr.toLowerCase());
    return !byIdMatch && !byNameMatch;
  });
  return roots.map(makeNode).sort((a, b) => (a.employee.name ?? "").localeCompare(b.employee.name ?? ""));
}

function formatDate(value?: string | Date | null) {
  if (!value) return "~";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "~";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

type Props = {
  employees: Employee[];
  isAdmin?: boolean;
};

/** Org chart node - circular with avatar, name, position */
function OrgChartNode({
  employee,
  isRoot,
  selectedId,
  onSelect,
}: {
  employee: Employee;
  isRoot: boolean;
  selectedId: string | null;
  onSelect: (e: Employee) => void;
}) {
  const e = employee;
  const initials = (e.name ?? "").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const isSelected = selectedId === e._id;

  return (
    <button
      type="button"
      onClick={() => onSelect(e)}
      className={cn(
        "flex flex-col items-center gap-2 p-3 rounded-full transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50",
        isRoot
          ? "bg-emerald-500/15 border-2 border-emerald-500/60 hover:border-emerald-500"
          : "bg-teal-500/15 border-2 border-teal-500/50 hover:border-teal-500",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div
        className={cn(
          "rounded-full overflow-hidden border-2 border-background flex items-center justify-center shrink-0",
          isRoot ? "h-16 w-16" : "h-12 w-12"
        )}
      >
        <Avatar className={cn("rounded-full", isRoot ? "h-16 w-16" : "h-12 w-12")}>
          <AvatarImage src={e.avatarUrl} />
          <AvatarFallback className={cn("bg-muted/80 text-muted-foreground", isRoot ? "text-base" : "text-xs")}>
            {initials || <User className="h-1/2 w-1/2" />}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="text-center min-w-0 max-w-[120px]">
        <div className={cn("font-semibold truncate", isRoot ? "text-sm" : "text-xs")}>
          {e.name || "~"}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">
          {e.title || e.department || "~"}
        </div>
        {e.department && e.title && (
          <div className="text-[9px] text-muted-foreground/80 truncate">{e.department}</div>
        )}
      </div>
    </button>
  );
}

/** Org chart level - renders a row of nodes with connectors */
function OrgChartLevel({
  nodes,
  level,
  selectedId,
  onSelect,
}: {
  nodes: TreeNode[];
  level: number;
  selectedId: string | null;
  onSelect: (e: Employee) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-start justify-center gap-8 md:gap-12 flex-wrap">
        {nodes.map((node, idx) => (
          <div key={node.employee._id} className="flex flex-col items-center">
            <OrgChartNode
              employee={node.employee}
              isRoot={level === 0}
              selectedId={selectedId}
              onSelect={onSelect}
            />
            {node.children.length > 0 && (
              <>
                <div className="w-px h-6 bg-teal-400/60 shrink-0" />
                <div className="flex gap-4 pt-2">
                  {node.children.map((child) => (
                    <div key={child.employee._id} className="flex flex-col items-center">
                      <div className="w-px h-4 bg-teal-400/60 shrink-0" />
                      <OrgChartNode
                        employee={child.employee}
                        isRoot={false}
                        selectedId={selectedId}
                        onSelect={onSelect}
                      />
                      {child.children.length > 0 && (
                        <>
                          <div className="w-px h-4 bg-teal-400/50 shrink-0" />
                          <div className="flex gap-3 pt-2">
                            {child.children.map((grandchild) => (
                              <OrgChartNode
                                key={grandchild.employee._id}
                                employee={grandchild.employee}
                                isRoot={false}
                                selectedId={selectedId}
                                onSelect={onSelect}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Flatten tree for simpler single-level display - root, then children in row */
function OrgChartTree({
  tree,
  selectedId,
  onSelect,
}: {
  tree: TreeNode[];
  selectedId: string | null;
  onSelect: (e: Employee) => void;
}) {
  if (tree.length === 0) return null;

  const root = tree[0];
  const hasMultipleRoots = tree.length > 1;

  return (
    <div className="flex flex-col items-center gap-0 py-8 overflow-x-auto min-h-[400px]">
      {hasMultipleRoots ? (
        <div className="flex flex-wrap justify-center gap-6">
          {tree.map((node) => (
            <OrgChartLevel key={node.employee._id} nodes={[node]} level={0} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      ) : (
        <>
          <OrgChartNode employee={root.employee} isRoot={true} selectedId={selectedId} onSelect={onSelect} />
          {root.children.length > 0 && (
            <>
              <div className="w-px h-8 bg-emerald-500/60 shrink-0" />
              <div className="flex border-t border-teal-400/40 pt-6 gap-6 md:gap-12 flex-wrap justify-center">
                {root.children.map((child) => (
                  <div key={child.employee._id} className="flex flex-col items-center">
                    <div className="w-px h-6 bg-teal-400/60 shrink-0 -mt-6" />
                    <OrgChartNode employee={child.employee} isRoot={false} selectedId={selectedId} onSelect={onSelect} />
                    {child.children.length > 0 && (
                      <>
                        <div className="w-px h-4 bg-teal-400/50 shrink-0" />
                        <div className="flex gap-4 pt-4">
                          {child.children.map((grandchild) => (
                            <div key={grandchild.employee._id} className="flex flex-col items-center">
                              <div className="w-px h-4 bg-teal-400/50 shrink-0" />
                              <OrgChartNode
                                employee={grandchild.employee}
                                isRoot={false}
                                selectedId={selectedId}
                                onSelect={onSelect}
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function PeopleViewClient({ employees, isAdmin = false }: Props) {
  const router = useRouter();
  const [view, setView] = useState<"tree" | "table">("tree");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState<string>("__all__");
  const [selected, setSelected] = useState<Employee | null>(null);

  const filtered = useMemo(() => {
    let list = employees.filter((e) => !e.isDismissed);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(q) ||
          emp.email?.toLowerCase().includes(q) ||
          emp.title?.toLowerCase().includes(q) ||
          emp.department?.toLowerCase().includes(q)
      );
    }
    if (filterDept !== "__all__") {
      list = list.filter((emp) => emp.department === filterDept);
    }
    return list;
  }, [employees, search, filterDept]);

  const tree = useMemo(() => buildTree(filtered as Employee[]), [filtered]);
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  return (
    <>
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-lg"
            />
          </div>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[180px] h-10 rounded-lg">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 ml-auto">
            <Tabs value={view} onValueChange={(v) => setView(v as "tree" | "table")}>
              <TabsList className="h-10 rounded-lg">
                <TabsTrigger value="tree" className="gap-1.5 px-4">
                  <LayoutGrid className="h-4 w-4" />
                  Tree
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-1.5 px-4">
                  <List className="h-4 w-4" />
                  Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span>
          {filtered.length !== employees.length && <span> of {employees.length}</span>} team members
        </div>

        {/* Content */}
        {view === "tree" ? (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-muted">
              <User className="h-16 w-16 mb-4 opacity-40 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">No team members match your filters</p>
              <p className="text-sm mt-1 text-muted-foreground/80">Try adjusting search or department</p>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card/50 p-6 overflow-auto">
              <OrgChartTree tree={tree} selectedId={selected?._id ?? null} onSelect={setSelected} />
            </div>
          )
        ) : (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[280px]">Employee</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No team members match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((emp) => {
                    const initials = (emp.name ?? "").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <TableRow
                        key={emp._id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/dashboard/people/${emp._id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={emp.avatarUrl} />
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold">{emp.name}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">{emp.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{emp.title || "~"}</TableCell>
                        <TableCell>{emp.department || "~"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatDate(emp.dateOfHiring)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/dashboard/people/${emp._id}`} onClick={(e) => e.stopPropagation()}>
                              View
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="sr-only">Employee details</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 pt-4">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24 border-2">
                    <AvatarImage src={selected.avatarUrl} />
                    <AvatarFallback className="text-xl">
                      {(selected.name ?? "").split(" ").map((p) => p[0]).join("").slice(0, 2) || "~"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h3 className="font-bold text-lg">{selected.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {[selected.title, selected.department].filter(Boolean).join(" • ") || "~"}
                    </p>
                    {selected.isOutsider && (
                      <Badge variant="destructive" className="mt-1 text-[10px] h-5">
                        Outsider
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-4 text-sm rounded-xl bg-muted/30 p-4">
                  {(selected.workStartTime || selected.workEndTime) && (
                    <div className="flex items-center gap-3">
                      <Clock3 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Schedule</p>
                        <p className="font-medium">
                          {selected.workStartTime || "~"} to {selected.workEndTime || "~"}
                        </p>
                      </div>
                    </div>
                  )}
                  {selected.employeeId != null && (
                    <div className="flex items-center gap-3">
                      <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ID</p>
                        <p className="font-medium">{selected.employeeId}</p>
                      </div>
                    </div>
                  )}
                  {selected.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</p>
                        <p className="font-medium break-all">{selected.email}</p>
                      </div>
                    </div>
                  )}
                  {selected.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone</p>
                        <p className="font-medium">{selected.phone}</p>
                      </div>
                    </div>
                  )}
                  {selected.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Address</p>
                        <p className="font-medium">{selected.location}</p>
                      </div>
                    </div>
                  )}
                  {selected.department && (
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Department</p>
                        <p className="font-medium">{selected.department}</p>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setSelected(null);
                    router.push(`/dashboard/people/${selected._id}`);
                  }}
                >
                  View full profile →
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
