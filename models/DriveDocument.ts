import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDocument extends Document {
  title: string;
  content: string; // Rich text HTML content
  owner: mongoose.Types.ObjectId;
  ownerName?: string;
  visibility: "private" | "public" | "specific";
  sharedWith: string[]; // user IDs
  tags: string[];
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema: Schema<IDocument> = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, default: "" },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ownerName: { type: String },
    visibility: {
      type: String,
      enum: ["private", "public", "specific"],
      default: "private",
    },
    sharedWith: [{ type: String }],
    tags: [{ type: String }],
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DocumentSchema.index({ owner: 1, updatedAt: -1 });
DocumentSchema.index({ visibility: 1 });

export const DriveDocument: Model<IDocument> =
  mongoose.models.DriveDocument ||
  mongoose.model<IDocument>("DriveDocument", DocumentSchema);
