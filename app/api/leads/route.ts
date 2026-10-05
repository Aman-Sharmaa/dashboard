import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";
import { verifyToken } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { newLeadEmail } from "@/lib/email-templates";

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

// GET ~ list leads (admin only)
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const source = searchParams.get("source");
  const sort = searchParams.get("sort") || "newest";

  // Build filter
  const filter: Record<string, any> = {};
  if (status && status !== "all") {
    filter.status = status;
  }
  if (source && source !== "all") {
    filter.source = source;
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  // Sort
  const sortObj: Record<string, 1 | -1> =
    sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

  const leads = await Lead.find(filter).sort(sortObj).lean();

  const serialized = leads.map((l) => ({
    id: String(l._id),
    name: l.name,
    email: l.email,
    phone: l.phone || "",
    companyName: l.companyName || "",
    companyWebsite: l.companyWebsite || "",
    designation: l.designation || "",
    serviceCategory: l.serviceCategory || "",
    serviceCategorySlug: l.serviceCategorySlug || "",
    services: l.services || [],
    projectDescription: l.projectDescription || "",
    budget: l.budget || "",
    timeline: l.timeline || "",
    currency: l.currency || "USD",
    source: l.source,
    sourcePage: l.sourcePage || "",
    status: l.status,
    notes: l.notes || "",
    adminNotes: l.adminNotes || "",
    convertedClientId: l.convertedClientId ? String(l.convertedClientId) : null,
    convertedAt: l.convertedAt ? l.convertedAt.toISOString() : null,
    createdAt: l.createdAt ? l.createdAt.toISOString() : "",
    updatedAt: l.updatedAt ? l.updatedAt.toISOString() : "",
  }));

  // Counts for filter badges
  const allLeads = await Lead.find().lean();
  const counts = {
    all: allLeads.length,
    new: allLeads.filter((l) => l.status === "new").length,
    contacted: allLeads.filter((l) => l.status === "contacted").length,
    qualified: allLeads.filter((l) => l.status === "qualified").length,
    converted: allLeads.filter((l) => l.status === "converted").length,
    lost: allLeads.filter((l) => l.status === "lost").length,
  };

  return NextResponse.json({ leads: serialized, counts });
}

// POST ~ create a new lead (public ~ no auth required, this is for the form)
export async function POST(req: Request) {
  await connectDB();

  try {
    const body = await req.json();
    const { name, email, phone, companyName, companyWebsite, designation, serviceCategory, serviceCategorySlug, services, projectDescription, budget, timeline, currency, source, sourcePage, notes } = body;

    if (!name || !email) {
      return NextResponse.json(
        { message: "Name and email are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const lead = await Lead.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : undefined,
      companyName: companyName ? String(companyName).trim() : undefined,
      companyWebsite: companyWebsite ? String(companyWebsite).trim() : undefined,
      designation: designation ? String(designation).trim() : undefined,
      serviceCategory: serviceCategory || undefined,
      serviceCategorySlug: serviceCategorySlug || undefined,
      services: Array.isArray(services) ? services : undefined,
      projectDescription: projectDescription ? String(projectDescription).trim() : undefined,
      budget: budget || undefined,
      timeline: timeline || undefined,
      currency: currency || "USD",
      source: source || "rapydlaunch",
      sourcePage: sourcePage || undefined,
      notes: notes ? String(notes).trim() : undefined,
      status: "new",
    });

    // Notify all admin users about the new lead + send email
    try {
      const admins = await User.find({ role: "admin" }).select("_id email name").lean();
      if (admins.length > 0) {
        await Notification.create(
          admins.map((admin: any) => ({
            user: admin._id,
            type: "new_lead",
            title: "New lead received",
            message: `${lead.name} (${lead.email})${lead.companyName ? ` from ${lead.companyName}` : ""} submitted a lead form.`,
            link: "/dashboard/leads",
            data: { leadId: String(lead._id) },
          }))
        );

        for (const admin of admins) {
          try {
            await sendMail({
              to: admin.email,
              subject: `New Lead: ${lead.name}${lead.companyName ? ` from ${lead.companyName}` : ""}`,
              html: newLeadEmail({
                adminName: admin.name || "Admin",
                leadName: lead.name,
                leadEmail: lead.email,
                companyName: lead.companyName,
                phone: lead.phone,
                serviceCategory: lead.serviceCategory,
                budget: lead.budget,
                projectDescription: lead.projectDescription,
                source: lead.source,
              }),
            });
          } catch {
            // Individual email failures should not block
          }
        }
      }
    } catch {
      // Notification errors should not block lead creation
    }

    return NextResponse.json(
      {
        message: "Thank you! We'll get back to you within 24 hours.",
        lead: { id: String(lead._id), name: lead.name, email: lead.email },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Lead creation error:", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
