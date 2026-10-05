import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISocialGroup extends Document {
  name: string;
  description?: string;
  color?: string;
  owner: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const SocialGroupSchema: Schema<ISocialGroup> = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    color: { type: String, default: "" },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

SocialGroupSchema.index({ owner: 1 });
SocialGroupSchema.index({ name: 1, owner: 1 }, { unique: true });

export const SocialGroup: Model<ISocialGroup> =
  mongoose.models.SocialGroup ||
  mongoose.model<ISocialGroup>("SocialGroup", SocialGroupSchema);
