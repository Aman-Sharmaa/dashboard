import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";

export type UserRole = "employee" | "admin" | "client" | "lead";

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const COOKIE_NAME = "kalp_auth_token";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export function signToken(payload: JWTPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, getJwtSecret()) as JWTPayload;
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/**
 * Server-side helper for pages that require a specific feature.
 * - Admins always have access.
 * - Employees are allowed if `featureKey` is in their `featureAccess` array.
 * - Everyone else is redirected.
 *
 * Usage:  const user = await requireFeatureAccess("invoices");
 */
export async function requireFeatureAccess(featureKey: string): Promise<JWTPayload> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login");

  let user: JWTPayload;
  try {
    user = verifyToken(token);
  } catch {
    redirect("/login");
  }

  // Admins always have full access
  if (user.role === "admin") return user;

  // Employees: check featureAccess from the database
  if (user.role === "employee") {
    await connectDB();
    // Lazy-import to avoid circular dependency with models
    const { User: UserModel } = await import("@/models/User");
    const userDoc = await UserModel.findById(user.userId).select("featureAccess").lean();
    const featureAccess: string[] = (userDoc as any)?.featureAccess || [];

    // If no features have been configured yet, use defaults
    if (featureAccess.length === 0) {
      const { DEFAULT_EMPLOYEE_FEATURES } = await import("@/lib/features");
      if (DEFAULT_EMPLOYEE_FEATURES.includes(featureKey)) return user;
    } else if (
      featureAccess.includes(featureKey) ||
      (featureKey === "expenses" && (featureAccess.includes("khatabook") || featureAccess.includes("dashboard")))
    ) {
      return user;
    }
  }

  redirect("/dashboard");
}

