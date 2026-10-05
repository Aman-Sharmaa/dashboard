import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMonitorGroup extends Document {
  /** Company owner (via CompanyProfile) */
  owner: mongoose.Types.ObjectId;
  /** Project this monitor group is assigned to (optional for backward compat) */
  project?: mongoose.Types.ObjectId;
  name: string;
  /** URL slug for public status page: /status/[slug] */
  slug: string;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const MonitorGroupSchema: Schema<IMonitorGroup> = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    name: { type: String, required: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, strictPopulate: false }
);

MonitorGroupSchema.index({ owner: 1 });
MonitorGroupSchema.index({ owner: 1, slug: 1 }, { unique: true });
MonitorGroupSchema.index({ project: 1 });

export const MonitorGroup: Model<IMonitorGroup> =
  mongoose.models.MonitorGroup ||
  mongoose.model<IMonitorGroup>("MonitorGroup", MonitorGroupSchema);
