import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKhatabookArea extends Document {
  name: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const KhatabookAreaSchema: Schema<IKhatabookArea> = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const KhatabookArea: Model<IKhatabookArea> =
  mongoose.models.KhatabookArea ||
  mongoose.model<IKhatabookArea>("KhatabookArea", KhatabookAreaSchema);
