import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReimbursementStash extends Document {
  employee: mongoose.Types.ObjectId;
  month: number;
  year: number;
  items: { amount: number; type?: string; note?: string; description?: string }[];
  createdAt?: Date;
  updatedAt?: Date;
}

const ReimbursementStashSchema: Schema<IReimbursementStash> = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    items: [
      {
        amount: { type: Number, required: true },
        type: String,
        note: String,
        description: String,
      },
    ],
  },
  { timestamps: true }
);

ReimbursementStashSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export const ReimbursementStash: Model<IReimbursementStash> =
  mongoose.models.ReimbursementStash ||
  mongoose.model<IReimbursementStash>("ReimbursementStash", ReimbursementStashSchema);
