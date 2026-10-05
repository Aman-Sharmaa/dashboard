"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Plus, Trash2, Save, Printer, ArrowLeft, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/rich-text-editor";

import { ConfirmDialog } from "@/components/confirm-dialog";

export function ProposalEditor({ proposalId }: { proposalId?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isNew = !proposalId;
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(isNew || searchParams?.get("edit") === "true");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [convertDialogOpen, setConvertDialogOpen] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        client: "",
        status: "draft",
        validUntil: undefined as Date | undefined,
        content: "", // Rich text for intro/scope
        phases: [] as { name: string; amount: number; details: string; duration: string }[],
        terms: "",
        currency: "INR",
        convertedProjectId: undefined as string | undefined, // Added convertedProjectId
    });

    const [clients, setClients] = useState<any[]>([]);
    const [companyProfile, setCompanyProfile] = useState<any>(null);

    useEffect(() => {
        fetch("/api/clients").then(r => r.json()).then(d => setClients(d.clients || []));
        fetch("/api/company").then(r => r.json()).then(d => setCompanyProfile(d.profile || null)).catch(() => { });

        if (!isNew) {
            fetch(`/api/proposals/${proposalId}`)
                .then(r => r.json())
                .then(d => {
                    if (d.proposal) {
                        setFormData({
                            title: d.proposal.title,
                            client: d.proposal.client?._id || d.proposal.client, // Handle populated or ID
                            status: d.proposal.status,
                            validUntil: d.proposal.validUntil ? new Date(d.proposal.validUntil) : undefined,
                            content: d.proposal.content || "",
                            phases: d.proposal.phases || [],
                            terms: d.proposal.terms || "",
                            currency: d.proposal.currency || "INR",
                            owner: d.proposal.owner,
                            convertedProjectId: d.proposal.convertedProjectId, // Added convertedProjectId
                        } as any);
                    }
                })
                .finally(() => setLoading(false));
        } else {
            // For new proposals, pre-fill terms from proposal settings
            fetch("/api/proposals/settings")
                .then(r => r.json())
                .then(d => {
                    if (d.defaultTerms) {
                        setFormData(prev => ({ ...prev, terms: d.defaultTerms }));
                    }
                })
                .catch(() => { /* ignore ~ terms will just be empty */ });
        }
    }, [proposalId, isNew]);

    const handleSave = async () => {
        if (!formData.title || !formData.client) {
            toast.error("Title and Client are required");
            return;
        }

        setSaving(true);
        try {
            const url = isNew ? "/api/proposals" : `/api/proposals/${proposalId}`;
            const method = isNew ? "POST" : "PUT";

            const totalAmount = formData.phases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, totalAmount }),
            });

            if (!res.ok) throw new Error("Failed to save");

            const data = await res.json();
            toast.success("Proposal saved");

            if (isNew && data.proposal) {
                router.replace(`/dashboard/finance/proposals/${data.proposal._id}?edit=true`);
            }
        } catch (err) {
            toast.error("Error saving proposal");
        } finally {
            setSaving(false);
        }
    };

    const addPhase = () => {
        setFormData(prev => ({
            ...prev,
            phases: [...prev.phases, { name: "", amount: 0, details: "", duration: "" }]
        }));
    };

    const updatePhase = (index: number, field: string, value: any) => {
        const newPhases = [...formData.phases];
        newPhases[index] = { ...newPhases[index], [field]: value };
        setFormData(prev => ({ ...prev, phases: newPhases }));
    };

    const removePhase = (index: number) => {
        const newPhases = formData.phases.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, phases: newPhases }));
    };

    const totalAmount = formData.phases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const [statusTarget, setStatusTarget] = useState<string | null>(null);

    const executeUpdateStatus = async () => {
        if (!statusTarget) return;
        const status = statusTarget;
        setSaving(true);
        try {
            const res = await fetch(`/api/proposals/${proposalId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Failed");
            setFormData(prev => ({ ...prev, status }));
            toast.success(`Proposal marked as ${status}`);
            setStatusTarget(null);
        } catch {
            toast.error("Failed to update status");
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = (status: string) => {
        setStatusTarget(status);
    };

    const handleConvert = async () => {
        setConvertDialogOpen(false);
        setSaving(true);
        try {
            const res = await fetch(`/api/proposals/${proposalId}/convert`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Conversion failed");

            toast.success("Project created successfully");
            router.push(`/dashboard/projects/${data.projectId}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to convert proposal");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleteDialogOpen(false);
        try {
            const res = await fetch(`/api/proposals/${proposalId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
            toast.success("Proposal deleted");
            router.replace("/dashboard/finance/proposals");
        } catch {
            toast.error("Failed to delete proposal");
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            {/* Header - Hidden on Print */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push("/dashboard/finance/proposals")}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isNew ? "New Proposal" : (isEditing ? "Edit Proposal" : formData.title)}
                    </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    {!isNew && !isEditing && (
                        <>
                            {formData.status === "draft" && (
                                <Button variant="outline" onClick={() => updateStatus("sent")}>
                                    Mark as Sent
                                </Button>
                            )}
                            {formData.status === "sent" && (
                                <Button variant="outline" onClick={() => updateStatus("accepted")}>
                                    Mark as Accepted
                                </Button>
                            )}
                            {formData.status === "accepted" && !formData.convertedProjectId && (
                                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setConvertDialogOpen(true)}>
                                    Convert to Project
                                </Button>
                            )}
                            {formData.convertedProjectId && (
                                <Button
                                    variant="outline"
                                    onClick={() => router.push(`/dashboard/projects/${formData.convertedProjectId}`)}
                                >
                                    View Project
                                </Button>
                            )}

                            <Button variant="outline" onClick={() => window.open(`/proposals/${proposalId}/view`, '_blank')}>
                                <Printer className="mr-2 h-4 w-4" /> Print
                            </Button>
                            <Button onClick={() => setIsEditing(true)}>
                                Edit
                            </Button>
                            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                        </>
                    )}
                    {isEditing && (
                        <>
                            {!isNew && (
                                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                                    Cancel
                                </Button>
                            )}
                            <Button onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Proposal
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Read-Only View */}
            {!isEditing && (
                <div className="bg-white border rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-none">
                    {/* Invoice-style Header */}
                    <div className="p-8 border-b bg-gray-50/50 flex flex-col md:flex-row print:flex-row justify-between gap-8 print:bg-transparent print:p-0 print:mb-8 print:border-none">
                        <div className="space-y-6 flex-1">
                            {companyProfile?.logoUrl && (
                                <img src={companyProfile.logoUrl} alt="" className="h-14 print:h-10 w-auto mb-2" />
                            )}
                            <div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Prepared For</div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {clients.find(c => c.id === formData.client)?.companyName || clients.find(c => c.id === formData.client)?.name || "Client Name"}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    {clients.find(c => c.id === formData.client)?.email || ""}
                                </div>
                            </div>

                            {/* Prepared By Section */}
                            <div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Prepared By</div>
                                <div className="text-lg font-medium text-gray-900">
                                    {(formData as any).owner?.name || "Webwrite Team"}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {(formData as any).owner?.email || ""}
                                </div>
                            </div>
                        </div>

                        <div className="text-left md:text-right print:text-right space-y-6 flex-shrink-0">
                            <div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Status</div>
                                <div className={cn(
                                    "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize tracking-wide",
                                    formData.status === "accepted" ? "bg-green-100 text-green-700 border border-green-200" :
                                        formData.status === "sent" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                                            formData.status === "rejected" ? "bg-red-100 text-red-700 border border-red-200" :
                                                "bg-gray-100 text-gray-700 border border-gray-200"
                                )}>
                                    {formData.status}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Valid Until</div>
                                <div className="text-lg font-medium text-gray-900">
                                    {formData.validUntil ? format(formData.validUntil, "MMM dd, yyyy") : "No Expiry"}
                                </div>
                            </div>
                            <div className="print:hidden">
                                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Proposal ID</div>
                                <div className="text-sm font-mono text-gray-500">
                                    {proposalId}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Intro */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Introduction & Scope</h3>
                            <div
                                className="prose prose-sm max-w-none text-gray-600"
                                dangerouslySetInnerHTML={{ __html: formData.content }}
                            />
                        </div>

                        {/* Phases */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Project Phases</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Phase</TableHead>
                                        <TableHead>Deliverables</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {formData.phases.map((phase, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium align-top">{phase.name}</TableCell>
                                            <TableCell className="text-gray-600 align-top whitespace-pre-wrap">{phase.details}</TableCell>
                                            <TableCell className="align-top">{phase.duration}</TableCell>
                                            <TableCell className="text-right align-top font-medium">
                                                {formData.currency} {Number(phase.amount).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Print Phase Invoice"
                                                    onClick={() => {
                                                        const client = clients.find(c => c.id === formData.client) || {};
                                                        const win = window.open("", "_blank");
                                                        if (!win) return;
                                                        // Reuse the print logic or Refactor it into a helper function
                                                        // For brevity duplicating minimal logic here or referring to the same logic
                                                        // I'll keep it simple for now, maybe refactor later if needed, but the logic inside the map in edit mode is complex to copy-paste.
                                                        // Ideally I should have a shared print function.
                                                        // Let's just put a placeholder alert or copy the logic if it fits.
                                                        // The user asked for "action buttons", maybe this is enough for now.
                                                        // Actually I should copy the logic since I am here.
                                                        win.document.write(`
                                                            <html>
                                                              <head>
                                                                <title>Invoice - ${phase.name}</title>
                                                                <style>
                                                                  body { font-family: system-ui, sans-serif; padding: 40px; }
                                                                  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
                                                                  .title { font-size: 24px; font-weight: bold; }
                                                                  .meta { margin-top: 20px; }
                                                                  .table { width: 100%; border-collapse: collapse; margin-top: 40px; }
                                                                  .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                                                                  .total { margin-top: 20px; text-align: right; font-size: 18px; font-weight: bold; }
                                                                </style>
                                                              </head>
                                                              <body>
                                                                <div class="header">
                                                                  <div>
                                                                    <div class="title">INVOICE</div>
                                                                    <div class="meta">
                                                                      <strong>To:</strong><br/>
                                                                      ${client.companyName || client.name || "Client Name"}<br/>
                                                                      ${client.email || ""}
                                                                    </div>
                                                                  </div>
                                                                  <div style="text-align: right;">
                                                                    <strong>Date:</strong> ${new Date().toLocaleDateString()}<br/>
                                                                    <strong>Proposal:</strong> ${formData.title}
                                                                  </div>
                                                                </div>
                                                                
                                                                <h3>Phase: ${phase.name}</h3>
                                                                <p>${phase.details || ""}</p>
                                                                
                                                                <table class="table">
                                                                  <thead>
                                                                    <tr>
                                                                      <th>Description</th>
                                                                      <th>Duration</th>
                                                                      <th>Amount</th>
                                                                    </tr>
                                                                  </thead>
                                                                  <tbody>
                                                                    <tr>
                                                                      <td>${phase.name}</td>
                                                                      <td>${phase.duration}</td>
                                                                      <td>${formData.currency} ${Number(phase.amount).toLocaleString()}</td>
                                                                    </tr>
                                                                  </tbody>
                                                                </table>
                                                                
                                                                <div class="total">
                                                                  Total: ${formData.currency} ${Number(phase.amount).toLocaleString()}
                                                                </div>
                                                                
                                                                <script>
                                                                  window.onload = function() { window.print(); }
                                                                </script>
                                                              </body>
                                                            </html>
                                                        `);
                                                        win.document.close();
                                                    }}
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-right font-bold text-lg">Total</TableCell>
                                        <TableCell className="text-right font-bold text-lg">{formData.currency} {totalAmount.toLocaleString()}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {/* Terms */}
                        {formData.terms && (
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Terms & Conditions</h3>
                                <p className="text-gray-600 whitespace-pre-wrap text-sm border p-4 rounded-lg bg-gray-50">
                                    {formData.terms}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Form (Edit Mode) */}
            {isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Details */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="space-y-2">
                            <Label>Proposal Title</Label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Website Redesign Proposal"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Introduction / Scope</Label>
                            <div className="border rounded-md min-h-[200px] p-2">
                                {/* Simplified Rich Text or Textarea */}
                                <RichTextEditor
                                    value={formData.content}
                                    onChange={(content) => setFormData({ ...formData, content })}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-lg font-semibold">Phases & Pricing</Label>
                                <Button variant="outline" size="sm" onClick={addPhase}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Phase
                                </Button>
                            </div>

                            {formData.phases.map((phase, index) => (
                                <div key={index} className="border p-4 rounded-lg space-y-4 relative bg-gray-50/50">
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Print Invoice for this Phase"
                                            onClick={() => {
                                                const client = clients.find(c => c.id === formData.client) || {};
                                                const win = window.open("", "_blank");
                                                if (!win) return;
                                                win.document.write(`
                                                <html>
                                                  <head>
                                                    <title>Invoice - ${phase.name}</title>
                                                    <style>
                                                      body { font-family: system-ui, sans-serif; padding: 40px; }
                                                      .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
                                                      .title { font-size: 24px; font-weight: bold; }
                                                      .meta { margin-top: 20px; }
                                                      .table { width: 100%; border-collapse: collapse; margin-top: 40px; }
                                                      .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                                                      .total { margin-top: 20px; text-align: right; font-size: 18px; font-weight: bold; }
                                                    </style>
                                                  </head>
                                                  <body>
                                                    <div class="header">
                                                      <div>
                                                        <div class="title">INVOICE</div>
                                                        <div class="meta">
                                                          <strong>To:</strong><br/>
                                                          ${client.companyName || client.name || "Client Name"}<br/>
                                                          ${client.email || ""}
                                                        </div>
                                                      </div>
                                                      <div style="text-align: right;">
                                                        <strong>Date:</strong> ${new Date().toLocaleDateString()}<br/>
                                                        <strong>Proposal:</strong> ${formData.title}
                                                      </div>
                                                    </div>
                                                    
                                                    <h3>Phase: ${phase.name}</h3>
                                                    <p>${phase.details || ""}</p>
                                                    
                                                    <table class="table">
                                                      <thead>
                                                        <tr>
                                                          <th>Description</th>
                                                          <th>Duration</th>
                                                          <th>Amount</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody>
                                                        <tr>
                                                          <td>${phase.name}</td>
                                                          <td>${phase.duration}</td>
                                                          <td>${formData.currency} ${Number(phase.amount).toLocaleString()}</td>
                                                        </tr>
                                                      </tbody>
                                                    </table>
                                                    
                                                    <div class="total">
                                                      Total: ${formData.currency} ${Number(phase.amount).toLocaleString()}
                                                    </div>
                                                    
                                                    <script>
                                                      window.onload = function() { window.print(); }
                                                    </script>
                                                  </body>
                                                </html>
                                            `);
                                                win.document.close();
                                            }}
                                        >
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => removePhase(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Phase Name</Label>
                                            <Input
                                                value={phase.name}
                                                onChange={e => updatePhase(index, "name", e.target.value)}
                                                placeholder="e.g., Discovery"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Duration</Label>
                                            <Input
                                                value={phase.duration}
                                                onChange={e => updatePhase(index, "duration", e.target.value)}
                                                placeholder="e.g., 2 weeks"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Details/Deliverables</Label>
                                        <Textarea
                                            value={phase.details}
                                            onChange={e => updatePhase(index, "details", e.target.value)}
                                            placeholder="List deliverables..."
                                            className="h-20"
                                        />
                                    </div>
                                    <div className="flex justify-end items-center gap-2">
                                        <Label>Amount ({formData.currency})</Label>
                                        <Input
                                            type="number"
                                            className="w-32"
                                            value={phase.amount}
                                            onChange={e => updatePhase(index, "amount", e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className="flex justify-end text-xl font-bold p-4 bg-gray-100 rounded-lg">
                                Total: {formData.currency} {totalAmount.toLocaleString()}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Terms & Conditions</Label>
                                <Button variant="outline" size="sm" asChild>
                                    <a href="/dashboard/finance/proposals/settings" target="_blank" rel="noreferrer">
                                        <Settings className="mr-2 h-3.5 w-3.5" />
                                        Proposal Settings
                                    </a>
                                </Button>
                            </div>
                            <Textarea
                                value={formData.terms}
                                onChange={e => setFormData({ ...formData, terms: e.target.value })}
                                className="h-32"
                                placeholder="Payment terms, validity, etc."
                            />
                        </div>
                    </div>

                    {/* Right Column: Meta */}
                    <div className="space-y-6">
                        <div className="p-4 border rounded-lg space-y-4 bg-white">
                            <h3 className="font-semibold">Settings</h3>

                            <div className="space-y-2">
                                <Label>Client</Label>
                                <Select
                                    value={typeof formData.client === 'string' ? formData.client : (formData.client as any)._id}
                                    onValueChange={v => setFormData({ ...formData, client: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.companyName || c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={v => setFormData({ ...formData, status: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="sent">Sent</SelectItem>
                                        <SelectItem value="accepted">Accepted</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 flex flex-col">
                                <Label>Valid Until</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !formData.validUntil && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.validUntil ? format(formData.validUntil, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={formData.validUntil}
                                            onSelect={d => setFormData({ ...formData, validUntil: d })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <Select
                                    value={formData.currency}
                                    onValueChange={v => setFormData({ ...formData, currency: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INR">INR (₹)</SelectItem>
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                        <SelectItem value="EUR">EUR (€)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={!!statusTarget}
                onOpenChange={(open) => { if (!open) setStatusTarget(null); }}
                title="Update Proposal Status?"
                description={`Are you sure you want to mark this proposal as ${statusTarget}?`}
                confirmLabel="Update Status"
                onConfirm={executeUpdateStatus}
                variant="default"
            />

            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Delete Proposal"
                description="Are you sure you want to delete this proposal? This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={handleDelete}
                variant="destructive"
            />

            <ConfirmDialog
                open={convertDialogOpen}
                onOpenChange={setConvertDialogOpen}
                title="Convert to Project"
                description="Create a new project and payment plan from this proposal?"
                confirmLabel="Convert"
                onConfirm={handleConvert}
                variant="default"
            />
        </div>
    );
}
