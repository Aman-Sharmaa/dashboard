import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICmsPage extends Document {
  title: string;
  slug: string;
  content: string;       // legacy rich-text (TipTap HTML)
  sections: unknown[];   // visual builder sections (JSON array)
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImage?: string;
  layout?: "default" | "full-width" | "narrow";
  status: "draft" | "published";
  visibility: "me" | "org" | "shared" | "public";
  authorId?: string;
  publishedAt?: Date;
  viewCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CmsPageSchema: Schema<ICmsPage> = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, default: "" },
    sections: { type: [Schema.Types.Mixed], default: [] }, // visual builder blocks
    metaTitle: { type: String },
    metaDescription: { type: String },
    metaKeywords: { type: String },
    ogImage: { type: String },
    layout: { type: String, enum: ["default", "full-width", "narrow"], default: "default" },
    status: { type: String, enum: ["draft", "published"], default: "published" },
    visibility: { type: String, enum: ["me", "org", "shared", "public"], default: "public" },
    authorId: { type: Schema.Types.ObjectId, ref: "User" },
    publishedAt: { type: Date },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const CmsPage: Model<ICmsPage> =
  mongoose.models.CmsPage || mongoose.model<ICmsPage>("CmsPage", CmsPageSchema);
