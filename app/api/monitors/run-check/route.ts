import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { runMonitorChecks } from "@/lib/monitor-check";

const COOKIE_NAME = "kalp_auth_token";

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function POST() {
  const auth = await requireAuth();
  if (!auth || auth.role !== "admin") return NextResponse.json({ message: "Forbidden: Admin access required." }, { status: 403 });

  const result = await runMonitorChecks();
  return NextResponse.json({ ok: true, ...result });
}
