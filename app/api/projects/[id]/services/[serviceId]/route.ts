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

/** Admin or employee assigned to the project can manage services */
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
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  const { id, serviceId } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const service = await ProjectService.findOne({
    _id: serviceId,
    project: id,
  }).lean();
  if (!service) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({
    service: {
      id: String(service._id),
      projectId: String(service.project),
      name: service.name,
      serviceId: service.serviceId,
      servicePass: service.servicePass,
      cost: service.cost,
      costType: service.costType,
      customMonths: service.customMonths,
      attachmentUrl: service.attachmentUrl,
      createdAt: service.createdAt,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  const { id, serviceId } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const canManage = await canManageProjectServices(id, user);
  if (!canManage) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const service = await ProjectService.findOne({
    _id: serviceId,
    project: id,
  });
  if (!service) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") || "";
  let body: Record<string, string | number | undefined> = {};
  let attachmentUrl: string | undefined;
  let attachmentKey: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    body = {
      name: formData.get("name") != null ? String(formData.get("name")) : undefined,
      serviceId: formData.get("serviceId") != null ? String(formData.get("serviceId")) : undefined,
      servicePass: formData.get("servicePass") != null ? String(formData.get("servicePass")) : undefined,
      cost: formData.get("cost") != null ? Number(formData.get("cost")) : undefined,
      costType: formData.get("costType") != null ? String(formData.get("costType")) : undefined,
      customMonths: formData.get("customMonths") ? Number(formData.get("customMonths")) : undefined,
    };
    const file = formData.get("attachment");
    if (file && typeof file === "object" && "arrayBuffer" in file && (file as any).size > 0) {
      try {
        const result = await uploadProjectServiceAttachment(file as File, id);
        attachmentUrl = result.url;
        attachmentKey = result.key;
      } catch {
        return NextResponse.json(
          { message: "File upload failed" },
          { status: 400 }
        );
      }
    }
  } else {
    body = await req.json();
  }

  if (body.name !== undefined) service.name = String(body.name);
  if (body.serviceId !== undefined) service.serviceId = String(body.serviceId);
  if (body.servicePass !== undefined) service.servicePass = String(body.servicePass);
  if (body.cost !== undefined) service.cost = Number(body.cost);
  if (body.costType !== undefined) service.costType = body.costType as any;
  if (body.customMonths !== undefined) service.customMonths = Number(body.customMonths) || undefined;
  if (attachmentUrl !== undefined) service.attachmentUrl = attachmentUrl;
  if (attachmentKey !== undefined) service.attachmentKey = attachmentKey;

  await service.save();

  const updated = await ProjectService.findById(service._id).lean();
  return NextResponse.json({
    service: {
      id: String(updated!._id),
      projectId: String(updated!.project),
      name: updated!.name,
      serviceId: updated!.serviceId,
      servicePass: updated!.servicePass,
      cost: updated!.cost,
      costType: updated!.costType,
      customMonths: updated!.customMonths,
      attachmentUrl: updated!.attachmentUrl,
      createdAt: updated!.createdAt,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  const { id, serviceId } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const canManage = await canManageProjectServices(id, user);
  if (!canManage) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const service = await ProjectService.findOneAndDelete({
    _id: serviceId,
    project: id,
  });
  if (!service) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
