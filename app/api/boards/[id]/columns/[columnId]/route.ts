import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { BoardColumn } from "@/models/BoardColumn";
import { Task } from "@/models/Task";

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

function serializeColumn(col: any) {
  return {
    id: String(col._id),
    boardId: col.boardId,
    key: col.key,
    label: col.label,
    color: col.color,
    order: col.order,
  };
}

/** PATCH /api/boards/[id]/columns/[columnId] — edit column name/color */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();
  const { id: boardId, columnId } = await params;

  const col = await BoardColumn.findOne({ _id: columnId, boardId });
  if (!col) return NextResponse.json({ message: "Column not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body.label !== undefined) col.label = String(body.label).trim();
  if (body.color !== undefined) col.color = String(body.color).trim();
  if (body.order !== undefined) col.order = Number(body.order);

  await col.save();

  return NextResponse.json({ column: serializeColumn(col) });
}

/** DELETE /api/boards/[id]/columns/[columnId] — delete column if empty */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();
  const { id: boardId, columnId } = await params;

  const col = await BoardColumn.findOne({ _id: columnId, boardId });
  if (!col) return NextResponse.json({ message: "Column not found" }, { status: 404 });

  // Block deletion if any task uses this column on this board
  const taskCount = await Task.countDocuments({ board: boardId, status: col.key });
  if (taskCount > 0) {
    return NextResponse.json(
      {
        message: `Cannot delete: "${col.label}" has ${taskCount} task${taskCount !== 1 ? "s" : ""} in it. Move or delete them first.`,
      },
      { status: 409 }
    );
  }

  await col.deleteOne();

  return NextResponse.json({ ok: true });
}
