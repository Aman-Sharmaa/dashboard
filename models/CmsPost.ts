import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICmsPost extends Document {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  categoryId?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImage?: string;
  layout?: "default" | "full-width" | "narrow";
  status: "draft" | "published";
  visibility: "me" | "org" | "shared" | "public";
  authorId?: string;
  publishedAt?: Date;
  readTimeMinutes?: number;
  password?: string;
  viewCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CmsPostSchema: Schema<ICmsPost> = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String },
    content: { type: String, default: "" },
    featuredImage: { type: String },
    categoryId: { type: Schema.Types.ObjectId, ref: "CmsCategory" },
    metaTitle: { type: String },
    metaDescription: { type: String },
    metaKeywords: { type: String },
    ogImage: { type: String },
    layout: { type: String, enum: ["default", "full-width", "narrow"], default: "default" },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    visibility: { type: String, enum: ["me", "org", "shared", "public"], default: "public" },
    authorId: { type: Schema.Types.ObjectId, ref: "User" },
    publishedAt: { type: Date },
    readTimeMinutes: { type: Number },
    password: { type: String },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const CmsPost: Model<ICmsPost> =
  mongoose.models.CmsPost || mongoose.model<ICmsPost>("CmsPost", CmsPostSchema);
