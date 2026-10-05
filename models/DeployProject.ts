import mongoose, { Schema, Document, Model } from "mongoose";

export type DeployStatus =
  | "running"
  | "stopped"
  | "deploying"
  | "failed"
  | "building"
  | "pending";

export interface IDeployProject extends Document {
  name: string;
  group?: mongoose.Types.ObjectId;
  server: mongoose.Types.ObjectId;
  repo: string;
  branch: string;
  githubOrg?: string;
  domain?: string;
  port: number;
  status: DeployStatus;
  framework: "nextjs" | "node" | "custom";
  buildCommand: string;
  startCommand: string;
  envVars: Map<string, string>;
  envContent: string;
  appDir: string;
  pm2Name: string;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  uptime?: string;
  restartCount?: number;
  lastDeployAt?: Date;
  lastDeployCommit?: string;
  deployedCommitAuthor?: string;
  latestCommitSha?: string;
  latestCommitAuthor?: string;
  latestCommitAt?: Date;
  latestCommitMessage?: string;
  lastCommitAuthor?: string;
  lastCommitAt?: Date;
  lastCommitMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeployProjectSchema: Schema<IDeployProject> = new Schema(
  {
    name: { type: String, required: true },
    group: { type: Schema.Types.ObjectId, ref: "DeployGroup", default: null },
    server: { type: Schema.Types.ObjectId, ref: "DeployServer", required: true },
    repo: { type: String, default: "" },
    branch: { type: String, required: true, default: "main" },
    githubOrg: String,
    domain: String,
    port: { type: Number, required: true },
    status: {
      type: String,
      enum: ["running", "stopped", "deploying", "failed", "building", "pending"],
      default: "pending",
    },
    framework: {
      type: String,
      enum: ["nextjs", "node", "custom"],
      default: "node",
    },
    buildCommand: { type: String, default: "npm install && npm run build" },
    startCommand: { type: String, default: "npm start" },
    envVars: { type: Map, of: String, default: {} },
    envContent: { type: String, default: "" },
    appDir: String,
    pm2Name: String,
    cpuUsage: Number,
    memoryUsage: Number,
    diskUsage: Number,
    uptime: String,
    restartCount: Number,
    lastDeployAt: Date,
    lastDeployCommit: String,
    deployedCommitAuthor: String,
    latestCommitSha: String,
    latestCommitAuthor: String,
    latestCommitAt: Date,
    latestCommitMessage: String,
    lastCommitAuthor: String,
    lastCommitAt: Date,
    lastCommitMessage: String,
  },
  { timestamps: true }
);

DeployProjectSchema.index({ server: 1 });
DeployProjectSchema.index({ group: 1 });
DeployProjectSchema.index({ port: 1, server: 1 }, { unique: true });
DeployProjectSchema.index({ status: 1 });

export const DeployProject: Model<IDeployProject> =
  mongoose.models.DeployProject ||
  mongoose.model<IDeployProject>("DeployProject", DeployProjectSchema);
