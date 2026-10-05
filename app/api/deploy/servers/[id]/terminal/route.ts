import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeployServer } from "@/models/DeployServer";
import {
  createSession,
  getSession,
  writeToSession,
  resizeSession,
  destroySession,
  addListener,
  removeListener,
} from "@/lib/deploy/terminal-sessions";

export const maxDuration = 300; // 5 minute max for SSE
export const dynamic = "force-dynamic";

// GET ~ SSE stream for terminal output
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireDeploymentsAdmin()))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id: serverId } = await params;
  const sp = new URL(req.url).searchParams;
  const sessionId = sp.get("session") || "";
  const cols = parseInt(sp.get("cols") || "120", 10);
  const rows = parseInt(sp.get("rows") || "30", 10);

  if (!sessionId)
    return NextResponse.json({ message: "Session ID required" }, { status: 400 });

  await connectDB();
  const server = await DeployServer.findById(serverId);
  if (!server)
    return NextResponse.json({ message: "Server not found" }, { status: 404 });

  // Create or reuse the shell session
  let session = getSession(sessionId);
  if (!session || session.closed) {
    try {
      session = await createSession(sessionId, server, cols, rows);
    } catch (err: any) {
      return NextResponse.json(
        { message: `SSH connection failed: ${err.message}` },
        { status: 502 }
      );
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          // Base64 encode to safely transport binary terminal data
          const b64 = Buffer.from(data, "utf-8").toString("base64");
          controller.enqueue(encoder.encode(`data: ${b64}\n\n`));
        } catch { }
      };

      // Send initial connected message
      controller.enqueue(encoder.encode(`event: connected\ndata: ok\n\n`));

      const listener = (data: string) => send(data);
      addListener(sessionId, listener);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        removeListener(sessionId, listener);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// POST ~ send input, resize, or destroy session
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireDeploymentsAdmin()))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id: serverId } = await params;
  const body = await req.json();
  const { action, session: sessionId } = body as {
    action: string;
    session: string;
  };

  if (!sessionId)
    return NextResponse.json({ message: "Session ID required" }, { status: 400 });

  switch (action) {
    case "input": {
      const data = body.data as string;
      if (typeof data !== "string")
        return NextResponse.json({ message: "Data required" }, { status: 400 });
      const ok = writeToSession(sessionId, data);
      return NextResponse.json({ ok });
    }

    case "resize": {
      const cols = body.cols as number;
      const rows = body.rows as number;
      if (!cols || !rows)
        return NextResponse.json({ message: "cols and rows required" }, { status: 400 });
      const ok = resizeSession(sessionId, cols, rows);
      return NextResponse.json({ ok });
    }

    case "destroy": {
      destroySession(sessionId);
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  }
}
