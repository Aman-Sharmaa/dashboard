import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Employee } from "@/models/Employee";

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

/** Admin only: list users with content access status */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  try {
    await connectDB();
    const users = await User.find({ role: "employee" })
      .select("_id email name canManageContent")
      .lean();
    const employees = await Employee.find({ email: { $in: users.map((u: any) => u.email) } })
      .select("email name")
      .lean();
    const empMap = Object.fromEntries((employees as { email: string; name: string }[]).map((e) => [e.email, e.name]));
    const list = (users as { _id: unknown; email: string; name?: string; canManageContent?: boolean }[]).map((u) => ({
      userId: String(u._id),
      email: u.email,
      name: u.name || empMap[u.email] || u.email.split("@")[0],
      canManageContent: !!u.canManageContent,
    }));
    return NextResponse.json({ users: list });
  } catch (e) {
    console.error("CMS access GET", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/** Admin only: grant or revoke CMS access for a user */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { userId, canManageContent } = body as { userId: string; canManageContent: boolean };
    if (!userId || typeof canManageContent !== "boolean") {
      return NextResponse.json({ message: "userId and canManageContent required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findByIdAndUpdate(
      userId,
      { canManageContent },
      { new: true }
    ).select("email canManageContent").lean();
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (e) {
    console.error("CMS access PATCH", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
