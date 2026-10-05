import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClientOnboardingLink extends Document {
  /** Public token used in URL (no mongoose _id exposed) */
  token: string;
  label?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ClientOnboardingLinkSchema: Schema<IClientOnboardingLink> = new Schema(
  {
    token: { type: String, required: true, unique: true },
    label: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ClientOnboardingLink: Model<IClientOnboardingLink> =
  mongoose.models.ClientOnboardingLink ||
  mongoose.model<IClientOnboardingLink>("ClientOnboardingLink", ClientOnboardingLinkSchema);
