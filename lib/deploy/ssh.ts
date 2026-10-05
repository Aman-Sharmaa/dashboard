import { Client } from "ssh2";
import { decrypt } from "./encryption";
import type { IDeployServer } from "@/models/DeployServer";

export interface SSHExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function getConnection(server: IDeployServer): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const config: any = {
      host: server.ip,
      port: server.sshPort || 22,
      username: server.sshUser || "root",
      readyTimeout: 15000,
      algorithms: {
        serverHostKey: [
          "ssh-ed25519",
          "ecdsa-sha2-nistp256",
          "ecdsa-sha2-nistp384",
          "ecdsa-sha2-nistp521",
          "rsa-sha2-512",
          "rsa-sha2-256",
          "ssh-rsa",
        ],
      },
    };

    if (server.authMethod === "key" && server.encryptedKey) {
      let rawKey = decrypt(server.encryptedKey);
      rawKey = rawKey.replace(/\r\n/g, "\n").trim();
      if (!rawKey.endsWith("\n")) rawKey += "\n";
      config.privateKey = rawKey;
    } else if (server.encryptedPassword) {
      config.password = decrypt(server.encryptedPassword);
    }

    conn
      .on("ready", () => resolve(conn))
      .on("error", (err) => reject(err))
      .connect(config);
  });
}

// Shell preamble that ensures PATH includes nvm/node/pm2 for non-login shells
const ENV_PREAMBLE = [
  'export PATH="$HOME/.nvm/versions/node/$(ls -1 $HOME/.nvm/versions/node/ 2>/dev/null | tail -1)/bin:$HOME/.local/bin:/usr/local/bin:$PATH" 2>/dev/null',
  "[ -s \"$HOME/.nvm/nvm.sh\" ] && . \"$HOME/.nvm/nvm.sh\" 2>/dev/null",
  "[ -s \"$HOME/.bashrc\" ] && . \"$HOME/.bashrc\" 2>/dev/null",
].join("; ");

export async function sshExec(
  server: IDeployServer,
  command: string
): Promise<SSHExecResult> {
  const conn = await getConnection(server);
  const wrappedCommand = `${ENV_PREAMBLE}; ${command}`;
  return new Promise((resolve, reject) => {
    conn.exec(wrappedCommand, (err, stream) => {
      if (err) {
        conn.end();
        return reject(err);
      }
      let stdout = "";
      let stderr = "";
      stream
        .on("close", (code: number) => {
          conn.end();
          resolve({ code: code ?? 0, stdout, stderr });
        })
        .on("data", (data: Buffer) => {
          stdout += data.toString();
        })
        .stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });
    });
  });
}

export async function sshExecStream(
  server: IDeployServer,
  command: string,
  onData: (line: string) => void
): Promise<number> {
  const conn = await getConnection(server);
  const wrappedCommand = `${ENV_PREAMBLE}; ${command}`;
  return new Promise((resolve, reject) => {
    conn.exec(wrappedCommand, (err, stream) => {
      if (err) {
        conn.end();
        return reject(err);
      }
      stream
        .on("close", (code: number) => {
          conn.end();
          resolve(code ?? 0);
        })
        .on("data", (data: Buffer) => {
          data
            .toString()
            .split("\n")
            .forEach((line) => {
              if (line) onData(line);
            });
        })
        .stderr.on("data", (data: Buffer) => {
          data
            .toString()
            .split("\n")
            .forEach((line) => {
              if (line) onData(`[stderr] ${line}`);
            });
        });
    });
  });
}

/**
 * Returns "sudo -n " for non-root users, "" for root.
 * The -n flag prevents sudo from prompting for a password.
 */
export function sudo(server: IDeployServer): string {
  return server.sshUser === "root" ? "" : "sudo -n ";
}

/**
 * Wraps a command with sudo bash -c for non-root users.
 * Use for compound commands that all need root (e.g. apt-get && systemctl).
 */
export function sudoShell(server: IDeployServer, command: string): string {
  if (server.sshUser === "root") return command;
  const escaped = command.replace(/'/g, "'\\''");
  return `sudo -n bash -c '${escaped}'`;
}

export async function testConnection(
  server: IDeployServer
): Promise<{ ok: boolean; os?: string; node?: string; nginx?: boolean; disk?: string; error?: string }> {
  try {
    const conn = await getConnection(server);

    const execOne = (cmd: string): Promise<string> =>
      new Promise((resolve, reject) => {
        conn.exec(cmd, (err, stream) => {
          if (err) return reject(err);
          let out = "";
          stream
            .on("close", () => resolve(out.trim()))
            .on("data", (d: Buffer) => {
              out += d.toString();
            })
            .stderr.on("data", () => { });
        });
      });

    const [os, node, nginxCheck, disk] = await Promise.all([
      execOne("uname -a").catch(() => "unknown"),
      execOne("node --version").catch(() => "not installed"),
      execOne("nginx -v 2>&1").catch(() => ""),
      execOne("df -h / | tail -1 | awk '{print $4}'").catch(() => "unknown"),
    ]);

    conn.end();

    return {
      ok: true,
      os: os.slice(0, 120),
      node,
      nginx: nginxCheck.includes("nginx"),
      disk,
    };
  } catch (err: any) {
    let msg = err.message || String(err);
    if (err.level === "client-authentication") {
      msg = `Authentication failed for ${server.sshUser}@${server.ip} ~ check your ${server.authMethod === "key" ? "SSH key (must be OpenSSH/PEM format, not PPK)" : "password"}`;
    } else if (err.level === "client-timeout") {
      msg = `Connection timed out ~ verify ${server.ip}:${server.sshPort || 22} is reachable`;
    } else if (err.code === "ECONNREFUSED") {
      msg = `Connection refused at ${server.ip}:${server.sshPort || 22} ~ check if SSH is running`;
    }
    return { ok: false, error: msg };
  }
}
