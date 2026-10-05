import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { ProjectPayment } from "@/models/ProjectPayment";
import { Invoice } from "@/models/Invoice";
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const payment = await ProjectPayment.findById(id)
    .populate("client", "name companyName email")
    .populate("project", "name")
    .populate("product", "name slug kind")
    .lean();

  if (!payment) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const p = payment as any;
  return NextResponse.json({
    payment: {
      id: String(payment._id),
      client: payment.client && typeof payment.client === "object"
        ? { id: String((payment.client as any)._id), name: (payment.client as any).name, companyName: (payment.client as any).companyName, email: (payment.client as any).email }
        : { id: String(payment.client), name: "", companyName: "", email: "" },
      project: payment.project && typeof payment.project === "object"
        ? { id: String((payment.project as any)._id), name: (payment.project as any).name }
        : payment.project ? { id: String(payment.project), name: "" } : null,
      product: p.product && typeof p.product === "object"
        ? { id: String(p.product._id), name: p.product.name, kind: p.product.kind }
        : p.product ? { id: String(p.product), name: "", kind: "product" } : null,
      totalAmount: payment.totalAmount,
      currency: payment.currency,
      billingCycle: payment.billingCycle,
      phases: (p.phases || []).map((ph: any) => ({ ...ph, status: ph.status ?? "draft", billGeneratedAt: ph.billGeneratedAt ?? null, dueDate: ph.dueDate ?? null, paidDate: ph.paidDate ?? null })),
      monthlyBreakdown: payment.monthlyBreakdown || [],
      startDate: payment.startDate,
      endDate: payment.endDate,
      status: payment.status,
      billGeneratedAt: payment.billGeneratedAt,
      paidDate: payment.paidDate,
      isGstBill: p.isGstBill,
      notes: payment.notes,
      createdAt: payment.createdAt,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const payment = await ProjectPayment.findById(id);
  if (!payment) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json();
  if (body.clientId !== undefined) payment.client = body.clientId;
  if (body.projectId !== undefined) payment.project = body.projectId || null;
  if (body.productId !== undefined) (payment as any).product = body.productId || null;
  if (body.totalAmount !== undefined) payment.totalAmount = Number(body.totalAmount);
  if (body.currency !== undefined) payment.currency = body.currency;
  if (body.billingCycle !== undefined) payment.billingCycle = body.billingCycle;
  if (body.monthlyBreakdown !== undefined) payment.monthlyBreakdown = body.monthlyBreakdown;
  if (body.startDate !== undefined) payment.startDate = body.startDate ? new Date(body.startDate) : undefined;
  if (body.endDate !== undefined) payment.endDate = body.endDate ? new Date(body.endDate) : undefined;
  if (body.status !== undefined) payment.status = body.status;
  if (body.paidDate !== undefined) payment.paidDate = body.paidDate ? new Date(body.paidDate) : undefined;
  if (body.notes !== undefined) payment.notes = body.notes;
  if (body.billGeneratedAt !== undefined) (payment as any).billGeneratedAt = body.billGeneratedAt ? new Date(body.billGeneratedAt) : undefined;
  if (body.isGstBill !== undefined) (payment as any).isGstBill = body.isGstBill;
  if (body.phases !== undefined) {
    const phasesArr = Array.isArray(body.phases)
      ? body.phases.map((p: any) => ({
        _id: p._id || undefined,
        name: p.name ?? "",
        percentage: Number(p.percentage) || 0,
        amount: Number(p.amount) || 0,
        remark: p.remark ?? "",
        status: ["draft", "sent", "paid", "overdue"].includes(p.status) ? p.status : "draft",
        billGeneratedAt: p.billGeneratedAt ? new Date(p.billGeneratedAt) : undefined,
        dueDate: p.dueDate ? new Date(p.dueDate) : undefined,
        paidDate: p.paidDate ? new Date(p.paidDate) : undefined,
        isGstBill: !!p.isGstBill,
      }))
      : [];
    (payment as any).phases = phasesArr;
    (payment as any).markModified("phases");
    // When all phases are paid, set payment status to "paid" (completed)
    if (phasesArr.length > 0 && phasesArr.every((ph: any) => ph.status === "paid")) {
      payment.status = "paid";
    }
  }
  if (body.createdAt !== undefined) (payment as any).createdAt = new Date(body.createdAt);

  await payment.save();

  // Sync details to connected invoices
  try {
    const invoices = await Invoice.find({ projectPayment: payment._id });
    for (const inv of invoices) {
      let needsSave = false;
      let newAmount: number | null = null;
      let newDescription: string | null = null;
      let newStatus: string | null = null;

      if (inv.invoiceType === "phase" && inv.phaseId) {
        const ph = (payment as any).phases?.find((p: any) => p._id && p._id.toString() === inv.phaseId);
        if (ph) {
          newAmount = ph.amount;
          newDescription = `${ph.name} - ${(payment as any).project ? "Project Payment" : "General"}`;
          newStatus = ph.status;
        }
      } else if (inv.invoiceType === "monthly" && inv.month) {
        const mb = payment.monthlyBreakdown?.find((m: any) => m.month === inv.month);
        if (mb) {
          newAmount = mb.amount;
        }
      } else if (inv.invoiceType === "single") {
        newAmount = payment.totalAmount;
        newStatus = payment.status;
      }

      if (newAmount !== null && inv.lineItems?.length > 0 && inv.lineItems[0].amount !== newAmount) {
        inv.lineItems[0].amount = newAmount;
        inv.subTotal = newAmount;
        // recalculate simple tax assuming GST 18% as per creation logic
        const gstRate = 18;
        const isInterstate = !!inv.tax?.igstAmount;
        if (isInterstate) {
          inv.tax.igstAmount = (newAmount * gstRate) / 100;
        } else {
          inv.tax.sgstAmount = (newAmount * (gstRate / 2)) / 100;
          inv.tax.cgstAmount = (newAmount * (gstRate / 2)) / 100;
        }
        const totalTax = (inv.tax?.sgstAmount || 0) + (inv.tax?.cgstAmount || 0) + (inv.tax?.igstAmount || 0);
        inv.totalAmount = newAmount + totalTax;
        needsSave = true;
      }

      if (newDescription !== null && inv.lineItems?.length > 0 && inv.lineItems[0].description !== newDescription) {
        inv.lineItems[0].description = newDescription;
        needsSave = true;
      }
      
      // Update paid status if marked paid in project payment
      if (newStatus === "paid" && inv.status !== "paid") {
        inv.status = "paid";
        inv.paidDate = new Date();
        needsSave = true;
      } else if (newStatus !== "paid" && newStatus !== "sent" && inv.status === "paid") {
        inv.status = "sent";
        inv.paidDate = undefined;
        needsSave = true;
      }

      if (needsSave) {
        await inv.save();
      }
    }
  } catch (err) {
    console.error("Failed to sync invoice details:", err);
  }

  const updated = await ProjectPayment.findById(payment._id)
    .populate("client", "name companyName")
    .populate("project", "name")
    .populate("product", "name slug kind")
    .lean();

  const u = updated as any;
  return NextResponse.json({
    payment: {
      id: String(updated!._id),
      client: updated!.client && typeof updated!.client === "object"
        ? { id: String((updated!.client as any)._id), name: (updated!.client as any).name, companyName: (updated!.client as any).companyName }
        : { id: String(updated!.client), name: "", companyName: "" },
      project: updated!.project && typeof updated!.project === "object"
        ? { id: String((updated!.project as any)._id), name: (updated!.project as any).name }
        : updated!.project ? { id: String(updated!.project), name: "" } : null,
      product: u.product && typeof u.product === "object"
        ? { id: String(u.product._id), name: u.product.name, kind: u.product.kind }
        : u.product ? { id: String(u.product), name: "", kind: "product" } : null,
      totalAmount: updated!.totalAmount,
      currency: updated!.currency,
      billingCycle: updated!.billingCycle,
      phases: (u.phases || []).map((ph: any) => ({ ...ph, _id: ph._id ? String(ph._id) : undefined, status: ph.status ?? "draft", billGeneratedAt: ph.billGeneratedAt ?? null, dueDate: ph.dueDate ?? null, paidDate: ph.paidDate ?? null })),
      monthlyBreakdown: updated!.monthlyBreakdown || [],
      startDate: updated!.startDate,
      endDate: updated!.endDate,
      status: updated!.status,
      billGeneratedAt: updated!.billGeneratedAt,
      paidDate: updated!.paidDate,
      isGstBill: u.isGstBill,
      notes: updated!.notes,
      createdAt: updated!.createdAt,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const payment = await ProjectPayment.findByIdAndDelete(id);
  if (!payment) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
