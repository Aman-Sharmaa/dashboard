import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { CompanyProfile } from "@/models/CompanyProfile";

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

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  let profile = await CompanyProfile.findOne({ owner: user.userId }).select("defaultTerms").lean();
  if (!profile) {
    profile = await CompanyProfile.findOne().select("defaultTerms").lean();
  }

  return NextResponse.json({
    defaultTerms: (profile as any)?.defaultTerms || "",
  });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const defaultTerms = typeof body.defaultTerms === "string" ? body.defaultTerms : "";

  await connectDB();
  let profile = await CompanyProfile.findOne({ owner: user.userId });
  if (!profile) {
    profile = await CompanyProfile.findOne();
  }

  if (!profile) {
    return NextResponse.json(
      { message: "Company profile not found. Please configure company settings first." },
      { status: 404 }
    );
  }

  profile.defaultTerms = defaultTerms;
  await profile.save();

  return NextResponse.json({ defaultTerms: profile.defaultTerms || "" });
}
