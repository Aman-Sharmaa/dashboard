import { connectDB } from "@/lib/db";
import { Proposal } from "@/models/Proposal";
import { Client } from "@/models/Client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { notFound } from "next/navigation";

// Ensure models are registered
void Client;

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ProposalViewPage(props: Props) {
    const params = await props.params;
    await connectDB();

    const proposal = await Proposal.findById(params.id)
        .populate("client", "name companyName email")
        .populate("owner", "name email")
        .lean();

    if (!proposal) {
        notFound();
    }

    // Type assertion for populated fields since lean() returns plain objects
    const client = proposal.client as any;
    const owner = proposal.owner as any;

    const totalAmount = (proposal.phases || []).reduce(
        (sum: number, p: any) => sum + (Number(p.amount) || 0),
        0
    );

    return (
        <div className="min-h-screen bg-white text-black p-8 md:p-12 max-w-4xl mx-auto print:max-w-none print:p-0">
            <style>{`
        @media print {
          @page { margin: 2cm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

            {/* Invoice-style Header */}
            <div className="border-b pb-8 mb-8 flex flex-col md:flex-row print:flex-row justify-between gap-8">
                <div className="space-y-6 flex-1">
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Prepared For</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {client?.companyName || client?.name || "Client Name"}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            {client?.email || ""}
                        </div>
                    </div>

                    {/* Prepared By Section */}
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Prepared By</div>
                        <div className="text-lg font-medium text-gray-900">
                            {owner?.name || "Webwrite Team"}
                        </div>
                        <div className="text-sm text-gray-500">
                            {owner?.email || ""}
                        </div>
                    </div>
                </div>

                <div className="text-left md:text-right print:text-right space-y-6 flex-shrink-0">
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Status</div>
                        <div className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize tracking-wide border",
                            proposal.status === "accepted" ? "bg-green-100 text-green-700 border-green-200" :
                                proposal.status === "sent" ? "bg-blue-100 text-blue-700 border-blue-200" :
                                    proposal.status === "rejected" ? "bg-red-100 text-red-700 border-red-200" :
                                        "bg-gray-100 text-gray-700 border-gray-200"
                        )}>
                            {proposal.status}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Valid Until</div>
                        <div className="text-lg font-medium text-gray-900">
                            {proposal.validUntil ? format(new Date(proposal.validUntil), "MMM dd, yyyy") : "No Expiry"}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Proposal ID</div>
                        <div className="text-sm font-mono text-gray-500">
                            KALP-{new Date(proposal.createdAt || Date.now()).getFullYear()}-{String(proposal.proposalNumber || 1).padStart(3, '0')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* Intro */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">Introduction & Scope</h3>
                    <div
                        className="prose prose-sm max-w-none text-gray-600"
                        dangerouslySetInnerHTML={{ __html: proposal.content || "" }}
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(proposal.phases || []).map((phase: any, index: number) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium align-top">{phase.name}</TableCell>
                                    <TableCell className="text-gray-600 align-top whitespace-pre-wrap">{phase.details}</TableCell>
                                    <TableCell className="align-top">{phase.duration}</TableCell>
                                    <TableCell className="text-right align-top font-medium">
                                        {proposal.currency || "INR"} {Number(phase.amount).toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold text-lg">Total</TableCell>
                                <TableCell className="text-right font-bold text-lg">
                                    {proposal.currency || "INR"} {totalAmount.toLocaleString()}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>

                {/* Terms */}
                {proposal.terms && (
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Terms & Conditions</h3>
                        <p className="text-gray-600 whitespace-pre-wrap text-sm border p-4 rounded-lg bg-gray-50 print:bg-transparent print:border-gray-200">
                            {proposal.terms}
                        </p>
                    </div>
                )}
            </div>

            {/* Footer / Branding often looks nice at the bottom */}
            <div className="mt-16 pt-8 border-t text-center text-sm text-gray-400 print:mt-8">
                <p>&copy; {new Date().getFullYear()} Webwrite. All rights reserved.</p>
            </div>
        </div>
    );
}
