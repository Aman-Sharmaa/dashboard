import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { ProjectPayment } from "@/models/ProjectPayment";
import { Client } from "@/models/Client";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

/** GET /api/project-payments/summary ~ list clients with payment totals and next due date (for sidebar) */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await connectDB();
    void Client.modelName;

    const payments = await ProjectPayment.find({})
      .populate("client", "name companyName")
      .sort({ createdAt: -1 })
      .lean();

    const byClient = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        totalPaid: number;
        totalDue: number;
        currency: string;
        nextDueDate: string | null;
      }
    >();

    for (const p of payments as any[]) {
      const client = p.client && typeof p.client === "object" ? p.client : null;
      const clientId = client ? String((client as any)._id) : String(p.client);
      const clientName = client ? (client as any).companyName || (client as any).name || "~" : "~";
      const currency = p.currency || "INR";

      if (!byClient.has(clientId)) {
        byClient.set(clientId, {
          clientId,
          clientName,
          totalPaid: 0,
          totalDue: 0,
          currency,
          nextDueDate: null,
        });
      }
      const row = byClient.get(clientId)!;

      const phases = p.phases || [];
      if (phases.length > 0) {
        let paidSum = 0;
        let dueSum = 0;
        let nextDue: Date | null = null;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        for (const ph of phases) {
          const amount = Number(ph.amount) || 0;
          if (ph.status === "paid") {
            paidSum += amount;
          } else {
            dueSum += amount;
            const due = ph.dueDate ? new Date(ph.dueDate) : null;
            if (due && !nextDue) nextDue = due;
            else if (due && nextDue && due < nextDue) nextDue = due;
          }
        }
        row.totalPaid += paidSum;
        row.totalDue += dueSum;
        if (nextDue && (!row.nextDueDate || nextDue < new Date(row.nextDueDate))) {
          row.nextDueDate = nextDue.toISOString();
        }
      } else {
        const amount = Number(p.totalAmount) || 0;
        if (p.status === "paid") row.totalPaid += amount;
        else row.totalDue += amount;
      }
    }

    const summary = Array.from(byClient.values()).filter(
      (s) => s.totalPaid > 0 || s.totalDue > 0
    );

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Project payments summary error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to load summary" },
      { status: 500 }
    );
  }
}
