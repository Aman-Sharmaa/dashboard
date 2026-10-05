import { Server as SocketIOServer } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import { setIO } from "@/lib/socket-server";
import { getPartyState, setPartyState, deletePartyState, VideoState } from "@/lib/party-state";

interface PartyUser {
  id: string; // socket.id
  name: string;
  audio: boolean;
  video: boolean;
}

const partyMembers: Record<string, PartyUser[]> = {};
interface SocketServer extends HTTPServer {
  io?: SocketIOServer;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const socketServer = (res.socket as unknown as SocketWithIO)?.server;

  if (socketServer?.io) {
    // Already initialized on HTTP server, but ensure globalThis ref is set
    // (module scope can reset on hot reload while HTTP server persists)
    setIO(socketServer.io);
    res.end();
    return;
  }

  const io = new SocketIOServer(socketServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  socketServer.io = io;
  setIO(io);

  io.on("connection", (socket) => {
    socket.on("join-user", (userId: string) => {
      socket.join(`user:${userId}`);
    });

    socket.on("join-monitor", () => {
      socket.join("monitor-dashboard");
    });

    socket.on("leave-monitor", () => {
      socket.leave("monitor-dashboard");
    });

    // --- Movie Party Events ---
    socket.on("join-party", (shareId: string, displayName: string) => {
      socket.join(`party:${shareId}`);
      
      if (!partyMembers[shareId]) partyMembers[shareId] = [];
      const user: PartyUser = { id: socket.id, name: displayName, audio: false, video: false };
      partyMembers[shareId] = partyMembers[shareId].filter(u => u.id !== socket.id);
      partyMembers[shareId].push(user);

      // Update viewer count for everyone in the room
      const room = io.sockets.adapter.rooms.get(`party:${shareId}`);
      io.to(`party:${shareId}`).emit("viewer-count-update", room ? room.size : 0);
      io.to(`party:${shareId}`).emit("members-update", partyMembers[shareId]);
      
      // Notify room about the new user
      io.to(`party:${shareId}`).emit("chat-message", { 
        id: Date.now().toString(),
        sender: "System", 
        message: `${displayName} joined the party` 
      });

      // Send current video state to the joiner if it exists
      const state = getPartyState(shareId);
      if (state) {
        socket.emit("video-state-sync", state);
      }
    });

    socket.on("chat-message", (shareId: string, payload: any) => {
      io.to(`party:${shareId}`).emit("chat-message", payload);
    });

    socket.on("send-reaction", (shareId: string, reaction: string) => {
      io.to(`party:${shareId}`).emit("new-reaction", reaction);
    });

    socket.on("video-state-update", (shareId: string, state: VideoState) => {
      setPartyState(shareId, state);
      // broadcast to everyone EXCEPT the sender
      socket.to(`party:${shareId}`).emit("video-state-sync", state);
    });

    socket.on("toggle-media", (shareId: string, type: "audio" | "video", enabled: boolean) => {
      if (partyMembers[shareId]) {
        const user = partyMembers[shareId].find(u => u.id === socket.id);
        if (user) {
          if (type === "audio") user.audio = enabled;
          if (type === "video") user.video = enabled;
          io.to(`party:${shareId}`).emit("members-update", partyMembers[shareId]);
        }
      }
    });

    socket.on("webrtc-offer", (shareId: string, targetId: string, offer: any) => {
      socket.to(targetId).emit("webrtc-offer", socket.id, offer);
    });

    socket.on("webrtc-answer", (shareId: string, targetId: string, answer: any) => {
      socket.to(targetId).emit("webrtc-answer", socket.id, answer);
    });

    socket.on("webrtc-ice-candidate", (shareId: string, targetId: string, candidate: any) => {
      socket.to(targetId).emit("webrtc-ice-candidate", socket.id, candidate);
    });

    socket.on("party-ended", (shareId: string) => {
      deletePartyState(shareId);
      delete partyMembers[shareId];
      io.to(`party:${shareId}`).emit("party-ended");
    });

    socket.on("disconnecting", () => {
      // Find which party rooms this socket was in
      for (const room of socket.rooms) {
        if (room.startsWith("party:")) {
          const shareId = room.split(":")[1];
          if (partyMembers[shareId]) {
            const user = partyMembers[shareId].find(u => u.id === socket.id);
            partyMembers[shareId] = partyMembers[shareId].filter(u => u.id !== socket.id);
            io.to(room).emit("members-update", partyMembers[shareId]);
            
            if (user) {
              io.to(room).emit("chat-message", { 
                id: Date.now().toString() + Math.random().toString(),
                sender: "System", 
                message: `${user.name} left the party` 
              });
            }
          }
          // Delay viewer count update slightly so the socket is fully removed from the room
          setTimeout(() => {
            const currentRoom = io.sockets.adapter.rooms.get(room);
            io.to(room).emit("viewer-count-update", currentRoom ? currentRoom.size : 0);
          }, 0);
        }
      }
    });

    socket.on("disconnect", () => {
      // cleanup handled automatically by socket.io
    });
  });

  res.end();
}
