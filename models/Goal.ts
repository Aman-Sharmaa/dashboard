import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGoal extends Document {
  year: number;
  business: mongoose.Types.ObjectId;
  targetAmount: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const GoalSchema: Schema<IGoal> = new Schema(
  {
    year: { type: Number, required: true, index: true },
    business: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    targetAmount: { type: Number, required: true, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

GoalSchema.index({ year: 1, business: 1 }, { unique: true });

export const Goal: Model<IGoal> =
  mongoose.models.Goal || mongoose.model<IGoal>("Goal", GoalSchema);
