import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { CmsSetting } from "@/models/CmsSetting";

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

// GET ~ read public roadmap setting
export async function GET() {
  const user = await getAuthUser();
  await connectDB();
  const doc = await CmsSetting.findOne().select("roadmapPublic").lean();
  return NextResponse.json({
    isPublic: (doc as any)?.roadmapPublic ?? false,
    isAdmin: user?.role === "admin",
    isAuthenticated: !!user,
  });
}

// PATCH ~ toggle public roadmap
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const body = await req.json().catch(() => ({}));
  const isPublic = Boolean(body.isPublic);
  await CmsSetting.findOneAndUpdate({}, { $set: { roadmapPublic: isPublic } }, { upsert: true });
  return NextResponse.json({ isPublic });
}
