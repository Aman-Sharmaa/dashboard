import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDeploymentLog extends Document {
  project: mongoose.Types.ObjectId;
  action: "deploy" | "redeploy" | "restart" | "stop" | "rollback" | "config";
  status: "running" | "success" | "failed";
  logs: string;
  commit?: string;
  branch?: string;
  triggeredBy?: string;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

const DeploymentLogSchema: Schema<IDeploymentLog> = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "DeployProject", required: true },
    action: {
      type: String,
      enum: ["deploy", "redeploy", "restart", "stop", "rollback", "config"],
      required: true,
    },
    status: {
      type: String,
      enum: ["running", "success", "failed"],
      default: "running",
    },
    logs: { type: String, default: "" },
    commit: String,
    branch: String,
    triggeredBy: String,
    duration: Number,
  },
  { timestamps: true }
);

DeploymentLogSchema.index({ project: 1, createdAt: -1 });
DeploymentLogSchema.index({ status: 1 });

export const DeploymentLog: Model<IDeploymentLog> =
  mongoose.models.DeploymentLog ||
  mongoose.model<IDeploymentLog>("DeploymentLog", DeploymentLogSchema);
