import mongoose, { Schema, Document, Model } from "mongoose";

export type ServiceCostType = "monthly" | "daily" | "custom_months";

export interface IProjectService extends Document {
  project: mongoose.Types.ObjectId;
  name: string;
  serviceId: string;
  servicePass: string;
  cost: number;
  costType: ServiceCostType;
  customMonths?: number;
  attachmentUrl?: string;
  attachmentKey?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProjectServiceSchema: Schema<IProjectService> = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true },
    serviceId: { type: String, required: true },
    servicePass: { type: String, required: true },
    cost: { type: Number, required: true },
    costType: {
      type: String,
      enum: ["monthly", "daily", "custom_months"],
      default: "monthly",
    },
    customMonths: Number,
    attachmentUrl: String,
    attachmentKey: String,
  },
  { timestamps: true }
);

ProjectServiceSchema.index({ project: 1 });

export const ProjectService: Model<IProjectService> =
  mongoose.models.ProjectService ||
  mongoose.model<IProjectService>("ProjectService", ProjectServiceSchema);
