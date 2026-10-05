import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDeployGroup extends Document {
  name: string;
  defaultServer?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DeployGroupSchema: Schema<IDeployGroup> = new Schema(
  {
    name: { type: String, required: true },
    defaultServer: { type: Schema.Types.ObjectId, ref: "DeployServer", default: null },
  },
  { timestamps: true }
);

DeployGroupSchema.index({ name: 1 }, { unique: true });

export const DeployGroup: Model<IDeployGroup> =
  mongoose.models.DeployGroup ||
  mongoose.model<IDeployGroup>("DeployGroup", DeployGroupSchema);
