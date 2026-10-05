import { InvoiceGenerator } from "@/components/invoice-generator";

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <InvoiceGenerator paymentId={id} />;
}
