import { Server as SocketIOServer } from "socket.io";

/**
 * Global Socket.io server instance.
 * Uses globalThis to ensure it's shared across App Router and Pages Router
 * (which can have separate module scopes in Next.js).
 */

const globalForIO = globalThis as unknown as {
  _socketIO: SocketIOServer | null;
};

if (!globalForIO._socketIO) {
  globalForIO._socketIO = null;
}

export function getIO(): SocketIOServer | null {
  return globalForIO._socketIO;
}

export function setIO(server: SocketIOServer) {
  globalForIO._socketIO = server;
}
