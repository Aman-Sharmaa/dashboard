import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getOverviewStats } from "@/lib/overview-stats";

const COOKIE_NAME = "kalp_auth_token";
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function csvCell(value: string | number) {
  const raw = String(value ?? "");
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, "\"\"")}"`;
  }
  return raw;
}

function csvLine(values: Array<string | number>) {
  return values.map(csvCell).join(",");
}

function toCsv(rows: Array<Array<string | number>>) {
  return rows.map((row) => csvLine(row)).join("\n");
}

async function getAdminUser() {
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

export async function GET(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const stats = await getOverviewStats();
  const scope = request.nextUrl.searchParams.get("scope") === "monthly" ? "monthly" : "overall";
  const now = new Date();
  const currentMonthIndex = now.getMonth();

  const monthlyExpenseTotals = Array(12).fill(0) as number[];
  for (const row of stats.monthlyExpenseByProductService) {
    row.monthlyExpense.forEach((amount, idx) => {
      monthlyExpenseTotals[idx] += Number(amount) || 0;
    });
  }
  const monthlyNetTotals = stats.monthlyRevenueCurrentYear.map(
    (revenue, idx) => Math.round((Number(revenue) || 0) - (Number(monthlyExpenseTotals[idx]) || 0))
  );

  const yearlyRevenue = stats.monthlyRevenueCurrentYear.reduce((sum, val) => sum + (Number(val) || 0), 0);
  const yearlyExpense = monthlyExpenseTotals.reduce((sum, val) => sum + (Number(val) || 0), 0);
  const yearlyNet = yearlyRevenue - yearlyExpense;

  const rows: Array<Array<string | number>> = [];
  rows.push(["Financial Report"]);
  rows.push(["Scope", scope === "monthly" ? "Monthly-wise breakdown" : "Overall"]);
  rows.push(["Year", stats.currentYear]);
  rows.push(["Generated At", now.toISOString()]);
  rows.push([]);

  if (scope === "monthly") {
    rows.push(["Monthly Summary"]);
    rows.push(["Month", "Revenue", "Expense", "Net P/L"]);
    MONTH_LABELS.forEach((month, idx) => {
      rows.push([
        month,
        Math.round(stats.monthlyRevenueCurrentYear[idx] || 0),
        Math.round(monthlyExpenseTotals[idx] || 0),
        Math.round(monthlyNetTotals[idx] || 0),
      ]);
    });
    rows.push([]);

    rows.push(["Revenue Breakdown by Product/Service (Month-wise)"]);
    rows.push(["Name", "Kind", ...MONTH_LABELS, "Total"]);
    for (const row of stats.monthlyRevenueByProductService) {
      const total = row.monthlyRevenue.reduce((sum, val) => sum + (Number(val) || 0), 0);
      rows.push([row.name, row.kind, ...row.monthlyRevenue.map((v) => Math.round(v || 0)), Math.round(total)]);
    }
    rows.push([]);

    rows.push(["Expense Breakdown by Product/Service (Month-wise)"]);
    rows.push(["Name", "Kind", ...MONTH_LABELS, "Total"]);
    for (const row of stats.monthlyExpenseByProductService) {
      const total = row.monthlyExpense.reduce((sum, val) => sum + (Number(val) || 0), 0);
      rows.push([row.name, row.kind, ...row.monthlyExpense.map((v) => Math.round(v || 0)), Math.round(total)]);
    }
  } else {
    rows.push(["Overall Financial Summary"]);
    rows.push(["Metric", "Value"]);
    rows.push(["Total Revenue (Year)", Math.round(yearlyRevenue)]);
    rows.push(["Total Expense (Year)", Math.round(yearlyExpense)]);
    rows.push(["Total Net P/L (Year)", Math.round(yearlyNet)]);
    rows.push(["Average Monthly Revenue", Math.round(yearlyRevenue / 12)]);
    rows.push(["Average Monthly Expense", Math.round(yearlyExpense / 12)]);
    rows.push(["Average Monthly Net P/L", Math.round(yearlyNet / 12)]);
    rows.push(["Current Month", MONTH_LABELS[currentMonthIndex]]);
    rows.push(["Current Month Revenue", Math.round(stats.monthlyRevenueCurrentYear[currentMonthIndex] || 0)]);
    rows.push(["Current Month Expense", Math.round(monthlyExpenseTotals[currentMonthIndex] || 0)]);
    rows.push(["Current Month Net P/L", Math.round(monthlyNetTotals[currentMonthIndex] || 0)]);
    rows.push(["Total Due", Math.round(stats.totalDue || 0)]);
    rows.push([]);

    rows.push(["Revenue Totals by Product/Service"]);
    rows.push(["Name", "Kind", "Revenue", "Share %"]);
    for (const row of stats.revenueByProductService) {
      const share = yearlyRevenue > 0 ? ((row.totalRevenue / yearlyRevenue) * 100).toFixed(2) : "0.00";
      rows.push([row.name, row.kind, Math.round(row.totalRevenue || 0), share]);
    }
    rows.push([]);

    rows.push(["Expense Totals by Product/Service"]);
    rows.push(["Name", "Kind", "Annualized Expense", "Share %"]);
    for (const row of stats.monthlyExpenseByProductService) {
      const yearlyRowExpense = row.monthlyExpense.reduce((sum, val) => sum + (Number(val) || 0), 0);
      const share = yearlyExpense > 0 ? ((yearlyRowExpense / yearlyExpense) * 100).toFixed(2) : "0.00";
      rows.push([row.name, row.kind, Math.round(yearlyRowExpense), share]);
    }
  }

  const csv = toCsv(rows);
  const dateTag = now.toISOString().slice(0, 10);
  const filename = `financial-report-${scope}-${dateTag}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
