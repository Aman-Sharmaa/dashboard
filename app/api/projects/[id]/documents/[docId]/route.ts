import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { ProjectDocument } from "@/models/ProjectDocument";
import { Employee } from "@/models/Employee";
import { verifyToken } from "@/lib/auth";

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

/** Admin or employee assigned to the project can manage documents */
async function canManageProjectDocuments(projectId: string, user: { role: string; email: string }): Promise<boolean> {
  if (user.role === "admin") return true;
  if (user.role !== "employee") return false;
  const employee = await Employee.findOne({ email: user.email }).select("_id").lean();
  if (!employee) return false;
  const project = await Project.findById(projectId).select("assignedMembers").lean();
  if (!project) return false;
  const assigned = (project.assignedMembers as unknown[]) || [];
  return assigned.some((id) => String(id) === String(employee._id));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const doc = await ProjectDocument.findOne({
    _id: docId,
    project: id,
  }).lean();
  if (!doc) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({
    document: {
      id: String(doc._id),
      projectId: String(doc.project),
      name: doc.name,
      fileUrl: doc.fileUrl,
      fileKey: doc.fileKey,
      uploadedAt: doc.uploadedAt,
      createdAt: doc.createdAt,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const canManage = await canManageProjectDocuments(id, user);
  if (!canManage) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const doc = await ProjectDocument.findOneAndDelete({
    _id: docId,
    project: id,
  });
  if (!doc) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
