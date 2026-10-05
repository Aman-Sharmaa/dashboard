"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

type SocketContextType = {
  socket: Socket | null;
  connected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}

/**
 * Provides a Socket.io connection to the dashboard.
 * Automatically connects on mount, joins the user's room, and cleans up on unmount.
 */
export function SocketProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Ensure the socket.io server is initialized
      try {
        await fetch("/api/socketio");
      } catch {
        // ignore - server might already be running
      }

      if (cancelled) return;

      const socket = io({
        path: "/api/socketio",
        addTrailingSlash: false,
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;
      // Force a re-render so consumers get the socket reference
      forceUpdate((n) => n + 1);

      socket.on("connect", () => {
        if (cancelled) return;
        setConnected(true);
        socket.emit("join-user", userId);
      });

      socket.on("reconnect", () => {
        // Re-join room after reconnection
        socket.emit("join-user", userId);
      });

      socket.on("disconnect", () => {
        if (cancelled) return;
        setConnected(false);
      });
    }

    init();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
