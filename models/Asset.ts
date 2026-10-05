import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAsset extends Document {
  employee: mongoose.Types.ObjectId;
  assetName: string;
  assetId: string;
  assetCost: number;
  givenDate: Date;
  takenDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const AssetSchema: Schema<IAsset> = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    assetName: { type: String, required: true },
    assetId: { type: String, required: true },
    assetCost: { type: Number, required: true, default: 0 },
    givenDate: { type: Date, required: true },
    takenDate: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

export const Asset: Model<IAsset> =
  mongoose.models.Asset || mongoose.model<IAsset>("Asset", AssetSchema);
