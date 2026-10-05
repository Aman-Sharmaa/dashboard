import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { ProjectPayment } from "@/models/ProjectPayment";
import { Client } from "@/models/Client";
import { Project } from "@/models/Project";
import { CompanyProfile } from "@/models/CompanyProfile";
import { verifyToken } from "@/lib/auth";
import { buildInvoiceNumber, resolveClientRegion } from "@/lib/invoice-number";

void Client;
void Project;

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const user = verifyToken(token);
    if (user.role !== "admin") return null;
    return user;
  } catch {
    return null;
  }
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakhs" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  let result = "Rupees " + convert(intPart);
  if (decPart > 0) result += " and " + convert(decPart) + " Paise";
  return result + " only.";
}

/** Generate invoice(s) from a project payment */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const body = await req.json();
    const { paymentId, phaseId, month, template } = body;

    if (!paymentId) {
      return NextResponse.json({ message: "paymentId is required" }, { status: 400 });
    }

    const payment = await ProjectPayment.findById(paymentId)
      .populate("client")
      .populate("project", "name description")
      .lean();

    if (!payment) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    const profile = await CompanyProfile.findOne({ owner: admin.userId }).lean();
    const settings = profile?.invoiceSettings;
    const senderMode = settings?.senderMode || "company";
    const clientData = payment.client as any;
    const projectData = payment.project as any;

    const clientRegion = resolveClientRegion({
      clientRegion: clientData?.clientRegion,
      currency: payment.currency,
    });
    const { invoiceNumber, serialField } = buildInvoiceNumber(settings, clientRegion);

    // Determine invoice type
    let invoiceType: "single" | "phase" | "monthly" = "single";
    let lineItems: any[] = [];
    let subTotal = 0;
    let phaseName = "";

    if (phaseId && payment.phases) {
      // Phase invoice
      invoiceType = "phase";
      const phase = payment.phases.find((p: any) => p._id?.toString() === phaseId);
      if (!phase) {
        return NextResponse.json({ message: "Phase not found" }, { status: 404 });
      }
      phaseName = phase.name;
      lineItems = [{ description: `${phase.name} - ${projectData?.name || "Project Payment"}`, amount: phase.amount }];
      subTotal = phase.amount;
    } else if (month && payment.monthlyBreakdown) {
      // Monthly invoice
      invoiceType = "monthly";
      const monthEntry = payment.monthlyBreakdown.find((m: any) => m.month === month);
      if (!monthEntry) {
        return NextResponse.json({ message: "Monthly entry not found" }, { status: 404 });
      }
      lineItems = [{ description: `Monthly Payment - ${month} - ${projectData?.name || "Project Payment"}`, amount: monthEntry.amount }];
      subTotal = monthEntry.amount;
    } else {
      // Single invoice for full amount
      lineItems = [{ description: `Services towards ${projectData?.name || "Project Payment"}`, amount: payment.totalAmount }];
      subTotal = payment.totalAmount;
    }

    // Calculate tax
    const gstRate = 18; // Default
    const isInterstate = false; // Can be computed from addresses later
    const tax = isInterstate
      ? { igstRate: gstRate, igstAmount: (subTotal * gstRate) / 100 }
      : { sgstRate: gstRate / 2, sgstAmount: (subTotal * gstRate / 2) / 100, cgstRate: gstRate / 2, cgstAmount: (subTotal * gstRate / 2) / 100 };

    const totalTax = (tax.sgstAmount || 0) + (tax.cgstAmount || 0) + (tax.igstAmount || 0);
    const totalAmount = subTotal + totalTax;

    const sender = senderMode === "personal"
      ? {
        name: settings?.personalName || profile?.personalDetails?.contactName || "",
        address: profile?.companyDetails?.address || "",
        email: profile?.personalDetails?.email || "",
        phone: profile?.personalDetails?.phone || "",
        pan: profile?.taxDetails?.panNumber || "",
        gstNumber: profile?.taxDetails?.gstNumber || "",
      }
      : {
        name: profile?.companyName || "",
        address: [profile?.companyDetails?.address, profile?.companyDetails?.city, profile?.companyDetails?.state, profile?.companyDetails?.zip].filter(Boolean).join(", "),
        email: profile?.personalDetails?.email || "",
        phone: profile?.personalDetails?.phone || "",
        pan: profile?.taxDetails?.panNumber || "",
        gstNumber: profile?.taxDetails?.gstNumber || "",
      };

    const invoice = await Invoice.create({
      invoiceNumber,
      invoiceDate: new Date(),
      template: template || settings?.defaultTemplate || "professional",
      invoiceType,
      senderMode,
      sender,
      recipient: {
        name: clientData?.name || "",
        companyName: clientData?.companyName || "",
        address: clientData?.companyAddress || "",
        email: clientData?.email || "",
        gstin: clientData?.gstin || "",
        pan: clientData?.pan || "",
      },
      toCompanyName: clientData?.companyName || "",
      toCompanyAddress: clientData?.companyAddress || "",
      lineItems,
      subTotal,
      tax,
      totalAmount,
      amountInWords: numberToWords(totalAmount),
      currency: payment.currency || "INR",
      bankDetails: {
        accountHolderName: profile?.bankDetails?.accountHolderName || "",
        accountNumber: profile?.bankDetails?.accountNumber || "",
        ifscCode: profile?.bankDetails?.ifscCode || "",
      },
      status: "draft",
      projectPayment: payment._id,
      project: projectData?._id || null,
      client: clientData?._id || null,
      phaseId: phaseId || undefined,
      phaseName: phaseName || undefined,
      month: month || undefined,
      owner: admin.userId,
      category: settings?.defaultCategory || "",
      uin: settings?.defaultUin || "",
      taxDisclaimer: settings?.defaultTaxDisclaimer || undefined,
    });

    // Increment serial
    if (profile) {
      await CompanyProfile.updateOne(
        { _id: profile._id },
        { $inc: { [serialField]: 1 } }
      );
    }

    return NextResponse.json({ invoice: { ...invoice.toObject(), id: String(invoice._id) } }, { status: 201 });
  } catch (err) {
    console.error("Generate invoice from payment error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
