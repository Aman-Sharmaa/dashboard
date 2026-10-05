import mongoose, { Schema, Document, Model } from "mongoose";

export type SprintStatus = "planned" | "active" | "completed";

export interface ISprint extends Document {
  name: string;
  startDate?: Date | null;
  endDate?: Date | null;
  status: SprintStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const SprintSchema: Schema<ISprint> = new Schema(
  {
    name: { type: String, required: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["planned", "active", "completed"],
      default: "planned",
    },
  },
  { timestamps: true }
);

SprintSchema.index({ status: 1 });

export const Sprint: Model<ISprint> =
  mongoose.models.Sprint || mongoose.model<ISprint>("Sprint", SprintSchema);
