import type { Client, ClientChannel } from "ssh2";
import { getConnection } from "./ssh";
import type { IDeployServer } from "@/models/DeployServer";

export interface TerminalSession {
  id: string;
  serverId: string;
  conn: Client;
  shell: ClientChannel;
  listeners: Set<(data: string) => void>;
  lastActivity: number;
  closed: boolean;
}

const sessions = new Map<string, TerminalSession>();

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes idle timeout

// Cleanup idle sessions every 60s
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastActivity > SESSION_TIMEOUT) {
        destroySession(id);
      }
    }
  }, 60_000);
}

export async function createSession(
  sessionId: string,
  server: IDeployServer,
  cols: number = 120,
  rows: number = 30
): Promise<TerminalSession> {
  if (sessions.has(sessionId)) {
    const existing = sessions.get(sessionId)!;
    if (!existing.closed) return existing;
    sessions.delete(sessionId);
  }

  const conn = await getConnection(server);

  const shell = await new Promise<ClientChannel>((resolve, reject) => {
    conn.shell(
      {
        term: "xterm-256color",
        cols,
        rows,
        modes: {},
      },
      (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        resolve(stream);
      }
    );
  });

  const session: TerminalSession = {
    id: sessionId,
    serverId: String(server._id),
    conn,
    shell,
    listeners: new Set(),
    lastActivity: Date.now(),
    closed: false,
  };

  shell.on("data", (data: Buffer) => {
    session.lastActivity = Date.now();
    const str = data.toString("utf-8");
    for (const listener of session.listeners) {
      try {
        listener(str);
      } catch {}
    }
  });

  shell.stderr?.on("data", (data: Buffer) => {
    session.lastActivity = Date.now();
    const str = data.toString("utf-8");
    for (const listener of session.listeners) {
      try {
        listener(str);
      } catch {}
    }
  });

  shell.on("close", () => {
    session.closed = true;
    for (const listener of session.listeners) {
      try {
        listener("\r\n\x1b[31m[Connection closed]\x1b[0m\r\n");
      } catch {}
    }
    conn.end();
    sessions.delete(sessionId);
  });

  conn.on("error", () => {
    session.closed = true;
    sessions.delete(sessionId);
  });

  conn.on("end", () => {
    session.closed = true;
    sessions.delete(sessionId);
  });

  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): TerminalSession | undefined {
  return sessions.get(sessionId);
}

export function writeToSession(sessionId: string, data: string): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.closed) return false;
  session.lastActivity = Date.now();
  session.shell.write(data);
  return true;
}

export function resizeSession(
  sessionId: string,
  cols: number,
  rows: number
): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.closed) return false;
  session.shell.setWindow(rows, cols, 0, 0);
  return true;
}

export function destroySession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.closed = true;
  try {
    session.shell.end();
  } catch {}
  try {
    session.conn.end();
  } catch {}
  sessions.delete(sessionId);
}

export function addListener(
  sessionId: string,
  listener: (data: string) => void
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.listeners.add(listener);
  return true;
}

export function removeListener(
  sessionId: string,
  listener: (data: string) => void
): void {
  const session = sessions.get(sessionId);
  if (session) session.listeners.delete(listener);
}
