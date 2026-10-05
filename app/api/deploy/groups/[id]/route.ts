import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireDeploymentsAdmin } from "@/lib/deploy-auth";
import { DeployGroup } from "@/models/DeployGroup";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const group = await DeployGroup.findByIdAndUpdate(id, body, { new: true });
  if (!group) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ group: { id: String(group._id), name: group.name } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireDeploymentsAdmin())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  await DeployGroup.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
