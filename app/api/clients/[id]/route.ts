import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import { Project } from "@/models/Project";
import { ProjectPayment } from "@/models/ProjectPayment";
import { ProjectService } from "@/models/ProjectService";
import { ProjectDocument } from "@/models/ProjectDocument";
import { Task } from "@/models/Task";
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

async function requireAdmin() {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

function serialize(client: any) {
  const rawPhases = client.budgetPhases;
  const budgetPhases = Array.isArray(rawPhases)
    ? rawPhases.map((p: any) => ({
      name: String(p.name ?? "").trim() || "Phase",
      percentage: Number(p.percentage) || 0,
      amount: Number(p.amount) || 0,
      description: String(p.description ?? "").trim(),
    }))
    : [];
  return {
    id: String(client._id),
    name: client.name,
    email: client.email,
    phone: client.phone,
    designation: client.designation,
    companyName: client.companyName,
    companyAddress: client.companyAddress,
    companyPhone: client.companyPhone,
    companyWebsite: client.companyWebsite,
    gstin: client.gstin,
    pan: client.pan,
    taxAddress: client.taxAddress,
    notes: client.notes,
    isActive: client.isActive,
    paymentProjectId: client.paymentProjectId ? String(client.paymentProjectId) : null,
    paymentType: client.paymentType || "project",
    scheduleType: client.scheduleType || "phases",
    totalBudget: Number(client.totalBudget) || 0,
    budgetPhases,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const client = await Client.findById(id).lean();
  if (!client) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({ client: serialize(client) });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const client = await Client.findById(id);
  if (!client) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json();
  const fields = [
    "name",
    "email",
    "phone",
    "designation",
    "companyName",
    "companyAddress",
    "companyPhone",
    "companyWebsite",
    "gstin",
    "pan",
    "taxAddress",
    "notes",
    "isActive",
    "totalBudget",
    "paymentType",
    "scheduleType",
  ];
  for (const key of fields) {
    if (body[key] !== undefined) {
      if (key === "email") (client as any)[key] = String(body[key]).trim().toLowerCase();
      else if (key === "totalBudget") (client as any)[key] = Number(body[key]) || 0;
      else (client as any)[key] = body[key];
    }
  }
  if (body.paymentProjectId !== undefined) {
    (client as any).paymentProjectId = body.paymentProjectId || null;
  }
  // Replace budget phases with incoming payload only (keep single set; older data replaced)
  if (body.budgetPhases !== undefined) {
    const phases = Array.isArray(body.budgetPhases)
      ? body.budgetPhases.map((p: any) => ({
        name: String(p.name ?? "").trim() || "Phase",
        percentage: Number(p.percentage) || 0,
        amount: Number(p.amount) || 0,
        description: String(p.description ?? "").trim(),
      }))
      : [];
    (client as any).budgetPhases = phases;
    (client as any).markModified("budgetPhases");
  }
  await client.save();

  const updated = await Client.findById(client._id).lean();
  return NextResponse.json({ client: serialize(updated) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const clientId = id;
  const client = await Client.findById(clientId);
  if (!client) return NextResponse.json({ message: "Not found" }, { status: 404 });

  // Cascade delete: remove everything attached to this client
  const projectIds = await Project.find({ client: clientId }).distinct("_id");

  await Promise.all([
    Task.deleteMany({ project: { $in: projectIds } }),
    ProjectService.deleteMany({ project: { $in: projectIds } }),
    ProjectDocument.deleteMany({ project: { $in: projectIds } }),
  ]);
  await ProjectPayment.deleteMany({ client: clientId });
  await Project.deleteMany({ client: clientId });
  await Client.findByIdAndDelete(clientId);

  return NextResponse.json({ ok: true });
}
