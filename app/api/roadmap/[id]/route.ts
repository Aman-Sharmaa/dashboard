import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { RoadmapItem } from "@/models/RoadmapItem";
import { Employee } from "@/models/Employee";

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

function serializeItem(item: any) {
  return {
    id: String(item._id),
    title: item.title,
    description: item.description,
    status: item.status,
    targetDate: item.targetDate,
    impactScore: item.impactScore,
    theme: item.theme,
    createdBy: item.createdBy || "",
    createdByName: item.createdByName || "",
    completed: item.completed === true,
    completedBy: item.completedBy || "",
    completedByName: item.completedByName || "",
    completedAt: item.completedAt || null,
    projectId: item.projectId || null,
    projectName: item.projectName || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  try {
    const body = await req.json().catch(() => ({}));
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.targetDate !== undefined) {
      updateData.targetDate = body.targetDate ? new Date(body.targetDate) : null;
    }
    if (body.impactScore !== undefined) {
      updateData.impactScore = typeof body.impactScore === "number" ? body.impactScore : null;
    }
    if (body.theme !== undefined) updateData.theme = body.theme;
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null;
    if (body.projectName !== undefined) updateData.projectName = body.projectName || null;
    if (body.completed !== undefined) {
      const completed = body.completed === true;
      updateData.completed = completed;

      if (completed) {
        const employee = await Employee.findOne({ email: user.email }).select("name").lean();
        updateData.completedBy = user.userId || "";
        updateData.completedByName = (employee as any)?.name || user.email || "";
        updateData.completedAt = new Date();
      } else {
        updateData.completedBy = "";
        updateData.completedByName = "";
        updateData.completedAt = null;
      }
    }

    const updated = await RoadmapItem.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ message: "Roadmap item not found" }, { status: 404 });
    }

    return NextResponse.json({ item: serializeItem(updated) });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to update roadmap item" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  try {
    const deleted = await RoadmapItem.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ message: "Roadmap item not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Roadmap item deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to delete roadmap item" }, { status: 500 });
  }
}
