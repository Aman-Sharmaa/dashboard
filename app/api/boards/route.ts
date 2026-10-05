import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Board } from "@/models/Board";
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

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get("type");

  let boards = await Board.find({}).sort({ order: 1, createdAt: 1 }).lean();

  // Ensure at least one General board exists
  const hasGeneral = boards.some((b) => (b as any).type === "General");
  if (!hasGeneral) {
    const count = await Board.countDocuments();
    await Board.create({
      name: "General",
      type: "General",
      order: count,
    });
    boards = await Board.find({}).sort({ order: 1, createdAt: 1 }).lean();
  }

  const filtered = typeFilter
    ? boards.filter((b) => (b as any).type === typeFilter)
    : boards;

  return NextResponse.json({
    boards: filtered.map((b) => ({
      id: String((b as any)._id),
      name: (b as any).name,
      type: (b as any).type,
      order: (b as any).order,
      isTaskManager: (b as any).isTaskManager !== false,
      labels: Array.isArray((b as any).labels) ? (b as any).labels : [],
      createdAt: (b as any).createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const { name, type, isTaskManager, labels } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ message: "Name is required" }, { status: 400 });
  }

  const count = await Board.countDocuments();
  const board = await Board.create({
    name: String(name).trim(),
    type: type ? String(type).trim() : "General",
    order: count,
    isTaskManager: isTaskManager !== false,
    labels: Array.isArray(labels) ? labels.map(String).map((label) => label.trim()).filter(Boolean) : [],
  });

  return NextResponse.json(
    {
      board: {
        id: String(board._id),
        name: board.name,
        type: board.type,
        order: board.order,
        isTaskManager: board.isTaskManager !== false,
        labels: board.labels || [],
        createdAt: board.createdAt,
      },
    },
    { status: 201 }
  );
}
