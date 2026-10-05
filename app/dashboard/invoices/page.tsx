import { requireFeatureAccess } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Client } from "@/models/Client";
import { Project } from "@/models/Project";
import { CompanyProfile } from "@/models/CompanyProfile";
import { ProjectPayment } from "@/models/ProjectPayment";
import { InvoicesPageClient } from "@/components/invoices-page-client";

void Client;
void Project;

export default async function InvoicesPage() {
  const user = await requireFeatureAccess("invoices");

  await connectDB();

  const clients = await Client.find({ isActive: true }).select("name companyName email companyAddress gstin pan phone clientRegion").sort({ name: 1 }).lean();
  const activeClientIds = clients.map((c: any) => c._id);

  const [invoices, projects, profile, payments] = await Promise.all([
    Invoice.find({ owner: user.userId })
      .populate("client", "name companyName email")
      .populate("project", "name")
      .sort({ createdAt: -1 })
      .lean(),
    Project.find({ client: { $in: activeClientIds }, status: { $ne: "completed" } }).select("name client status").populate("client", "name companyName").sort({ name: 1 }).lean(),
    CompanyProfile.findOne({ owner: user.userId }).lean(),
    ProjectPayment.find({ client: { $in: activeClientIds } })
      .populate("client", "name companyName")
      .populate("project", "name")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const serializedInvoices = invoices.map((inv: any) => ({
    id: String(inv._id),
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate?.toISOString() || new Date().toISOString(),
    template: inv.template,
    invoiceDocumentType: inv.invoiceDocumentType || "invoice",
    isNoGst: Boolean(inv.isNoGst),
    invoiceType: inv.invoiceType,
    senderMode: inv.senderMode,
    sender: inv.sender || {},
    recipient: inv.recipient || {},
    toCompanyName: inv.toCompanyName || "",
    toCompanyAddress: inv.toCompanyAddress || "",
    lineItems: inv.lineItems || [],
    subTotal: inv.subTotal || 0,
    tax: inv.tax || {},
    discount: inv.discount || 0,
    roundOff: inv.roundOff || 0,
    totalAmount: inv.totalAmount || 0,
    amountInWords: inv.amountInWords || "",
    currency: inv.currency || "INR",
    bankDetails: inv.bankDetails || {},
    purpose: inv.purpose || "",
    notes: inv.notes || "",
    periodFrom: inv.periodFrom?.toISOString() || null,
    periodTo: inv.periodTo?.toISOString() || null,
    status: inv.status,
    settledAmount: inv.settledAmount || 0,
    dueDate: inv.dueDate?.toISOString() || null,
    client: inv.client && typeof inv.client === "object"
      ? { id: String(inv.client._id), name: inv.client.name, companyName: inv.client.companyName }
      : null,
    project: inv.project && typeof inv.project === "object"
      ? { id: String(inv.project._id), name: inv.project.name }
      : null,
    projectPayment: inv.projectPayment ? String(inv.projectPayment) : null,
    phaseId: inv.phaseId || null,
    phaseName: inv.phaseName || null,
    month: inv.month || null,
    category: inv.category || "",
    uin: inv.uin || "",
    signatureNote: inv.signatureNote || "",
    taxDisclaimer: inv.taxDisclaimer || "",
    createdAt: inv.createdAt?.toISOString() || new Date().toISOString(),
  }));

  const serializedClients = clients.map((c: any) => ({
    id: String(c._id),
    name: c.name,
    companyName: c.companyName,
    email: c.email || "",
    companyAddress: c.companyAddress || "",
    gstin: c.gstin || "",
    pan: c.pan || "",
    phone: c.phone || "",
    clientRegion: c.clientRegion || "national",
  }));

  const serializedProjects = projects.map((p: any) => ({
    id: String(p._id),
    name: p.name,
    clientId: p.client && typeof p.client === "object" ? String(p.client._id) : String(p.client),
    clientName: p.client && typeof p.client === "object" ? p.client.name : "",
    status: p.status,
  }));

  const serializedProfile = profile ? {
    companyName: profile.companyName || "",
    legalName: profile.legalName || "",
    logoUrl: profile.logoUrl || "",
    personalDetails: profile.personalDetails || {},
    bankDetails: profile.bankDetails || {},
    companyDetails: profile.companyDetails || {},
    taxDetails: profile.taxDetails || {},
    invoiceSettings: profile.invoiceSettings || {},
  } : null;

  const serializedPayments = payments.map((p: any) => ({
    id: String(p._id),
    client: p.client && typeof p.client === "object"
      ? { id: String(p.client._id), name: p.client.name, companyName: p.client.companyName }
      : { id: String(p.client), name: "", companyName: "" },
    project: p.project && typeof p.project === "object"
      ? { id: String(p.project._id), name: p.project.name }
      : p.project ? { id: String(p.project), name: "" } : null,
    totalAmount: p.totalAmount,
    currency: p.currency || "INR",
    billingCycle: p.billingCycle,
    phases: (p.phases || []).map((ph: any) => ({
      _id: String(ph._id),
      name: ph.name,
      amount: ph.amount,
      percentage: ph.percentage,
      status: ph.status || "draft",
    })),
    monthlyBreakdown: (p.monthlyBreakdown || []).map((m: any) => ({
      month: m.month,
      amount: m.amount,
    })),
    status: p.status,
    createdAt: p.createdAt?.toISOString(),
  }));

  return (
    <InvoicesPageClient
      invoices={serializedInvoices}
      clients={serializedClients}
      projects={serializedProjects}
      companyProfile={serializedProfile}
      payments={serializedPayments}
    />
  );
}
