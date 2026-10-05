import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlanPage extends Document {
    planId: mongoose.Types.ObjectId;
    name: string;
    url?: string;
    content?: string;
    visibility: "me" | "org" | "shared" | "public";
    createdBy: mongoose.Types.ObjectId;
    sharedWith?: mongoose.Types.ObjectId[];
    projectId?: mongoose.Types.ObjectId;
    order: number;
    isPinned?: boolean;
    isPinnedToSidebar?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const PlanPageSchema: Schema<IPlanPage> = new Schema(
    {
        planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
        name: { type: String, required: true },
        url: String,
        content: String,
        visibility: { type: String, enum: ["me", "org", "shared", "public"], default: "org" },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        sharedWith: [{ type: Schema.Types.ObjectId, ref: "User" }],
        projectId: { type: Schema.Types.ObjectId, ref: "Project" },
        order: { type: Number, default: 0 },
        isPinned: { type: Boolean, default: false },
        isPinnedToSidebar: { type: Boolean, default: false },
    },
    { timestamps: true }
);

PlanPageSchema.index({ planId: 1, order: 1 });

export const PlanPage: Model<IPlanPage> =
    mongoose.models.PlanPage || mongoose.model<IPlanPage>("PlanPage", PlanPageSchema);
