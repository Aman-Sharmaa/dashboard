import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { RoadmapItem } from "@/models/RoadmapItem";
import { CmsSetting } from "@/models/CmsSetting";
import { Project } from "@/models/Project";
import { Client } from "@/models/Client";
import { Employee } from "@/models/Employee";
import { RoadmapColumn } from "@/models/RoadmapColumn";

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

function serializeColumn(col: any) {
  return {
    id: String(col._id),
    key: col.key,
    label: col.label,
    color: col.color,
    order: col.order,
  };
}

export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const doc = await CmsSetting.findOne().select("roadmapPublic").lean();
    const isPublic = (doc as any)?.roadmapPublic ?? false;

    if (!isPublic) {
      return NextResponse.json({ message: "Roadmap is private" }, { status: 403 });
    }

    // Filter projects belonging only to active clients
    const activeClients = await Client.find({ isActive: true }).select("_id").lean();
    const activeClientIds = activeClients.map((c) => c._id);
    
    const activeProjects = await Project.find({ client: { $in: activeClientIds } }).lean();
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

    // Fetch employees for the "WHO'S WORKING ON IT" section
    const employees = await Employee.find().sort({ createdAt: 1 }).lean();

    // Fetch dynamic columns
    let columns = await RoadmapColumn.find().sort({ order: 1 }).lean();
    if (columns.length === 0) {
      const DEFAULT_COLUMNS = [
        { key: "now",     label: "Now",      color: "#2563eb", order: 0 },
        { key: "next",    label: "Next",     color: "#d97706", order: 1 },
        { key: "later",   label: "Later",    color: "#e11d48", order: 2 },
        { key: "wont_do", label: "Won't do", color: "#71717a", order: 3 },
      ];
      await RoadmapColumn.insertMany(DEFAULT_COLUMNS);
      columns = await RoadmapColumn.find().sort({ order: 1 }).lean();
    }

    return NextResponse.json({
      items: items.map(serializeItem),
      columns: columns.map(serializeColumn),
      projects: activeProjects.map((p: any) => ({
        id: String(p._id),
        name: p.name,
        description: p.description,
      })),
      employees: employees.map((e: any) => ({
        id: String(e._id),
        name: e.name,
        title: e.title,
        department: e.department,
        avatarUrl: e.avatarUrl,
        type: e.type,
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to fetch roadmap items" }, { status: 500 });
  }
}
