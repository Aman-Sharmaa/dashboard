import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDeploySettings extends Document {
  encryptedGithubToken?: string;
  githubWebhookSecret?: string;
  defaultOrg?: string;
  defaultBuildCommand: string;
  defaultStartCommand: string;
  defaultFramework: "nextjs" | "node" | "custom";
  portRangeStart: number;
  portRangeEnd: number;
  defaultServer?: mongoose.Types.ObjectId;
  mongoConnections?: {
    _id?: mongoose.Types.ObjectId;
    name: string;
    encryptedUri: string;
    favoriteDb?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }[];
  updatedAt: Date;
}

const MongoConnectionSchema = new Schema(
  {
    name: { type: String, required: true },
    encryptedUri: { type: String, required: true },
    favoriteDb: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { _id: true, timestamps: true }
);

const DeploySettingsSchema: Schema<IDeploySettings> = new Schema(
  {
    encryptedGithubToken: String,
    githubWebhookSecret: String,
    defaultOrg: String,
    defaultBuildCommand: { type: String, default: "npm install && npm run build" },
    defaultStartCommand: { type: String, default: "npm start" },
    defaultFramework: {
      type: String,
      enum: ["nextjs", "node", "custom"],
      default: "node",
    },
    portRangeStart: { type: Number, default: 3000 },
    portRangeEnd: { type: Number, default: 5000 },
    defaultServer: { type: Schema.Types.ObjectId, ref: "DeployServer", default: null },
    mongoConnections: { type: [MongoConnectionSchema], default: [] },
  },
  { timestamps: true }
);

export const DeploySettings: Model<IDeploySettings> =
  mongoose.models.DeploySettings ||
  mongoose.model<IDeploySettings>("DeploySettings", DeploySettingsSchema);
