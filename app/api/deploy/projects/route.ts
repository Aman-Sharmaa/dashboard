import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeployProject } from "@/models/DeployProject";
import { DeployServer } from "@/models/DeployServer";
import { DeploySettings } from "@/models/DeploySettings";
import { EnvHistory } from "@/models/EnvHistory";
import { decrypt } from "@/lib/deploy/encryption";
import { fetchLatestCommit } from "@/lib/deploy/github";
import "@/models/DeployGroup";

function cleanRepoSlug(repo: string): string {
  return repo
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .trim();
}

export async function GET(req: NextRequest) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const sp = new URL(req.url).searchParams;
  const filter: Record<string, any> = {};
  if (sp.get("serverId")) filter.server = sp.get("serverId");
  if (sp.get("groupId")) filter.group = sp.get("groupId");
  if (sp.get("status")) filter.status = sp.get("status");
  const search = sp.get("search");

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { domain: { $regex: search, $options: "i" } },
      { repo: { $regex: search, $options: "i" } },
    ];
  }

  const projects = await DeployProject.find(filter)
    .populate("server", "name ip")
    .populate("group", "name")
    .sort({ lastCommitAt: -1, lastDeployAt: -1, updatedAt: -1 })
    .lean();

  // Fetch latest commit from GitHub for each project (in parallel, non-blocking)
  let ghToken: string | null = null;
  try {
    const settings = await DeploySettings.findOne().lean();
    if (settings?.encryptedGithubToken) ghToken = decrypt(settings.encryptedGithubToken);
  } catch {}

  type CommitInfo = { sha: string; author: string; date: string; message: string } | null;
  const commitMap = new Map<string, CommitInfo>();

  if (ghToken) {
    const reposToFetch = projects
      .filter((p: any) => p.repo && p.repo.includes("/"))
      .map((p: any) => ({ id: String(p._id), repo: p.repo, branch: p.branch || "main" }));

    // Dedupe by repo+branch to avoid duplicate API calls
    const uniqueKeys = new Map<string, { repo: string; branch: string }>();
    for (const r of reposToFetch) {
      uniqueKeys.set(`${r.repo}:${r.branch}`, { repo: r.repo, branch: r.branch });
    }

    const commitResults = await Promise.allSettled(
      Array.from(uniqueKeys.entries()).map(async ([key, { repo, branch }]) => {
        const [owner, repoName] = repo.split("/");
        if (!owner || !repoName) return { key, commit: null };
        const commit = await fetchLatestCommit(ghToken!, owner, repoName, branch);
        return { key, commit };
      })
    );

    const keyCommitMap = new Map<string, CommitInfo>();
    for (const r of commitResults) {
      if (r.status === "fulfilled" && r.value) {
        keyCommitMap.set(r.value.key, r.value.commit);
      }
    }

    // Map commit data back to project IDs and update DB in background
    const bulkOps: any[] = [];
    for (const p of reposToFetch) {
      const commit = keyCommitMap.get(`${p.repo}:${p.branch}`);
      commitMap.set(p.id, commit || null);
      if (commit?.date) {
        bulkOps.push({
          updateOne: {
            filter: { _id: p.id },
            update: {
              $set: {
                latestCommitSha: commit.sha,
                latestCommitAuthor: commit.author,
                latestCommitAt: new Date(commit.date),
                latestCommitMessage: commit.message,
                lastCommitAt: new Date(commit.date),
                lastCommitAuthor: commit.author,
                lastCommitMessage: commit.message,
              },
            },
          },
        });
      }
    }
    if (bulkOps.length > 0) {
      DeployProject.bulkWrite(bulkOps).catch(() => {});
    }
  }

  const projectList = projects.map((p: any) => {
    const id = String(p._id);
    const ghCommit = commitMap.get(id);
    const latestSha = ghCommit?.sha || p.latestCommitSha || null;
    const deployedCommit = p.lastDeployCommit || null;
    return {
      id,
      name: p.name,
      pm2Name: p.pm2Name,
      group: p.group ? { id: String(p.group._id), name: p.group.name } : null,
      server: p.server ? { id: String(p.server._id), name: p.server.name, ip: p.server.ip } : null,
      repo: p.repo,
      branch: p.branch,
      domain: p.domain,
      port: p.port,
      status: p.status,
      framework: p.framework,
      cpuUsage: p.cpuUsage,
      memoryUsage: p.memoryUsage,
      diskUsage: p.diskUsage,
      uptime: p.uptime,
      restartCount: p.restartCount,
      lastDeployAt: p.lastDeployAt,
      lastDeployCommit: deployedCommit,
      deployedCommitAuthor: p.deployedCommitAuthor || null,
      latestCommitSha: latestSha,
      latestCommitAuthor: ghCommit?.author || p.latestCommitAuthor || p.lastCommitAuthor,
      latestCommitAt: ghCommit?.date ? new Date(ghCommit.date) : (p.latestCommitAt || p.lastCommitAt),
      latestCommitMessage: ghCommit?.message || p.latestCommitMessage || p.lastCommitMessage,
      hasPendingCommit: !!(latestSha && deployedCommit && latestSha !== deployedCommit),
      lastCommitAuthor: ghCommit?.author || p.lastCommitAuthor,
      lastCommitAt: ghCommit?.date ? new Date(ghCommit.date) : p.lastCommitAt,
      lastCommitMessage: ghCommit?.message || p.lastCommitMessage,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  projectList.sort((a: any, b: any) => {
    const aTime = new Date(a.latestCommitAt || a.lastDeployAt || a.updatedAt || 0).getTime();
    const bTime = new Date(b.latestCommitAt || b.lastDeployAt || b.updatedAt || 0).getTime();
    return bTime - aTime;
  });

  return NextResponse.json({ projects: projectList });
}

export async function POST(req: NextRequest) {
  const admin = await requireDeploymentsAdmin();
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const { name, groupId, serverId, repo, branch, githubOrg, domain, port, framework, buildCommand, startCommand, envVars, envContent, appDir, pm2Name: customPm2Name } = body;

  if (!name || !serverId) {
    return NextResponse.json({ message: "Name and server are required" }, { status: 400 });
  }
  if (!domain || !String(domain).trim()) {
    return NextResponse.json({ message: "Domain or subdomain is required" }, { status: 400 });
  }

  const resolvedPort = Number(port);
  if (!Number.isInteger(resolvedPort) || resolvedPort < 1 || resolvedPort > 65535) {
    return NextResponse.json({ message: "Valid port is required" }, { status: 400 });
  }

  const existing = await DeployProject.findOne({ server: serverId, port: resolvedPort });
  if (existing) return NextResponse.json({ message: `Port ${resolvedPort} already in use on this server` }, { status: 409 });

  const pm2Name = customPm2Name
    ? String(customPm2Name).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 50)
    : name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 50);
  const cleanedRepo = repo ? cleanRepoSlug(repo) : "";

  const server = await DeployServer.findById(serverId);
  const sshUser = server?.sshUser || "root";
  const defaultDir = sshUser === "root" ? `/root/apps/${pm2Name}` : `/home/${sshUser}/apps/${pm2Name}`;

  // Parse envContent into envVars Map for backward compat
  let resolvedEnvVars = envVars || {};
  const resolvedEnvContent = envContent || "";
  if (resolvedEnvContent && (!envVars || Object.keys(envVars).length === 0)) {
    const parsed: Record<string, string> = {};
    for (const line of resolvedEnvContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) parsed[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
    resolvedEnvVars = parsed;
  }

  const project = await DeployProject.create({
    name,
    group: groupId || null,
    server: serverId,
    repo: cleanedRepo,
    branch,
    githubOrg,
    domain,
    port: resolvedPort,
    framework: framework || "node",
    buildCommand: buildCommand || "",
    startCommand: startCommand || "npm start",
    envVars: resolvedEnvVars,
    envContent: resolvedEnvContent,
    pm2Name,
    appDir: appDir || defaultDir,
  });

  if (resolvedEnvContent) {
    await EnvHistory.create({
      project: project._id,
      content: resolvedEnvContent,
      changedBy: admin.email,
    });
  }

  return NextResponse.json({
    project: {
      id: String(project._id),
      name: project.name,
      port: project.port,
      status: project.status,
    },
  }, { status: 201 });
}
