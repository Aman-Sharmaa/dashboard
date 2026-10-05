import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { Client } from "@/models/Client";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const user = verifyToken(token);
    if (!user || user.role !== "admin") return null;
    return user;
  } catch {
    return null;
  }
}

// GET ~ single lead detail
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;
  const lead = await Lead.findById(id).lean();
  if (!lead) {
    return NextResponse.json({ message: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json({
    lead: {
      id: String(lead._id),
      name: lead.name,
      email: lead.email,
      phone: lead.phone || "",
      companyName: lead.companyName || "",
      companyWebsite: lead.companyWebsite || "",
      designation: lead.designation || "",
      serviceCategory: lead.serviceCategory || "",
      serviceCategorySlug: lead.serviceCategorySlug || "",
      services: lead.services || [],
      projectDescription: lead.projectDescription || "",
      budget: lead.budget || "",
      timeline: lead.timeline || "",
      currency: lead.currency || "USD",
      source: lead.source,
      sourcePage: lead.sourcePage || "",
      status: lead.status,
      notes: lead.notes || "",
      adminNotes: lead.adminNotes || "",
      convertedClientId: lead.convertedClientId ? String(lead.convertedClientId) : null,
      convertedAt: lead.convertedAt ? lead.convertedAt.toISOString() : null,
      createdAt: lead.createdAt ? lead.createdAt.toISOString() : "",
      updatedAt: lead.updatedAt ? lead.updatedAt.toISOString() : "",
    },
  });
}

// PATCH ~ update lead (status, admin notes, or convert to client)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;
  const lead = await Lead.findById(id);
  if (!lead) {
    return NextResponse.json({ message: "Lead not found" }, { status: 404 });
  }

  const body = await req.json();
  const { status, adminNotes, action } = body;

  // Convert to client action
  if (action === "convert_to_client") {
    // Check if already converted
    if (lead.status === "converted" && lead.convertedClientId) {
      return NextResponse.json(
        { message: "This lead has already been converted to a client" },
        { status: 400 }
      );
    }

    // Check if client with this email already exists
    const existingClient = await Client.findOne({
      email: lead.email.toLowerCase(),
    });

    if (existingClient) {
      // Link to existing client
      lead.status = "converted";
      lead.convertedClientId = existingClient._id;
      lead.convertedAt = new Date();
      await lead.save();

      return NextResponse.json({
        message: "Lead linked to existing client",
        clientId: String(existingClient._id),
        lead: { id: String(lead._id), status: lead.status },
      });
    }

    // Create new client
    const client = await Client.create({
      name: lead.name,
      email: lead.email.toLowerCase(),
      phone: lead.phone || undefined,
      companyName: lead.companyName || lead.name,
      companyWebsite: lead.companyWebsite || undefined,
      designation: lead.designation || undefined,
      notes: `Converted from lead. Service: ${lead.serviceCategory || "N/A"}. Budget: ${lead.budget || "N/A"}. Description: ${lead.projectDescription || "N/A"}`,
      isActive: true,
    });

    // Update lead
    lead.status = "converted";
    lead.convertedClientId = client._id;
    lead.convertedAt = new Date();
    await lead.save();

    return NextResponse.json({
      message: "Lead successfully converted to client",
      clientId: String(client._id),
      lead: { id: String(lead._id), status: lead.status },
    });
  }

  // Regular status / notes update
  if (status) {
    const validStatuses = ["new", "contacted", "qualified", "converted", "lost"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { message: "Invalid status" },
        { status: 400 }
      );
    }
    lead.status = status;
  }

  if (adminNotes !== undefined) {
    lead.adminNotes = adminNotes;
  }

  await lead.save();

  return NextResponse.json({
    message: "Lead updated",
    lead: { id: String(lead._id), status: lead.status },
  });
}

// DELETE ~ delete a lead
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;
  const lead = await Lead.findByIdAndDelete(id);
  if (!lead) {
    return NextResponse.json({ message: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Lead deleted" });
}
