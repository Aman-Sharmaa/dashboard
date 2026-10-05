import { ProposalEditor } from "@/components/proposal-editor";

export default async function ProposalEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <ProposalEditor proposalId={id} />;
}
