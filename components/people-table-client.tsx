"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type PeopleTableEmployee = {
  _id: string;
  name: string;
  email: string;
  title?: string;
  department?: string;
  location?: string;
  type?: string;
  employeeId?: number;
  dateOfHiring?: Date | string | null;
  isDismissed?: boolean;
  avatarUrl?: string;
  assignedProduct?: string;
  assignedService?: string;
};

function formatDate(value?: Date | string | null) {
  if (!value) return "~";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "~";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  employees: PeopleTableEmployee[];
  isAdmin: boolean;
};

export function PeopleTableClient({ employees, isAdmin }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("__all__");
  const [filterProductOrService, setFilterProductOrService] = useState<string>("__all__");
  const [pendingLeaves, setPendingLeaves] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/attendance?approvalStatus=pending&status=leave")
      .then((res) => res.ok ? res.json() : { attendance: [] })
      .then((data) => {
        const counts: Record<string, number> = {};
        for (const rec of data.attendance || []) {
          if (rec.status === "leave" && rec.approvalStatus === "pending") {
            counts[rec.employeeId] = (counts[rec.employeeId] || 0) + 1;
          }
        }
        setPendingLeaves(counts);
      })
      .catch(() => { });
  }, [isAdmin]);

  const filtered = useMemo(() => {
    let list = [...employees];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(q) ||
          emp.email?.toLowerCase().includes(q) ||
          emp.title?.toLowerCase().includes(q) ||
          emp.department?.toLowerCase().includes(q) ||
          emp.type?.toLowerCase().includes(q)
      );
    }
    if (filterType !== "__all__") {
      list = list.filter((emp) => emp.type === filterType);
    }
    if (filterProductOrService !== "__all__") {
      list = list.filter(
        (emp) =>
          emp.assignedProduct === filterProductOrService ||
          emp.assignedService === filterProductOrService
      );
    }
    return list;
  }, [employees, search, filterType, filterProductOrService]);

  const types = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((emp) => {
      if (emp.type) set.add(emp.type);
    });
    return Array.from(set).sort();
  }, [employees]);

  const productsAndServices = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((emp) => {
      if (emp.assignedProduct) set.add(emp.assignedProduct);
      if (emp.assignedService) set.add(emp.assignedService);
    });
    return Array.from(set).sort();
  }, [employees]);

  const activeEmployeesTotal = useMemo(
    () => employees.length,
    [employees]
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-wrap">
        <div className="relative w-full sm:max-w-xs group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          <Input
            placeholder="Search by name, email, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-muted/20 border-muted-foreground/10 focus:bg-background transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterProductOrService} onValueChange={setFilterProductOrService}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl">
              <SelectValue placeholder="Product / Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All products & services</SelectItem>
              {productsAndServices.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs font-medium text-muted-foreground sm:ml-auto">
          Showing <span className="text-foreground font-bold">{filtered.length}</span>
          {filtered.length !== activeEmployeesTotal && (
            <span> of {activeEmployeesTotal} team members</span>
          )}
          {filtered.length === activeEmployeesTotal && activeEmployeesTotal > 0 && (
            <span> team members</span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-background/50 overflow-hidden shadow-sm mt-[10px]">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-[300px] py-4 pl-6 text-xs font-bold uppercase tracking-wider">Employee</TableHead>
              <TableHead className="py-4 text-xs font-bold uppercase tracking-wider">Status</TableHead>
              <TableHead className="py-4 text-xs font-bold uppercase tracking-wider">Role & Placement</TableHead>
              <TableHead className="py-4 text-xs font-bold uppercase tracking-wider">Joined Date</TableHead>
              <TableHead className="text-right py-4 pr-6 text-xs font-bold uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                  {employees.length === 0
                    ? "No team members currently recorded."
                    : activeEmployeesTotal === 0
                      ? "No active team members currently recorded."
                      : "No team members match your search or filters."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => {
                const initials = emp.name
                  .split(" ")
                  .map((p: string) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const isActive = !emp.isDismissed;

                const profileHref = `/dashboard/people/${String(emp._id)}`;
                return (
                  <TableRow
                    key={String(emp._id)}
                    className="group border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => router.push(profileHref)}
                  >
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border shadow-sm group-hover:scale-105 transition-transform">
                          <AvatarImage src={emp.avatarUrl} alt={emp.name} />
                          <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground truncate">{emp.name}</span>
                            {isAdmin && pendingLeaves[emp._id] > 0 && (
                              <Badge variant="destructive" className="px-1.5 py-0 text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center">
                                {pendingLeaves[emp._id]} leave
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-medium truncate">{emp.email}</span>
                          {emp.employeeId != null && (
                            <span className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                              ID #{emp.employeeId}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant={isActive ? "secondary" : "outline"}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          isActive
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-muted-foreground/20"
                        )}
                      >
                        {isActive ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold truncate">{emp.title || "~"}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{emp.department || "General"}</span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30 shrink-0" />
                          {emp.type === "Gig Worker" ? (
                            <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0 rounded-sm font-bold uppercase tracking-tighter">Gig Worker</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter capitalize">{emp.type || "~"}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-xs font-medium text-muted-foreground">{formatDate(emp.dateOfHiring)}</span>
                    </TableCell>
                    <TableCell className="text-right py-4 pr-6" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-muted-foreground/10">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-muted-foreground/10">
                          <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2 py-1.5">Record Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild className="rounded-lg m-1">
                            <a href={profileHref} className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <UserCircle className="h-4 w-4" />
                              View Full Profile
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
