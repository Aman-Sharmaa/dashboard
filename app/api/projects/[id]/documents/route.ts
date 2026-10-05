import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { ProjectDocument } from "@/models/ProjectDocument";
import { Employee } from "@/models/Employee";
import { verifyToken } from "@/lib/auth";
import { uploadProjectDocument } from "@/lib/s3";

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

/** Admin or employee assigned to the project can add/delete documents */
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const project = await Project.findById(id);
  if (!project) return NextResponse.json({ message: "Project not found" }, { status: 404 });

  const documents = await ProjectDocument.find({ project: id })
    .sort({ uploadedAt: -1 })
    .lean();

  return NextResponse.json({
    documents: documents.map((d) => ({
      id: String(d._id),
      projectId: String(d.project),
      name: d.name,
      fileUrl: d.fileUrl,
      fileKey: d.fileKey,
      uploadedAt: d.uploadedAt,
      createdAt: d.createdAt,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const canManage = await canManageProjectDocuments(id, user);
  if (!canManage) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const project = await Project.findById(id);
  if (!project) return NextResponse.json({ message: "Project not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { message: "Use multipart/form-data with name and file" },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const name = String(formData.get("name") || "").trim();
  const file = formData.get("file");
  if (!name) {
    return NextResponse.json({ message: "Document name is required" }, { status: 400 });
  }
  if (!file || typeof file !== "object" || !("arrayBuffer" in file) || (file as any).size === 0) {
    return NextResponse.json({ message: "A file is required" }, { status: 400 });
  }

  let fileUrl: string;
  let fileKey: string;
  try {
    const result = await uploadProjectDocument(file, id, name);
    fileUrl = result.url;
    fileKey = result.key;
  } catch (e) {
    return NextResponse.json(
      { message: "File upload failed. Is S3 configured?" },
      { status: 400 }
    );
  }

  const doc = await ProjectDocument.create({
    project: id,
    name,
    fileUrl,
    fileKey,
    uploadedAt: new Date(),
    uploadedBy: user.userId,
  });

  const created = await ProjectDocument.findById(doc._id).lean();
  return NextResponse.json(
    {
      document: {
        id: String(created!._id),
        projectId: String(created!.project),
        name: created!.name,
        fileUrl: created!.fileUrl,
        fileKey: created!.fileKey,
        uploadedAt: created!.uploadedAt,
        createdAt: created!.createdAt,
      },
    },
    { status: 201 }
  );
}
