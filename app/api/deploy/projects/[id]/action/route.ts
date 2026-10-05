import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeployProject } from "@/models/DeployProject";
import { DeployServer } from "@/models/DeployServer";
import { deployProject, restartProject, stopProject } from "@/lib/deploy/deployer";
import { sshExec, sudo } from "@/lib/deploy/ssh";
import { generateNginxConfig } from "@/lib/deploy/nginx";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireDeploymentsAdmin();
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const project = await DeployProject.findById(id);
  if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const { action } = await req.json();

  try {
    switch (action) {
      case "deploy":
      case "redeploy": {
        const isRedeploy = action === "redeploy";
        const result = await deployProject(project, admin.email, undefined, undefined, {
          action: isRedeploy ? "redeploy" : "deploy",
          skipDomainSetup: isRedeploy,
          skipSslSetup: isRedeploy,
        });
        return NextResponse.json(result);
      }
      case "restart": {
        const result = await restartProject(project, admin.email);
        return NextResponse.json(result);
      }
      case "stop": {
        const result = await stopProject(project, admin.email);
        return NextResponse.json(result);
      }
      case "fix-nginx":
      case "reconfiguration": {
        const server = await DeployServer.findById(project.server);
        if (!server) return NextResponse.json({ message: "Server not found" }, { status: 404 });
        if (!project.domain) return NextResponse.json({ message: "No domain configured" }, { status: 400 });

        const s = sudo(server);
        const nginxBase = "/etc/nginx";
        const domain = project.domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
        const pm2Name = project.pm2Name || project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 50);

        // Detect layout from nginx.conf includes
        const includesRes = await sshExec(server, `${s}grep -E '^\\s*include\\s+' ${nginxBase}/nginx.conf 2>/dev/null | grep -v '#'`);
        const inc = (includesRes.stdout || "").toLowerCase();
        const useConfD = inc.includes("conf.d");
        const useSitesEnabled = inc.includes("sites-enabled");

        // Remove stale configs from ALL locations
        await sshExec(server, `${s}rm -f ${nginxBase}/conf.d/${pm2Name}.conf ${nginxBase}/sites-available/${pm2Name} ${nginxBase}/sites-enabled/${pm2Name} 2>/dev/null || true`);

        // Check if cert exists → generate SSL config if so
        const certCheck = await sshExec(server, `test -d /etc/letsencrypt/live/${domain} && echo yes || echo no`);
        const hasCert = certCheck.stdout.trim() === "yes";
        const nginxConf = generateNginxConfig({ domain, port: project.port, appName: pm2Name, ssl: hasCert });
        const escaped = nginxConf.replace(/'/g, "'\\''");

        let confPath: string;
        if (useSitesEnabled) {
          confPath = `${nginxBase}/sites-available/${pm2Name}`;
          await sshExec(server, `${s}mkdir -p ${nginxBase}/sites-available ${nginxBase}/sites-enabled`);
          await sshExec(server, `echo '${escaped}' | ${s}tee ${confPath} > /dev/null`);
          await sshExec(server, `${s}ln -sf ${confPath} ${nginxBase}/sites-enabled/${pm2Name}`);
          await sshExec(server, `${s}rm -f ${nginxBase}/sites-enabled/default 2>/dev/null || true`);
        } else if (useConfD) {
          confPath = `${nginxBase}/conf.d/${pm2Name}.conf`;
          await sshExec(server, `${s}mkdir -p ${nginxBase}/conf.d`);
          await sshExec(server, `echo '${escaped}' | ${s}tee ${confPath} > /dev/null`);
        } else {
          confPath = `${nginxBase}/conf.d/${pm2Name}.conf`;
          await sshExec(server, `${s}mkdir -p ${nginxBase}/conf.d`);
          await sshExec(server, `echo '${escaped}' | ${s}tee ${confPath} > /dev/null`);
          await sshExec(server, `${s}sed -i '/http\\s*{/a\\    include ${nginxBase}/conf.d/*.conf;' ${nginxBase}/nginx.conf 2>/dev/null`);
        }

        const testRes = await sshExec(server, `${s}nginx -t 2>&1`);
        if (testRes.code !== 0) {
          return NextResponse.json({ success: false, message: `nginx -t failed: ${(testRes.stdout || testRes.stderr).trim()}` });
        }

        await sshExec(server, `${s}systemctl restart nginx 2>&1 || ${s}systemctl start nginx 2>&1 || ${s}nginx -s reload 2>&1`);

        const verify = await sshExec(server, `${s}nginx -T 2>/dev/null | grep -c 'server_name.*${domain}' || echo 0`);
        const loaded = parseInt(verify.stdout.trim(), 10) > 0;

        return NextResponse.json({
          success: loaded,
          message: loaded
            ? `Reconfiguration completed: ${domain} → port ${project.port} (${hasCert ? "SSL" : "HTTP"}) via ${confPath}`
            : `Config written to ${confPath} but Nginx may need manual attention`,
        });
      }
      case "reload-server": {
        const server = await DeployServer.findById(project.server);
        if (!server) return NextResponse.json({ message: "Server not found" }, { status: 404 });
        const s = sudo(server);
        const reload = await sshExec(server, `${s}systemctl reload nginx 2>&1`);
        if (reload.code === 0) {
          return NextResponse.json({ success: true, message: "Server reloaded (nginx reload successful)" });
        }
        const restart = await sshExec(server, `${s}systemctl restart nginx 2>&1`);
        if (restart.code === 0) {
          return NextResponse.json({ success: true, message: "Server reloaded (nginx restart successful)" });
        }
        return NextResponse.json({
          success: false,
          message: (reload.stderr || reload.stdout || restart.stderr || restart.stdout || "Failed to reload server").trim(),
        });
      }
      default:
        return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Action failed" }, { status: 500 });
  }
}
