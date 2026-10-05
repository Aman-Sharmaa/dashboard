import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeploySettings } from "@/models/DeploySettings";
import { encrypt, decrypt } from "@/lib/deploy/encryption";
import { verifyToken as verifyGhToken } from "@/lib/deploy/github";

export async function GET() {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  let settings = await DeploySettings.findOne().lean();
  if (!settings) {
    const created = await DeploySettings.create({});
    settings = created.toObject();
  }

  let ghConnected = false;
  let ghUser: string | null = null;
  if (settings.encryptedGithubToken) {
    try {
      const token = decrypt(settings.encryptedGithubToken);
      const u = await verifyGhToken(token);
      if (u) {
        ghConnected = true;
        ghUser = u.login;
      }
    } catch {}
  }

  return NextResponse.json({
    settings: {
      hasGithubToken: !!settings.encryptedGithubToken,
      githubConnected: ghConnected,
      githubUser: ghUser,
      defaultOrg: settings.defaultOrg,
      defaultBuildCommand: settings.defaultBuildCommand,
      defaultStartCommand: settings.defaultStartCommand,
      defaultFramework: settings.defaultFramework,
      portRangeStart: settings.portRangeStart,
      portRangeEnd: settings.portRangeEnd,
      defaultServer: settings.defaultServer ? String(settings.defaultServer) : null,
    },
  });
}

export async function PUT(req: NextRequest) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  let settings = await DeploySettings.findOne();
  if (!settings) settings = new DeploySettings();

  if (body.githubToken !== undefined) {
    if (body.githubToken) {
      settings.encryptedGithubToken = encrypt(body.githubToken);
    } else {
      settings.encryptedGithubToken = "";
    }
  }
  if (body.githubWebhookSecret !== undefined) settings.githubWebhookSecret = body.githubWebhookSecret;
  if (body.defaultOrg !== undefined) settings.defaultOrg = body.defaultOrg;
  if (body.defaultBuildCommand !== undefined) settings.defaultBuildCommand = body.defaultBuildCommand;
  if (body.defaultStartCommand !== undefined) settings.defaultStartCommand = body.defaultStartCommand;
  if (body.defaultFramework !== undefined) settings.defaultFramework = body.defaultFramework;
  if (body.portRangeStart !== undefined) settings.portRangeStart = body.portRangeStart;
  if (body.portRangeEnd !== undefined) settings.portRangeEnd = body.portRangeEnd;
  if (body.defaultServer !== undefined) settings.defaultServer = body.defaultServer || null;

  await settings.save();
  return NextResponse.json({ ok: true });
}
