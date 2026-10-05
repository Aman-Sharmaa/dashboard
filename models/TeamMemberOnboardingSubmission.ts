import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITeamMemberOnboardingSubmission extends Document {
  linkToken: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  type?: "Intern" | "Employee" | "Part-Time" | "Contract";
  status: "pending" | "approved" | "rejected";
  createdEmployeeId?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const TeamMemberOnboardingSubmissionSchema: Schema<ITeamMemberOnboardingSubmission> = new Schema(
  {
    linkToken: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    title: String,
    type: { type: String, enum: ["Intern", "Employee", "Part-Time", "Contract"], default: "Employee" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    createdEmployeeId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
  },
  { timestamps: true }
);

TeamMemberOnboardingSubmissionSchema.index({ linkToken: 1 });
TeamMemberOnboardingSubmissionSchema.index({ status: 1 });

export const TeamMemberOnboardingSubmission: Model<ITeamMemberOnboardingSubmission> =
  mongoose.models.TeamMemberOnboardingSubmission ||
  mongoose.model<ITeamMemberOnboardingSubmission>("TeamMemberOnboardingSubmission", TeamMemberOnboardingSubmissionSchema);
