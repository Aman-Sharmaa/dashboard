import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICompanyProfile extends Document {
  owner: mongoose.Types.ObjectId;
  companyName: string;
  legalName?: string;
  logoUrl?: string;
  leaveSettings?: {
    monthlyPaidLimit?: number;
    monthlyUnpaidLimit?: number;
    leaveTypes?: string[];
    weeklyOffDays?: string[];
    carryForward?: boolean;
  };
  personalDetails?: {
    contactName?: string;
    email?: string;
    phone?: string;
  };
  bankDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
  companyDetails?: {
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  taxDetails?: {
    gstNumber?: string;
    panNumber?: string;
    otherTaxId?: string;
  };
  /** Webhook URL for service-down notifications (Discord incoming webhook) */
  webhookUrl?: string;
  /** Emails to notify when monitors go down (SMTP). Comma-separated in UI. */
  monitorAlertEmails?: string[];
  taskEmailNotifications?: {
    enabled?: boolean;
    sendTime?: string;
    timezone?: string;
    lastSentDate?: string;
  };
  /** Default Terms & Conditions for proposals */
  defaultTerms?: string;
  /** Invoice settings */
  invoiceSettings?: {
    /** Use personal name or company name on invoices */
    senderMode?: "personal" | "company";
    /** Personal name for invoices (if senderMode is personal) */
    personalName?: string;
    /** Default template */
    defaultTemplate?: "professional" | "modern" | "classic" | "reimbursement";
    /** Default UIN / Contract number */
    defaultUin?: string;
    /** Default category (e.g., Senior Fellow / Consultant / Intern) */
    defaultCategory?: string;
    /** Invoice number prefix for national clients, e.g., "AG" */
    invoicePrefix?: string;
    /** Invoice number format: prefix/month/serial e.g., AG/April/001 */
    invoiceFormat?: string;
    /** Next serial number for national clients */
    nextSerial?: number;
    /** Invoice number prefix for international clients */
    internationalInvoicePrefix?: string;
    /** Next serial number for international clients */
    internationalNextSerial?: number;
    /** Default HSN/SAC code for line items */
    defaultHsn?: string;
    /** Default notes on invoices */
    defaultNotes?: string;
    /** Default signature note */
    defaultSignatureNote?: string;
    /** Default tax disclaimer */
    defaultTaxDisclaimer?: string;
  };
}

const CompanyProfileSchema: Schema<ICompanyProfile> = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    companyName: { type: String, required: true },
    legalName: { type: String },
    logoUrl: { type: String },
    leaveSettings: {
      monthlyPaidLimit: Number,
      monthlyUnpaidLimit: Number,
      leaveTypes: [String],
      weeklyOffDays: [String],
      carryForward: Boolean,
    },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
    },
    personalDetails: {
      contactName: String,
      email: String,
      phone: String,
    },
    companyDetails: {
      website: String,
      address: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    taxDetails: {
      gstNumber: String,
      panNumber: String,
      otherTaxId: String,
    },
    webhookUrl: String,
    monitorAlertEmails: [String],
    taskEmailNotifications: {
      enabled: { type: Boolean, default: true },
      sendTime: { type: String, default: "14:30" },
      timezone: { type: String, default: "Asia/Kolkata" },
      lastSentDate: { type: String, default: "" },
    },
    defaultTerms: String,
    invoiceSettings: {
      senderMode: { type: String, enum: ["personal", "company"], default: "company" },
      personalName: String,
      defaultTemplate: { type: String, enum: ["professional", "modern", "classic", "reimbursement"], default: "professional" },
      defaultUin: String,
      defaultCategory: String,
      invoicePrefix: String,
      invoiceFormat: String,
      nextSerial: { type: Number, default: 1 },
      internationalInvoicePrefix: String,
      internationalNextSerial: { type: Number, default: 1 },
      defaultHsn: String,
      defaultNotes: String,
      defaultSignatureNote: String,
      defaultTaxDisclaimer: String,
    },
  },
  { timestamps: true }
);

export const CompanyProfile: Model<ICompanyProfile> =
  mongoose.models.CompanyProfile ||
  mongoose.model<ICompanyProfile>("CompanyProfile", CompanyProfileSchema);
