import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReimbursement extends Document {
  employee: mongoose.Types.ObjectId;
  /** Set when a payslip exists for this employee+month+year; null until then */
  payslip: mongoose.Types.ObjectId | null;
  month: number;
  year: number;
  amount: number;
  type?: string;
  note?: string;
  description?: string;
  /** When employee requests an edit (e.g. wrong amount/month); admin can resolve */
  editRequestedAt?: Date;
  editRequestNote?: string;
  status?: "pending" | "approved" | "rejected";
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId | null;
  rejectedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId | null;
  rejectionReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReimbursementSchema: Schema<IReimbursement> = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    payslip: { type: Schema.Types.ObjectId, ref: "Payslip", default: null },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    type: String,
    note: String,
    description: String,
    editRequestedAt: Date,
    editRequestNote: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    approvedAt: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    rejectedAt: Date,
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: String,
  },
  { timestamps: true }
);

ReimbursementSchema.index({ employee: 1, month: 1, year: 1 });
ReimbursementSchema.index({ payslip: 1 });
ReimbursementSchema.index({ status: 1 });

export const Reimbursement: Model<IReimbursement> =
  mongoose.models.Reimbursement || mongoose.model<IReimbursement>("Reimbursement", ReimbursementSchema);
