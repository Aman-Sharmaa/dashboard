import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { TeamMemberOnboardingLink } from "@/models/TeamMemberOnboardingLink";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const { id } = await params;
  const link = await TeamMemberOnboardingLink.findById(id);
  if (!link) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const isActive = body.isActive;
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ message: "isActive (boolean) is required" }, { status: 400 });
  }

  link.isActive = isActive;
  await link.save();

  const origin = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return NextResponse.json({
    link: {
      id: String(link._id),
      token: link.token,
      label: link.label || null,
      isActive: link.isActive,
      publicUrl: origin ? `${origin}/onboarding/team/${link.token}` : `/onboarding/team/${link.token}`,
      createdAt: link.createdAt,
    },
  });
}
