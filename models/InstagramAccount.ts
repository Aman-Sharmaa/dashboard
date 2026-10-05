import mongoose, { Schema, Document } from "mongoose";

export interface IInstagramAccount extends Document {
  owner: mongoose.Types.ObjectId;
  instagramUserId: string; // The ID from Meta Graph API
  username: string;
  profilePicture?: string;
  accountType?: string; // e.g. "professional", "creator"
  accessTokenEncrypted: string;  // System User token (for IG read/comment)
  pageId?: string;               // Facebook Page ID linked to this IG account
  pageAccessTokenEncrypted?: string; // Page Access Token (for DM sending via /me/messages)
  tokenExpiresAt?: Date;
  status: "connected" | "disconnected" | "expired";
  connectedAt: Date;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InstagramAccountSchema: Schema<IInstagramAccount> = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    instagramUserId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    profilePicture: String,
    accountType: String,
    accessTokenEncrypted: { type: String, required: true },
    pageId: String,
    pageAccessTokenEncrypted: String,
    tokenExpiresAt: Date,
    status: { type: String, enum: ["connected", "disconnected", "expired"], default: "connected" },
    connectedAt: { type: Date, default: Date.now },
    lastSyncAt: Date,
  },
  { timestamps: true }
);

export const InstagramAccount = mongoose.models.InstagramAccount || mongoose.model<IInstagramAccount>("InstagramAccount", InstagramAccountSchema);
