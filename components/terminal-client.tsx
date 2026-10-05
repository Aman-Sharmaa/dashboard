"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Terminal as TerminalIcon,
  ArrowLeft,
  Loader2,
  XCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function generateId() {
  return "ts_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function TerminalClient({
  serverId,
  serverName,
  serverIp,
}: {
  serverId: string;
  serverName: string;
  serverIp: string;
}) {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const sessionIdRef = useRef(generateId());
  const eventSourceRef = useRef<EventSource | null>(null);
  const inputBufferRef = useRef<string[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyedRef = useRef(false);

  const [status, setStatus] = useState<
    "connecting" | "connected" | "error" | "closed"
  >("connecting");
  const [error, setError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const flushInput = useCallback(() => {
    const buf = inputBufferRef.current;
    if (buf.length === 0) return;
    const data = buf.join("");
    inputBufferRef.current = [];
    fetch(`/api/deploy/servers/${serverId}/terminal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "input",
        session: sessionIdRef.current,
        data,
      }),
      keepalive: true,
    }).catch(() => { });
  }, [serverId]);

  const sendInput = useCallback(
    (data: string) => {
      inputBufferRef.current.push(data);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (inputBufferRef.current.join("").length > 64) {
        flushInput();
      } else {
        flushTimerRef.current = setTimeout(flushInput, 8);
      }
    },
    [flushInput]
  );

  const sendResize = useCallback(
    (cols: number, rows: number) => {
      fetch(`/api/deploy/servers/${serverId}/terminal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resize",
          session: sessionIdRef.current,
          cols,
          rows,
        }),
      }).catch(() => { });
    },
    [serverId]
  );

  useEffect(() => {
    if (!serverId || !termRef.current) return;
    destroyedRef.current = false;

    let removeResizeListener: (() => void) | null = null;

    async function init() {
      // Inject xterm CSS from CDN if not already present
      if (!document.querySelector("link[data-xterm-css]")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.setAttribute("data-xterm-css", "1");
        link.href =
          "https://cdn.jsdelivr.net/npm/@xterm/xterm@5/css/xterm.min.css";
        document.head.appendChild(link);
        await new Promise((r) => {
          link.onload = r;
          link.onerror = r;
        });
      }

      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);

      if (destroyedRef.current) return;

      const fitAddon = new FitAddon();
      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        fontSize: 14,
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Monaco', 'Inconsolata', 'Courier New', monospace",
        lineHeight: 1.2,
        theme: {
          background: "#0d1117",
          foreground: "#c9d1d9",
          cursor: "#58a6ff",
          cursorAccent: "#0d1117",
          selectionBackground: "#264f78",
          selectionForeground: "#ffffff",
          black: "#484f58",
          red: "#ff7b72",
          green: "#3fb950",
          yellow: "#d29922",
          blue: "#58a6ff",
          magenta: "#bc8cff",
          cyan: "#39c5cf",
          white: "#b1bac4",
          brightBlack: "#6e7681",
          brightRed: "#ffa198",
          brightGreen: "#56d364",
          brightYellow: "#e3b341",
          brightBlue: "#79c0ff",
          brightMagenta: "#d2a8ff",
          brightCyan: "#56d4dd",
          brightWhite: "#f0f6fc",
        },
        allowProposedApi: true,
        scrollback: 10000,
        tabStopWidth: 8,
      });

      term.loadAddon(fitAddon);
      term.open(termRef.current!);

      requestAnimationFrame(() => {
        fitAddon.fit();
      });

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      term.onData((data) => sendInput(data));
      term.onBinary((data) => sendInput(data));

      const cols = term.cols;
      const rows = term.rows;
      const sessionId = sessionIdRef.current;

      const es = new EventSource(
        `/api/deploy/servers/${serverId}/terminal?session=${sessionId}&cols=${cols}&rows=${rows}`
      );
      eventSourceRef.current = es;

      es.addEventListener("connected", () => {
        if (!destroyedRef.current) setStatus("connected");
      });

      es.onmessage = (event) => {
        if (destroyedRef.current) return;
        try {
          const bytes = Uint8Array.from(atob(event.data), (c) =>
            c.charCodeAt(0)
          );
          const decoded = new TextDecoder().decode(bytes);
          term.write(decoded);
        } catch { }
      };

      es.onerror = () => {
        if (destroyedRef.current) return;
        setStatus("error");
        setError("Connection lost. Click Reconnect to try again.");
        es.close();
      };

      const handleResize = () => {
        requestAnimationFrame(() => {
          if (fitAddonRef.current && xtermRef.current) {
            fitAddonRef.current.fit();
          }
        });
      };

      term.onResize(({ cols, rows }) => sendResize(cols, rows));
      window.addEventListener("resize", handleResize);
      removeResizeListener = () =>
        window.removeEventListener("resize", handleResize);

      term.focus();
    }

    init();

    return () => {
      destroyedRef.current = true;
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushInput();
      removeResizeListener?.();

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      fetch(`/api/deploy/servers/${serverId}/terminal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "destroy",
          session: sessionIdRef.current,
        }),
        keepalive: true,
      }).catch(() => { });

      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    };
  }, [serverId, sendInput, sendResize, flushInput]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "F11" || (e.metaKey && e.shiftKey && e.key === "f")) {
        e.preventDefault();
        setIsFullscreen((f) => !f);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (fitAddonRef.current) fitAddonRef.current.fit();
      if (xtermRef.current) xtermRef.current.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [isFullscreen]);

  useEffect(() => {
    document.title = `${serverName} ~ Terminal`;
    return () => {
      document.title = "Dashboard";
    };
  }, [serverName]);

  return (
    <div
      className={cn(
        "flex flex-col bg-[#0d1117]",
        isFullscreen ? "fixed inset-0 z-50" : "h-screen"
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d] shrink-0 select-none">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.close()}
            className="h-7 px-2 text-neutral-400 hover:text-neutral-100 hover:bg-[#30363d] rounded-lg"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Close
          </Button>
          <div className="h-4 w-px bg-[#30363d]" />
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-neutral-200">
              {serverName}
            </span>
            <span className="text-xs font-mono text-neutral-500">
              {serverIp}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                status === "connected"
                  ? "bg-emerald-500"
                  : status === "connecting"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-red-500"
              )}
            />
            <span className="text-[11px] text-neutral-500 capitalize">
              {status}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen((f) => !f)}
            className="h-7 w-7 p-0 text-neutral-400 hover:text-neutral-100 hover:bg-[#30363d] rounded-lg"
            title={isFullscreen ? "Exit fullscreen (F11)" : "Fullscreen (F11)"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {status === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0d1117]/80">
            <div className="flex items-center gap-3 text-neutral-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Connecting to {serverName}...</span>
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0d1117]/80">
            <div className="flex flex-col items-center gap-3 text-center">
              <XCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-red-400 max-w-md">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="rounded-lg border-[#30363d] text-neutral-300 hover:bg-[#30363d]"
              >
                Reconnect
              </Button>
            </div>
          </div>
        )}
        <div
          ref={termRef}
          className="h-full w-full"
          style={{ padding: "4px 4px 0 4px", background: "#0d1117" }}
          onClick={() => xtermRef.current?.focus()}
        />
      </div>
    </div>
  );
}
