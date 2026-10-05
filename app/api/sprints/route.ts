import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Sprint } from "@/models/Sprint";

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

// GET: list all sprints
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await connectDB();

    const sprints = await Sprint.find({})
      .sort({ status: 1, startDate: -1 })
      .lean();

    return NextResponse.json({
      sprints: sprints.map((s: any) => ({
        id: String(s._id),
        name: s.name,
        startDate: s.startDate || null,
        endDate: s.endDate || null,
        status: s.status,
      })),
    });
  } catch (err: any) {
    console.error("GET /api/sprints error:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST: create a new sprint (admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ message: "Admin only" }, { status: 403 });
    await connectDB();

    const body = await req.json();
    const { name, startDate, endDate, status } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ message: "Sprint name is required" }, { status: 400 });
    }

    const sprint = await Sprint.create({
      name: String(name).trim(),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: status || "planned",
    });

    return NextResponse.json({
      sprint: {
        id: String(sprint._id),
        name: sprint.name,
        startDate: sprint.startDate || null,
        endDate: sprint.endDate || null,
        status: sprint.status,
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/sprints error:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// PATCH: update a sprint (admin only) ~ takes id in body
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ message: "Admin only" }, { status: 403 });
    await connectDB();

    const body = await req.json();
    const { id, name, startDate, endDate, status } = body;

    if (!id) return NextResponse.json({ message: "Sprint id is required" }, { status: 400 });

    const sprint = await Sprint.findById(id);
    if (!sprint) return NextResponse.json({ message: "Not found" }, { status: 404 });

    if (name !== undefined) sprint.name = String(name).trim();
    if (startDate !== undefined) sprint.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) sprint.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) sprint.status = status;

    await sprint.save();

    return NextResponse.json({
      sprint: {
        id: String(sprint._id),
        name: sprint.name,
        startDate: sprint.startDate || null,
        endDate: sprint.endDate || null,
        status: sprint.status,
      },
    });
  } catch (err: any) {
    console.error("PATCH /api/sprints error:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// DELETE: remove a sprint (admin only) ~ takes id in query string
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ message: "Admin only" }, { status: 403 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "Sprint id is required" }, { status: 400 });

    const Task = (await import("@/models/Task")).Task;

    // Unset sprint from all tasks in this sprint
    await Task.updateMany({ sprint: id }, { $set: { sprint: null } });

    await Sprint.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/sprints error:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
