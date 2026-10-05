import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDebt extends Document {
  type: "taken" | "given";
  party: string;          // person/entity name
  amount: number;
  currency: string;
  date: Date;
  dueDate?: Date;
  notes?: string;
  status: "pending" | "settled" | "partial";
  settledAmount?: number;
  owner: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const DebtSchema: Schema<IDebt> = new Schema(
  {
    type: { type: String, enum: ["taken", "given"], required: true },
    party: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    date: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    notes: { type: String },
    status: { type: String, enum: ["pending", "settled", "partial"], default: "pending" },
    settledAmount: { type: Number, default: 0 },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

DebtSchema.index({ owner: 1, status: 1 });
DebtSchema.index({ owner: 1, type: 1 });

export const Debt: Model<IDebt> =
  mongoose.models.Debt || mongoose.model<IDebt>("Debt", DebtSchema);
