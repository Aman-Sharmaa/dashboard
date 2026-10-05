import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Board } from "@/models/Board";
import { Task } from "@/models/Task";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { id } = await params;
  const board = await Board.findById(id).lean();
  if (!board) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({
    board: {
      id: String(board._id),
      name: board.name,
      type: board.type,
      order: board.order,
      isTaskManager: board.isTaskManager !== false,
      labels: board.labels || [],
      createdAt: board.createdAt,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { id } = await params;
  const board = await Board.findById(id);
  if (!board) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json();
  if (body.name !== undefined) board.name = String(body.name).trim();
  if (body.type !== undefined) board.type = String(body.type).trim();
  if (body.order !== undefined) board.order = Number(body.order);
  if (body.isTaskManager !== undefined) board.isTaskManager = Boolean(body.isTaskManager);
  if (body.labels !== undefined) board.labels = Array.isArray(body.labels)
    ? body.labels.map(String).map((label: string) => label.trim()).filter(Boolean)
    : [];

  await board.save();

  return NextResponse.json({
    board: {
      id: String(board._id),
      name: board.name,
      type: board.type,
      order: board.order,
      isTaskManager: board.isTaskManager !== false,
      labels: board.labels || [],
      createdAt: board.createdAt,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const { id } = await params;
  const board = await Board.findById(id);
  if (!board) return NextResponse.json({ message: "Not found" }, { status: 404 });

  // Block deletion if board still has tasks
  const taskCount = await Task.countDocuments({ board: id });
  if (taskCount > 0) {
    return NextResponse.json(
      { message: `Cannot delete: this board has ${taskCount} task${taskCount !== 1 ? "s" : ""} assigned to it. Move or reassign them first.` },
      { status: 409 }
    );
  }

  await board.deleteOne();

  return NextResponse.json({ ok: true });
}
