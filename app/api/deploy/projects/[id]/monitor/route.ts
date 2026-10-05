import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeployProject } from "@/models/DeployProject";
import { getProjectMonitoring } from "@/lib/deploy/deployer";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const project = await DeployProject.findById(id);
  if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const stats = await getProjectMonitoring(project);
  if (stats) {
    await DeployProject.findByIdAndUpdate(id, {
      cpuUsage: stats.cpu,
      memoryUsage: stats.memoryMb,
      diskUsage: stats.disk,
      uptime: stats.uptime,
      restartCount: stats.restartCount,
    });
  }

  return NextResponse.json({ stats });
}
