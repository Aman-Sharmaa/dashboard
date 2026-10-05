import mongoose, { Schema, Document, Model } from "mongoose";

export type GoalInstanceStatus = "pending" | "in_progress" | "completed" | "missed";

export interface IGoalInstance extends Document {
  goalId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  /** Computed weighted score 0–100+ */
  overallScore?: number;
  /** Expected progress % based on time of day */
  expectedProgress?: number;
  status: GoalInstanceStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const GoalInstanceSchema: Schema<IGoalInstance> = new Schema(
  {
    goalId: { type: Schema.Types.ObjectId, ref: "GoalTemplate", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    overallScore: { type: Number, default: null },
    expectedProgress: { type: Number, default: null },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "missed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Unique: one instance per goal per period per owner
GoalInstanceSchema.index({ goalId: 1, ownerId: 1, periodStart: 1 }, { unique: true });
GoalInstanceSchema.index({ ownerId: 1, periodStart: 1 });
GoalInstanceSchema.index({ periodStart: 1 });

export const GoalInstance: Model<IGoalInstance> =
  mongoose.models.GoalInstance ||
  mongoose.model<IGoalInstance>("GoalInstance", GoalInstanceSchema);
