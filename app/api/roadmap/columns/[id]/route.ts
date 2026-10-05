import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { RoadmapColumn } from "@/models/RoadmapColumn";
import { RoadmapItem } from "@/models/RoadmapItem";

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
    key: col.key,
    label: col.label,
    color: col.color,
    order: col.order,
  };
}

/** PATCH /api/roadmap/columns/[id] — rename label or update color */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();

  const { id } = await params;
  const col = await RoadmapColumn.findById(id);
  if (!col) return NextResponse.json({ message: "Column not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body.label !== undefined) col.label = String(body.label).trim();
  if (body.color !== undefined) col.color = String(body.color).trim();
  if (body.order !== undefined) col.order = Number(body.order);

  await col.save();

  return NextResponse.json({ column: serializeColumn(col) });
}

/** DELETE /api/roadmap/columns/[id] — delete only if no items use this column */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();

  const { id } = await params;
  const col = await RoadmapColumn.findById(id);
  if (!col) return NextResponse.json({ message: "Column not found" }, { status: 404 });

  // Block deletion if items still live in this column
  const itemCount = await RoadmapItem.countDocuments({ status: col.key });
  if (itemCount > 0) {
    return NextResponse.json(
      {
        message: `Cannot delete: "${col.label}" has ${itemCount} item${itemCount !== 1 ? "s" : ""}. Move or delete them first.`,
      },
      { status: 409 }
    );
  }

  await col.deleteOne();

  return NextResponse.json({ ok: true });
}
