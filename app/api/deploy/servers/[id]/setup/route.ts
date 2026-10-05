import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeployServer } from "@/models/DeployServer";
import { sshExec, sudoShell } from "@/lib/deploy/ssh";

const SERVICES = ["upgrade", "nginx", "nodejs", "pm2", "certbot"] as const;
type ServiceName = (typeof SERVICES)[number];
type PkgManager = "apt" | "yum" | "dnf";

async function detectPkgManager(server: any): Promise<PkgManager> {
  const result = await sshExec(
    server,
    "command -v apt-get >/dev/null 2>&1 && echo apt || (command -v dnf >/dev/null 2>&1 && echo dnf || (command -v yum >/dev/null 2>&1 && echo yum || echo none))"
  );
  const pm = result.stdout.trim();
  if (pm === "apt" || pm === "yum" || pm === "dnf") return pm;
  return "apt";
}

function buildCommand(service: ServiceName, pm: PkgManager, email?: string): string {
  const env = pm === "apt" ? "export DEBIAN_FRONTEND=noninteractive && " : "";
  const install = pm === "apt" ? "apt-get install -y" : pm === "dnf" ? "dnf install -y" : "yum install -y";
  const update = pm === "apt" ? "apt-get update -y" : pm === "dnf" ? "dnf check-update || true" : "yum check-update || true";
  const upgrade = pm === "apt" ? "apt-get upgrade -y" : pm === "dnf" ? "dnf upgrade -y" : "yum upgrade -y";
  const cleanup = pm === "apt" ? "apt-get autoremove -y" : pm === "dnf" ? "dnf autoremove -y" : "yum autoremove -y 2>/dev/null || true";

  switch (service) {
    case "upgrade":
      return `${env}${update} 2>&1 && ${upgrade} 2>&1 && ${cleanup} 2>&1`;
    case "nginx":
      return `${env}${pm === "apt" ? `${update} 2>&1 && ` : ""}${install} nginx 2>&1 && systemctl enable nginx 2>&1 && systemctl start nginx 2>&1`;
    case "nodejs": {
      if (pm === "apt") {
        return `${env}curl -fsSL https://deb.nodesource.com/setup_20.x 2>&1 | bash - 2>&1 && apt-get install -y nodejs 2>&1`;
      }
      return `curl -fsSL https://rpm.nodesource.com/setup_20.x 2>&1 | bash - 2>&1 && ${install} nodejs 2>&1`;
    }
    case "pm2": {
      const homeDir = pm === "apt" ? "/root" : "/root";
      return `npm install -g pm2 2>&1 && pm2 startup systemd -u root --hp ${homeDir} 2>&1`;
    }
    case "certbot": {
      let cmd: string;
      if (pm === "apt") {
        cmd = `${env}${install} certbot python3-certbot-nginx 2>&1`;
      } else if (pm === "dnf") {
        cmd = `${install} certbot python3-certbot-nginx 2>&1`;
      } else {
        cmd = `${install} epel-release 2>&1 && ${install} certbot python3-certbot-nginx 2>&1`;
      }
      if (email) {
        cmd += ` && certbot register --non-interactive --agree-tos -m ${email} 2>&1 || true`;
      }
      return cmd;
    }
  }
}

function versionCommand(service: ServiceName): string {
  switch (service) {
    case "upgrade":
      return `lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2`;
    case "nginx":
      return "nginx -v 2>&1";
    case "nodejs":
      return "node --version 2>&1 && npm --version 2>&1";
    case "pm2":
      return "pm2 --version 2>&1";
    case "certbot":
      return "certbot --version 2>&1";
  }
}

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
  const { services, email } = body as {
    services: ServiceName[];
    email?: string;
  };

  if (!services?.length)
    return NextResponse.json(
      { message: "No services specified" },
      { status: 400 }
    );

  const invalid = services.filter((s) => !SERVICES.includes(s));
  if (invalid.length)
    return NextResponse.json(
      { message: `Invalid services: ${invalid.join(", ")}` },
      { status: 400 }
    );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      const pm = await detectPkgManager(server);
      send({ type: "log", service: "system", data: `Detected package manager: ${pm}` });

      for (const svc of services) {
        send({ type: "start", service: svc });

        try {
          const cmd = buildCommand(svc, pm, email);
          const result = await sshExec(server, sudoShell(server, cmd));

          if (result.stdout) send({ type: "log", service: svc, data: result.stdout });
          if (result.stderr) send({ type: "log", service: svc, data: result.stderr });

          if (result.code !== 0) {
            send({
              type: "error",
              service: svc,
              data: `Exit code: ${result.code}`,
            });
            continue;
          }

          const verResult = await sshExec(server, versionCommand(svc));
          const version = (verResult.stdout || verResult.stderr).trim();
          send({ type: "done", service: svc, version });
        } catch (err: any) {
          send({
            type: "error",
            service: svc,
            data: err.message || String(err),
          });
        }
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireDeploymentsAdmin()))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const server = await DeployServer.findById(id);
  if (!server)
    return NextResponse.json({ message: "Not found" }, { status: 404 });

  const checks: Record<string, { installed: boolean; version: string }> = {};

  const commands: { name: ServiceName; cmd: string }[] = [
    { name: "nginx", cmd: "nginx -v 2>&1" },
    { name: "nodejs", cmd: "node --version 2>&1 && echo 'npm:' && npm --version 2>&1" },
    { name: "pm2", cmd: "pm2 --version 2>&1" },
    { name: "certbot", cmd: "certbot --version 2>&1" },
  ];

  try {
    const osResult = await sshExec(
      server,
      "lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d'\"' -f2"
    );
    checks["upgrade"] = {
      installed: true,
      version: osResult.stdout.trim() || "Unknown OS",
    };
  } catch {
    checks["upgrade"] = { installed: false, version: "" };
  }

  for (const { name, cmd } of commands) {
    try {
      const result = await sshExec(server, cmd);
      const output = (result.stdout || result.stderr).trim();
      const isInstalled =
        result.code === 0 &&
        !output.toLowerCase().includes("not found") &&
        !output.toLowerCase().includes("no such file");
      checks[name] = { installed: isInstalled, version: isInstalled ? output : "" };
    } catch {
      checks[name] = { installed: false, version: "" };
    }
  }

  return NextResponse.json({ checks });
}
