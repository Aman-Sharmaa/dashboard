import mongoose, { Schema, Document, Model } from "mongoose";

export type MetricDirection = "higher_is_better" | "lower_is_better";
export type MetricDataSource = "manual" | "auto_crm" | "auto_task" | "auto_delivery" | "auto_catalog";

export interface IGoalMetric extends Document {
  goalId: mongoose.Types.ObjectId;
  metricName: string;
  /** Numeric target value */
  target: number;
  /** e.g. "onboardings", "%", "min", "calls" */
  unit?: string;
  /** Weight 0–100; all metrics in a goal should sum to 100 */
  weight: number;
  direction: MetricDirection;
  dataSource: MetricDataSource;
  /** Display order within the goal */
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const GoalMetricSchema: Schema<IGoalMetric> = new Schema(
  {
    goalId: { type: Schema.Types.ObjectId, ref: "GoalTemplate", required: true, index: true },
    metricName: { type: String, required: true },
    target: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "" },
    weight: { type: Number, default: 0, min: 0, max: 100 },
    direction: {
      type: String,
      enum: ["higher_is_better", "lower_is_better"],
      default: "higher_is_better",
    },
    dataSource: {
      type: String,
      enum: ["manual", "auto_crm", "auto_task", "auto_delivery", "auto_catalog"],
      default: "manual",
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

GoalMetricSchema.index({ goalId: 1, order: 1 });

export const GoalMetric: Model<IGoalMetric> =
  mongoose.models.GoalMetric ||
  mongoose.model<IGoalMetric>("GoalMetric", GoalMetricSchema);
