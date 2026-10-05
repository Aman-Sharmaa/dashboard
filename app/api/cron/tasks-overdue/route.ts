import { NextRequest, NextResponse } from "next/server";
import { runScheduledOverdueTaskEmails } from "@/lib/tasks-overdue";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runScheduledOverdueTaskEmails();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("Cron failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
