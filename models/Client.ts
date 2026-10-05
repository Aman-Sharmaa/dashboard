import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClient extends Document {
  // Personal
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  // Company
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyWebsite?: string;
  // Tax
  gstin?: string;
  pan?: string;
  taxAddress?: string;
  /** national = India / INR billing; international = foreign clients */
  clientRegion?: "national" | "international";
  // Meta
  notes?: string;
  isActive: boolean;
  // Additional contacts/emails for meetings
  contactEmails?: string[];
  // Payment / budget
  paymentProjectId?: mongoose.Types.ObjectId | null;
  paymentType?: "maintenance" | "project";
  scheduleType?: "phases" | "monthly" | "6_month" | "yearly";
  totalBudget?: number;
  budgetPhases?: { name: string; percentage: number; amount: number; description?: string }[];
  createdAt?: Date;
  updatedAt?: Date;
}

const ClientSchema: Schema<IClient> = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    designation: String,
    companyName: { type: String, required: true },
    companyAddress: String,
    companyPhone: String,
    companyWebsite: String,
    gstin: String,
    pan: String,
    taxAddress: String,
    clientRegion: { type: String, enum: ["national", "international"], default: "national" },
    notes: String,
    isActive: { type: Boolean, default: true },
    contactEmails: [{ type: String }],
    paymentProjectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    paymentType: { type: String, enum: ["maintenance", "project"], default: "project" },
    scheduleType: { type: String, enum: ["phases", "monthly", "6_month", "yearly"], default: "phases" },
    totalBudget: Number,
    budgetPhases: [
      {
        name: String,
        percentage: Number,
        amount: Number,
        description: String,
      },
    ],
  },
  { timestamps: true }
);

ClientSchema.index({ email: 1 }, { unique: true });

export const Client: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
