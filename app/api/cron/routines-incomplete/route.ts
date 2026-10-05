import { NextRequest, NextResponse } from "next/server";
import { runIncompleteRoutineReminders } from "@/lib/routine-reminders";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runIncompleteRoutineReminders());
  } catch (error) {
    console.error("[cron/routines-incomplete] failed:", error);
    return NextResponse.json({ message: "Routine reminder job failed" }, { status: 500 });
  }
}
