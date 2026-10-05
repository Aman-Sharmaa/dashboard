import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { BoardColumn } from "@/models/BoardColumn";
import { Board } from "@/models/Board";

const COOKIE_NAME = "kalp_auth_token";

const DEFAULT_COLUMNS = [
  { key: "backlog",     label: "Backlog",     color: "#9ca3af", order: 0 },
  { key: "todo",        label: "Todo",        color: "#9ca3af", order: 1 },
  { key: "in_progress", label: "Inprogress",  color: "#3b82f6", order: 2 },
  { key: "hold",        label: "Hold",        color: "#f97316", order: 3 },
  { key: "in_review",   label: "Inreview",    color: "#f59e0b", order: 4 },
  { key: "done",        label: "Completed",   color: "#10b981", order: 5 },
  { key: "rejected",    label: "Rejected",    color: "#f43f5e", order: 6 },
];

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

/** GET /api/boards/[id]/columns — get board columns (seeds defaults if empty) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id: boardId } = await params;

  // Validate board exists
  const board = await Board.findById(boardId);
  if (!board) return NextResponse.json({ message: "Board not found" }, { status: 404 });

  let columns = await BoardColumn.find({ boardId }).sort({ order: 1 }).lean();

  if (columns.length === 0) {
    const seeded = DEFAULT_COLUMNS.map((col) => ({ ...col, boardId }));
    await BoardColumn.insertMany(seeded);
    columns = await BoardColumn.find({ boardId }).sort({ order: 1 }).lean();
  }

  return NextResponse.json({ columns: columns.map(serializeColumn) });
}

/** POST /api/boards/[id]/columns — create a column inside a board */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();
  const { id: boardId } = await params;

  const board = await Board.findById(boardId);
  if (!board) return NextResponse.json({ message: "Board not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (!body.label?.trim()) {
    return NextResponse.json({ message: "Label is required" }, { status: 400 });
  }

  const baseKey = body.label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  let key = baseKey;
  let suffix = 2;
  while (await BoardColumn.exists({ boardId, key })) {
    key = `${baseKey}_${suffix++}`;
  }

  const maxOrderDoc = await BoardColumn.findOne({ boardId }).sort({ order: -1 }).select("order").lean();
  const nextOrder = maxOrderDoc ? (maxOrderDoc as any).order + 1 : 0;

  const col = await BoardColumn.create({
    boardId,
    key,
    label: body.label.trim(),
    color: body.color || "#9ca3af",
    order: nextOrder,
  });

  return NextResponse.json({ column: serializeColumn(col) }, { status: 201 });
}
