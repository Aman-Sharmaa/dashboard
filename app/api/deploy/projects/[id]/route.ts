import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeployProject } from "@/models/DeployProject";
import { DeploymentLog } from "@/models/DeploymentLog";
import { EnvHistory } from "@/models/EnvHistory";
import "@/models/DeployGroup";
import { deployProject, restartProject, stopProject, getProjectMonitoring, cleanupProject } from "@/lib/deploy/deployer";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const project = await DeployProject.findById(id)
    .populate("server", "name ip")
    .populate("group", "name")
    .lean();
  if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const [logs, envHistory] = await Promise.all([
    DeploymentLog.find({ project: id }).sort({ createdAt: -1 }).limit(20).lean(),
    EnvHistory.find({ project: id }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  // Build envContent: prefer stored envContent, fall back to converting envVars Map
  let envContent = (project as any).envContent || "";
  if (!envContent && project.envVars) {
    const vars = project.envVars instanceof Map
      ? Object.fromEntries(project.envVars)
      : (typeof project.envVars === "object" ? project.envVars : {});
    const entries = Object.entries(vars);
    if (entries.length > 0) {
      envContent = entries.map(([k, v]) => `${k}=${v}`).join("\n");
    }
  }

  return NextResponse.json({
    project: {
      id: String(project._id),
      name: project.name,
      group: project.group ? { id: String((project.group as any)._id), name: (project.group as any).name } : null,
      server: project.server ? { id: String((project.server as any)._id), name: (project.server as any).name, ip: (project.server as any).ip } : null,
      repo: project.repo,
      branch: project.branch,
      githubOrg: project.githubOrg,
      domain: project.domain,
      port: project.port,
      status: project.status,
      framework: project.framework,
      buildCommand: project.buildCommand,
      startCommand: project.startCommand,
      envContent,
      envVars: project.envVars && typeof project.envVars === "object"
        ? (project.envVars instanceof Map ? Object.fromEntries(project.envVars) : project.envVars)
        : {},
      appDir: project.appDir,
      pm2Name: project.pm2Name,
      cpuUsage: project.cpuUsage,
      memoryUsage: project.memoryUsage,
      diskUsage: project.diskUsage,
      uptime: project.uptime,
      restartCount: project.restartCount,
      lastDeployAt: project.lastDeployAt,
      lastDeployCommit: project.lastDeployCommit,
      latestCommitSha: (project as any).latestCommitSha,
      hasPendingCommit: !!((project as any).latestCommitSha && project.lastDeployCommit && (project as any).latestCommitSha !== project.lastDeployCommit),
      createdAt: project.createdAt,
    },
    envHistory: envHistory.map((h) => ({
      id: String(h._id),
      content: h.content,
      changedBy: h.changedBy,
      createdAt: h.createdAt,
    })),
    logs: logs.map((l) => ({
      id: String(l._id),
      action: l.action,
      status: l.status,
      logs: l.logs,
      commit: l.commit,
      branch: l.branch,
      triggeredBy: l.triggeredBy,
      duration: l.duration,
      createdAt: l.createdAt,
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireDeploymentsAdmin();
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const project = await DeployProject.findById(id);
  if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body.name !== undefined) project.name = body.name;
  if (body.pm2Name !== undefined) project.pm2Name = body.pm2Name;
  if (body.groupId !== undefined) (project as any).group = body.groupId || null;
  if (body.repo !== undefined) project.repo = body.repo
    ? body.repo.replace(/^https?:\/\/github\.com\//, "").replace(/^github\.com\//, "").replace(/\.git$/, "").trim()
    : "";
  if (body.branch !== undefined) project.branch = body.branch;
  if (body.domain !== undefined) project.domain = body.domain;
  if (body.port !== undefined) project.port = body.port;
  if (body.framework !== undefined) project.framework = body.framework;
  if (body.buildCommand !== undefined) project.buildCommand = body.buildCommand;
  if (body.startCommand !== undefined) project.startCommand = body.startCommand;
  if (body.appDir !== undefined) project.appDir = body.appDir;
  if (body.envVars !== undefined) project.envVars = body.envVars;

  // Handle envContent (text editor) - also sync to envVars Map for backward compat
  if (body.envContent !== undefined) {
    const oldContent = (project as any).envContent || "";
    (project as any).envContent = body.envContent;

    // Parse envContent into envVars Map
    const parsedVars: Record<string, string> = {};
    for (const line of (body.envContent as string).split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        parsedVars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
      }
    }
    project.envVars = parsedVars as any;

    // Create env history entry if content actually changed
    if (body.envContent !== oldContent) {
      await EnvHistory.create({
        project: project._id,
        content: body.envContent,
        changedBy: admin.email,
      });
    }
  }

  try {
    await project.save();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const msg = err.code === 11000
      ? "A project with this port/server combination already exists"
      : err.message || "Failed to save project";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireDeploymentsAdmin();
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const project = await DeployProject.findById(id);
  if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });

  let cleanupDetails = "";
  if (project.server) {
    try {
      const result = await cleanupProject(project, admin.email);
      cleanupDetails = result.details;
    } catch (err: any) {
      cleanupDetails = `Cleanup error: ${err.message}`;
    }
  }

  await DeployProject.findByIdAndDelete(id);
  await Promise.all([
    DeploymentLog.deleteMany({ project: id }),
    EnvHistory.deleteMany({ project: id }),
  ]);
  return NextResponse.json({ ok: true, cleanupDetails });
}
