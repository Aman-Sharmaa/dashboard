import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { RoadmapColumn } from "@/models/RoadmapColumn";

const COOKIE_NAME = "kalp_auth_token";

// Default columns seeded if none exist in DB
const DEFAULT_COLUMNS = [
  { key: "now",     label: "Now",      color: "#2563eb", order: 0 },
  { key: "next",    label: "Next",     color: "#d97706", order: 1 },
  { key: "later",   label: "Later",    color: "#e11d48", order: 2 },
  { key: "wont_do", label: "Won't do", color: "#71717a", order: 3 },
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
    key: col.key,
    label: col.label,
    color: col.color,
    order: col.order,
  };
}

/** GET /api/roadmap/columns — returns all columns (seeding defaults if empty) */
export async function GET(_req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  let columns = await RoadmapColumn.find().sort({ order: 1 }).lean();

  // Seed defaults on first use
  if (columns.length === 0) {
    await RoadmapColumn.insertMany(DEFAULT_COLUMNS);
    columns = await RoadmapColumn.find().sort({ order: 1 }).lean();
  }

  return NextResponse.json({ columns: columns.map(serializeColumn) });
}

/** POST /api/roadmap/columns — create a new column (admin only) */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();

  const body = await req.json().catch(() => ({}));
  if (!body.label?.trim()) {
    return NextResponse.json({ message: "Label is required" }, { status: 400 });
  }

  // Auto-generate a slug key from the label
  const baseKey = body.label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  // Ensure key uniqueness by appending a suffix if needed
  let key = baseKey;
  let suffix = 2;
  while (await RoadmapColumn.exists({ key })) {
    key = `${baseKey}_${suffix++}`;
  }

  const maxOrderDoc = await RoadmapColumn.findOne().sort({ order: -1 }).select("order").lean();
  const nextOrder = maxOrderDoc ? (maxOrderDoc as any).order + 1 : 0;

  const col = await RoadmapColumn.create({
    key,
    label: body.label.trim(),
    color: body.color || "#71717a",
    order: nextOrder,
  });

  return NextResponse.json({ column: serializeColumn(col) }, { status: 201 });
}
