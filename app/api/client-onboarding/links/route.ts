import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { ClientOnboardingLink } from "@/models/ClientOnboardingLink";

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

/** Generate a URL-safe token (no mongoose id) */
function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const links = await ClientOnboardingLink.find().sort({ createdAt: -1 }).lean();
  const origin = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return NextResponse.json({
    links: links.map((l) => ({
      id: String(l._id),
      token: l.token,
      label: l.label || null,
      isActive: (l as any).isActive !== false,
      publicUrl: origin ? `${origin}/onboarding/${l.token}` : `/onboarding/${l.token}`,
      createdAt: l.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim() : undefined;

  let token = generateToken();
  let exists = await ClientOnboardingLink.findOne({ token }).lean();
  while (exists) {
    token = generateToken();
    exists = await ClientOnboardingLink.findOne({ token }).lean();
  }

  const link = await ClientOnboardingLink.create({ token, label, isActive: true });
  const origin = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const publicUrl = origin ? `${origin}/onboarding/${token}` : `/onboarding/${token}`;

  return NextResponse.json({
    link: {
      id: String(link._id),
      token: link.token,
      label: link.label || null,
      isActive: true,
      publicUrl,
      createdAt: link.createdAt,
    },
  }, { status: 201 });
}
