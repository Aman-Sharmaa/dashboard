import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProjectDocument extends Document {
  project: mongoose.Types.ObjectId;
  name: string;
  fileUrl: string;
  fileKey: string;
  uploadedAt?: Date;
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProjectDocumentSchema: Schema<IProjectDocument> = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileKey: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ProjectDocumentSchema.index({ project: 1 });

export const ProjectDocument: Model<IProjectDocument> =
  mongoose.models.ProjectDocument ||
  mongoose.model<IProjectDocument>("ProjectDocument", ProjectDocumentSchema);
