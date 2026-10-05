import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvoiceLineItem {
  description: string;
  hsn?: string;
  rate?: number;
  quantity?: number;
  amount: number;
}

export interface IInvoiceSender {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  pan?: string;
  gstNumber?: string;
  location?: string;
}

export interface IInvoiceRecipient {
  name: string;
  companyName?: string;
  address?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
}

export interface IInvoiceBankDetails {
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  bankAddress?: string;
  ifscCode?: string;
  panCardNo?: string;
  swiftCode?: string;
}

export interface IInvoiceTax {
  sgstRate?: number;
  sgstAmount?: number;
  cgstRate?: number;
  cgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
}

export interface IInvoice extends Document {
  /** Auto-generated or user-set invoice number, e.g. AG/April/001 */
  invoiceNumber: string;
  /** Date of the invoice */
  invoiceDate: Date;
  /** UIN / Contract number */
  uin?: string;
  /** Category: Senior Fellow / Consultant / Intern / Custom */
  category?: string;
  /** Template: professional | modern | classic | reimbursement */
  template: "professional" | "modern" | "classic" | "reimbursement";
  /** Invoice Document Type: invoice | proforma */
  invoiceDocumentType?: "invoice" | "proforma";
  /** Region: national or international */
  clientRegion?: "national" | "international";
  /** Manually classify this invoice as not applicable for GST. */
  isNoGst?: boolean;
  /** Invoice type: single | phase | monthly */
  invoiceType: "single" | "phase" | "monthly";
  /** Use personal name or company name (from settings) */
  senderMode: "personal" | "company";
  /** Sender details (editable, pre-filled from settings) */
  sender: IInvoiceSender;
  /** Recipient details (editable, pre-filled from client) */
  recipient: IInvoiceRecipient;
  /** To address block (company being billed to) */
  toCompanyName?: string;
  toCompanyAddress?: string;
  /** Line items / services */
  lineItems: IInvoiceLineItem[];
  /** Sub-total before tax */
  subTotal: number;
  /** Tax breakdown */
  tax: IInvoiceTax;
  /** Discount amount */
  discount?: number;
  /** Round off */
  roundOff?: number;
  /** Total amount */
  totalAmount: number;
  /** Amount in words */
  amountInWords?: string;
  /** Currency */
  currency: string;
  /** Bank / Wire transfer details */
  bankDetails?: IInvoiceBankDetails;
  /** Purpose / Description / Work done */
  purpose?: string;
  /** Notes */
  notes?: string;
  /** Period: from date */
  periodFrom?: Date;
  /** Period: to date */
  periodTo?: Date;
  /** Status */
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  /** Due date */
  dueDate?: Date;
  /** Connected project payment */
  projectPayment?: mongoose.Types.ObjectId | null;
  /** Connected project */
  project?: mongoose.Types.ObjectId | null;
  /** Connected client */
  client?: mongoose.Types.ObjectId | null;
  /** Phase ID if phase invoice */
  phaseId?: string;
  /** Phase name */
  phaseName?: string;
  /** Month (for monthly invoices), e.g. "2026-02" */
  month?: string;
  /** Owner (admin user) */
  owner: mongoose.Types.ObjectId;
  /** Signature note */
  signatureNote?: string;
  /** Tax disclaimer */
  taxDisclaimer?: string;
  /** Amount already settled/paid towards total */
  settledAmount?: number;
  /** When the invoice was settled/paid */
  paidDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const InvoiceSchema: Schema<IInvoice> = new Schema(
  {
    invoiceNumber: { type: String, required: true },
    invoiceDate: { type: Date, required: true, default: Date.now },
    uin: String,
    category: String,
    template: {
      type: String,
      enum: ["professional", "modern", "classic", "reimbursement"],
      default: "professional",
    },
    invoiceDocumentType: {
      type: String,
      enum: ["invoice", "proforma"],
      default: "invoice",
    },
    clientRegion: {
      type: String,
      enum: ["national", "international"],
      default: "national",
    },
    isNoGst: { type: Boolean, default: false, index: true },
    invoiceType: {
      type: String,
      enum: ["single", "phase", "monthly"],
      default: "single",
    },
    senderMode: {
      type: String,
      enum: ["personal", "company"],
      default: "company",
    },
    sender: {
      name: String,
      address: String,
      email: String,
      phone: String,
      pan: String,
      gstNumber: String,
      location: String,
    },
    recipient: {
      name: String,
      companyName: String,
      address: String,
      email: String,
      phone: String,
      gstin: String,
      pan: String,
    },
    toCompanyName: String,
    toCompanyAddress: String,
    lineItems: [
      {
        description: { type: String, required: true },
        hsn: String,
        rate: Number,
        quantity: Number,
        amount: { type: Number, required: true },
      },
    ],
    subTotal: { type: Number, required: true, default: 0 },
    tax: {
      sgstRate: Number,
      sgstAmount: Number,
      cgstRate: Number,
      cgstAmount: Number,
      igstRate: Number,
      igstAmount: Number,
    },
    discount: Number,
    roundOff: Number,
    totalAmount: { type: Number, required: true, default: 0 },
    amountInWords: String,
    currency: { type: String, default: "INR" },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      bankName: String,
      bankBranch: String,
      bankAddress: String,
      ifscCode: String,
      panCardNo: String,
      swiftCode: String,
    },
    purpose: String,
    notes: String,
    periodFrom: Date,
    periodTo: Date,
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      default: "draft",
    },
    dueDate: Date,
    projectPayment: { type: Schema.Types.ObjectId, ref: "ProjectPayment", default: null },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    client: { type: Schema.Types.ObjectId, ref: "Client", default: null },
    phaseId: String,
    phaseName: String,
    month: String,
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    signatureNote: String,
    taxDisclaimer: { type: String, default: "You shall be solely responsible for any and all taxes, retirement contributions or payments, disability insurance, unemployment taxes, and other statutory payroll type taxes applicable to this compensation." },
    settledAmount: { type: Number, default: 0 },
    paidDate: Date,
  },
  { timestamps: true }
);

InvoiceSchema.index({ owner: 1, status: 1 });
InvoiceSchema.index({ client: 1 });
InvoiceSchema.index({ project: 1 });
InvoiceSchema.index({ projectPayment: 1 });

export const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
