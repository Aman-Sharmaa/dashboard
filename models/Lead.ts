import mongoose, { Schema, Document, Model } from "mongoose";

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

export interface ILead extends Document {
  // Contact
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  companyWebsite?: string;
  designation?: string;

  // Requirements
  serviceCategory?: string;
  serviceCategorySlug?: string;
  services?: string[];
  projectDescription?: string;
  budget?: string;
  timeline?: string;
  currency?: string;

  // Source
  source: string; // e.g. "rapydlaunch", "website", "referral", "manual"
  sourcePage?: string; // e.g. "/rapydlaunch/video-editing"

  // Status & tracking
  status: LeadStatus;
  notes?: string;
  adminNotes?: string;

  // Conversion
  convertedClientId?: mongoose.Types.ObjectId | null;
  convertedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

const LeadSchema: Schema<ILead> = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    companyName: String,
    companyWebsite: String,
    designation: String,

    serviceCategory: String,
    serviceCategorySlug: String,
    services: [{ type: String }],
    projectDescription: String,
    budget: String,
    timeline: String,
    currency: { type: String, default: "USD" },

    source: { type: String, default: "website" },
    sourcePage: String,

    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "converted", "lost"],
      default: "new",
    },
    notes: String,
    adminNotes: String,

    convertedClientId: { type: Schema.Types.ObjectId, ref: "Client", default: null },
    convertedAt: Date,
  },
  { timestamps: true }
);

LeadSchema.index({ email: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ createdAt: -1 });

export const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);
