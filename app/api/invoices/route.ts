import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Client } from "@/models/Client";
import { Project } from "@/models/Project";
import { ProjectPayment } from "@/models/ProjectPayment";
import { CompanyProfile } from "@/models/CompanyProfile";
import { verifyToken } from "@/lib/auth";
import { buildInvoiceNumber, resolveClientRegion } from "@/lib/invoice-number";

// Ensure ref models are registered for populate()
void Client;
void Project;
void ProjectPayment;

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
    const status = searchParams.get("status");
    const invoiceType = searchParams.get("invoiceType");
    const gstStatus = searchParams.get("gstStatus");

    const filter: Record<string, unknown> = { owner: user.userId };
    if (clientId) filter.client = clientId;
    if (projectId) filter.project = projectId;
    if (status) filter.status = status;
    if (invoiceType) filter.invoiceType = invoiceType;
    if (gstStatus === "no_gst") filter.isNoGst = true;
    if (gstStatus === "gst") filter.isNoGst = { $ne: true };

    const invoices = await Invoice.find(filter)
      .populate("client", "name companyName email")
      .populate("project", "name")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      invoices: invoices.map((inv: any) => ({
        id: String(inv._id),
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        template: inv.template,
        invoiceType: inv.invoiceType,
        invoiceDocumentType: inv.invoiceDocumentType,
        clientRegion: inv.clientRegion,
        isNoGst: Boolean(inv.isNoGst),
        senderMode: inv.senderMode,
        sender: inv.sender,
        recipient: inv.recipient,
        lineItems: inv.lineItems,
        subTotal: inv.subTotal,
        tax: inv.tax,
        discount: inv.discount,
        roundOff: inv.roundOff,
        totalAmount: inv.totalAmount,
        currency: inv.currency,
        status: inv.status,
        dueDate: inv.dueDate,
        client: inv.client && typeof inv.client === "object"
          ? { id: String(inv.client._id), name: inv.client.name, companyName: inv.client.companyName }
          : inv.client ? { id: String(inv.client), name: "", companyName: "" } : null,
        project: inv.project && typeof inv.project === "object"
          ? { id: String(inv.project._id), name: inv.project.name }
          : inv.project ? { id: String(inv.project), name: "" } : null,
        projectPayment: inv.projectPayment ? String(inv.projectPayment) : null,
        phaseId: inv.phaseId,
        phaseName: inv.phaseName,
        month: inv.month,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      })),
    });
  } catch (err) {
    console.error("Invoices GET error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to load invoices" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  try {
    const body = await req.json();

    // Auto-generate invoice number if not provided
    if (!body.invoiceNumber) {
      const profile = await CompanyProfile.findOne({ owner: admin.userId });
      const settings = profile?.invoiceSettings;

      let clientRegion = resolveClientRegion({
        clientRegion: body.clientRegion,
        currency: body.currency,
      });

      if (body.client) {
        const client = await Client.findById(body.client).select("clientRegion").lean();
        if (client?.clientRegion) {
          clientRegion = resolveClientRegion({ clientRegion: client.clientRegion });
        }
      }

      const { invoiceNumber, serialField } = buildInvoiceNumber(settings, clientRegion);
      body.invoiceNumber = invoiceNumber;

      if (profile) {
        await CompanyProfile.updateOne(
          { _id: profile._id },
          { $inc: { [serialField]: 1 } }
        );
      }
    }

    const invoice = await Invoice.create({
      ...body,
      owner: admin.userId,
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      periodFrom: body.periodFrom ? new Date(body.periodFrom) : undefined,
      periodTo: body.periodTo ? new Date(body.periodTo) : undefined,
    });

    const populated = await Invoice.findById(invoice._id)
      .populate("client", "name companyName email")
      .populate("project", "name")
      .lean();

    return NextResponse.json({ invoice: { ...populated, id: String(populated!._id) } }, { status: 201 });
  } catch (err) {
    console.error("Invoice POST error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to create invoice" },
      { status: 500 }
    );
  }
}
