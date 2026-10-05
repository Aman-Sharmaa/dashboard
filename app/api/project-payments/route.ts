import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { ProjectPayment } from "@/models/ProjectPayment";
import { Client } from "@/models/Client";
import { Project } from "@/models/Project";
import { Product } from "@/models/Product";
import { verifyToken } from "@/lib/auth";

// Ensure ref models are registered for populate()
void Client;
void Project;
void Product;

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

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const projectId = searchParams.get("projectId");
    const billingCycle = searchParams.get("billingCycle");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const filter: Record<string, unknown> = {};
    if (clientId) filter.client = clientId;
    if (projectId) filter.project = projectId;
    if (billingCycle) filter.billingCycle = billingCycle;

    if (fromDate) {
      const start = new Date(fromDate);
      start.setUTCHours(0, 0, 0, 0);
      (filter as any).updatedAt = (filter as any).updatedAt || {};
      (filter as any).updatedAt.$gte = start;
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setUTCHours(23, 59, 59, 999);
      (filter as any).updatedAt = (filter as any).updatedAt || {};
      (filter as any).updatedAt.$lte = end;
    }

    const payments = await ProjectPayment.find(filter)
      .populate("client", "name companyName")
      .populate("project", "name")
      .populate("product", "name slug kind")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: String(p._id),
        client: p.client && typeof p.client === "object"
          ? { id: String((p.client as any)._id), name: (p.client as any).name, companyName: (p.client as any).companyName }
          : { id: String(p.client), name: "", companyName: "" },
        project: p.project && typeof p.project === "object"
          ? { id: String((p.project as any)._id), name: (p.project as any).name }
          : p.project ? { id: String(p.project), name: "" } : null,
        product: p.product && typeof p.product === "object"
          ? { id: String((p.product as any)._id), name: (p.product as any).name, kind: (p.product as any).kind }
          : (p as any).product ? { id: String((p as any).product), name: "", kind: "product" } : null,
        totalAmount: p.totalAmount,
        currency: p.currency,
        billingCycle: p.billingCycle,
        phases: (p.phases || []).map((ph: any) => ({
          _id: ph._id ? String(ph._id) : undefined,
          name: ph.name,
          percentage: ph.percentage,
          amount: ph.amount,
          remark: ph.remark ?? "",
          status: ph.status ?? "draft",
          billGeneratedAt: ph.billGeneratedAt ?? null,
          dueDate: ph.dueDate ?? null,
          paidDate: ph.paidDate ?? null,
          isGstBill: ph.isGstBill ?? false,
          invoiceDetails: ph.invoiceDetails ?? null,
        })),
        monthlyBreakdown: p.monthlyBreakdown || [],
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
        billGeneratedAt: p.billGeneratedAt,
        paidDate: p.paidDate,
        isGstBill: (p as any).isGstBill,
        invoiceDetails: (p as any).invoiceDetails,
        notes: p.notes,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    console.error("Project payments GET error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to load payments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const body = await req.json();
  const {
    clientId,
    projectId,
    productId,
    totalAmount,
    currency,
    billingCycle,
    phases,
    monthlyBreakdown,
    startDate,
    endDate,
    status,
    paidDate,
    notes,
  } = body;

  if (!clientId || totalAmount == null) {
    return NextResponse.json(
      { message: "Client and total amount are required" },
      { status: 400 }
    );
  }

  const phasesArr = Array.isArray(phases)
    ? phases.map((p: any) => ({
      name: p.name ?? "",
      percentage: Number(p.percentage) || 0,
      amount: Number(p.amount) || 0,
      remark: p.remark ?? "",
      status: ["draft", "sent", "paid", "overdue"].includes(p.status) ? p.status : "draft",
      billGeneratedAt: p.billGeneratedAt ? new Date(p.billGeneratedAt) : undefined,
      dueDate: p.dueDate ? new Date(p.dueDate) : undefined,
      paidDate: p.paidDate ? new Date(p.paidDate) : undefined,
      isGstBill: !!p.isGstBill,
      invoiceDetails: p.invoiceDetails,
    }))
    : [];

  const payment = await ProjectPayment.create({
    client: clientId,
    project: projectId || null,
    product: productId || null,
    totalAmount: Number(totalAmount),
    currency: currency || "INR",
    billingCycle: billingCycle || "one_time",
    phases: phasesArr,
    monthlyBreakdown: monthlyBreakdown || [],
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    status: status || "draft",
    paidDate: paidDate ? new Date(paidDate) : undefined,
    isGstBill: !!body.isGstBill,
    invoiceDetails: body.invoiceDetails,
    notes: notes || undefined,
  });

  const populated = await ProjectPayment.findById(payment._id)
    .populate("client", "name companyName")
    .populate("project", "name")
    .populate("product", "name slug kind")
    .lean();

  const pop = populated as any;
  return NextResponse.json(
    {
      payment: {
        id: String(populated!._id),
        client: populated!.client && typeof populated!.client === "object"
          ? { id: String((populated!.client as any)._id), name: (populated!.client as any).name, companyName: (populated!.client as any).companyName }
          : { id: String(populated!.client), name: "", companyName: "" },
        project: populated!.project && typeof populated!.project === "object"
          ? { id: String((populated!.project as any)._id), name: (populated!.project as any).name }
          : populated!.project ? { id: String(populated!.project), name: "" } : null,
        product: pop.product && typeof pop.product === "object"
          ? { id: String(pop.product._id), name: pop.product.name, kind: pop.product.kind }
          : pop.product ? { id: String(pop.product), name: "", kind: "product" } : null,
        totalAmount: populated!.totalAmount,
        currency: populated!.currency,
        billingCycle: populated!.billingCycle,
        phases: (pop.phases || []).map((ph: any) => ({ ...ph, _id: ph._id ? String(ph._id) : undefined, status: ph.status ?? "draft", billGeneratedAt: ph.billGeneratedAt ?? null, dueDate: ph.dueDate ?? null, paidDate: ph.paidDate ?? null, invoiceDetails: ph.invoiceDetails ?? null })),
        monthlyBreakdown: populated!.monthlyBreakdown || [],
        startDate: populated!.startDate,
        endDate: populated!.endDate,
        status: populated!.status,
        billGeneratedAt: populated!.billGeneratedAt,
        paidDate: populated!.paidDate,
        isGstBill: pop.isGstBill,
        invoiceDetails: pop.invoiceDetails,
        notes: populated!.notes,
        createdAt: populated!.createdAt,
      },
    },
    { status: 201 }
  );
}
