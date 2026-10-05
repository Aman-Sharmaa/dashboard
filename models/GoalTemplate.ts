import mongoose, { Schema, Document, Model } from "mongoose";

export type GoalWorkType = "goal" | "routine" | "milestone";
export type GoalFrequency = "daily" | "weekly" | "monthly" | "custom";
export type GoalStatus = "active" | "paused" | "archived";

export interface IGoalTemplate extends Document {
  /** Admin user id (organization root) */
  organizationId: mongoose.Types.ObjectId;
  /** e.g. "gram", "kalp" — optional business context */
  businessId?: string;
  /** Team / department name */
  teamId?: string;
  /** Primary Employee who owns this goal (kept for backward compat) */
  ownerId: mongoose.Types.ObjectId;
  /** Multiple assigned employees */
  ownerIds?: mongoose.Types.ObjectId[];
  /** Reporting manager */
  managerId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  workType: GoalWorkType;
  frequency: GoalFrequency;
  /** Days of week when this goal is active: 0=Sun, 1=Mon, … 6=Sat */
  workingDays: number[];
  startDate: Date;
  endDate?: Date;
  noEndDate: boolean;
  status: GoalStatus;
  createdBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const GoalTemplateSchema: Schema<IGoalTemplate> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    businessId: { type: String, default: null },
    teamId: { type: String, default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    ownerIds: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    managerId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    workType: {
      type: String,
      enum: ["goal", "routine", "milestone"],
      default: "goal",
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "custom"],
      default: "daily",
    },
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // Mon–Fri
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    noEndDate: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["active", "paused", "archived"],
      default: "active",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

GoalTemplateSchema.index({ organizationId: 1, status: 1 });
GoalTemplateSchema.index({ ownerId: 1, status: 1 });

export const GoalTemplate: Model<IGoalTemplate> =
  mongoose.models.GoalTemplate ||
  mongoose.model<IGoalTemplate>("GoalTemplate", GoalTemplateSchema);
