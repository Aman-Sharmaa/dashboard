import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { slugify } from "@/lib/utils";

const COOKIE_NAME = "kalp_auth_token";

/** Returns auth payload if user is admin, has canManageContent, or is any employee (all employees allowed) */
export async function requireCmsAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    if (payload.role === "admin") return payload;
    await connectDB();
    const user = await User.findById(payload.userId).select("canManageContent").lean();
    if ((user as any)?.canManageContent) return payload;
    if (payload.role === "employee") return payload;
    return null;
  } catch {
    return null;
  }
}

export { slugify };
