import mongoose, { Schema, Document } from "mongoose";

export interface IAutoDMAutomation extends Document {
  owner: mongoose.Types.ObjectId;
  instagramAccountId: mongoose.Types.ObjectId;
  name: string;
  triggerType: "post" | "dm" | "story" | "live" | "share_post";
  mediaType: "specific" | "any" | "next";
  mediaId?: string;
  mediaUrl?: string;
  commentMode: "any" | "keyword";
  includedKeywords?: string[];
  excludedKeywords?: string[];
  delayMinutes?: number;
  publicReplyEnabled: boolean;
  publicReplies?: string[];
  followGateEnabled: boolean;
  followOpeningMessage?: string;
  mainMessage: string;
  buttons?: Array<{ text: string; url: string }>;
  status: "active" | "paused" | "stopped";
  createdAt: Date;
  updatedAt: Date;
}

const AutoDMAutomationSchema: Schema<IAutoDMAutomation> = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    instagramAccountId: { type: Schema.Types.ObjectId, ref: "InstagramAccount", required: true },
    name: { type: String, required: true },
    triggerType: { type: String, enum: ["post", "dm", "story", "live", "share_post"], required: true },
    mediaType: { type: String, enum: ["specific", "any", "next"], required: true },
    mediaId: String,
    mediaUrl: String,
    commentMode: { type: String, enum: ["any", "keyword"], required: true },
    includedKeywords: [String],
    excludedKeywords: [String],
    delayMinutes: { type: Number, default: 0 },
    publicReplyEnabled: { type: Boolean, default: false },
    publicReplies: [String],
    followGateEnabled: { type: Boolean, default: false },
    followOpeningMessage: String,
    mainMessage: { type: String, required: true },
    buttons: [{ text: String, url: String }],
    status: { type: String, enum: ["active", "paused", "stopped"], default: "active" },
  },
  { timestamps: true }
);

export const AutoDMAutomation = mongoose.models.AutoDMAutomation || mongoose.model<IAutoDMAutomation>("AutoDMAutomation", AutoDMAutomationSchema);
