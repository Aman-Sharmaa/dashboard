import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { ProjectService } from "@/models/ProjectService";
import { Employee } from "@/models/Employee";
import { verifyToken } from "@/lib/auth";
import { uploadProjectServiceAttachment } from "@/lib/s3";

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

/** Admin or employee assigned to the project can add/delete services */
async function canManageProjectServices(projectId: string, user: { role: string; email: string }): Promise<boolean> {
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

  const services = await ProjectService.find({ project: id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    services: services.map((s) => ({
      id: String(s._id),
      projectId: String(s.project),
      name: s.name,
      serviceId: s.serviceId,
      servicePass: s.servicePass,
      cost: s.cost,
      costType: s.costType,
      customMonths: s.customMonths,
      attachmentUrl: s.attachmentUrl,
      createdAt: s.createdAt,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const canManage = await canManageProjectServices(id, user);
  if (!canManage) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const project = await Project.findById(id);
  if (!project) return NextResponse.json({ message: "Project not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") || "";
  let body: Record<string, string | number | undefined> = {};
  let attachmentUrl: string | undefined;
  let attachmentKey: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    body = {
      name: String(formData.get("name") || ""),
      serviceId: String(formData.get("serviceId") || ""),
      servicePass: String(formData.get("servicePass") || ""),
      cost: Number(formData.get("cost")) || 0,
      costType: String(formData.get("costType") || "monthly"),
      customMonths: formData.get("customMonths") ? Number(formData.get("customMonths")) : undefined,
    };
    const file = formData.get("attachment");
    if (file && typeof file === "object" && "arrayBuffer" in file && (file as any).size > 0) {
      try {
        const result = await uploadProjectServiceAttachment(file as File, id);
        attachmentUrl = result.url;
        attachmentKey = result.key;
      } catch (e) {
        return NextResponse.json(
          { message: "File upload failed. Is S3 configured?" },
          { status: 400 }
        );
      }
    }
  } else {
    const json = await req.json();
    body = {
      name: json.name,
      serviceId: json.serviceId,
      servicePass: json.servicePass,
      cost: json.cost,
      costType: json.costType || "monthly",
      customMonths: json.customMonths,
    };
  }

  if (!body.name || body.serviceId === undefined || body.servicePass === undefined) {
    return NextResponse.json(
      { message: "Name, service ID, and service pass are required" },
      { status: 400 }
    );
  }

  const service = await ProjectService.create({
    project: id,
    name: String(body.name),
    serviceId: String(body.serviceId),
    servicePass: String(body.servicePass),
    cost: Number(body.cost),
    costType: ["monthly", "daily", "custom_months"].includes(String(body.costType))
      ? String(body.costType) as "monthly" | "daily" | "custom_months"
      : "monthly",
    customMonths: body.costType === "custom_months" && body.customMonths != null
      ? Number(body.customMonths)
      : undefined,
    attachmentUrl: attachmentUrl || undefined,
    attachmentKey: attachmentKey || undefined,
  });

  const created = await ProjectService.findById(service._id).lean();
  return NextResponse.json(
    {
      service: {
        id: String(created!._id),
        projectId: String(created!.project),
        name: created!.name,
        serviceId: created!.serviceId,
        servicePass: created!.servicePass,
        cost: created!.cost,
        costType: created!.costType,
        customMonths: created!.customMonths,
        attachmentUrl: created!.attachmentUrl,
        createdAt: created!.createdAt,
      },
    },
    { status: 201 }
  );
}
