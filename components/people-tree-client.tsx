"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  User,
  ChevronRight,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Hash,
  Expand,
  Minus,
  Users,
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
  employeeId?: number;
  phone?: string;
  avatarUrl?: string;
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

type Props = {
  employees: {
    _id: string;
    name: string;
    email?: string;
    title?: string;
    department?: string;
    manager?: string;
    location?: string;
    employeeId?: number;
    phone?: string;
    avatarUrl?: string;
    isDismissed?: boolean;
  }[];
};

function TreeItem({
  node,
  expanded,
  selectedId,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  expanded: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (emp: Employee) => void;
}) {
  const e = node.employee;
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(e._id);
  const isSelected = selectedId === e._id;

  const initials = (e.name ?? "")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <li>
        <div
          className={cn(
            "group relative mx-auto flex w-[210px] flex-col items-center rounded-2xl border bg-card px-4 py-4 text-center transition-all duration-200",
            "cursor-pointer select-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
            isSelected
              ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/10"
              : "border-border shadow-sm"
          )}
          onClick={() => onSelect(e)}
        >
          {hasChildren && (
            <button
              type="button"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={(ev) => {
                ev.stopPropagation();
                onToggle(e._id);
              }}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          <Avatar className="h-14 w-14 shrink-0 border-2 border-background shadow-md ring-1 ring-border/60">
            <AvatarImage src={e.avatarUrl} className="object-cover" />
            <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
              {initials || "~"}
            </AvatarFallback>
          </Avatar>
          <div className="mt-3 min-w-0 w-full">
            <div className="truncate text-sm font-bold text-foreground">{e.name || "~"}</div>
            <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
              {e.title || "Team member"}
            </div>
            {e.department && (
              <div className="mt-2 inline-flex max-w-full rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                <span className="truncate">{e.department}</span>
              </div>
            )}
          </div>
          {hasChildren && (
            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Users className="h-3 w-3" />
              {node.children.length} direct {node.children.length === 1 ? "report" : "reports"}
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <ul>
            {node.children.map((child) => (
              <TreeItem
                key={child.employee._id}
                node={child}
                expanded={expanded}
                selectedId={selectedId}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
    </li>
  );
}

export function PeopleTreeClient({ employees }: Props) {
  const router = useRouter();
  const visibleEmployees = employees;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(visibleEmployees.map((e) => e._id)));
  const [selected, setSelected] = useState<Employee | null>(null);

  const tree = useMemo(() => buildTree(visibleEmployees as Employee[]), [visibleEmployees]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(visibleEmployees.map((e) => e._id)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  if (visibleEmployees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground rounded-2xl border-2 border-dashed">
        <User className="h-16 w-16 mb-4 opacity-40" />
        <p className="text-base font-medium">No team members yet</p>
        <p className="text-sm mt-1">Add employees to build your org chart</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-[10px]">
        <Button
          variant="outline"
          size="sm"
          onClick={expandAll}
          className="h-8 text-xs gap-1.5"
        >
          <Expand className="h-3.5 w-3.5" />
          Expand all
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={collapseAll}
          className="h-8 text-xs gap-1.5"
        >
          <Minus className="h-3.5 w-3.5" />
          Collapse all
        </Button>
        <span className="text-xs text-muted-foreground ml-1">
          {visibleEmployees.length} team members • Click to view details
        </span>
      </div>

      <div className="org-chart min-h-[500px] overflow-auto rounded-2xl border bg-gradient-to-b from-muted/20 to-background px-6 py-10">
        <ul className="org-tree">
          {tree.map((node) => (
            <TreeItem
              key={node.employee._id}
              node={node}
              expanded={expanded}
              selectedId={selected?._id ?? null}
              onToggle={toggle}
              onSelect={setSelected}
            />
          ))}
        </ul>
      </div>

      <style jsx global>{`
        .org-chart .org-tree,
        .org-chart .org-tree ul {
          display: flex;
          justify-content: center;
          margin: 0;
          padding: 0;
          position: relative;
          width: max-content;
          min-width: 100%;
        }

        .org-chart .org-tree li {
          list-style: none;
          padding: 34px 10px 0;
          position: relative;
          text-align: center;
        }

        .org-chart .org-tree > li {
          padding-top: 0;
        }

        .org-chart .org-tree li::before,
        .org-chart .org-tree li::after {
          border-top: 2px solid hsl(var(--border));
          content: "";
          height: 34px;
          position: absolute;
          top: 0;
          width: 50%;
        }

        .org-chart .org-tree li::before {
          right: 50%;
        }

        .org-chart .org-tree li::after {
          border-left: 2px solid hsl(var(--border));
          left: 50%;
        }

        .org-chart .org-tree > li::before,
        .org-chart .org-tree > li::after,
        .org-chart .org-tree li:only-child::before,
        .org-chart .org-tree li:only-child::after {
          display: none;
        }

        .org-chart .org-tree li:first-child::before,
        .org-chart .org-tree li:last-child::after {
          border: 0;
        }

        .org-chart .org-tree li:last-child::before {
          border-right: 2px solid hsl(var(--border));
          border-radius: 0 10px 0 0;
        }

        .org-chart .org-tree li:first-child::after {
          border-radius: 10px 0 0 0;
        }

        .org-chart .org-tree ul::before {
          border-left: 2px solid hsl(var(--border));
          content: "";
          height: 34px;
          left: 50%;
          position: absolute;
          top: 0;
        }
      `}</style>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="sr-only">Employee details</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 pt-4">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24 border-2 border-muted shadow-lg">
                    <AvatarImage src={selected.avatarUrl} />
                    <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                      {(selected.name ?? "")
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2) || "~"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center space-y-1">
                    <h3 className="font-bold text-lg">{selected.name || "~"}</h3>
                    {(selected.title || selected.department) && (
                      <p className="text-sm text-muted-foreground">
                        {[selected.title, selected.department].filter(Boolean).join(" • ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 text-sm rounded-xl bg-muted/30 p-4">
                  {selected.employeeId != null && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">ID</p>
                        <p className="font-semibold">{selected.employeeId}</p>
                      </div>
                    </div>
                  )}
                  {selected.email && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Email</p>
                        <p className="font-medium break-all">{selected.email}</p>
                      </div>
                    </div>
                  )}
                  {selected.phone && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Phone</p>
                        <p className="font-medium">{selected.phone}</p>
                      </div>
                    </div>
                  )}
                  {selected.location && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Address</p>
                        <p className="font-medium">{selected.location}</p>
                      </div>
                    </div>
                  )}
                  {selected.department && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Department</p>
                        <p className="font-medium">{selected.department}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Full profile hidden for employees ~ contains sensitive data */}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
