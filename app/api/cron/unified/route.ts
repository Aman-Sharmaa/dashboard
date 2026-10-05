import { NextRequest, NextResponse } from "next/server";
import { runDomainStatusCheck } from "@/lib/domain-status";
import { runMonitorChecks } from "@/lib/monitor-check";
import { runScheduledOverdueTaskEmails } from "@/lib/tasks-overdue";

export const dynamic = "force-dynamic";

/**
 * Unified cron endpoint.
 * Scheduled 4× daily (IST): 11AM, 3PM, 9PM, 2AM
 * ~ see vercel.json for schedule entries.
 *
 * Runs all three jobs in sequence and returns a combined report.
 * Secured via CRON_SECRET env variable.
 */

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

  const startedAt = new Date().toISOString();
  const results: Record<string, any> = { startedAt };

  // ── 1. Domain status check ──────────────────────────────────────────────────
  try {
    const domainResult = await runDomainStatusCheck();
    results.domainStatus = { ok: true, ...domainResult };
  } catch (err: any) {
    console.error("[cron/unified] domainStatus failed:", err);
    results.domainStatus = { ok: false, error: err?.message };
  }

  // ── 2. Monitor checks ───────────────────────────────────────────────────────
  try {
    const monitorResult = await runMonitorChecks();
    results.monitors = { ok: true, ...monitorResult };
  } catch (err: any) {
    console.error("[cron/unified] monitors failed:", err);
    results.monitors = { ok: false, error: err?.message };
  }

  // ── 3. Overdue task emails ──────────────────────────────────────────────────
  try {
    const overdueResult = await runScheduledOverdueTaskEmails();
    results.overdueEmails = { ok: true, ...overdueResult };
  } catch (err: any) {
    console.error("[cron/unified] overdueEmails failed:", err);
    results.overdueEmails = { ok: false, error: err?.message };
  }

  results.finishedAt = new Date().toISOString();
  return NextResponse.json(results);
}
