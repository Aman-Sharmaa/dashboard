import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProjectDomain {
  url: string;
  label?: string;
  lastChecked?: Date;
  isUp?: boolean;
  lastStatusCode?: number;
}

export interface IProject extends Document {
  client: mongoose.Types.ObjectId;
  parent?: mongoose.Types.ObjectId | null; // for sub-projects
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  maintenanceStartDate?: Date;
  maintenanceEndDate?: Date;
  /** Explicitly set per request; never defaulted to "all" employees. Use only IDs sent by client. */
  assignedMembers: mongoose.Types.ObjectId[];
  /** Project manager - can edit project details (optional) */
  manager?: mongoose.Types.ObjectId | null;
  status: "planned" | "active" | "on_hold" | "completed" | "maintenance";
  budget?: number;
  domains?: IProjectDomain[];
  isPinned?: boolean;
  isPinnedToSidebar?: boolean;
  /** When true the project has a live public showcase page at /work/[publicSlug] */
  isPublic?: boolean;
  /** URL-safe slug used in the public showcase URL */
  publicSlug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProjectSchema: Schema<IProject> = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    parent: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    name: { type: String, required: true },
    description: String,
    startDate: Date,
    endDate: Date,
    maintenanceStartDate: Date,
    maintenanceEndDate: Date,
    assignedMembers: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    manager: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    status: {
      type: String,
      enum: ["planned", "active", "on_hold", "completed", "maintenance"],
      default: "active",
    },
    budget: Number,
    domains: [
      {
        url: { type: String, required: true },
        label: String,
        lastChecked: Date,
        isUp: Boolean,
        lastStatusCode: Number,
      },
    ],
    isPinned: { type: Boolean, default: false },
    isPinnedToSidebar: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    publicSlug: { type: String, default: null, sparse: true },
  },
  { timestamps: true }
);

ProjectSchema.index({ client: 1 });
ProjectSchema.index({ parent: 1 });

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
