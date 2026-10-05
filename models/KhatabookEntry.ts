import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKhatabookEntry extends Document {
  date: Date;
  revenue: number;
  expense: number;
  merchantAmount: number;
  expenseType?: string;
  notes?: string;
  imageUrl?: string;
  area?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const KhatabookEntrySchema: Schema<IKhatabookEntry> = new Schema(
  {
    date: { type: Date, required: true },
    revenue: { type: Number, default: 0, min: 0 },
    expense: { type: Number, default: 0, min: 0 },
    merchantAmount: { type: Number, default: 0, min: 0 },
    expenseType: { type: String, trim: true },
    notes: { type: String, trim: true },
    imageUrl: { type: String },
    area: { type: Schema.Types.ObjectId, ref: "KhatabookArea" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

KhatabookEntrySchema.index({ date: -1 });
KhatabookEntrySchema.index({ createdBy: 1, date: -1 });

export const KhatabookEntry: Model<IKhatabookEntry> =
  mongoose.models.KhatabookEntry ||
  mongoose.model<IKhatabookEntry>("KhatabookEntry", KhatabookEntrySchema);
