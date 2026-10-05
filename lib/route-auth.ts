import { cookies } from "next/headers";
import { verifyToken, type JWTPayload } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { grantsFromUserDoc, employeeHasFeatureAdmin, employeeFeatureIsReadOnly } from "@/lib/employee-feature-grants";

const COOKIE_NAME = "kalp_auth_token";

export async function getAuthUserFromCookies(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

/** Global admin only (legacy). */
export async function requireGlobalAdmin(): Promise<JWTPayload | null> {
  const user = await getAuthUserFromCookies();
  if (!user || user.role !== "admin") return null;
  return user;
}

/**
 * Allows global admin, or an employee with this feature in `featureAdminFor`
 * (and in `featureAccess`) to perform admin-style mutations for that feature.
 */
export async function requireAdminOrFeatureAdmin(
  featureKey: string
): Promise<JWTPayload | null> {
  const user = await getAuthUserFromCookies();
  if (!user) return null;
  if (user.role === "admin") return user;
  if (user.role !== "employee") return null;

  await connectDB();
  const doc = await User.findById(user.userId)
    .select("featureAccess featureAdminFor featureReadOnlyFor")
    .lean();
  const grants = grantsFromUserDoc(doc as any);
  if (employeeHasFeatureAdmin(user.role, grants, featureKey)) return user;
  return null;
}

/** True if employee may not mutate data for this feature (read-only grant). */
export async function employeeIsReadOnlyForFeature(
  userId: string,
  role: string,
  featureKey: string
): Promise<boolean> {
  if (role === "admin") return false;
  if (role !== "employee") return true;
  await connectDB();
  const doc = await User.findById(userId)
    .select("featureAccess featureAdminFor featureReadOnlyFor")
    .lean();
  const grants = grantsFromUserDoc(doc as any);
  return employeeFeatureIsReadOnly(role as any, grants, featureKey);
}
