import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayslip extends Document {
  /** Human-readable unique ID, e.g. PSL-2025-02-0001. Never use Mongoose _id in UI or slips. */
  payslipId?: string;
  employee: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number;
  grossSalary: number;
  /** Total reimbursement (sum of reimbursementItems). Kept for backward compat. */
  reimbursement?: number;
  /** Category/type of reimbursement (e.g. Travel, Medical). Legacy single item. */
  reimbursementType?: string;
  /** Short note for reimbursement. Legacy single item. */
  reimbursementNote?: string;
  /** Description/details for reimbursement. Legacy single item. */
  reimbursementDescription?: string;
  /** Multiple reimbursement entries per month (type, amount, note, description). */
  reimbursementItems?: { amount: number; type?: string; note?: string; description?: string }[];
  deductions: {
    tds?: number;
    pf?: number;
    esic?: number;
    professionalTax?: number;
    advanceSalary?: number;
    attendanceDeduction?: number;
    unpaidLeave?: number;
    other?: number;
  };
  netSalary: number;
  isPaid: boolean;
  paidAt?: Date;
  paidBy?: mongoose.Types.ObjectId | null;
  pdfUrl?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PayslipSchema: Schema<IPayslip> = new Schema(
  {
    payslipId: { type: String, unique: true, sparse: true },
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    grossSalary: { type: Number, required: true, default: 0 },
    reimbursement: { type: Number, default: 0 },
    reimbursementType: String,
    reimbursementNote: String,
    reimbursementDescription: String,
    reimbursementItems: [{
      amount: { type: Number, required: true },
      type: String,
      note: String,
      description: String,
    }],
    deductions: {
      tds: Number,
      pf: Number,
      esic: Number,
      professionalTax: Number,
      advanceSalary: Number,
      attendanceDeduction: Number,
      unpaidLeave: Number,
      other: Number,
    },
    netSalary: { type: Number, required: true, default: 0 },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    paidBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    pdfUrl: String,
    notes: String,
  },
  {
    timestamps: true,
  }
);

PayslipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export const Payslip: Model<IPayslip> =
  mongoose.models.Payslip || mongoose.model<IPayslip>("Payslip", PayslipSchema);
