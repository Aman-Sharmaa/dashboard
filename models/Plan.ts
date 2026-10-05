import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlan extends Document {
  name: string;
  parentId?: mongoose.Types.ObjectId | null;
  visibility: "me" | "org" | "shared" | "public";
  createdBy: mongoose.Types.ObjectId;
  sharedWith?: mongoose.Types.ObjectId[];
  order: number;
  isPinned?: boolean;
  isPinnedToSidebar?: boolean;
  viewedBy?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema: Schema<IPlan> = new Schema(
  {
    name: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Plan", default: null },
    visibility: { type: String, enum: ["me", "org", "shared", "public"], default: "org" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: "User" }],
    order: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    isPinnedToSidebar: { type: Boolean, default: false },
    viewedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

PlanSchema.index({ parentId: 1, order: 1 });

export const Plan: Model<IPlan> =
  mongoose.models.Plan || mongoose.model<IPlan>("Plan", PlanSchema);
