import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeployServer } from "@/models/DeployServer";
import { sshExec, sudo, sudoShell } from "@/lib/deploy/ssh";
import { decrypt } from "@/lib/deploy/encryption";
import { DeploySettings } from "@/models/DeploySettings";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireDeploymentsAdmin()))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const server = await DeployServer.findById(id);
  if (!server)
    return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json();
  const { action } = body as { action: string };

  switch (action) {
    case "home-dir": {
      try {
        const result = await sshExec(server, "echo $HOME");
        const home = result.stdout.trim() || "/root";
        return NextResponse.json({ home });
      } catch (err: any) {
        return NextResponse.json({ home: "/root", error: err.message });
      }
    }

    case "files": {
      const dir = body.path || "~";
      try {
        const result = await sshExec(
          server,
          `ls -lAhp --time-style=long-iso "${dir}" 2>&1 | tail -n +2`
        );
        if (result.code !== 0)
          return NextResponse.json({
            files: [],
            error: result.stderr || result.stdout,
          });

        const files = result.stdout
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const parts = line.split(/\s+/);
            if (parts.length < 8) return null;
            const perms = parts[0];
            const size = parts[4];
            const date = parts[5];
            const time = parts[6];
            const name = parts.slice(7).join(" ");
            if (name === "./" || name === "../") return null;
            const isDir = perms.startsWith("d") || name.endsWith("/");
            return {
              name: name.replace(/\/$/, ""),
              isDir,
              size,
              modified: `${date} ${time}`,
              perms,
            };
          })
          .filter(Boolean);

        return NextResponse.json({ files, path: dir });
      } catch (err: any) {
        return NextResponse.json({
          files: [],
          error: err.message,
        });
      }
    }

    case "pm2": {
      try {
        const result = await sshExec(server, "pm2 jlist 2>/dev/null");
        if (result.code !== 0 || !result.stdout.trim())
          return NextResponse.json({ processes: [], error: "PM2 not found or no processes" });

        const processes = JSON.parse(result.stdout.trim()).map((p: any) => ({
          name: p.name,
          pmId: p.pm_id,
          status: p.pm2_env?.status || "unknown",
          cpu: p.monit?.cpu || 0,
          memory: p.monit?.memory || 0,
          uptime: p.pm2_env?.pm_uptime || 0,
          restarts: p.pm2_env?.restart_time || 0,
          pid: p.pid,
          mode: p.pm2_env?.exec_mode || "fork",
          nodeVersion: p.pm2_env?.node_version || "",
        }));

        return NextResponse.json({ processes });
      } catch (err: any) {
        return NextResponse.json({ processes: [], error: err.message });
      }
    }

    case "pm2-action": {
      const { pmAction, processName } = body as { pmAction: string; processName: string };
      if (!pmAction || !processName)
        return NextResponse.json({ message: "Missing action or process name" }, { status: 400 });

      const allowed = ["restart", "stop", "start", "delete"];
      if (!allowed.includes(pmAction))
        return NextResponse.json({ message: `Invalid action: ${pmAction}` }, { status: 400 });

      try {
        const result = await sshExec(server, `pm2 ${pmAction} ${JSON.stringify(processName)} 2>&1`);
        const output = (result.stdout || result.stderr).trim();
        if (result.code !== 0)
          return NextResponse.json({ ok: false, message: output || `pm2 ${pmAction} failed` });
        return NextResponse.json({ ok: true, message: output });
      } catch (err: any) {
        return NextResponse.json({ ok: false, message: err.message });
      }
    }

    case "resources": {
      const forceRefresh = body.refresh === true;
      const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
      if (
        !forceRefresh &&
        server.cachedResources &&
        server.cachedResourcesAt &&
        Date.now() - new Date(server.cachedResourcesAt).getTime() < CACHE_TTL
      ) {
        return NextResponse.json({
          ...server.cachedResources,
          topOutput: "",
          cached: true,
          cachedAt: server.cachedResourcesAt,
        });
      }

      try {
        const [cpuDetail, memDetail, diskDetail, topResult, uptimeResult] =
          await Promise.all([
            sshExec(server, `nproc && grep 'model name' /proc/cpuinfo | head -1 | cut -d: -f2`),
            sshExec(server, `free -b | awk '/Mem:/ {print $2, $3, $4, $7}'`),
            sshExec(server, `df -B1 / | tail -1 | awk '{print $2, $3, $4, $5}'`),
            sshExec(server, `top -bn1 -o %CPU | head -20`),
            sshExec(server, `uptime -p 2>/dev/null || uptime`),
          ]);

        const cpuParts = cpuDetail.stdout.trim().split("\n");
        const memParts = memDetail.stdout.trim().split(" ");
        const diskParts = diskDetail.stdout.trim().split(" ");

        const memTotal = parseInt(memParts[0]) || 0;
        const memUsed = parseInt(memParts[1]) || 0;
        const diskTotal = parseInt(diskParts[0]) || 0;
        const diskUsed = parseInt(diskParts[1]) || 0;

        const resourceData = {
          cpu: {
            cores: parseInt(cpuParts[0]) || 1,
            model: (cpuParts[1] || "").trim(),
          },
          memory: {
            total: memTotal,
            used: memUsed,
            percent: memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0,
          },
          disk: {
            total: diskTotal,
            used: diskUsed,
            percent: diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0,
          },
          uptime: uptimeResult.stdout.trim(),
        };

        await DeployServer.findByIdAndUpdate(id, {
          cachedResources: resourceData,
          cachedResourcesAt: new Date(),
          status: "connected",
          lastCheckedAt: new Date(),
        });

        return NextResponse.json({
          ...resourceData,
          topOutput: topResult.stdout,
          cached: false,
          cachedAt: new Date(),
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message });
      }
    }

    case "credentials": {
      try {
        const result: { authMethod: string; password?: string; privateKey?: string } = {
          authMethod: server.authMethod,
        };
        if (server.encryptedPassword) {
          result.password = decrypt(server.encryptedPassword);
        }
        if (server.encryptedKey) {
          result.privateKey = decrypt(server.encryptedKey);
        }
        return NextResponse.json(result);
      } catch (err: any) {
        return NextResponse.json(
          { message: err.message || "Failed to decrypt credentials" },
          { status: 500 }
        );
      }
    }

    case "download-file": {
      const { path: filePath } = body as { path: string };
      if (!filePath?.trim())
        return NextResponse.json({ message: "No path" }, { status: 400 });

      try {
        const sizeResult = await sshExec(
          server,
          `stat -c%s "${filePath}" 2>/dev/null || echo "0"`
        );
        const fileSize = parseInt(sizeResult.stdout.trim()) || 0;
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit
        if (fileSize > MAX_SIZE)
          return NextResponse.json(
            { message: `File too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Max 10MB.` },
            { status: 400 }
          );

        const result = await sshExec(
          server,
          `base64 "${filePath}" 2>&1`
        );
        if (result.code !== 0)
          return NextResponse.json(
            { message: result.stderr || result.stdout || "Failed to read file" },
            { status: 400 }
          );

        const fileName = filePath.split("/").pop() || "download";
        const fileBuffer = Buffer.from(result.stdout.trim(), "base64");

        return new Response(fileBuffer, {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${fileName}"`,
            "Content-Length": String(fileBuffer.length),
          },
        });
      } catch (err: any) {
        return NextResponse.json(
          { message: err.message || "Failed to download file" },
          { status: 500 }
        );
      }
    }

    case "detect-apps":
    case "detect-services": {
      const forceRescan = body.refresh === true;
      const SVC_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

      if (
        !forceRescan &&
        server.cachedServices &&
        server.cachedServicesAt &&
        Date.now() - new Date(server.cachedServicesAt).getTime() < SVC_CACHE_TTL
      ) {
        return NextResponse.json({
          services: server.cachedServices,
          domainResults: server.cachedDomainResults || {},
          cached: true,
          cachedAt: server.cachedServicesAt,
        });
      }

      try {
        // 1. Parse every nginx site-enabled config: extract server_name, proxy_pass port, root
        const nginxResult = await sshExec(
          server,
          `for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf 2>/dev/null; do [ -f "$f" ] && echo "___FILE:$f" && cat "$f" 2>/dev/null; done`
        ).catch(() => ({ stdout: "", code: 1 } as any));

        interface NginxSite { domain: string; port?: number; root?: string; configFile: string; ssl: boolean }
        const nginxSites: NginxSite[] = [];

        if (nginxResult.stdout) {
          let currentFile = "";
          let currentDomains: string[] = [];
          let currentPort: number | undefined;
          let currentRoot: string | undefined;
          let currentSsl = false;

          const flushBlock = () => {
            for (const d of currentDomains) {
              nginxSites.push({ domain: d, port: currentPort, root: currentRoot, configFile: currentFile, ssl: currentSsl });
            }
            currentDomains = []; currentPort = undefined; currentRoot = undefined; currentSsl = false;
          };

          for (const line of nginxResult.stdout.split("\n")) {
            if (line.startsWith("___FILE:")) {
              flushBlock();
              currentFile = line.slice(8);
              continue;
            }
            const trimmed = line.trim();
            const snMatch = trimmed.match(/server_name\s+([^;]+)/);
            if (snMatch) {
              const domains = snMatch[1].trim().split(/\s+/).filter((d: string) => d !== "_" && d !== "localhost" && d !== "default_server" && d.includes("."));
              currentDomains.push(...domains);
            }
            const ppMatch = trimmed.match(/proxy_pass\s+https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/);
            if (ppMatch) currentPort = parseInt(ppMatch[1]);
            const rootMatch = trimmed.match(/^\s*root\s+([^;]+)/);
            if (rootMatch) currentRoot = rootMatch[1].trim();
            if (trimmed.includes("ssl_certificate") || trimmed.includes("listen 443")) currentSsl = true;
          }
          flushBlock();
        }

        // 2. Get all PM2 processes with cwd and port info
        const pm2Result = await sshExec(server, "pm2 jlist 2>/dev/null").catch(() => ({ stdout: "", code: 1 } as any));
        interface Pm2App { name: string; pmId: number; status: string; cpu: number; memory: number; uptime: number; restarts: number; pid: number; cwd: string; port?: number; script: string }
        const pm2Apps: Pm2App[] = [];

        if (pm2Result.code === 0 && pm2Result.stdout.trim()) {
          try {
            const processes = JSON.parse(pm2Result.stdout.trim());
            for (const p of processes) {
              const env = p.pm2_env || {};
              const portFromEnv = env.env?.PORT || env.PORT || null;
              pm2Apps.push({
                name: p.name,
                pmId: p.pm_id,
                status: env.status || "unknown",
                cpu: p.monit?.cpu || 0,
                memory: p.monit?.memory || 0,
                uptime: env.pm_uptime || 0,
                restarts: env.restart_time || 0,
                pid: p.pid,
                cwd: env.pm_cwd || "",
                port: portFromEnv ? parseInt(portFromEnv) : undefined,
                script: env.pm_exec_path || "",
              });
            }
          } catch { }
        }

        // 3. For each PM2 app, check git info
        interface DetectedService {
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

        const services: DetectedService[] = [];
        const portMap = new Map<number, DetectedService>();

        for (const pm of pm2Apps) {
          let repo = "";
          let branch = "";
          let hasGit = false;
          if (pm.cwd) {
            const gitResult = await sshExec(server, `cd "${pm.cwd}" && git remote get-url origin 2>/dev/null && git branch --show-current 2>/dev/null`).catch(() => null);
            if (gitResult?.stdout) {
              const lines = gitResult.stdout.trim().split("\n");
              repo = lines[0] || "";
              branch = lines[1] || "";
              hasGit = true;
            }
          }

          // Try to detect port from listening sockets if not in env
          let port = pm.port;
          if (!port && pm.pid > 0) {
            const portResult = await sshExec(server, `${sudo(server)}ss -tlnp 2>/dev/null | grep "pid=${pm.pid}," | head -1 | awk '{print $4}' | rev | cut -d: -f1 | rev`).catch(() => null);
            if (portResult?.stdout) port = parseInt(portResult.stdout.trim()) || undefined;
          }

          // Match with nginx site
          const nginxMatch = port ? nginxSites.find((ns) => ns.port === port) : undefined;

          const svc: DetectedService = {
            name: pm.name,
            port,
            repo, branch, hasGit,
            appDir: pm.cwd,
            pm2Name: pm.name,
            pm2Status: pm.status,
            pm2Cpu: pm.cpu,
            pm2Mem: pm.memory,
            pm2Restarts: pm.restarts,
            pm2Uptime: pm.uptime,
            pm2Id: pm.pmId,
            domain: nginxMatch?.domain,
            ssl: nginxMatch?.ssl,
            nginxConfig: nginxMatch?.configFile,
            source: "pm2",
          };
          services.push(svc);
          if (port) portMap.set(port, svc);
        }

        // 4. Add nginx sites that have no matching PM2 process
        for (const ns of nginxSites) {
          if (ns.port && portMap.has(ns.port)) continue;
          const svc: DetectedService = {
            name: ns.domain,
            domain: ns.domain,
            port: ns.port,
            ssl: ns.ssl,
            nginxConfig: ns.configFile,
            hasGit: false,
            source: "nginx",
          };
          // Check if root dir has a git repo
          if (ns.root) {
            const gitResult = await sshExec(server, `cd "${ns.root}" && git remote get-url origin 2>/dev/null && git branch --show-current 2>/dev/null`).catch(() => null);
            if (gitResult?.stdout) {
              const lines = gitResult.stdout.trim().split("\n");
              svc.repo = lines[0] || "";
              svc.branch = lines[1] || "";
              svc.hasGit = true;
              svc.appDir = ns.root;
            }
          }
          services.push(svc);
          if (ns.port) portMap.set(ns.port, svc);
        }

        // 5. Domain health checks
        const domainResults: Record<string, { status: "up" | "down" | "unknown"; code?: number }> = {};
        const domains = services.map((s) => s.domain).filter(Boolean) as string[];
        for (const domain of [...new Set(domains)].slice(0, 20)) {
          try {
            const result = await sshExec(
              server,
              `curl -o /dev/null -s -w "%{http_code}" --max-time 5 "https://${domain}" 2>/dev/null || curl -o /dev/null -s -w "%{http_code}" --max-time 5 "http://${domain}" 2>/dev/null`
            );
            const code = parseInt(result.stdout.trim()) || 0;
            domainResults[domain] = { status: code >= 200 && code < 500 ? "up" : "down", code };
          } catch {
            domainResults[domain] = { status: "unknown" };
          }
        }

        await DeployServer.findByIdAndUpdate(id, {
          cachedServices: services,
          cachedDomainResults: domainResults,
          cachedServicesAt: new Date(),
        });

        return NextResponse.json({ services, domainResults, cached: false, cachedAt: new Date() });
      } catch (err: any) {
        if (server.cachedServices) {
          return NextResponse.json({
            services: server.cachedServices,
            domainResults: server.cachedDomainResults || {},
            cached: true,
            cachedAt: server.cachedServicesAt,
            error: err.message,
          });
        }
        return NextResponse.json({ services: [], domainResults: {}, error: err.message });
      }
    }

    case "domain-check": {
      const { domains } = body as { domains: string[] };
      if (!domains?.length)
        return NextResponse.json({ results: {} });

      const results: Record<string, { status: "up" | "down" | "unknown"; code?: number }> = {};
      for (const domain of domains.slice(0, 20)) {
        try {
          const result = await sshExec(
            server,
            `curl -o /dev/null -s -w "%{http_code}" --max-time 5 "https://${domain}" 2>/dev/null || curl -o /dev/null -s -w "%{http_code}" --max-time 5 "http://${domain}" 2>/dev/null`
          );
          const code = parseInt(result.stdout.trim()) || 0;
          results[domain] = { status: code >= 200 && code < 500 ? "up" : "down", code };
        } catch {
          results[domain] = { status: "unknown" };
        }
      }
      return NextResponse.json({ results });
    }

    case "optimize": {
      const { command: optCmd } = body as { command: string };
      if (!optCmd?.trim())
        return NextResponse.json({ message: "No command" }, { status: 400 });

      try {
        // Auto-inject GitHub token for any command that involves git
        let finalCmd = optCmd;
        if (/\bgit\b/.test(optCmd)) {
          try {
            const settings = await DeploySettings.findOne().lean();
            if (settings?.encryptedGithubToken) {
              const ghToken = decrypt(settings.encryptedGithubToken);
              finalCmd = `git config --global url."https://${ghToken}@github.com/".insteadOf "https://github.com/" 2>/dev/null; git config --global url."https://${ghToken}@github.com/".insteadOf "git@github.com:" 2>/dev/null; GIT_TERMINAL_PROMPT=0 ${optCmd}`;
            }
          } catch { }
        }
        const result = await sshExec(server, sudoShell(server, `${finalCmd} 2>&1`));
        const output = (result.stdout || "") + (result.stderr || "");
        if (result.code !== 0 && !output.trim()) {
          return NextResponse.json({
            ok: false,
            output: `Command exited with code ${result.code}. sudo may require a password ~ configure NOPASSWD in /etc/sudoers for ${server.sshUser}.`,
            code: result.code,
          });
        }
        return NextResponse.json({
          ok: result.code === 0,
          output: output.trim(),
          code: result.code,
        });
      } catch (err: any) {
        return NextResponse.json({ ok: false, output: err.message, code: 1 });
      }
    }

    case "quick-deploy": {
      const { appDir, branch, pm2Name, repo } = body as {
        appDir: string;
        branch?: string;
        pm2Name?: string;
        repo?: string;
      };
      if (!appDir?.trim())
        return NextResponse.json({ message: "No appDir" }, { status: 400 });

      try {
        let ghToken = "";
        try {
          const settings = await DeploySettings.findOne().lean();
          if (settings?.encryptedGithubToken)
            ghToken = decrypt(settings.encryptedGithubToken);
        } catch { }

        const br = branch || "main";
        const steps: string[] = [];

        if (ghToken && repo) {
          const slug = repo
            .replace(/^https?:\/\/github\.com\//, "")
            .replace(/^github\.com\//, "")
            .replace(/\.git$/, "")
            .trim();
          const tokenUrl = `https://${ghToken}@github.com/${slug}.git`;
          steps.push(`cd "${appDir}" && git remote set-url origin '${tokenUrl}'`);
        } else if (ghToken) {
          steps.push(
            `cd "${appDir}" && CURRENT_URL=$(git remote get-url origin 2>/dev/null) && ` +
            `if echo "$CURRENT_URL" | grep -q 'github.com'; then ` +
            `SLUG=$(echo "$CURRENT_URL" | sed -E 's|.*github\\.com[:/]||;s|\\.git$||') && ` +
            `git remote set-url origin "https://${ghToken}@github.com/$SLUG.git"; fi`
          );
        }

        steps.push(`cd "${appDir}" && GIT_TERMINAL_PROMPT=0 git fetch --all && git checkout ${br} && git pull origin ${br}`);
        steps.push(`cd "${appDir}" && npm install 2>&1`);
        if (pm2Name) {
          steps.push(`pm2 restart ${JSON.stringify(pm2Name)} 2>&1 && pm2 save`);
        }

        const fullCmd = steps.join(" && ");
        const result = await sshExec(server, fullCmd);
        const output = ((result.stdout || "") + (result.stderr || "")).trim();
        return NextResponse.json({
          ok: result.code === 0,
          output: output || (result.code === 0 ? "Deploy complete" : "Deploy failed"),
          code: result.code,
        });
      } catch (err: any) {
        return NextResponse.json({ ok: false, output: err.message, code: 1 });
      }
    }

    case "pm2-restart-all": {
      try {
        const result = await sshExec(server, "pm2 restart all 2>&1");
        const output = (result.stdout || result.stderr).trim();
        return NextResponse.json({ ok: result.code === 0, message: output || "All processes restarted" });
      } catch (err: any) {
        return NextResponse.json({ ok: false, message: err.message });
      }
    }

    case "pm2-flush": {
      try {
        const result = await sshExec(server, "pm2 flush 2>&1");
        const output = (result.stdout || result.stderr).trim();
        return NextResponse.json({ ok: result.code === 0, message: output || "Logs flushed" });
      } catch (err: any) {
        return NextResponse.json({ ok: false, message: err.message });
      }
    }

    case "pm2-save": {
      try {
        const result = await sshExec(server, "pm2 save 2>&1");
        const output = (result.stdout || result.stderr).trim();
        return NextResponse.json({ ok: result.code === 0, message: output || "PM2 process list saved" });
      } catch (err: any) {
        return NextResponse.json({ ok: false, message: err.message });
      }
    }

    case "pm2-logs": {
      const { processName, lines = 100 } = body as { processName?: string; lines?: number };
      try {
        const cmd = processName
          ? `pm2 logs ${JSON.stringify(processName)} --nostream --lines ${lines} 2>&1`
          : `pm2 logs --nostream --lines ${lines} 2>&1`;
        const result = await sshExec(server, cmd);
        return NextResponse.json({ ok: true, output: (result.stdout || result.stderr).trim() });
      } catch (err: any) {
        return NextResponse.json({ ok: false, output: err.message });
      }
    }

    case "login-attempts": {
      try {
        const s = sudo(server);
        const result = await sshExec(
          server,
          `${s}bash -c '
            if [ -f /var/log/auth.log ]; then
              grep -E "sshd\\[.*\\]: (Accepted|Failed)" /var/log/auth.log 2>/dev/null | tail -200
            elif [ -f /var/log/secure ]; then
              grep -E "sshd\\[.*\\]: (Accepted|Failed)" /var/log/secure 2>/dev/null | tail -200
            else
              journalctl -u sshd -n 200 --no-pager 2>/dev/null | grep -E "(Accepted|Failed)" || echo "NO_LOG_SOURCE"
            fi
          '`
        );
        const raw = result.stdout.trim();
        if (raw === "NO_LOG_SOURCE") {
          return NextResponse.json({ attempts: [], error: "No SSH log source found" });
        }

        const attempts = raw.split("\n").filter(Boolean).map((line) => {
          const success = line.includes("Accepted");
          const userMatch = line.match(/(?:Accepted|Failed)\s+\S+\s+for\s+(?:invalid user\s+)?(\S+)/);
          const ipMatch = line.match(/from\s+(\S+)/);
          const dateMatch = line.match(/^(\w+\s+\d+\s+[\d:]+)/);
          return {
            success,
            user: userMatch?.[1] || "unknown",
            ip: ipMatch?.[1] || "unknown",
            time: dateMatch?.[1] || line.slice(0, 15),
            raw: line,
          };
        }).reverse();

        return NextResponse.json({ attempts });
      } catch (err: any) {
        return NextResponse.json({ attempts: [], error: err.message });
      }
    }

    case "nginx-diagnose": {
      try {
        const s = sudo(server);
        const nginxBase = "/etc/nginx";

        const [includesRes, confDRes, sitesRes, statusRes, fullDump] = await Promise.all([
          sshExec(server, `${s}grep -E '^\\s*include\\s+' ${nginxBase}/nginx.conf 2>/dev/null | grep -v '#'`),
          sshExec(server, `ls -la ${nginxBase}/conf.d/ 2>/dev/null || echo "NO_CONFD"`),
          sshExec(server, `ls -la ${nginxBase}/sites-enabled/ 2>/dev/null || echo "NO_SITES_ENABLED"`),
          sshExec(server, `${s}systemctl status nginx 2>&1 || ${s}nginx -t 2>&1`),
          sshExec(server, `${s}nginx -T 2>/dev/null | grep -E '(server_name|proxy_pass|listen|include|# configuration file)' | head -80`),
        ]);

        return NextResponse.json({
          ok: true,
          includes: includesRes.stdout.trim(),
          confDFiles: confDRes.stdout.trim(),
          sitesEnabledFiles: sitesRes.stdout.trim(),
          nginxStatus: statusRes.stdout.trim().slice(0, 2000),
          serverBlocks: fullDump.stdout.trim(),
        });
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message });
      }
    }

    case "nginx-fix": {
      const { domain, port, pm2Name: appName } = body as { domain: string; port: number; pm2Name: string };
      if (!domain || !port || !appName)
        return NextResponse.json({ message: "Missing domain, port, or pm2Name" }, { status: 400 });

      try {
        const s = sudo(server);
        const nginxBase = "/etc/nginx";
        const { generateNginxConfig } = await import("@/lib/deploy/nginx");

        // Detect correct layout
        const includesRes = await sshExec(server, `${s}grep -E '^\\s*include\\s+' ${nginxBase}/nginx.conf 2>/dev/null | grep -v '#'`);
        const lines = (includesRes.stdout || "").toLowerCase();
        const useConfD = lines.includes("conf.d");
        const useSitesEnabled = lines.includes("sites-enabled");

        // Clean up from ALL possible locations
        await sshExec(server, `${s}rm -f ${nginxBase}/conf.d/${appName}.conf ${nginxBase}/sites-available/${appName} ${nginxBase}/sites-enabled/${appName} 2>/dev/null || true`);

        const nginxConf = generateNginxConfig({ domain, port, appName });
        const escaped = nginxConf.replace(/'/g, "'\\''");

        let confPath: string;
        if (useSitesEnabled) {
          confPath = `${nginxBase}/sites-available/${appName}`;
          await sshExec(server, `${s}mkdir -p ${nginxBase}/sites-available ${nginxBase}/sites-enabled`);
          await sshExec(server, `echo '${escaped}' | ${s}tee ${confPath} > /dev/null`);
          await sshExec(server, `${s}ln -sf ${confPath} ${nginxBase}/sites-enabled/${appName}`);
          await sshExec(server, `${s}rm -f ${nginxBase}/sites-enabled/default 2>/dev/null || true`);
        } else if (useConfD) {
          confPath = `${nginxBase}/conf.d/${appName}.conf`;
          await sshExec(server, `${s}mkdir -p ${nginxBase}/conf.d`);
          await sshExec(server, `echo '${escaped}' | ${s}tee ${confPath} > /dev/null`);
        } else {
          // Neither included ~ add conf.d include and write there
          confPath = `${nginxBase}/conf.d/${appName}.conf`;
          await sshExec(server, `${s}mkdir -p ${nginxBase}/conf.d`);
          await sshExec(server, `echo '${escaped}' | ${s}tee ${confPath} > /dev/null`);
          await sshExec(server, `${s}sed -i '/http\\s*{/a\\    include ${nginxBase}/conf.d/*.conf;' ${nginxBase}/nginx.conf 2>/dev/null`);
        }

        const testRes = await sshExec(server, `${s}nginx -t 2>&1`);
        if (testRes.code !== 0) {
          return NextResponse.json({ ok: false, message: `nginx -t failed: ${testRes.stdout || testRes.stderr}` });
        }

        // Restart nginx
        const restart = await sshExec(server, `${s}systemctl restart nginx 2>&1 || ${s}systemctl start nginx 2>&1 || ${s}nginx -s reload 2>&1`);

        // Verify
        const verify = await sshExec(server, `${s}nginx -T 2>/dev/null | grep -c 'server_name.*${domain}' || echo 0`);
        const loaded = parseInt(verify.stdout.trim(), 10) > 0;

        return NextResponse.json({
          ok: true,
          confPath,
          loaded,
          testOutput: (testRes.stdout || testRes.stderr).trim(),
          restartOutput: (restart.stdout || restart.stderr).trim(),
          message: loaded
            ? `Nginx configured for ${domain} → port ${port}`
            : `Config written to ${confPath} but server block not detected in nginx -T`,
        });
      } catch (err: any) {
        return NextResponse.json({ ok: false, message: err.message });
      }
    }

    case "install-custom": {
      const { command } = body as { command: string };
      if (!command?.trim())
        return NextResponse.json({ message: "No command" }, { status: 400 });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          function send(data: Record<string, unknown>) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }

          send({ type: "start" });
          try {
            const pmResult = await sshExec(
              server,
              "command -v apt-get >/dev/null 2>&1 && echo apt || (command -v dnf >/dev/null 2>&1 && echo dnf || (command -v yum >/dev/null 2>&1 && echo yum || echo none))"
            );
            const pm = pmResult.stdout.trim();
            const envPrefix = pm === "apt" ? "export DEBIAN_FRONTEND=noninteractive && " : "";
            send({ type: "log", data: `Package manager: ${pm}` });

            const result = await sshExec(
              server,
              sudoShell(server, `${envPrefix}${command} 2>&1`)
            );
            if (result.stdout) send({ type: "log", data: result.stdout });
            if (result.stderr) send({ type: "log", data: result.stderr });
            send({
              type: result.code === 0 ? "done" : "error",
              data:
                result.code === 0
                  ? "Command completed successfully"
                  : `Exit code: ${result.code}`,
            });
          } catch (err: any) {
            send({ type: "error", data: err.message || String(err) });
          }
          send({ type: "complete" });
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    case "exec": {
      const command = (body.command || "").trim();
      if (!command)
        return NextResponse.json({ message: "No command provided" }, { status: 400 });

      const cwd = body.cwd || "~";
      const fullCmd = `cd ${cwd} 2>/dev/null; ${command}`;
      try {
        const result = await sshExec(server, fullCmd);
        return NextResponse.json({
          ok: true,
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code,
        });
      } catch (err: any) {
        return NextResponse.json({
          ok: false,
          stdout: "",
          stderr: err.message || String(err),
          code: 1,
        });
      }
    }

    default:
      return NextResponse.json(
        { message: "Unknown action" },
        { status: 400 }
      );
  }
}
