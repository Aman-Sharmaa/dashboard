import mongoose, { Schema, Document, Model } from "mongoose";

export interface IContact extends Document {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  designation?: string;
  tagline?: string;
  tags?: string[];
  notes?: string;
  source: "manual" | "client";
  clientId?: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema: Schema<IContact> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    designation: { type: String, trim: true },
    tagline: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    notes: { type: String },
    source: { type: String, enum: ["manual", "client"], default: "manual" },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ContactSchema.index({ owner: 1 });
ContactSchema.index({ owner: 1, email: 1 });
ContactSchema.index({ owner: 1, clientId: 1 });
ContactSchema.index({ name: "text", email: "text", company: "text", tagline: "text" });

export const Contact: Model<IContact> =
  mongoose.models.Contact ||
  mongoose.model<IContact>("Contact", ContactSchema);
