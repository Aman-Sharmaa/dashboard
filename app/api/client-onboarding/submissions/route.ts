import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { ClientOnboardingSubmission } from "@/models/ClientOnboardingSubmission";

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
  const status = searchParams.get("status"); // pending | approved | rejected | done

  const filter: Record<string, string> = {};
  if (status && ["pending", "approved", "rejected", "done"].includes(status)) {
    filter.status = status;
  }

  const list = await ClientOnboardingSubmission.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    submissions: list.map((s) => ({
      id: String(s._id),
      linkToken: s.linkToken,
      name: s.name,
      email: s.email,
      companyName: s.companyName,
      phone: s.phone,
      designation: s.designation,
      companyAddress: s.companyAddress,
      companyPhone: s.companyPhone,
      companyWebsite: s.companyWebsite,
      gstin: s.gstin,
      pan: s.pan,
      notes: s.notes,
      status: s.status,
      createdClientId: s.createdClientId ? String(s.createdClientId) : null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  });
}
