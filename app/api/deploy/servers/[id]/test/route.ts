import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeployServer } from "@/models/DeployServer";
import { testConnection } from "@/lib/deploy/ssh";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const server = await DeployServer.findById(id);
  if (!server) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const result = await testConnection(server);
  await DeployServer.findByIdAndUpdate(id, {
    status: result.ok ? "connected" : "error",
    lastCheckedAt: new Date(),
  });

  return NextResponse.json(result);
}
