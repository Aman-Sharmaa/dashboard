import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeployServer } from "@/models/DeployServer";
import { encrypt } from "@/lib/deploy/encryption";
import { testConnection } from "@/lib/deploy/ssh";
import { getServerStats } from "@/lib/deploy/deployer";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const server = await DeployServer.findById(id);
  if (!server) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const stats = await getServerStats(server);
  return NextResponse.json({
    server: {
      id: String(server._id),
      name: server.name,
      ip: server.ip,
      sshUser: server.sshUser,
      sshPort: server.sshPort,
      authMethod: server.authMethod,
      defaultNodeVersion: server.defaultNodeVersion,
      defaultNginxPath: server.defaultNginxPath,
      maxDeploy: server.maxDeploy,
      status: server.status,
    },
    stats,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const server = await DeployServer.findById(id);
  if (!server) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json();
  if (body.name !== undefined) server.name = body.name;
  if (body.ip !== undefined) server.ip = body.ip;
  if (body.sshUser !== undefined) server.sshUser = body.sshUser;
  if (body.sshPort !== undefined) server.sshPort = body.sshPort;
  if (body.authMethod !== undefined) server.authMethod = body.authMethod;
  if (body.privateKey) server.encryptedKey = encrypt(body.privateKey);
  if (body.password) server.encryptedPassword = encrypt(body.password);
  if (body.defaultNodeVersion !== undefined) server.defaultNodeVersion = body.defaultNodeVersion;
  if (body.defaultNginxPath !== undefined) server.defaultNginxPath = body.defaultNginxPath;
  if (body.maxDeploy !== undefined) server.maxDeploy = body.maxDeploy;

  await server.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  await DeployServer.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
