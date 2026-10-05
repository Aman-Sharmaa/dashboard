import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { TeamMemberOnboardingSubmission } from "@/models/TeamMemberOnboardingSubmission";

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
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // pending | approved | rejected

  const filter: Record<string, string> = {};
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    filter.status = status;
  }

  const list = await TeamMemberOnboardingSubmission.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    submissions: list.map((s) => ({
      id: String(s._id),
      linkToken: s.linkToken,
      name: s.name,
      email: s.email,
      phone: s.phone,
      title: s.title,
      type: s.type,
      status: s.status,
      createdEmployeeId: s.createdEmployeeId ? String(s.createdEmployeeId) : null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  });
}
