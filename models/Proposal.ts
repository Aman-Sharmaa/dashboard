import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProposalPhase {
    name: string;
    amount: number;
    details?: string;
    duration?: string; // e.g., "2 weeks"
}

export interface IProposal extends Document {
    title: string;
    client: mongoose.Types.ObjectId; // Link to Client model
    owner: mongoose.Types.ObjectId; // User who created it
    content: string; // Rich text content / JSON
    phases: IProposalPhase[];
    totalAmount: number;
    currency: string;
    status: "draft" | "sent" | "accepted" | "rejected";
    validUntil?: Date;
    terms?: string;
    convertedProjectId?: mongoose.Types.ObjectId; // Track if converted to project
    proposalNumber?: number; // Sequential number for display
    createdAt?: Date;
    updatedAt?: Date;
}

const ProposalSchema: Schema<IProposal> = new Schema(
    {
        title: { type: String, required: true },
        client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, default: "" },
        phases: [
            {
                name: String,
                amount: Number,
                details: String,
                duration: String,
            },
        ],
        totalAmount: { type: Number, default: 0 },
        currency: { type: String, default: "INR" },
        status: {
            type: String,
            enum: ["draft", "sent", "accepted", "rejected"],
            default: "draft",
        },
        validUntil: Date,
        terms: String,
        convertedProjectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
        proposalNumber: { type: Number },
    },
    { timestamps: true }
);

// Auto-increment proposalNumber before saving
ProposalSchema.pre("save", async function () {
    if (this.isNew && !this.proposalNumber) {
        const ProposalModel = this.constructor as Model<IProposal>;
        const lastProposal = await ProposalModel
            .findOne({})
            .sort({ proposalNumber: -1 })
            .select("proposalNumber")
            .lean();
        this.proposalNumber = (lastProposal?.proposalNumber || 0) + 1;
    }
});

export const Proposal: Model<IProposal> =
    mongoose.models.Proposal || mongoose.model<IProposal>("Proposal", ProposalSchema);
