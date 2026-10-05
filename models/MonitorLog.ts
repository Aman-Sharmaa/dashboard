import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMonitorLog extends Document {
  monitor: mongoose.Types.ObjectId;
  checkedAt: Date;
  isUp: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
  createdAt?: Date;
}

const MonitorLogSchema: Schema<IMonitorLog> = new Schema(
  {
    monitor: { type: Schema.Types.ObjectId, ref: "Monitor", required: true },
    checkedAt: { type: Date, required: true, default: Date.now },
    isUp: { type: Boolean, required: true },
    statusCode: Number,
    responseTimeMs: Number,
    error: String,
  },
  { timestamps: true }
);

MonitorLogSchema.index({ monitor: 1, checkedAt: -1 });

export const MonitorLog: Model<IMonitorLog> =
  mongoose.models.MonitorLog ||
  mongoose.model<IMonitorLog>("MonitorLog", MonitorLogSchema);
