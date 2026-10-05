import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICmsCategory extends Document {
  name: string;
  slug: string;
  description?: string;
  postCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CmsCategorySchema: Schema<ICmsCategory> = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    postCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const CmsCategory: Model<ICmsCategory> =
  mongoose.models.CmsCategory || mongoose.model<ICmsCategory>("CmsCategory", CmsCategorySchema);
