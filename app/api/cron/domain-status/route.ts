import { NextRequest, NextResponse } from "next/server";
import { runDomainStatusCheck } from "@/lib/domain-status";

export const dynamic = "force-dynamic";

/** Secures cron: set CRON_SECRET in env and call with Authorization: Bearer <CRON_SECRET> */
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
  const result = await runDomainStatusCheck();
  return NextResponse.json({
    ok: true,
    ...result,
  });
}
