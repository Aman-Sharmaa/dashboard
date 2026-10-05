import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClientOnboardingSubmission extends Document {
  /** Token of the link this was submitted to (no ref to link _id in URL) */
  linkToken: string;
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  designation?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyWebsite?: string;
  gstin?: string;
  pan?: string;
  notes?: string;
  status: "pending" | "approved" | "rejected" | "done";
  /** Set when admin approves: created client id */
  createdClientId?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const ClientOnboardingSubmissionSchema: Schema<IClientOnboardingSubmission> = new Schema(
  {
    linkToken: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    companyName: { type: String, required: true },
    phone: String,
    designation: String,
    companyAddress: String,
    companyPhone: String,
    companyWebsite: String,
    gstin: String,
    pan: String,
    notes: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "done"],
      default: "pending",
    },
    createdClientId: { type: Schema.Types.ObjectId, ref: "Client", default: null },
  },
  { timestamps: true }
);

ClientOnboardingSubmissionSchema.index({ linkToken: 1 });
ClientOnboardingSubmissionSchema.index({ status: 1 });

export const ClientOnboardingSubmission: Model<IClientOnboardingSubmission> =
  mongoose.models.ClientOnboardingSubmission ||
  mongoose.model<IClientOnboardingSubmission>("ClientOnboardingSubmission", ClientOnboardingSubmissionSchema);
