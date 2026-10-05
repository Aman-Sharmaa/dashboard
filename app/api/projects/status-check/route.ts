import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { runDomainStatusCheck } from "@/lib/domain-status";

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const user = verifyToken(token);
    return user.role === "admin" ? user : null;
  } catch {
    return null;
  }
}

export async function POST() {
  const admin = requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const result = await runDomainStatusCheck();
  return NextResponse.json({
    ok: true,
    ...result,
  });
}
