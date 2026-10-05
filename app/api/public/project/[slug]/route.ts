import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { Employee } from "@/models/Employee";
import { CompanyProfile } from "@/models/CompanyProfile";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  await connectDB();

  const project = await Project.findOne({ publicSlug: slug, isPublic: true })
    .populate("assignedMembers", "name title department avatarUrl profileSlug email type")
    .lean();

  if (!project) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const profile = await CompanyProfile.findOne().select("companyName logoUrl companyDetails personalDetails").lean();

  const members = ((project as any).assignedMembers || []).map((m: any) => ({
    id: String(m._id),
    name: m.name,
    title: m.title || null,
    department: m.department || null,
    avatarUrl: m.avatarUrl || null,
    profileSlug: m.profileSlug || null,
    type: m.type || "Employee",
  }));

  return NextResponse.json({
    project: {
      id: String((project as any)._id),
      name: (project as any).name,
      description: (project as any).description || null,
      status: (project as any).status,
      startDate: (project as any).startDate || null,
      endDate: (project as any).endDate || null,
      domains: (project as any).domains || [],
      publicSlug: (project as any).publicSlug,
    },
    members,
    company: profile
      ? {
        name: (profile as any).companyName || "Webwrite",
        logoUrl: (profile as any).logoUrl || null,
        website: (profile as any).companyDetails?.website || "https://Webwrite",
        city: (profile as any).companyDetails?.city || null,
        country: (profile as any).companyDetails?.country || null,
        email: (profile as any).personalDetails?.email || null,
      }
      : { name: "Webwrite", logoUrl: null, website: "https://Webwrite" },
  });
}
