import mongoose, { Schema, Document, Model } from "mongoose";

export type AccessGroupType = "all" | "specific";

export interface IAccessGroup extends Document {
  name: string;
  type: AccessGroupType;
  featureAccess: string[];
  createdBy?: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const AccessGroupSchema: Schema<IAccessGroup> = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    type: { type: String, enum: ["all", "specific"], default: "specific" },
    featureAccess: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const AccessGroup: Model<IAccessGroup> =
  mongoose.models.AccessGroup ||
  mongoose.model<IAccessGroup>("AccessGroup", AccessGroupSchema);
