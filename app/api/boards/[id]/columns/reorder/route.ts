import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { BoardColumn } from "@/models/BoardColumn";

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

/** PATCH /api/boards/[id]/columns/reorder — bulk reorder board columns */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();
  const { id: boardId } = await params;

  const body = await req.json().catch(() => ({}));
  const { orderedIds } = body as { orderedIds?: string[] };

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ message: "orderedIds array is required" }, { status: 400 });
  }

  // Bulk-update in parallel
  await Promise.all(
    orderedIds.map((colId, index) =>
      BoardColumn.findOneAndUpdate({ _id: colId, boardId }, { order: index })
    )
  );

  return NextResponse.json({ ok: true });
}
