import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { ProjectPayment } from "@/models/ProjectPayment";
import { Client } from "@/models/Client";
import { Project } from "@/models/Project";
import { verifyToken } from "@/lib/auth";

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const paidDateInput = body.paidDate ? new Date(body.paidDate) : new Date();

    // 1. Find the invoice
    const invoice = await Invoice.findOne({ _id: id, owner: admin.userId });
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ message: "Invoice is already paid" }, { status: 400 });
    }

    // 2. Mark invoice as paid
    invoice.status = "paid";
    invoice.paidDate = paidDateInput;
    await invoice.save();

    // 3. Update linked project payment if exists
    let paymentUpdated = false;
    if (invoice.projectPayment) {
      const payment = await ProjectPayment.findById(invoice.projectPayment);
      if (payment) {
        // If invoice is for a specific phase, mark that phase as paid
        if (invoice.phaseId && payment.phases && payment.phases.length > 0) {
          const phaseIdx = payment.phases.findIndex(
            (ph: any) => String(ph._id) === invoice.phaseId
          );
          if (phaseIdx !== -1) {
            (payment.phases as any)[phaseIdx].status = "paid";
            (payment.phases as any)[phaseIdx].paidDate = paidDateInput;
            payment.markModified("phases");

            // If all phases are now paid, mark the overall payment as paid
            const allPaid = payment.phases.every(
              (ph: any) => ph.status === "paid"
            );
            if (allPaid) {
              payment.status = "paid";
              payment.paidDate = paidDateInput;
            }
          }
        } else {
          // No specific phase ~ mark overall payment as paid
          payment.status = "paid";
          payment.paidDate = paidDateInput;

          // Also mark all individual phases as paid so payment history reflects correctly
          if (payment.phases && payment.phases.length > 0) {
            for (let i = 0; i < payment.phases.length; i++) {
              if ((payment.phases as any)[i].status !== "paid") {
                (payment.phases as any)[i].status = "paid";
                (payment.phases as any)[i].paidDate = paidDateInput;
              }
            }
            payment.markModified("phases");
          }
        }

        await payment.save();
        paymentUpdated = true;
      }
    }

    // 4. Return updated invoice
    const updated = await Invoice.findById(id)
      .populate("client", "name companyName email")
      .populate("project", "name")
      .lean();

    const result = updated
      ? {
        id: String(updated._id),
        invoiceNumber: updated.invoiceNumber,
        invoiceDate: updated.invoiceDate?.toISOString(),
        template: updated.template,
        invoiceType: updated.invoiceType,
        senderMode: updated.senderMode,
        sender: updated.sender || {},
        recipient: updated.recipient || {},
        toCompanyName: updated.toCompanyName || "",
        toCompanyAddress: updated.toCompanyAddress || "",
        lineItems: updated.lineItems || [],
        subTotal: updated.subTotal || 0,
        tax: updated.tax || {},
        discount: updated.discount || 0,
        roundOff: updated.roundOff || 0,
        totalAmount: updated.totalAmount || 0,
        amountInWords: updated.amountInWords || "",
        currency: updated.currency || "INR",
        bankDetails: updated.bankDetails || {},
        purpose: updated.purpose || "",
        notes: updated.notes || "",
        periodFrom: updated.periodFrom?.toISOString() || null,
        periodTo: updated.periodTo?.toISOString() || null,
        status: updated.status,
        dueDate: updated.dueDate?.toISOString() || null,
        client:
          updated.client && typeof updated.client === "object"
            ? {
              id: String((updated.client as any)._id),
              name: (updated.client as any).name,
              companyName: (updated.client as any).companyName,
            }
            : null,
        project:
          updated.project && typeof updated.project === "object"
            ? {
              id: String((updated.project as any)._id),
              name: (updated.project as any).name,
            }
            : null,
        projectPayment: updated.projectPayment
          ? String(updated.projectPayment)
          : null,
        phaseId: updated.phaseId || null,
        phaseName: updated.phaseName || null,
        month: updated.month || null,
        category: updated.category || "",
        uin: updated.uin || "",
        signatureNote: updated.signatureNote || "",
        taxDisclaimer: updated.taxDisclaimer || "",
        createdAt: updated.createdAt?.toISOString() || new Date().toISOString(),
      }
      : null;

    return NextResponse.json({
      message: "Invoice marked as paid",
      invoice: result,
      paymentUpdated,
    });
  } catch (err) {
    console.error("Mark paid error:", err);
    return NextResponse.json(
      {
        message:
          err instanceof Error ? err.message : "Failed to mark invoice as paid",
      },
      { status: 500 }
    );
  }
}
