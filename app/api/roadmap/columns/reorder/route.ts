import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { RoadmapColumn } from "@/models/RoadmapColumn";

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

/** PATCH /api/roadmap/columns/reorder — bulk reorder by ordered ID array */
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();

  const body = await req.json().catch(() => ({}));
  const { orderedIds } = body as { orderedIds?: string[] };

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ message: "orderedIds array is required" }, { status: 400 });
  }

  // Bulk-update order in parallel
  await Promise.all(
    orderedIds.map((id, index) =>
      RoadmapColumn.findByIdAndUpdate(id, { order: index })
    )
  );

  return NextResponse.json({ ok: true });
}
