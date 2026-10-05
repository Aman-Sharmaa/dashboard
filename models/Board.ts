import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBoard extends Document {
  name: string;
  type: string; // e.g. "QA", "Production", "Development"
  order: number;
  isTaskManager: boolean;
  labels: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const BoardSchema: Schema<IBoard> = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true, default: "General" },
    order: { type: Number, default: 0 },
    isTaskManager: { type: Boolean, default: true },
    labels: [{ type: String }],
  },
  { timestamps: true }
);

BoardSchema.index({ order: 1 });

export const Board: Model<IBoard> =
  mongoose.models.Board || mongoose.model<IBoard>("Board", BoardSchema);
