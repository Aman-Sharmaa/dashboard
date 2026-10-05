import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { CompanyProfile } from "@/models/CompanyProfile";
import { verifyToken } from "@/lib/auth";

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

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const profile = await CompanyProfile.findOne({ owner: admin.userId }).lean();

    return NextResponse.json({
      settings: profile?.invoiceSettings || {},
      companyProfile: profile || null,
    });
  } catch (err) {
    console.error("Invoice settings GET error:", err);
    return NextResponse.json({ message: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const body = await req.json();

    const profile = await CompanyProfile.findOneAndUpdate(
      { owner: admin.userId },
      { $set: { invoiceSettings: body } },
      { new: true, upsert: false }
    ).lean();

    if (!profile) {
      return NextResponse.json({ message: "Company profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      settings: profile.invoiceSettings || {},
      companyProfile: profile,
    });
  } catch (err) {
    console.error("Invoice settings PUT error:", err);
    return NextResponse.json({ message: "Failed to save settings" }, { status: 500 });
  }
}
