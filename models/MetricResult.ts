import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMetricResult extends Document {
  goalInstanceId: mongoose.Types.ObjectId;
  metricId: mongoose.Types.ObjectId;
  /** Copied from GoalMetric at instance creation for immutability */
  target: number;
  /** Current actual value */
  actual: number;
  /** achievement = (actual / target) * 100, adjusted for direction */
  achievement: number;
  source: "manual" | "auto_crm" | "auto_task" | "auto_delivery" | "auto_catalog";
  auditLog: {
    value: number;
    source: string;
    updatedAt: Date;
    updatedBy: string;
  }[];
  updatedAt?: Date;
  createdAt?: Date;
}

const AuditLogEntrySchema = new Schema(
  {
    value: { type: Number, required: true },
    source: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String, required: true },
  },
  { _id: false }
);

const MetricResultSchema: Schema<IMetricResult> = new Schema(
  {
    goalInstanceId: {
      type: Schema.Types.ObjectId,
      ref: "GoalInstance",
      required: true,
      index: true,
    },
    metricId: {
      type: Schema.Types.ObjectId,
      ref: "GoalMetric",
      required: true,
    },
    target: { type: Number, required: true },
    actual: { type: Number, default: 0 },
    achievement: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ["manual", "auto_crm", "auto_task", "auto_delivery", "auto_catalog"],
      default: "manual",
    },
    auditLog: { type: [AuditLogEntrySchema], default: [] },
  },
  { timestamps: true }
);

MetricResultSchema.index({ goalInstanceId: 1, metricId: 1 }, { unique: true });

export const MetricResult: Model<IMetricResult> =
  mongoose.models.MetricResult ||
  mongoose.model<IMetricResult>("MetricResult", MetricResultSchema);
