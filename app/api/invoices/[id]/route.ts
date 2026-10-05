import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Client } from "@/models/Client";
import { Project } from "@/models/Project";
import { CompanyProfile } from "@/models/CompanyProfile";
import { verifyToken } from "@/lib/auth";

void Client;
void Project;

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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();

    const invoice = await Invoice.findOne({ _id: id, owner: user.userId })
      .populate("client")
      .populate("project", "name description")
      .lean();

    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    const companyProfile = await CompanyProfile.findOne({ owner: user.userId }).lean();

    return NextResponse.json({
      invoice: { ...invoice, id: String(invoice._id) },
      companyProfile,
    });
  } catch (err) {
    console.error("Invoice GET error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to load invoice" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await connectDB();

    const body = await req.json();

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, owner: admin.userId },
      {
        $set: {
          ...body,
          invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : undefined,
          dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
          periodFrom: body.periodFrom ? new Date(body.periodFrom) : undefined,
          periodTo: body.periodTo ? new Date(body.periodTo) : undefined,
        },
      },
      { new: true }
    )
      .populate("client", "name companyName email")
      .populate("project", "name")
      .lean();

    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ invoice: { ...invoice, id: String(invoice._id) } });
  } catch (err) {
    console.error("Invoice PUT error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await connectDB();

    const invoice = await Invoice.findOneAndDelete({ _id: id, owner: admin.userId });

    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Invoice deleted" });
  } catch (err) {
    console.error("Invoice DELETE error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
