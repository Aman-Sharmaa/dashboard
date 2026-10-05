import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDriveQuota extends Document {
  user: mongoose.Types.ObjectId;
  maxBytes: number;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const DriveQuotaSchema: Schema<IDriveQuota> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    maxBytes: { type: Number, required: true, default: 2 * 1024 * 1024 * 1024 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const DriveQuota: Model<IDriveQuota> =
  mongoose.models.DriveQuota || mongoose.model<IDriveQuota>("DriveQuota", DriveQuotaSchema);
