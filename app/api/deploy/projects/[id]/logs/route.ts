import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeploymentLog } from "@/models/DeploymentLog";
import { DeployProject } from "@/models/DeployProject";
import { DeployServer } from "@/models/DeployServer";
import { sshExec } from "@/lib/deploy/ssh";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const { searchParams } = new URL(req.url);
  const logId = searchParams.get("logId");
  const logType = searchParams.get("type");

  if (logType === "pm2" || logType === "server") {
    const project = await DeployProject.findById(id).lean();
    if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });
    const server = await DeployServer.findById(project.server).lean();
    if (!server) return NextResponse.json({ message: "Server not found" }, { status: 404 });

    const pm2Name = project.pm2Name || project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const lines = searchParams.get("lines") || "100";

    try {
      let cmd: string;
      if (logType === "pm2") {
        cmd = `pm2 logs ${pm2Name} --nostream --lines ${lines} 2>&1 || echo "No PM2 logs available"`;
      } else {
        const domain = project.domain;
        if (domain) {
          cmd = `tail -n ${lines} /var/log/nginx/${domain}*.log 2>/dev/null || tail -n ${lines} /var/log/nginx/access.log 2>/dev/null || echo "No server logs found"`;
        } else {
          cmd = `tail -n ${lines} /var/log/nginx/access.log 2>/dev/null || echo "No server logs found"`;
        }
      }
      const result = await sshExec(server as any, cmd);
      return NextResponse.json({ logs: result.stdout || result.stderr || "No logs available" });
    } catch (err: any) {
      return NextResponse.json({ logs: `Error fetching logs: ${err.message}` });
    }
  }

  if (logId) {
    const log = await DeploymentLog.findById(logId).lean();
    if (!log) return NextResponse.json({ message: "Log not found" }, { status: 404 });
    return NextResponse.json({
      log: {
        id: String(log._id),
        action: log.action,
        status: log.status,
        logs: log.logs,
        commit: log.commit,
        branch: log.branch,
        triggeredBy: log.triggeredBy,
        createdAt: log.createdAt,
      },
    });
  }

  const logs = await DeploymentLog.find({ project: id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: String(l._id),
      action: l.action,
      status: l.status,
      logs: l.logs,
      commit: l.commit,
      branch: l.branch,
      triggeredBy: l.triggeredBy,
      createdAt: l.createdAt,
    })),
  });
}
