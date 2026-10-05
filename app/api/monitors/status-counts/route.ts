import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Monitor } from "@/models/Monitor";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ up: 0, down: 0, total: 0 });

    let auth;
    try {
      auth = verifyToken(token);
    } catch {
      return NextResponse.json({ up: 0, down: 0, total: 0 });
    }

    await connectDB();

    const monitors = await Monitor.find({ enabled: true })
      .select("isUp")
      .lean();

    const up = monitors.filter((m) => m.isUp === true).length;
    const down = monitors.filter((m) => m.isUp === false).length;

    return NextResponse.json({ up, down, total: monitors.length });
  } catch {
    return NextResponse.json({ up: 0, down: 0, total: 0 });
  }
}
