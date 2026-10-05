import { sshExec, sudo } from "./ssh";
import { generateNginxConfig } from "./nginx";
import { DeployProject, type IDeployProject } from "@/models/DeployProject";
import { DeployServer } from "@/models/DeployServer";
import { DeploymentLog } from "@/models/DeploymentLog";
import { DeploySettings } from "@/models/DeploySettings";
import { decrypt } from "./encryption";

type LogFn = (line: string) => void;

export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface DeployStepUpdate {
  stepId: string;
  status: StepStatus;
  detail?: string;
}

interface DeployExecutionOptions {
  skipDomainSetup?: boolean;
  skipSslSetup?: boolean;
  action?: "deploy" | "redeploy";
}

export const DEPLOY_STEPS = [
  { id: "connect", label: "Connecting to server" },
  { id: "clone", label: "Cloning repository" },
  { id: "env", label: "Setting up environment" },
  { id: "build", label: "Installing & building" },
  { id: "pm2", label: "Starting application" },
  { id: "nginx", label: "Configuring domain" },
  { id: "ssl", label: "Setting up SSL" },
  { id: "verify", label: "Verifying deployment" },
];

type StepFn = (update: DeployStepUpdate) => void;

async function appendLog(logId: string, line: string) {
  const doc = await DeploymentLog.findById(logId);
  if (doc) {
    doc.logs = (doc.logs || "") + line + "\n";
    await doc.save();
  }
}

function sanitizePm2Name(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

async function getGithubToken(): Promise<string> {
  const settings = await DeploySettings.findOne().lean();
  if (!settings?.encryptedGithubToken)
    throw new Error("GitHub token not configured");
  return decrypt(settings.encryptedGithubToken);
}

function cleanRepoSlug(repo: string): string {
  return repo
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .trim();
}

async function restartNginx(server: any, s: string): Promise<boolean> {
  // Try reload → restart → start in order; return true if nginx ends up running
  const reload = await sshExec(server, `${s}systemctl reload nginx 2>&1`);
  if (reload.code === 0) return true;
  const restart = await sshExec(server, `${s}systemctl restart nginx 2>&1`);
  if (restart.code === 0) return true;
  const sigReload = await sshExec(server, `${s}nginx -s reload 2>&1`);
  if (sigReload.code === 0) return true;
  const start = await sshExec(server, `${s}systemctl start nginx 2>&1`);
  return start.code === 0;
}

export async function deployProject(
  project: IDeployProject,
  triggeredBy: string,
  onStep?: StepFn,
  onLog?: LogFn,
  options: DeployExecutionOptions = {}
): Promise<{ success: boolean; logId: string }> {
  const server = await DeployServer.findById(project.server);
  if (!server) throw new Error("Server not found");

  const log = await DeploymentLog.create({
    project: project._id,
    action: options.action || (project.lastDeployAt ? "redeploy" : "deploy"),
    status: "running",
    branch: project.branch,
    triggeredBy,
  });
  const logId = String(log._id);

  const emit = async (line: string) => {
    await appendLog(logId, line);
    onLog?.(line);
  };

  const emitStep = (stepId: string, status: StepStatus, detail?: string) => {
    onStep?.({ stepId, status, detail });
  };

  const pm2Name = sanitizePm2Name(project.pm2Name || project.name);
  let appDir =
    project.appDir || `/home/${server.sshUser}/apps/${pm2Name}`;

  let currentStepId = "connect";

  try {
    await DeployProject.findByIdAndUpdate(project._id, {
      status: "deploying",
      appDir,
      pm2Name,
    });

    // 1. Connect
    currentStepId = "connect";
    emitStep("connect", "running");
    await emit("▶ Connecting to server...");
    const testConn = await sshExec(server, "echo connected");
    if (testConn.code !== 0) throw new Error("Failed to connect to server");
    emitStep("connect", "completed", `Connected to ${server.ip}`);

    // 2. Clone or pull
    currentStepId = "clone";
    if (project.repo) {
      emitStep("clone", "running");
      const ghToken = await getGithubToken();
      const slug = cleanRepoSlug(project.repo);
      const repoUrl = `https://${ghToken}@github.com/${slug}.git`;
      const s = sudo(server);

      // Ensure GitHub host key is in known_hosts to prevent "Host key verification failed"
      await sshExec(
        server,
        `mkdir -p ~/.ssh && ssh-keyscan -t ed25519,rsa github.com >> ~/.ssh/known_hosts 2>/dev/null && sort -u -o ~/.ssh/known_hosts ~/.ssh/known_hosts`
      );
      // Disable git credential prompts globally
      await sshExec(server, `git config --global credential.helper store 2>/dev/null; git config --global url."https://${ghToken}@github.com/".insteadOf "git@github.com:" 2>/dev/null; git config --global url."https://${ghToken}@github.com/".insteadOf "https://github.com/" 2>/dev/null`);

      const dirCheck = await sshExec(
        server,
        `test -d ${appDir}/.git && echo git || (test -d ${appDir} && echo nonempty || echo missing)`
      );
      const dirState = dirCheck.stdout.trim();

      if (dirState === "git") {
        await emit("📥 Pulling latest changes...");
        await sshExec(server, `cd ${appDir} && git remote set-url origin '${repoUrl}'`);
        const pull = await sshExec(
          server,
          `cd ${appDir} && GIT_TERMINAL_PROMPT=0 git fetch --all && git checkout ${project.branch} && GIT_TERMINAL_PROMPT=0 git pull origin ${project.branch}`
        );
        await emit(pull.stdout || pull.stderr);
        if (pull.code !== 0) throw new Error(`Pull failed: ${pull.stderr}`);
        emitStep("clone", "completed", "Pulled latest changes");
      } else {
        if (dirState === "nonempty") {
          await emit("⚠️ Directory exists without git ~ removing and re-cloning...");
          await sshExec(server, `${s}rm -rf ${appDir}`);
        }
        await emit(`📦 Cloning ${slug}...`);
        await sshExec(server, `${s}mkdir -p $(dirname ${appDir})`);
        const clone = await sshExec(
          server,
          `${s}GIT_TERMINAL_PROMPT=0 git clone -b ${project.branch} '${repoUrl}' ${appDir}`
        );
        await emit(clone.stdout || clone.stderr);
        if (clone.code !== 0) throw new Error(`Clone failed: ${clone.stderr}`);
        if (server.sshUser !== "root") {
          await sshExec(server, `${s}chown -R ${server.sshUser}:${server.sshUser} ${appDir}`);
        }
        emitStep("clone", "completed", "Repository cloned");
      }
    } else {
      emitStep("clone", "skipped", "No repository configured");
    }

    // 3. Write .env
    currentStepId = "env";
    emitStep("env", "running");

    // Prefer envContent (raw text from editor), fall back to envVars Map
    let envText = (project as any).envContent || "";
    if (!envText) {
      const envEntries =
        project.envVars instanceof Map
          ? Array.from(project.envVars.entries())
          : Object.entries(project.envVars || {});
      if (envEntries.length > 0) {
        envText = envEntries.map(([k, v]) => `${k}=${v}`).join("\n");
      }
    }

    if (envText.trim()) {
      const lineCount = envText.trim().split("\n").filter((l: string) => l.trim() && !l.trim().startsWith("#")).length;
      await emit(`📝 Writing .env (${lineCount} variables)...`);
      const heredoc = `cat > ${appDir}/.env << 'KALP_ENV_EOF'\n${envText}\nKALP_ENV_EOF`;
      const envWrite = await sshExec(server, heredoc);
      if (envWrite.code !== 0) {
        await emit("⚠️ Heredoc failed, using base64 fallback...");
        const b64 = Buffer.from(envText + "\n").toString("base64");
        await sshExec(server, `echo '${b64}' | base64 -d > ${appDir}/.env`);
      }
      const verifyEnv = await sshExec(server, `wc -l < ${appDir}/.env 2>/dev/null`);
      const written = parseInt(verifyEnv.stdout.trim(), 10) || 0;
      if (written > 0) {
        emitStep("env", "completed", `${lineCount} variables written`);
      } else {
        await emit("⚠️ .env file may be empty ~ check manually");
        emitStep("env", "completed", `Wrote ${lineCount} variables (verify on server)`);
      }
    } else {
      await emit("ℹ️ No environment variables to write");
      emitStep("env", "skipped", "No variables configured");
    }

    // 4. Install & build
    currentStepId = "build";
    emitStep("build", "running");

    // Locate package.json (may be in a subdirectory)
    const hasPkg = await sshExec(server, `test -f ${appDir}/package.json && echo yes || echo no`);
    if (hasPkg.stdout.trim() === "no") {
      const findPkg = await sshExec(server, `find ${appDir} -maxdepth 2 -name package.json -not -path '*/node_modules/*' 2>/dev/null | head -1`);
      const foundPath = findPkg.stdout.trim();
      if (foundPath) {
        const subDir = foundPath.replace(/\/package\.json$/, "");
        await emit(`📂 package.json found in ${subDir} ~ updating app directory`);
        appDir = subDir;
        await DeployProject.findByIdAndUpdate(project._id, { appDir: subDir });
      }
    }

    const pkgExists = (await sshExec(server, `test -f ${appDir}/package.json && echo yes || echo no`)).stdout.trim() === "yes";

    if (!pkgExists) {
      await emit("⚠️ No package.json found ~ skipping build");
      emitStep("build", "skipped", "No package.json in app directory");
    } else if (project.framework === "nextjs") {
      // Next.js: always run npm install + npm run build (mandatory)
      let buildCommand = project.buildCommand?.trim();
      if (!buildCommand) {
        buildCommand = "npm install && npm run build";
      } else {
        // Ensure npm install is included
        if (!/npm (ci|install|i)\b/.test(buildCommand)) {
          buildCommand = "npm install && " + buildCommand;
        }
        // Ensure npm run build is included (mandatory for Next.js)
        if (!/npm run build|npx .* build|next build/.test(buildCommand)) {
          buildCommand = buildCommand + " && npm run build";
        }
      }
      await emit(`🔧 Next.js build: ${buildCommand}`);

      // Remove old .next build cache to force clean build
      await sshExec(server, `cd ${appDir} && rm -rf .next 2>/dev/null || true`);

      const parts = buildCommand.split("&&").map((c) => c.trim()).filter(Boolean);
      for (const cmd of parts) {
        await emit(`📦 Running: ${cmd}`);
        const result = await sshExec(server, `cd ${appDir} && ${cmd}`);
        const output = (result.stdout || result.stderr || "").slice(-2000);
        if (output) await emit(output);
        if (result.code !== 0) {
          throw new Error(`Command failed: ${cmd} (exit ${result.code})`);
        }
      }

      // Verify .next directory was created
      const nextDirCheck = await sshExec(server, `test -d ${appDir}/.next && echo yes || echo no`);
      if (nextDirCheck.stdout.trim() !== "yes") {
        throw new Error("Next.js build failed: .next directory not found after build");
      }
      emitStep("build", "completed", "Next.js install & build successful");
    } else {
      // Node.js / custom: run provided build command or just npm install
      let buildCommand = project.buildCommand?.trim();
      if (buildCommand) {
        const parts = buildCommand.split("&&").map((c) => c.trim()).filter(Boolean);
        for (const cmd of parts) {
          await emit(`📦 Running: ${cmd}`);
          const result = await sshExec(server, `cd ${appDir} && ${cmd}`);
          const output = (result.stdout || result.stderr || "").slice(-2000);
          if (output) await emit(output);
          if (result.code !== 0) {
            const isBuildScript = /npm run build|npm run compile|npx .* build/.test(cmd);
            if (isBuildScript) {
              const hasScript = await sshExec(server, `cd ${appDir} && node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts.build ? 0 : 1)" 2>/dev/null`);
              if (hasScript.code !== 0) {
                await emit(`⚠️ No "build" script in package.json ~ skipping (not required for Node.js)`);
                continue;
              }
            }
            throw new Error(`Command failed: ${cmd} (exit ${result.code})`);
          }
        }
        emitStep("build", "completed", "Install & build successful");
      } else {
        await emit("📦 Running: npm install");
        const installResult = await sshExec(server, `cd ${appDir} && npm install`);
        const output = (installResult.stdout || installResult.stderr || "").slice(-2000);
        if (output) await emit(output);
        if (installResult.code !== 0) {
          throw new Error(`npm install failed (exit ${installResult.code})`);
        }
        emitStep("build", "completed", "Dependencies installed");
      }
    }

    // 5. PM2
    currentStepId = "pm2";
    emitStep("pm2", "running");
    await emit("🔄 Starting application with PM2...");

    // Check if PM2 process already exists
    const pm2Check = await sshExec(server, `pm2 describe ${pm2Name} 2>/dev/null && echo __EXISTS__ || echo __MISSING__`);
    const pm2Exists = pm2Check.stdout.includes("__EXISTS__");

    let startCmd = (project.startCommand || "").trim();
    // Strip any existing pm2 prefix ~ we'll construct the pm2 command ourselves
    startCmd = startCmd.replace(/^pm2\s+start\s+/i, "").trim();

    // For Next.js: always use "npm start" via pm2 with PORT env variable
    // This runs "next start" from package.json scripts, and PORT controls the listen port
    if (project.framework === "nextjs") {
      if (!startCmd || startCmd === "npm start" || startCmd === "npm run start" || /npx\s+next\s+start/.test(startCmd)) {
        startCmd = "npm start";
      }
    }

    if (!startCmd) {
      const pkgCheck = await sshExec(server, `cd ${appDir} && node -e "const p=require('./package.json'); console.log(p.scripts?.start||''); console.log(p.main||'')" 2>/dev/null`);
      const [scriptStart, mainFile] = (pkgCheck.stdout || "").trim().split("\n");
      if (scriptStart) {
        startCmd = "npm start";
      } else if (mainFile) {
        startCmd = `node ${mainFile}`;
      } else {
        startCmd = "npm start";
      }
      await emit(`📋 Detected start command: ${startCmd}`);
    }

    // Build the pm2 command with PORT env variable
    function buildPm2StartCmd(cmd: string): string {
      if (cmd === "npm start" || cmd === "npm run start") {
        return `cd ${appDir} && PORT=${project.port} pm2 start npm --name "${pm2Name}" -- start`;
      } else if (cmd.startsWith("npm run ")) {
        const script = cmd.replace(/^npm run\s+/, "");
        return `cd ${appDir} && PORT=${project.port} pm2 start npm --name "${pm2Name}" -- run ${script}`;
      } else {
        return `cd ${appDir} && PORT=${project.port} pm2 start ${cmd} --name "${pm2Name}"`;
      }
    }

    let pm2Cmd: string;
    if (pm2Exists) {
      // Delete old process and start fresh ~ ensures new build, port, and env are picked up
      await emit(`🗑️ Removing old PM2 process "${pm2Name}" for clean start...`);
      await sshExec(server, `pm2 delete "${pm2Name}" 2>/dev/null || true`);
      pm2Cmd = buildPm2StartCmd(startCmd);
      await emit(`▶ ${pm2Cmd.split("&&").pop()?.trim()}`);
    } else {
      pm2Cmd = buildPm2StartCmd(startCmd);
      await emit(`▶ ${pm2Cmd.split("&&").pop()?.trim()}`);
    }

    const pm2Result = await sshExec(server, pm2Cmd);
    await emit(pm2Result.stdout || pm2Result.stderr);
    if (pm2Result.code !== 0) {
      // Retry once with delete + fresh start
      await emit("⚠️ PM2 start failed ~ retrying after cleanup...");
      await sshExec(server, `pm2 delete "${pm2Name}" 2>/dev/null || true`);
      const retryCmd = buildPm2StartCmd(startCmd);
      await emit(`▶ ${retryCmd.split("&&").pop()?.trim()}`);
      const retryResult = await sshExec(server, retryCmd);
      await emit(retryResult.stdout || retryResult.stderr);
      if (retryResult.code !== 0) {
        throw new Error(`PM2 start failed: ${(retryResult.stderr || retryResult.stdout || "").slice(0, 300)}`);
      }
    }
    await sshExec(server, "pm2 save");
    emitStep(
      "pm2",
      "completed",
      `Running as ${pm2Name} on port ${project.port}`
    );

    // 6. Nginx
    currentStepId = "nginx";
    const domainClean = project.domain
      ? project.domain.replace(/^https?:\/\//, "").replace(/\/+$/, "")
      : "";
    let nginxConfPath = "";
    const isRedeploy = !!project.lastDeployAt;

    if (options.skipDomainSetup) {
      emitStep("nginx", "skipped", "Skipped for redeployment");
    } else if (domainClean) {
      const s = sudo(server);
      const nginxBase = server.defaultNginxPath || "/etc/nginx";

      // Quick check: is nginx already serving this domain with the correct port?
      const verifyExisting = await sshExec(server, `${s}nginx -T 2>/dev/null | grep -c 'server_name.*${domainClean}' || echo 0`);
      const alreadyServing = parseInt(verifyExisting.stdout.trim(), 10) > 0;
      // Also check the proxy_pass port matches
      const portCheck = await sshExec(server, `${s}nginx -T 2>/dev/null | grep -A5 'server_name.*${domainClean}' | grep -c 'proxy_pass.*:${project.port}' || echo 0`);
      const portMatches = parseInt(portCheck.stdout.trim(), 10) > 0;

      if (alreadyServing && portMatches && isRedeploy) {
        // Domain + port already configured and this is a redeploy ~ just verify and skip
        await emit(`✅ Nginx already configured for ${domainClean} → port ${project.port}`);
        emitStep("nginx", "completed", `Already configured for ${domainClean}`);

        // Detect confPath for SSL step
        const includesCheck = await sshExec(server, `${s}grep -E '^\\s*include\\s+' ${nginxBase}/nginx.conf 2>/dev/null | grep -v '#'`);
        const inc = (includesCheck.stdout || "").toLowerCase();
        const useSites = inc.includes("sites-enabled");
        nginxConfPath = useSites
          ? `${nginxBase}/sites-available/${pm2Name}`
          : `${nginxBase}/conf.d/${pm2Name}.conf`;
      } else {
        // First deploy OR domain/port changed ~ full nginx setup
        emitStep("nginx", "running");

        const includesCheck = await sshExec(
          server,
          `${s}grep -E '^\\s*include\\s+' ${nginxBase}/nginx.conf 2>/dev/null | grep -v '#'`
        );
        const includeLines = (includesCheck.stdout || "").toLowerCase();
        const includesSitesEnabled = includeLines.includes("sites-enabled");
        const includesConfD = includeLines.includes("conf.d");

        let useSites = false;
        if (includesSitesEnabled) {
          useSites = true;
        } else if (includesConfD) {
          useSites = false;
        } else {
          const dirCheck = await sshExec(server, `test -d ${nginxBase}/sites-enabled && echo sites || echo confd`);
          useSites = dirCheck.stdout.trim() === "sites";
        }

        const confPath = useSites
          ? `${nginxBase}/sites-available/${pm2Name}`
          : `${nginxBase}/conf.d/${pm2Name}.conf`;
        const activePath = useSites
          ? `${nginxBase}/sites-enabled/${pm2Name}`
          : confPath;
        nginxConfPath = confPath;

        if (useSites) {
          await sshExec(server, `${s}mkdir -p ${nginxBase}/sites-available ${nginxBase}/sites-enabled`);
        } else {
          await sshExec(server, `${s}mkdir -p ${nginxBase}/conf.d`);
        }

        // Clean up stale config from the OTHER layout
        if (useSites) {
          await sshExec(server, `${s}rm -f ${nginxBase}/conf.d/${pm2Name}.conf 2>/dev/null || true`);
        } else {
          await sshExec(server, `${s}rm -f ${nginxBase}/sites-available/${pm2Name} ${nginxBase}/sites-enabled/${pm2Name} 2>/dev/null || true`);
        }

        // Check if cert already exists to write SSL config directly
        const certPreCheck = await sshExec(server, `test -d /etc/letsencrypt/live/${domainClean} && echo yes || echo no`);
        const hasCert = certPreCheck.stdout.trim() === "yes";

        await emit(`🌐 Configuring Nginx for ${domainClean} → port ${project.port}${hasCert ? " (with SSL)" : ""}...`);
        const nginxConf = generateNginxConfig({ domain: domainClean, port: project.port, appName: pm2Name, ssl: hasCert });
        const escaped = nginxConf.replace(/'/g, "'\\''");
        await sshExec(server, `echo '${escaped}' | ${s}tee ${confPath} > /dev/null`);
        if (useSites) {
          await sshExec(server, `${s}ln -sf ${confPath} ${activePath}`);
          await sshExec(server, `${s}rm -f ${nginxBase}/sites-enabled/default 2>/dev/null || true`);
        }

        const nginxTest = await sshExec(server, `${s}nginx -t 2>&1`);
        await emit(nginxTest.stdout || nginxTest.stderr);
        if (nginxTest.code === 0) {
          const ok = await restartNginx(server, s);
          if (!ok) await emit("⚠️ Nginx service issue ~ config is valid but service may need manual attention");
          emitStep("nginx", "completed", `Domain ${domainClean} configured`);
        } else {
          emitStep("nginx", "failed", "Nginx config test failed, skipping reload");
        }

        // Verify nginx loaded the server block
        const verifyBlock = await sshExec(server, `${s}nginx -T 2>/dev/null | grep -c 'server_name.*${domainClean}' || echo 0`);
        const blockCount = parseInt(verifyBlock.stdout.trim(), 10) || 0;
        if (blockCount === 0) {
          await emit(`⚠️ Nginx did not load server block for ${domainClean} ~ checking includes...`);
          if (useSites && !includesSitesEnabled) {
            await sshExec(server, `${s}sed -i '/http\\s*{/a\\    include ${nginxBase}/sites-enabled/*;' ${nginxBase}/nginx.conf 2>/dev/null`);
            await restartNginx(server, s);
            await emit("Added sites-enabled include to nginx.conf");
          } else if (!useSites && !includesConfD) {
            await sshExec(server, `${s}sed -i '/http\\s*{/a\\    include ${nginxBase}/conf.d/*.conf;' ${nginxBase}/nginx.conf 2>/dev/null`);
            await restartNginx(server, s);
            await emit("Added conf.d include to nginx.conf");
          }
        }
      }
    } else {
      emitStep("nginx", "skipped", "No domain configured");
    }

    // 7. SSL (Certbot)
    currentStepId = "ssl";
    if (options.skipSslSetup || options.skipDomainSetup) {
      emitStep("ssl", "skipped", "Skipped for redeployment");
    } else if (domainClean) {
      const s = sudo(server);
      const certExists = await sshExec(
        server,
        `test -d /etc/letsencrypt/live/${domainClean} && echo yes || echo no`
      );
      if (certExists.stdout.trim() === "yes") {
        // SSL cert already exists ~ just verify it's valid, don't rewrite config
        await emit(`✅ SSL certificate exists for ${domainClean}`);
        // Quick expiry check
        const expiryCheck = await sshExec(server, `${s}certbot certificates 2>/dev/null | grep -A2 '${domainClean}' | grep 'Expiry' || echo ""`);
        if (expiryCheck.stdout.trim()) {
          await emit(`📋 ${expiryCheck.stdout.trim()}`);
        }
        emitStep("ssl", "completed", `SSL already active for ${domainClean}`);
      } else {
        // No cert ~ only run certbot on first deploy, skip on redeploy to avoid delays
        if (isRedeploy) {
          await emit(`ℹ️ No SSL certificate found ~ skipping on redeploy (use first deploy or fix-nginx to set up SSL)`);
          emitStep("ssl", "skipped", "No cert ~ skipped on redeploy");
        } else {
          const certbotCheck = await sshExec(server, "command -v certbot >/dev/null 2>&1 && echo yes || echo no");
          if (certbotCheck.stdout.trim() === "yes") {
            emitStep("ssl", "running");
            await emit("🔒 Setting up SSL certificate...");

            let sslOk = false;
            const certNginx = await sshExec(
              server,
              `${s}certbot --nginx -d ${domainClean} --non-interactive --agree-tos --redirect 2>&1`
            );
            const nginxOut = (certNginx.stdout || certNginx.stderr || "").slice(-1500);
            if (certNginx.code === 0) {
              sslOk = true;
              if (nginxOut) await emit(nginxOut);
            } else {
              await emit("⚠️ Certbot --nginx failed, trying standalone mode...");
              await sshExec(server, `${s}systemctl stop nginx 2>/dev/null || true`);
              const certStandalone = await sshExec(
                server,
                `${s}certbot certonly --standalone -d ${domainClean} --non-interactive --agree-tos 2>&1`
              );
              const standaloneOut = (certStandalone.stdout || certStandalone.stderr || "").slice(-1500);
              if (standaloneOut) await emit(standaloneOut);
              if (certStandalone.code === 0) {
                sslOk = true;
              } else {
                const certWebroot = await sshExec(
                  server,
                  `${s}certbot certonly --webroot -w /var/www/html -d ${domainClean} --non-interactive --agree-tos 2>&1`
                );
                const webrootOut = (certWebroot.stdout || certWebroot.stderr || "").slice(-1500);
                if (webrootOut) await emit(webrootOut);
                sslOk = certWebroot.code === 0;
              }

              if (sslOk && nginxConfPath) {
                const sslConf = generateNginxConfig({ domain: domainClean, port: project.port, appName: pm2Name, ssl: true });
                const escaped = sslConf.replace(/'/g, "'\\''");
                await sshExec(server, `echo '${escaped}' | ${s}tee ${nginxConfPath} > /dev/null`);
              }
              await restartNginx(server, s);
            }

            if (sslOk) {
              await restartNginx(server, s);
              emitStep("ssl", "completed", `SSL configured for ${domainClean}`);
            } else {
              emitStep("ssl", "failed", "Certbot failed ~ SSL not configured");
              await emit("⚠️ SSL setup failed, site will work on HTTP only");
              await restartNginx(server, s);
            }
          } else {
            emitStep("ssl", "skipped", "Certbot not installed ~ install via Server Settings");
          }
        }
      }
    } else {
      emitStep("ssl", "skipped", "No domain configured");
    }

    // 8. Verify
    currentStepId = "verify";
    emitStep("verify", "running");
    await emit("🔍 Verifying deployment...");

    // Wait for app to start ~ check up to 3 times with increasing delay
    let appRunning = false;
    let pm2Status = "unknown";
    for (let attempt = 1; attempt <= 3; attempt++) {
      const waitMs = attempt === 1 ? 3000 : attempt === 2 ? 5000 : 7000;
      await new Promise((r) => setTimeout(r, waitMs));

      const pm2Verify = await sshExec(server, "pm2 jlist 2>/dev/null");
      try {
        const list = JSON.parse(pm2Verify.stdout);
        const proc = list.find((p: any) => p.name === pm2Name);
        pm2Status = proc?.pm2_env?.status || "not found";
        appRunning = pm2Status === "online";
      } catch { }

      if (appRunning) break;
      if (attempt < 3) await emit(`⏳ App not ready yet (attempt ${attempt}/3), waiting...`);
    }

    // Check if port is actually listening
    let portListening = false;
    if (appRunning) {
      const portCheck = await sshExec(server, `ss -tlnp 2>/dev/null | grep ':${project.port} ' || netstat -tlnp 2>/dev/null | grep ':${project.port} '`);
      portListening = portCheck.code === 0 && portCheck.stdout.trim().length > 0;
      if (portListening) {
        await emit(`✅ Port ${project.port} is listening`);
      } else {
        await emit(`⚠️ App is online but port ${project.port} is not listening yet ~ it may still be starting`);
      }
    }

    if (!appRunning) {
      await emit(`⚠️ PM2 status: ${pm2Status}`);
      const pm2Logs = await sshExec(server, `pm2 logs "${pm2Name}" --nostream --lines 30 2>&1`);
      if (pm2Logs.stdout?.trim()) {
        await emit("📋 Recent PM2 logs:");
        await emit(pm2Logs.stdout.trim().slice(-2000));
      }
    }

    let commitHash = "";
    let commitAuthor = "";
    if (project.repo) {
      const commitResult = await sshExec(
        server,
        `cd ${appDir} && git rev-parse --short HEAD 2>/dev/null`
      );
      commitHash = commitResult.stdout.trim();
      const authorResult = await sshExec(
        server,
        `cd ${appDir} && git log -1 --format='%an' 2>/dev/null`
      );
      commitAuthor = authorResult.stdout.trim();
    }

    await DeployProject.findByIdAndUpdate(project._id, {
      status: appRunning ? "running" : "failed",
      appDir,
      pm2Name,
      lastDeployAt: new Date(),
      ...(commitHash && { lastDeployCommit: commitHash }),
      ...(commitAuthor && { deployedCommitAuthor: commitAuthor, lastCommitAuthor: commitAuthor }),
    });

    if (appRunning) {
      await DeploymentLog.findByIdAndUpdate(logId, { status: "success" });
      emitStep("verify", "completed", "Application is running");
      await emit("✅ Deployment successful!");
      return { success: true, logId };
    } else {
      await DeploymentLog.findByIdAndUpdate(logId, { status: "failed" });
      emitStep("verify", "failed", `App status: ${pm2Status} ~ check logs above`);
      await emit("⚠️ Deployment completed but app is not healthy");
      return { success: false, logId };
    }
  } catch (err: any) {
    emitStep(currentStepId, "failed", err.message);
    await emit(`❌ Failed at ${currentStepId}: ${err.message}`);
    await DeployProject.findByIdAndUpdate(project._id, { status: "failed" });
    await DeploymentLog.findByIdAndUpdate(logId, { status: "failed" });
    return { success: false, logId };
  }
}

export async function restartProject(
  project: IDeployProject,
  triggeredBy: string
): Promise<{ success: boolean; logId: string }> {
  const server = await DeployServer.findById(project.server);
  if (!server) throw new Error("Server not found");

  const log = await DeploymentLog.create({
    project: project._id,
    action: "restart",
    status: "running",
    triggeredBy,
  });

  try {
    const pm2Name = project.pm2Name || sanitizePm2Name(project.name);
    const appDir = project.appDir || `/home/${server.sshUser}/apps/${pm2Name}`;

    // Re-write .env before restart (in case env vars changed)
    let envText = (project as any).envContent || "";
    if (!envText) {
      const envEntries =
        project.envVars instanceof Map
          ? Array.from(project.envVars.entries())
          : Object.entries(project.envVars || {});
      if (envEntries.length > 0) {
        envText = envEntries.map(([k, v]) => `${k}=${v}`).join("\n");
      }
    }
    if (envText.trim()) {
      const heredoc = `cat > ${appDir}/.env << 'KALP_ENV_EOF'\n${envText}\nKALP_ENV_EOF`;
      const envWrite = await sshExec(server, heredoc);
      if (envWrite.code !== 0) {
        const b64 = Buffer.from(envText + "\n").toString("base64");
        await sshExec(server, `echo '${b64}' | base64 -d > ${appDir}/.env`);
      }
    }

    // Delete + start fresh to pick up env and port changes
    const pm2Check = await sshExec(server, `pm2 describe "${pm2Name}" 2>/dev/null && echo __EXISTS__ || echo __MISSING__`);
    if (pm2Check.stdout.includes("__EXISTS__")) {
      await sshExec(server, `pm2 delete "${pm2Name}" 2>/dev/null || true`);
    }

    let startCmd = (project.startCommand || "").trim().replace(/^pm2\s+start\s+/i, "").trim();
    if (project.framework === "nextjs" && (!startCmd || startCmd === "npm start" || startCmd === "npm run start" || /npx\s+next\s+start/.test(startCmd))) {
      startCmd = "npm start";
    }
    if (!startCmd) startCmd = "npm start";

    let pm2Cmd: string;
    if (startCmd === "npm start" || startCmd === "npm run start") {
      pm2Cmd = `cd ${appDir} && PORT=${project.port} pm2 start npm --name "${pm2Name}" -- start`;
    } else if (startCmd.startsWith("npm run ")) {
      const script = startCmd.replace(/^npm run\s+/, "");
      pm2Cmd = `cd ${appDir} && PORT=${project.port} pm2 start npm --name "${pm2Name}" -- run ${script}`;
    } else {
      pm2Cmd = `cd ${appDir} && PORT=${project.port} pm2 start ${startCmd} --name "${pm2Name}"`;
    }

    const result = await sshExec(server, pm2Cmd);
    if (result.code !== 0) {
      throw new Error(`PM2 start failed: ${(result.stderr || result.stdout || "").slice(0, 300)}`);
    }
    await sshExec(server, "pm2 save");

    await DeployProject.findByIdAndUpdate(project._id, { status: "running" });
    await DeploymentLog.findByIdAndUpdate(log._id, {
      status: "success",
      logs: `Restarted on port ${project.port}: ${pm2Cmd}`,
    });
    return { success: true, logId: String(log._id) };
  } catch (err: any) {
    await DeployProject.findByIdAndUpdate(project._id, { status: "failed" });
    await DeploymentLog.findByIdAndUpdate(log._id, {
      status: "failed",
      logs: err.message,
    });
    return { success: false, logId: String(log._id) };
  }
}

export async function stopProject(
  project: IDeployProject,
  triggeredBy: string
): Promise<{ success: boolean; logId: string }> {
  const server = await DeployServer.findById(project.server);
  if (!server) throw new Error("Server not found");

  const log = await DeploymentLog.create({
    project: project._id,
    action: "stop",
    status: "running",
    triggeredBy,
  });

  try {
    const pm2Name = project.pm2Name || sanitizePm2Name(project.name);
    await sshExec(server, `pm2 stop ${pm2Name}`);
    await DeployProject.findByIdAndUpdate(project._id, { status: "stopped" });
    await DeploymentLog.findByIdAndUpdate(log._id, {
      status: "success",
      logs: "Stopped successfully",
    });
    return { success: true, logId: String(log._id) };
  } catch (err: any) {
    await DeploymentLog.findByIdAndUpdate(log._id, {
      status: "failed",
      logs: err.message,
    });
    return { success: false, logId: String(log._id) };
  }
}

export async function getProjectMonitoring(project: IDeployProject) {
  const server = await DeployServer.findById(project.server);
  if (!server) return null;

  const pm2Name = project.pm2Name || sanitizePm2Name(project.name);
  try {
    const pm2Info = await sshExec(server, "pm2 jlist 2>/dev/null");
    let cpu = 0,
      memory = 0,
      uptime = "",
      restarts = 0,
      status = "stopped";
    try {
      const list = JSON.parse(pm2Info.stdout);
      const proc = list.find((p: any) => p.name === pm2Name);
      if (proc) {
        cpu = proc.monit?.cpu || 0;
        memory = Math.round((proc.monit?.memory || 0) / 1024 / 1024);
        uptime = proc.pm2_env?.pm_uptime
          ? new Date(proc.pm2_env.pm_uptime).toISOString()
          : "";
        restarts = proc.pm2_env?.restart_time || 0;
        status = proc.pm2_env?.status || "stopped";
      }
    } catch { }

    const diskResult = await sshExec(
      server,
      `du -sh ${project.appDir} 2>/dev/null | cut -f1`
    );

    return {
      cpu,
      memoryMb: memory,
      disk: diskResult.stdout.trim(),
      uptime,
      restartCount: restarts,
      pm2Status: status,
    };
  } catch {
    return null;
  }
}

export async function cleanupProject(
  project: IDeployProject,
  triggeredBy: string
): Promise<{ success: boolean; details: string }> {
  const server = await DeployServer.findById(project.server);
  if (!server) throw new Error("Server not found");

  const pm2Name = project.pm2Name || sanitizePm2Name(project.name);
  const s = sudo(server);
  const appDir = project.appDir || `/var/www/${pm2Name}`;
  const domain = project.domain;
  const nginxPath = server.defaultNginxPath || "/etc/nginx";
  const details: string[] = [];

  try { await sshExec(server, `pm2 stop ${pm2Name} 2>/dev/null; pm2 delete ${pm2Name} 2>/dev/null`); details.push("PM2 process removed"); } catch { details.push("PM2 cleanup skipped"); }
  if (domain) {
    try { await sshExec(server, `${s}rm -f ${nginxPath}/sites-enabled/${domain} ${nginxPath}/sites-available/${domain} 2>/dev/null`); await restartNginx(server, s); details.push("Nginx config removed"); } catch { details.push("Nginx cleanup skipped"); }
  }
  try { await sshExec(server, `rm -rf ${appDir}`); details.push(`App directory ${appDir} removed`); } catch { details.push("Code directory cleanup skipped"); }
  try { await sshExec(server, `pm2 save 2>/dev/null`); } catch { }

  await DeploymentLog.create({
    project: project._id,
    action: "config" as any,
    status: "success",
    triggeredBy,
    logs: `Cleanup: ${details.join("; ")}`,
  });

  return { success: true, details: details.join("; ") };
}

export async function getServerStats(server: import("@/models/DeployServer").IDeployServer) {
  try {
    const [cpuResult, memResult, diskResult, portsResult] = await Promise.all([
      sshExec(
        server,
        `top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1`
      ),
      sshExec(
        server,
        `free -m | awk '/Mem:/ {printf "%d/%dMB (%.0f%%)", $3, $2, $3*100/$2}'`
      ),
      sshExec(
        server,
        `df -h / | tail -1 | awk '{print $3"/"$2" ("$5")"}'`
      ),
      sshExec(
        server,
        `${sudo(server)}ss -tlnp | grep LISTEN | awk '{print $4}' | rev | cut -d: -f1 | rev | sort -un`
      ),
    ]);

    return {
      cpu: parseFloat(cpuResult.stdout.trim()) || 0,
      memory: memResult.stdout.trim(),
      disk: diskResult.stdout.trim(),
      usedPorts: portsResult.stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(Number)
        .filter((n) => !isNaN(n)),
    };
  } catch (err: any) {
    return { cpu: 0, memory: "N/A", disk: "N/A", usedPorts: [], error: err.message };
  }
}
