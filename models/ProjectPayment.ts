import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvoiceDetails {
  invoiceNumber?: string;
  invoiceDate?: Date;
  gstRate?: number; // e.g., 18
  discount?: number; // absolute amount
  roundOff?: number; // +/- amount
  notes?: string;
  billed?: boolean;  // confirmed/saved
}

export interface IPaymentPhase {
  _id?: string; // Mongoose adds this automatically
  name: string;
  percentage: number;
  amount: number;
  remark: string;
  /** Phase-level status: draft | sent | paid | overdue */
  status?: "draft" | "sent" | "paid" | "overdue";
  /** When bill was generated for this phase */
  billGeneratedAt?: Date;
  /** Due date for this phase (for alerts when approaching) */
  dueDate?: Date;
  /** When this phase was marked as paid */
  paidDate?: Date;
  isGstBill?: boolean;
  invoiceDetails?: IInvoiceDetails;
}

export interface IProjectPayment extends Document {
  client: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId | null;
  /** Optional link to Product (product or service) for revenue by product/service */
  product?: mongoose.Types.ObjectId | null;
  totalAmount: number;
  currency: string;
  billingCycle: "one_time" | "monthly" | "yearly" | "phases";
  phases?: IPaymentPhase[];
  monthlyBreakdown?: { month: string; amount: number; dueDate?: Date }[];
  startDate?: Date;
  endDate?: Date;
  /** Overall status (legacy); when using phases, consider derived from phase statuses */
  status: "draft" | "sent" | "paid" | "overdue";
  billGeneratedAt?: Date;
  paidDate?: Date;
  isGstBill?: boolean;
  invoiceDetails?: IInvoiceDetails;
  /** Proforma invoice type for advance payment tracking */
  proformaInvoiceType?: "100_advance" | "50_advance" | "custom" | null;
  /** Linked proforma Invoice document ID */
  proformaInvoiceId?: mongoose.Types.ObjectId | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProjectPaymentSchema: Schema<IProjectPayment> = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    product: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    billingCycle: {
      type: String,
      enum: ["one_time", "monthly", "yearly", "phases"],
      default: "one_time",
    },
    phases: [
      {
        name: String,
        percentage: Number,
        amount: Number,
        remark: String,
        status: { type: String, enum: ["draft", "sent", "paid", "overdue"], default: "draft" },
        billGeneratedAt: Date,
        dueDate: Date,
        paidDate: Date,
        isGstBill: Boolean,
        invoiceDetails: {
          invoiceNumber: String,
          invoiceDate: Date,
          gstRate: Number,
          discount: Number,
          roundOff: Number,
          notes: String,
          billed: Boolean,
        },
      },
    ],
    monthlyBreakdown: [
      {
        month: String,
        amount: Number,
        dueDate: Date,
      },
    ],
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue"],
      default: "draft",
    },
    billGeneratedAt: Date,
    paidDate: Date,
    isGstBill: Boolean,
    invoiceDetails: {
      invoiceNumber: String,
      invoiceDate: Date,
      gstRate: Number,
      discount: Number,
      roundOff: Number,
      notes: String,
      billed: Boolean,
    },
    notes: String,
    proformaInvoiceType: {
      type: String,
      enum: ["100_advance", "50_advance", "custom"],
      default: null,
    },
    proformaInvoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
  },
  { timestamps: true, strictPopulate: false }
);

ProjectPaymentSchema.index({ client: 1 });
ProjectPaymentSchema.index({ project: 1 });

export const ProjectPayment: Model<IProjectPayment> =
  mongoose.models.ProjectPayment ||
  mongoose.model<IProjectPayment>("ProjectPayment", ProjectPaymentSchema);
