import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDomainProvider extends Document {
  name: string;
  provider: "cloudflare" | "godaddy" | "namecheap" | "hostinger";
  encryptedApiKey: string;
  encryptedApiSecret?: string;
  encryptedApiEmail?: string; // Cloudflare global-key auth
  cachedDomains: { domain: string; zoneId?: string }[];
  cachedDomainsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DomainProviderSchema: Schema<IDomainProvider> = new Schema(
  {
    name: { type: String, required: true },
    provider: {
      type: String,
      required: true,
      enum: ["cloudflare", "godaddy", "namecheap", "hostinger"],
    },
    encryptedApiKey: { type: String, required: true },
    encryptedApiSecret: String,
    encryptedApiEmail: String,
    cachedDomains: [
      {
        domain: { type: String, required: true },
        zoneId: String,
      },
    ],
    cachedDomainsAt: Date,
  },
  { timestamps: true }
);

export const DomainProvider: Model<IDomainProvider> =
  mongoose.models.DomainProvider ||
  mongoose.model<IDomainProvider>("DomainProvider", DomainProviderSchema);
