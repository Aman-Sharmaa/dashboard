import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICachedResource {
  cpu: { cores: number; model: string };
  memory: { total: number; used: number; percent: number };
  disk: { total: number; used: number; percent: number };
  uptime: string;
}

export interface ICachedService {
  name: string;
  domain?: string;
  port?: number;
  repo?: string;
  branch?: string;
  appDir?: string;
  pm2Name?: string;
  pm2Status?: string;
  pm2Cpu?: number;
  pm2Mem?: number;
  pm2Restarts?: number;
  pm2Uptime?: number;
  pm2Id?: number;
  ssl?: boolean;
  nginxConfig?: string;
  hasGit: boolean;
  source: string;
}

export interface IDeployServer extends Document {
  name: string;
  ip: string;
  sshUser: string;
  sshPort: number;
  encryptedKey?: string;
  encryptedPassword?: string;
  authMethod: "key" | "password";
  defaultNodeVersion: string;
  defaultNginxPath: string;
  maxDeploy: number;
  status: "connected" | "disconnected" | "error";
  lastCheckedAt?: Date;
  cachedResources?: ICachedResource;
  cachedResourcesAt?: Date;
  cachedServices?: ICachedService[];
  cachedDomainResults?: Record<string, { status: string; code?: number }>;
  cachedServicesAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeployServerSchema: Schema<IDeployServer> = new Schema(
  {
    name: { type: String, required: true },
    ip: { type: String, required: true },
    sshUser: { type: String, required: true, default: "root" },
    sshPort: { type: Number, default: 22 },
    encryptedKey: String,
    encryptedPassword: String,
    authMethod: { type: String, enum: ["key", "password"], default: "key" },
    defaultNodeVersion: { type: String, default: "20" },
    defaultNginxPath: { type: String, default: "/etc/nginx" },
    maxDeploy: { type: Number, default: 20 },
    status: {
      type: String,
      enum: ["connected", "disconnected", "error"],
      default: "disconnected",
    },
    lastCheckedAt: Date,
    cachedResources: { type: Schema.Types.Mixed, default: null },
    cachedResourcesAt: Date,
    cachedServices: { type: [Schema.Types.Mixed], default: null },
    cachedDomainResults: { type: Schema.Types.Mixed, default: null },
    cachedServicesAt: Date,
  },
  { timestamps: true }
);

DeployServerSchema.index({ ip: 1 }, { unique: true });

export const DeployServer: Model<IDeployServer> =
  mongoose.models.DeployServer ||
  mongoose.model<IDeployServer>("DeployServer", DeployServerSchema);
