import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExpense extends Document {
  /** Link to product or service (Product model with kind product/service) */
  product: mongoose.Types.ObjectId;
  type: string;
  amount: number;
  frequency: "monthly" | "yearly" | "custom";
  /** When frequency is "custom", interval in months (e.g. 3 = every 3 months) */
  customMonths?: number;
  remark?: string;
  isPaused: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ExpenseSchema: Schema<IExpense> = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    frequency: {
      type: String,
      enum: ["monthly", "yearly", "custom"],
      default: "monthly",
    },
    customMonths: { type: Number, min: 1 },
    remark: String,
    isPaused: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ExpenseSchema.index({ product: 1 });
ExpenseSchema.index({ isPaused: 1 });

export const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
