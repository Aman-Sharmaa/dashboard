import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILoginOtp extends Document {
  email: string;
  otpHash: string;
  sessionToken: string;
  ipAddress: string;
  attempts: number;
  verified: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const LoginOtpSchema: Schema<ILoginOtp> = new Schema({
  email: { type: String, required: true, index: true },
  otpHash: { type: String, required: true },
  sessionToken: { type: String, required: true, unique: true },
  ipAddress: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now },
});

LoginOtpSchema.index({ email: 1, createdAt: -1 });

export const LoginOtp: Model<ILoginOtp> =
  mongoose.models.LoginOtp || mongoose.model<ILoginOtp>("LoginOtp", LoginOtpSchema);
