import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExternalRevenue extends Document {
  productId: mongoose.Types.ObjectId;
  amount: number;
  currency?: string;
  date: Date;
  month: number; // 1-12
  year: number;
  source: string; // Name of the external source/backend
  metadata?: Record<string, any>; // Store full API response or additional data
  createdAt?: Date;
  updatedAt?: Date;
}

const ExternalRevenueSchema: Schema<IExternalRevenue> = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    date: { type: Date, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    source: { type: String, required: true }, // e.g., "backend-api", "stripe", "razorpay"
    metadata: { type: Schema.Types.Mixed }, // Store full API response
  },
  { timestamps: true }
);

ExternalRevenueSchema.index({ productId: 1, year: 1, month: 1 });
ExternalRevenueSchema.index({ date: 1 });
ExternalRevenueSchema.index({ source: 1 });

export const ExternalRevenue: Model<IExternalRevenue> =
  mongoose.models.ExternalRevenue ||
  mongoose.model<IExternalRevenue>("ExternalRevenue", ExternalRevenueSchema);
