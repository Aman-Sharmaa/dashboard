import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITeamMemberOnboardingLink extends Document {
  token: string;
  label?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const TeamMemberOnboardingLinkSchema: Schema<ITeamMemberOnboardingLink> = new Schema(
  {
    token: { type: String, required: true, unique: true },
    label: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const TeamMemberOnboardingLink: Model<ITeamMemberOnboardingLink> =
  mongoose.models.TeamMemberOnboardingLink ||
  mongoose.model<ITeamMemberOnboardingLink>("TeamMemberOnboardingLink", TeamMemberOnboardingLinkSchema);
