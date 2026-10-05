import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEnvHistory extends Document {
  project: mongoose.Types.ObjectId;
  content: string;
  changedBy: string;
  createdAt: Date;
}

const EnvHistorySchema: Schema<IEnvHistory> = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "DeployProject", required: true },
    content: { type: String, default: "" },
    changedBy: { type: String, required: true },
  },
  { timestamps: true }
);

EnvHistorySchema.index({ project: 1, createdAt: -1 });

export const EnvHistory: Model<IEnvHistory> =
  mongoose.models.EnvHistory ||
  mongoose.model<IEnvHistory>("EnvHistory", EnvHistorySchema);
