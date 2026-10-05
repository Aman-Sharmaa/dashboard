import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { RoadmapItem } from "@/models/RoadmapItem";
import { Employee } from "@/models/Employee";
import { Project } from "@/models/Project";
import { Client } from "@/models/Client";

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

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  try {
    // Filter projects belonging only to active clients
    const activeClients = await Client.find({ isActive: true }).select("_id").lean();
    const activeClientIds = activeClients.map((c) => c._id);
    
    const activeProjects = await Project.find({ client: { $in: activeClientIds } }).select("_id").lean();
    const activeProjectIds = activeProjects.map((p) => String(p._id));

    // Find roadmap items that are either not linked to any project, OR linked to an active project
    const items = await RoadmapItem.find({
      $or: [
        { projectId: { $in: activeProjectIds } },
        { projectId: null },
        { projectId: "" },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const employees = await Employee.find().sort({ createdAt: 1 }).lean();

    return NextResponse.json({ 
      items: items.map(serializeItem),
      employees: employees.map((e: any) => ({
        id: String(e._id),
        name: e.name,
        avatarUrl: e.avatarUrl,
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to fetch roadmap items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.title) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 });
    }

    // Look up the employee's actual name from the Employee model
    let displayName = user.email || "";
    try {
      const emp = await Employee.findOne({ email: user.email }).select("name").lean();
      if (emp && (emp as any).name) {
        displayName = (emp as any).name;
      }
    } catch {
      // fallback to email if lookup fails
    }

    const created = await RoadmapItem.create({
      title: body.title,
      description: body.description || "",
      status: body.status || "now",
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      impactScore: typeof body.impactScore === "number" ? body.impactScore : null,
      theme: body.theme || "",
      createdBy: user.userId || "",
      createdByName: displayName,
      projectId: body.projectId || null,
      projectName: body.projectName || null,
    });

    return NextResponse.json({ item: serializeItem(created) }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to create roadmap item" }, { status: 500 });
  }
}
