import mongoose, { Schema, Document, Model } from "mongoose";

export type DriveItemType = "folder" | "file";
export type DriveVisibility = "private" | "public" | "specific";

export interface IDriveItem extends Document {
  owner: mongoose.Types.ObjectId;
  name: string;
  type: DriveItemType;
  parentId?: mongoose.Types.ObjectId | null;
  visibility: DriveVisibility;
  sharedWith: mongoose.Types.ObjectId[];
  pendingEmails?: string[];
  approvedEmails?: string[];
  accessRequests?: {
    name: string;
    email: string;
    status: "pending" | "approved" | "rejected";
    requestedAt: Date;
  }[];
  mimeType?: string;

  sizeInBytes: number;
  fileUrl?: string;
  fileKey?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const DriveItemSchema: Schema<IDriveItem> = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["folder", "file"], required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: "DriveItem", default: null, index: true },
    visibility: {
      type: String,
      enum: ["private", "public", "specific"],
      default: "private",
      index: true,
    },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: "User" }],
    pendingEmails: [{ type: String }],
    approvedEmails: [{ type: String }],
    accessRequests: [
      {
        name: { type: String, required: true },
        email: { type: String, required: true, lowercase: true },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        requestedAt: { type: Date, default: Date.now },
      },
    ],
    mimeType: { type: String },

    sizeInBytes: { type: Number, default: 0 },
    fileUrl: { type: String },
    fileKey: { type: String },
  },
  { timestamps: true }
);

DriveItemSchema.index({ owner: 1, parentId: 1, type: 1 });
DriveItemSchema.index({ owner: 1, name: 1, parentId: 1 }, { unique: false });
DriveItemSchema.index({ sharedWith: 1 });

export const DriveItem: Model<IDriveItem> =
  mongoose.models.DriveItem || mongoose.model<IDriveItem>("DriveItem", DriveItemSchema);
