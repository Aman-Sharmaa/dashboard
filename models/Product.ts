import mongoose, { Schema, Document, Model } from "mongoose";

export type ProductKind = "product" | "service";

export interface IProduct extends Document {
  name: string;
  slug: string;
  kind: ProductKind;
  description?: string;
  isActive: boolean;
  externalRevenueApiUrl?: string;
  externalRevenueJwtToken?: string;
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    kind: { type: String, enum: ["product", "service"], required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    externalRevenueApiUrl: { type: String },
    externalRevenueJwtToken: { type: String },
  },
  { timestamps: true }
);

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

