import mongoose, { Schema, Document } from "mongoose";

export interface IAutoDMRun extends Document {
  owner: mongoose.Types.ObjectId;
  automationId: mongoose.Types.ObjectId;
  instagramAccountId: mongoose.Types.ObjectId;
  commentId?: string;
  instagramUserId: string;
  username: string;
  triggerText?: string;
  followRequired: boolean;
  followVerified: boolean;
  publicReplyStatus: "pending" | "sent" | "failed" | "skipped";
  dmStatus: "pending" | "sent" | "failed" | "skipped";
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

const AutoDMRunSchema: Schema<IAutoDMRun> = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    automationId: { type: Schema.Types.ObjectId, ref: "AutoDMAutomation", required: true, index: true },
    instagramAccountId: { type: Schema.Types.ObjectId, ref: "InstagramAccount", required: true },
    commentId: String,
    instagramUserId: { type: String, required: true },
    username: String,
    triggerText: String,
    followRequired: { type: Boolean, default: false },
    followVerified: { type: Boolean, default: false },
    publicReplyStatus: { type: String, enum: ["pending", "sent", "failed", "skipped"], default: "pending" },
    dmStatus: { type: String, enum: ["pending", "sent", "failed", "skipped"], default: "pending" },
    errorCode: String,
    errorMessage: String,
    completedAt: Date,
  },
  { timestamps: true }
);

export const AutoDMRun = mongoose.models.AutoDMRun || mongoose.model<IAutoDMRun>("AutoDMRun", AutoDMRunSchema);
