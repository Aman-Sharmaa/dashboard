import mongoose, { Schema, Document } from "mongoose";

export interface IAutoDMSettings extends Document {
  owner: mongoose.Types.ObjectId;
  metaAppId?: string;
  metaAppSecretEncrypted?: string;
  metaSystemUserTokenEncrypted?: string;
  metaWebhookVerifyTokenEncrypted?: string;
  lastConnectionStatus?: "connected" | "invalid" | "expired" | "missing_permissions" | "webhook_unconfigured";
  lastCheckedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AutoDMSettingsSchema: Schema<IAutoDMSettings> = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    metaAppId: String,
    metaAppSecretEncrypted: String,
    metaSystemUserTokenEncrypted: String,
    metaWebhookVerifyTokenEncrypted: String,
    lastConnectionStatus: {
      type: String,
      enum: ["connected", "invalid", "expired", "missing_permissions", "webhook_unconfigured"],
    },
    lastCheckedAt: Date,
  },
  { timestamps: true }
);

export const AutoDMSettings = mongoose.models.AutoDMSettings || mongoose.model<IAutoDMSettings>("AutoDMSettings", AutoDMSettingsSchema);
