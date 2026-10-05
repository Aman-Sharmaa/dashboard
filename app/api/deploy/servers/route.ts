import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeployServer } from "@/models/DeployServer";
import { encrypt } from "@/lib/deploy/encryption";
import { testConnection } from "@/lib/deploy/ssh";
import { getServerStats } from "@/lib/deploy/deployer";

export async function GET() {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const servers = await DeployServer.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({
    servers: servers.map((s) => ({
      id: String(s._id),
      name: s.name,
      ip: s.ip,
      sshUser: s.sshUser,
      sshPort: s.sshPort,
      authMethod: s.authMethod,
      defaultNodeVersion: s.defaultNodeVersion,
      defaultNginxPath: s.defaultNginxPath,
      maxDeploy: s.maxDeploy,
      status: s.status,
      lastCheckedAt: s.lastCheckedAt,
      createdAt: s.createdAt,
      cachedResources: s.cachedResources || null,
      cachedResourcesAt: s.cachedResourcesAt || null,
      cachedServicesCount: s.cachedServices?.length || 0,
      cachedServicesAt: s.cachedServicesAt || null,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const { name, ip, sshUser, sshPort, authMethod, privateKey, password, defaultNodeVersion, defaultNginxPath, maxDeploy } = body;

  if (!name || !ip) return NextResponse.json({ message: "Name and IP required" }, { status: 400 });

  const existing = await DeployServer.findOne({ ip });
  if (existing) return NextResponse.json({ message: "Server with this IP already exists" }, { status: 409 });

  const server = await DeployServer.create({
    name,
    ip,
    sshUser: sshUser || "root",
    sshPort: sshPort || 22,
    authMethod: authMethod || "key",
    encryptedKey: privateKey ? encrypt(privateKey) : undefined,
    encryptedPassword: password ? encrypt(password) : undefined,
    defaultNodeVersion: defaultNodeVersion || "20",
    defaultNginxPath: defaultNginxPath || "/etc/nginx",
    maxDeploy: maxDeploy || 20,
  });

  return NextResponse.json({
    server: {
      id: String(server._id),
      name: server.name,
      ip: server.ip,
      sshUser: server.sshUser,
      status: server.status,
    },
  }, { status: 201 });
}
