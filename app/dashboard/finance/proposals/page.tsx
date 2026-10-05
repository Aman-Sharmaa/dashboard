"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, FileText, Search, Settings, CheckCircle2, Send, Clock, XCircle, LayoutList } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type StatusTab = "all" | "draft" | "sent" | "accepted" | "rejected";

const STATUS_TABS: { value: StatusTab; label: string; icon: React.ReactNode; color: string }[] = [
    { value: "all", label: "All", icon: <LayoutList className="h-3.5 w-3.5" />, color: "" },
    { value: "draft", label: "Draft", icon: <Clock className="h-3.5 w-3.5" />, color: "text-gray-600" },
    { value: "sent", label: "Sent", icon: <Send className="h-3.5 w-3.5" />, color: "text-blue-600" },
    { value: "accepted", label: "Accepted", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-green-600" },
    { value: "rejected", label: "Rejected", icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-600" },
];

const STATUS_BADGE: Record<string, string> = {
    accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function ProposalsPage() {
    const [proposals, setProposals] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [statusTab, setStatusTab] = useState<StatusTab>("all");
    const [clientFilter, setClientFilter] = useState("all");

    useEffect(() => {
        Promise.all([
            fetch("/api/proposals").then((r) => r.json()),
            fetch("/api/clients").then((r) => r.json())
        ])
            .then(([proposalsData, clientsData]) => {
                setProposals(proposalsData.proposals || []);
                setClients(clientsData.clients || []);
            })
            .catch((e) => console.error(e))
            .finally(() => setLoading(false));
    }, []);

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: proposals.length, draft: 0, sent: 0, accepted: 0, rejected: 0 };
        proposals.forEach((p) => { if (c[p.status] !== undefined) c[p.status]++; });
        return c;
    }, [proposals]);

    const filteredProposals = useMemo(() => {
        let res = proposals;
        if (search) res = res.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()));
        if (statusTab !== "all") res = res.filter(p => p.status === statusTab);
        if (clientFilter !== "all") res = res.filter(p => (p.client?._id || p.client) === clientFilter);
        return res;
    }, [proposals, search, statusTab, clientFilter]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Proposals</h1>
                    <p className="text-muted-foreground">Manage and track your project proposals.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/finance/proposals/settings">
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/dashboard/finance/proposals/new">
                            <Plus className="mr-2 h-4 w-4" />
                            New Proposal
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border w-fit flex-wrap">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setStatusTab(tab.value)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                            statusTab === tab.value
                                ? "bg-background shadow text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span className={statusTab === tab.value ? tab.color : ""}>{tab.icon}</span>
                        {tab.label}
                        <span className={cn(
                            "ml-1 px-1.5 py-0 rounded-full text-[10px] font-bold min-w-5 text-center",
                            statusTab === tab.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                            {counts[tab.value] ?? 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search + Client Filter */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search proposals..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
                        {clients.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.companyName || c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>Title</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="text-right">Created</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProposals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No proposals found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProposals.map((proposal) => (
                                <TableRow key={proposal.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell>
                                        <div className="font-medium flex items-center gap-2">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            {proposal.title}
                                        </div>
                                    </TableCell>
                                    <TableCell>{proposal.client?.companyName || proposal.client?.name || "Unknown"}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[proposal.status] || STATUS_BADGE.draft}`}>
                                            {proposal.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {proposal.currency} {proposal.totalAmount?.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {new Date(proposal.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/finance/proposals/${proposal.id}`}>
                                                View
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
