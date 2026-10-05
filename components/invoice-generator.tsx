"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Printer, Save, Download } from "lucide-react";
import { toast } from "sonner";

interface Props {
    paymentId: string;
}

export function InvoiceGenerator({ paymentId }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const phaseIdParam = searchParams?.get("phaseId");

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [selectedPhaseId, setSelectedPhaseId] = useState<string>(phaseIdParam || "main"); // "main" or phase._id

    // Invoice State
    const [invoiceMode, setInvoiceMode] = useState<"view" | "edit">("view");
    const [invoiceDetails, setInvoiceDetails] = useState({
        invoiceNumber: "",
        invoiceDate: new Date().toISOString().split("T")[0],
        gstRate: 0,
        discount: 0,
        roundOff: 0,
        notes: "",
    });

    useEffect(() => {
        fetch(`/api/project-payments/${paymentId}/bill`)
            .then((r) => r.json())
            .then((d) => {
                setData(d);
                // Initialize default invoice details if available
                if (d.payment) {
                    // Determine which to show first
                    const hasPhases = d.payment.phases && d.payment.phases.length > 0;
                    if (hasPhases && selectedPhaseId === "main") {
                        // If there are phases, default to the first phase if not specified? 
                        // Or let user select.
                        // If "main" is selected but it's a phased payment, maybe we should select first phase?
                        // Let's keep "main" as "Total/Main" but usually phased payments bill by phase.
                    }
                }
            })
            .catch((e) => toast.error("Failed to load bill data"))
            .finally(() => setLoading(false));
    }, [paymentId]);

    // When selection changes or data loads, update form
    useEffect(() => {
        if (!data?.payment) return;

        let currentDetails: any = {};

        if (selectedPhaseId === "main") {
            currentDetails = data.payment.invoiceDetails || {};
        } else {
            const phase = data.payment.phases.find((p: any) => p._id === selectedPhaseId);
            currentDetails = phase?.invoiceDetails || {};
        }

        setInvoiceDetails({
            invoiceNumber: currentDetails.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
            invoiceDate: currentDetails.invoiceDate ? new Date(currentDetails.invoiceDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            gstRate: currentDetails.gstRate || 0,
            discount: currentDetails.discount || 0,
            roundOff: currentDetails.roundOff || 0,
            notes: currentDetails.notes || "",
        });

    }, [data, selectedPhaseId]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        toast.info("Please select 'Save as PDF' in the print dialog to download.");
        setTimeout(() => window.print(), 500);
    };

    const handleSave = async () => {
        // API call to save invoice details
        try {
            // We need to update the payment object.
            // Since the API expects the WHOLE object or specific fields, implementing a PATCH might be better
            // but our current PUT/POST is for full object. 
            // Let's create a specific endpoint or use the existing one carefully.
            // Actually, our task list didn't specify a new update API, but let's assume we can update via the standard route or create a specific action.
            // For now, let's just log or mock save.
            // WAIT, I need to implement the save logic.
            // I'll assume we can use the same POST/PUT route if I fetch the full object, modify it, and send it back.
            // OR better, create a specific endpoint for updating invoice details.

            // Let's use a specific endpoint `api/project-payments/[id]/bill` with POST/PUT method to update invoice details only.
            const res = await fetch(`/api/project-payments/${paymentId}/bill`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phaseId: selectedPhaseId === "main" ? null : selectedPhaseId,
                    invoiceDetails,
                }),
            });

            if (!res.ok) throw new Error("Failed to save");

            toast.success("Invoice saved");
            setInvoiceMode("view");
            // reload data
            const d = await res.json();
            setData((prev: any) => ({ ...prev, payment: d.payment }));

        } catch (err) {
            toast.error("Failed to save invoice");
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    if (!data?.payment) return <div className="p-10">Payment not found</div>;

    const { payment, client, companyProfile } = data;
    const isPhased = payment.phases && payment.phases.length > 0;

    // Determine current item to bill
    let currentItem = payment;
    let description = `Project Payment: ${payment.project?.name || "Payment"}`;
    let amount = payment.totalAmount;

    if (selectedPhaseId !== "main") {
        const phase = payment.phases.find((p: any) => p._id === selectedPhaseId);
        if (phase) {
            currentItem = phase;
            description = `Phase: ${phase.name}`;
            amount = phase.amount;
        }
    }

    // Calculations
    const baseAmount = amount;
    const discount = Number(invoiceDetails.discount) || 0;
    const taxableAmount = baseAmount - discount;
    const gstRate = Number(invoiceDetails.gstRate) || 0;
    const gstAmount = (taxableAmount * gstRate) / 100;
    const roundOff = Number(invoiceDetails.roundOff) || 0;
    const totalAmount = taxableAmount + gstAmount + roundOff;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
            {/* Header Actions */}
            <div className="flex justify-between items-center print:hidden">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="flex gap-2">
                    {isPhased && (
                        <Select value={selectedPhaseId} onValueChange={setSelectedPhaseId}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="main">Full Project (Total)</SelectItem>
                                {payment.phases.map((p: any) => (
                                    <SelectItem key={p._id} value={p._id}>{p.name} - {payment.currency} {p.amount}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Button variant="outline" onClick={() => setInvoiceMode(invoiceMode === "view" ? "edit" : "view")}>
                        {invoiceMode === "view" ? "Edit Invoice" : "View Invoice"}
                    </Button>
                    <Button variant="outline" onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    {invoiceMode === "edit" && (
                        <Button onClick={handleSave}>
                            <Save className="mr-2 h-4 w-4" /> Save
                        </Button>
                    )}
                </div>
            </div>

            {/* Edit Form */}
            {invoiceMode === "edit" && (
                <Card className="print:hidden">
                    <CardHeader>
                        <CardTitle>Invoice Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Invoice Number</Label>
                            <Input value={invoiceDetails.invoiceNumber} onChange={(e) => setInvoiceDetails({ ...invoiceDetails, invoiceNumber: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Invoice Date</Label>
                            <Input type="date" value={invoiceDetails.invoiceDate} onChange={(e) => setInvoiceDetails({ ...invoiceDetails, invoiceDate: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>GST Rate (%)</Label>
                            <Input type="number" value={invoiceDetails.gstRate} onChange={(e) => setInvoiceDetails({ ...invoiceDetails, gstRate: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Discount</Label>
                            <Input type="number" value={invoiceDetails.discount} onChange={(e) => setInvoiceDetails({ ...invoiceDetails, discount: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Round Off</Label>
                            <Input type="number" value={invoiceDetails.roundOff} onChange={(e) => setInvoiceDetails({ ...invoiceDetails, roundOff: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label>Notes</Label>
                            <Textarea value={invoiceDetails.notes} onChange={(e) => setInvoiceDetails({ ...invoiceDetails, notes: e.target.value })} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Invoice View (Printable) */}
            <div className="bg-white border text-black p-8 md:p-12 shadow-sm print:shadow-none print:border-none min-h-[800px] flex flex-col relative overflow-hidden">
                {/* Design Elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-purple-600 print:hidden"></div>

                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                    <div>
                        {companyProfile?.logoUrl ? (
                            <img src={companyProfile.logoUrl} alt="Logo" className="h-16 w-auto object-contain mb-4" />
                        ) : (
                            <h1 className="text-3xl font-bold text-primary mb-2">{companyProfile?.companyName || "Company Name"}</h1>
                        )}
                        <div className="text-sm text-gray-500 space-y-1">
                            <p>{companyProfile?.companyDetails?.address}</p>
                            <p>{companyProfile?.companyDetails?.city}, {companyProfile?.companyDetails?.state} {companyProfile?.companyDetails?.zip}</p>
                            <p>{companyProfile?.companyDetails?.country}</p>
                            {companyProfile?.taxDetails?.gstNumber && <p>GSTIN: {companyProfile.taxDetails.gstNumber}</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-light text-gray-800 mb-2">INVOICE</h2>
                        <div className="text-sm text-gray-500 space-y-1">
                            <p><strong>Invoice No:</strong> {invoiceDetails.invoiceNumber || "DRAFT"}</p>
                            <p><strong>Date:</strong> {new Date(invoiceDetails.invoiceDate).toLocaleDateString()}</p>
                            {/* <p><strong>Due Date:</strong> {currentItem.dueDate ? new Date(currentItem.dueDate).toLocaleDateString() : "Immediate"}</p> */}
                        </div>
                    </div>
                </div>

                {/* Bill To */}
                <div className="mb-12">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Bill To</h3>
                    <div className="text-gray-800">
                        <p className="font-bold text-lg">{client?.companyName || client?.name}</p>
                        <p>{client?.companyAddress}</p>
                        <p>{client?.name}</p>
                        <p>{client?.email}</p>
                        {client?.gstin && <p>GSTIN: {client.gstin}</p>}
                    </div>
                </div>

                {/* Line Items */}
                <div className="mb-8">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-100">
                                <th className="py-3 text-sm font-semibold text-gray-500">Description</th>
                                <th className="py-3 text-sm font-semibold text-gray-500 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-50">
                                <td className="py-4 text-gray-800">
                                    <p className="font-medium">{description}</p>
                                </td>
                                <td className="py-4 text-right font-medium text-gray-800">
                                    {payment.currency} {baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span>{payment.currency} {baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Discount</span>
                                <span>- {payment.currency} {discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Taxable Amount</span>
                            <span>{payment.currency} {taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {gstRate > 0 && (
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>GST ({gstRate}%)</span>
                                <span>{payment.currency} {gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        {roundOff !== 0 && (
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Round Off</span>
                                <span>{payment.currency} {roundOff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2 mt-2">
                            <span>Total</span>
                            <span>{payment.currency} {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* Notes & Bank Details */}
                <div className="grid grid-cols-2 gap-8 mt-auto pt-8 border-t border-gray-100">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Notes</h3>
                        <p className="text-sm text-gray-500 whitespace-pre-line">{invoiceDetails.notes || payment.notes || "Thank you for your business!"}</p>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Bank Details</h3>
                        <div className="text-sm text-gray-500 space-y-1">
                            <p>Bank: {companyProfile?.bankDetails?.accountHolderName}</p>
                            <p>Account No: {companyProfile?.bankDetails?.accountNumber}</p>
                            <p>IFSC: {companyProfile?.bankDetails?.ifscCode}</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-xs text-gray-400 print:mt-4">
                    <p>This is a computer-generated invoice.</p>
                </div>

            </div>
        </div>
    );
}
