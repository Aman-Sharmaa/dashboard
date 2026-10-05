import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { DEFAULT_EMPLOYEE_FEATURES } from "@/lib/features";
import { uploadKhatabookImage } from "@/lib/s3";

const COOKIE_NAME = "kalp_auth_token";
const FEATURE_KEY = "khatabook";

async function requireKhatabookAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const payload = verifyToken(token);
    if (payload.role === "admin") return payload;
    if (payload.role !== "employee") return null;

    await connectDB();
    const userDoc = await User.findById(payload.userId).select("featureAccess").lean();
    const featureAccess: string[] = (userDoc as any)?.featureAccess || [];
    if (featureAccess.length === 0 && DEFAULT_EMPLOYEE_FEATURES.includes(FEATURE_KEY)) {
      return payload;
    }
    if (featureAccess.includes(FEATURE_KEY)) return payload;
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireKhatabookAccess();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }
    const url = await uploadKhatabookImage(file);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("Khatabook upload failed", e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
