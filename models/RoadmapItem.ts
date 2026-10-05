import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoadmapItem extends Document {
  title: string;
  description?: string;
  status: string;  // column key — was enum, now free string to support dynamic columns
  targetDate?: Date | null;
  impactScore?: number | null;
  theme?: string;
  createdBy?: string;   // user ID from JWT
  createdByName?: string; // user name for display
  completed?: boolean;
  completedBy?: string;
  completedByName?: string;
  completedAt?: Date | null;
  projectId?: string | null;
  projectName?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const RoadmapItemSchema: Schema<IRoadmapItem> = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      default: "now",
    },
    targetDate: { type: Date, default: null },
    impactScore: { type: Number, min: 0, max: 100, default: null },
    theme: { type: String, default: "" },
    createdBy: { type: String, default: "" },
    createdByName: { type: String, default: "" },
    completed: { type: Boolean, default: false },
    completedBy: { type: String, default: "" },
    completedByName: { type: String, default: "" },
    completedAt: { type: Date, default: null },
    projectId: { type: String, default: null },
    projectName: { type: String, default: null },
  },
  { timestamps: true }
);

export const RoadmapItem: Model<IRoadmapItem> =
  mongoose.models.RoadmapItem ||
  mongoose.model<IRoadmapItem>("RoadmapItem", RoadmapItemSchema);
