import mongoose, { Schema, Document, Model } from "mongoose";

export type MonitorType = "http" | "api";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

export interface IMonitor extends Document {
  group: mongoose.Types.ObjectId;
  name: string;
  /** URL to check (website or API endpoint) */
  url: string;
  type: MonitorType;
  /** HTTP method for the check request */
  method: HttpMethod;
  /** Optional request body (for POST, PUT, PATCH) */
  requestBody?: string;
  /** HTTP status codes that count as "up". Empty = 200-299 */
  upStatusCodes: number[];
  /** Check interval in minutes */
  intervalMinutes: number;
  enabled: boolean;
  lastChecked?: Date;
  isUp?: boolean;
  lastStatusCode?: number;
  lastResponseTimeMs?: number;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const MonitorSchema: Schema<IMonitor> = new Schema(
  {
    group: { type: Schema.Types.ObjectId, ref: "MonitorGroup", required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, enum: ["http", "api"], default: "http" },
    method: { type: String, enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"], default: "GET" },
    requestBody: String,
    upStatusCodes: { type: [Number], default: [] },
    intervalMinutes: { type: Number, default: 5 },
    enabled: { type: Boolean, default: true },
    lastChecked: Date,
    isUp: Boolean,
    lastStatusCode: Number,
    lastResponseTimeMs: Number,
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

MonitorSchema.index({ group: 1 });
MonitorSchema.index({ enabled: 1, lastChecked: 1 });

export const Monitor: Model<IMonitor> =
  mongoose.models.Monitor || mongoose.model<IMonitor>("Monitor", MonitorSchema);
