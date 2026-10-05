import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeployGroup } from "@/models/DeployGroup";
import { DeployProject } from "@/models/DeployProject";

export async function GET() {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const groups = await DeployGroup.find().populate("defaultServer", "name ip").sort({ name: 1 }).lean();
  const projectCounts = await DeployProject.aggregate([
    { $match: { group: { $ne: null } } },
    { $group: { _id: "$group", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(projectCounts.map((p) => [String(p._id), p.count]));

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: String(g._id),
      name: g.name,
      defaultServer: g.defaultServer ? { id: String((g.defaultServer as any)._id), name: (g.defaultServer as any).name } : null,
      projectCount: countMap.get(String(g._id)) || 0,
      createdAt: g.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { name, defaultServer } = await req.json();
  if (!name?.trim()) return NextResponse.json({ message: "Name required" }, { status: 400 });

  const group = await DeployGroup.create({ name: name.trim(), defaultServer: defaultServer || null });
  return NextResponse.json({ group: { id: String(group._id), name: group.name } }, { status: 201 });
}
