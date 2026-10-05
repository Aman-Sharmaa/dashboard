import { Client } from "@/models/Client";
import { Project } from "@/models/Project";
import { Employee } from "@/models/Employee";
import { ProjectPayment } from "@/models/ProjectPayment";
import { Expense } from "@/models/Expense";
import { ExternalRevenue } from "@/models/ExternalRevenue";
import { Invoice } from "@/models/Invoice";
import "@/models/Product";

/** Payment date for revenue attribution: paidDate, or fallback to billGeneratedAt/updatedAt when paid */
function getPaymentDate(p: { status: string; paidDate?: Date | null; billGeneratedAt?: Date | null; updatedAt?: Date | null }): Date | null {
  if (p.status !== "paid") return null;
  const d = p.paidDate || p.billGeneratedAt || (p as any).updatedAt;
  return d ? new Date(d) : null;
}

/** Paid amount for a payment: from phases (sum of paid phase amounts) or totalAmount when status paid */
function getPaidAmount(p: { status: string; totalAmount?: number; phases?: { amount?: number; status?: string }[] }): number {
  const phases = (p as any).phases || [];
  if (phases.length > 0) {
    return phases.reduce((sum: number, ph: any) => sum + (ph.status === "paid" ? Number(ph.amount) || 0 : 0), 0);
  }
  return p.status === "paid" ? Number((p as any).totalAmount) || 0 : 0;
}

export type PayrollBreakdownItem = { name: string; monthlyPayroll: number };

export type OverviewStats = {
  clientsActive: number;
  clientsInactive: number;
  projectsOngoing: number;
  projectsMaintenance: number;
  projectsCompleted: number;
  employeesTotal: number;
  employeesOnProduct: number;
  employeesOnService: number;
  monthlyPayroll: number;
  payrollByProduct: { name: string; monthlyPayroll: number }[];
  payrollByService: { name: string; monthlyPayroll: number }[];
  /** Monthly revenue (current year): paid amounts by month of payment. Index 0 = Jan, 11 = Dec. */
  monthlyRevenueCurrentYear: number[];
  /** Deprecated: no longer split by project start; kept for compatibility. */
  priorYearProjectsRevenue: number;
  currentYear: number;
  /** Total monthly equivalent of active (non-paused) expenses */
  totalMonthlyExpense: number;
  /** Expense breakdown by product/service name (monthly equivalent) */
  expenseByProduct: { name: string; kind: string; monthlyExpense: number }[];
  /** Monthly expense by product/service ~ same layout as money in (Jan–Dec, monthly equivalent per month) */
  monthlyExpenseByProductService: { name: string; kind: string; monthlyExpense: number[] }[];
  /** Comparison: Service ~ revenue (monthly), expense (monthly), net P&L. */
  comparisonService: { revenue: number; expense: number; netPL: number };
  /** Comparison: Product ~ revenue (monthly), expense (monthly), net P&L. */
  comparisonProduct: { revenue: number; expense: number; netPL: number };
  /** Total revenue (paid) in current year (all payments, phased or not). */
  totalRevenueCurrentYear: number;
  /** Revenue in current year by product/service (name, kind, totalRevenue). */
  revenueByProductService: { name: string; kind: string; totalRevenue: number }[];
  /** Revenue in current year by business (product/service id). */
  revenueByBusiness: { businessId: string; name: string; kind: string; totalRevenue: number }[];
  /** Monthly revenue by product/service. Index 0 = Jan, 11 = Dec. */
  monthlyRevenueByProductService: { name: string; kind: string; monthlyRevenue: number[] }[];
  /** Net P&L per month: revenue(month) - totalMonthlyExpense. Index 0 = Jan, 11 = Dec. */
  monthlyNetPL: number[];
  /** Top 5 profitable employees by product/service: net = (revenue share - salary) */
  topProfitableEmployees: { name: string; productOrService: string; kind: string; netMonthly: number }[];
  /** Top 5 losing employees (lowest net contribution) */
  topLosingEmployees: { name: string; productOrService: string; kind: string; netMonthly: number }[];
  /** Total amount due across all clients (unpaid phases + unpaid full payments) */
  totalDue: number;
  /** Payments/phases due within the next 10 days */
  upcomingPayments: {
    id: string;
    clientId: string;
    clientName: string;
    projectName: string;
    phaseName?: string;
    amount: number;
    dueDate: Date;
    status: string;
  }[];
  /** Revenue from last year up to today's date (for comparison) */
  totalRevenueLastYearYTD: number;
  /** Percentage growth: (CurrentYTD - LastYTD) / LastYTD * 100 */
  revenueGrowthPct: number;
};

export async function getOverviewStats(): Promise<OverviewStats> {
  const now = new Date();
  const currentYear = now.getFullYear();

  const startOfLastYear = new Date(currentYear - 1, 0, 1);

  const [
    clientsActive,
    clientsInactive,
    projectsOngoing,
    projectsMaintenance,
    projectsCompleted,
    employeesTotal,
    employeesOnProduct,
    employeesOnService,
    payrollAgg,
    payrollByProductAgg,
    payrollByServiceAgg,
    paidInvoices,
    allPaymentsForDue,
    employeesList,
    expenseDocs,
    externalRevenues,
  ] = await Promise.all([
    Client.countDocuments({ isActive: true }),
    Client.countDocuments({ isActive: false }),
    Project.countDocuments({ status: { $in: ["planned", "active", "on_hold"] } }),
    Project.countDocuments({ status: "maintenance" }),
    Project.countDocuments({ status: "completed" }),
    Employee.countDocuments({ isDismissed: { $ne: true } }),
    Employee.countDocuments({ isDismissed: { $ne: true }, assignedProduct: { $exists: true, $nin: ["", null] } }),
    Employee.countDocuments({ isDismissed: { $ne: true }, assignedService: { $exists: true, $nin: ["", null] } }),
    Employee.aggregate([
      { $match: { isDismissed: { $ne: true } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$annualSalary", 0] } } } },
    ]),
    Employee.aggregate([
      { $match: { isDismissed: { $ne: true }, assignedProduct: { $exists: true, $nin: ["", null] } } },
      { $group: { _id: "$assignedProduct", total: { $sum: { $ifNull: ["$annualSalary", 0] } } } },
      { $sort: { _id: 1 } },
    ]),
    Employee.aggregate([
      { $match: { isDismissed: { $ne: true }, assignedService: { $exists: true, $nin: ["", null] } } },
      { $group: { _id: "$assignedService", total: { $sum: { $ifNull: ["$annualSalary", 0] } } } },
      { $sort: { _id: 1 } },
    ]),
    Invoice.find({
      status: "paid",
      $or: [
        { paidDate: { $gte: startOfLastYear } },
        { invoiceDate: { $gte: startOfLastYear } },
        { updatedAt: { $gte: startOfLastYear } },
      ],
    })
      .select("subTotal totalAmount paidDate invoiceDate updatedAt projectPayment")
      .populate({
        path: "projectPayment",
        select: "product",
        populate: { path: "product", select: "name kind" }
      })
      .lean(),
    ProjectPayment.find({
      $or: [
        { status: { $ne: "paid" } },
        { "phases.status": { $ne: "paid" } },
      ],
    })
      .select("totalAmount phases status client project")
      .populate("client", "name companyName")
      .populate("project", "name")
      .lean(),
    Employee.find({ isDismissed: { $ne: true } })
      .select("name annualSalary assignedProduct assignedService")
      .lean(),
    Expense.find({ isPaused: { $ne: true } })
      .select("amount frequency customMonths product")
      .populate("product", "name kind")
      .lean(),
    ExternalRevenue.find({ year: currentYear })
      .populate("productId", "name kind")
      .lean(),
  ]);

  let totalDue = 0;
  const upcomingPayments: OverviewStats["upcomingPayments"] = [];
  const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  for (const p of allPaymentsForDue as any[]) {
    const phases = p.phases || [];
    const clientName = p.client?.companyName || p.client?.name || "Unknown Client";
    const projectName = p.project?.name || "General";

    if (phases.length > 0) {
      for (const ph of phases) {
        if (ph.status !== "paid") {
          totalDue += Number(ph.amount) || 0;
          if (ph.dueDate) {
            const dueDate = new Date(ph.dueDate);
            if (dueDate <= tenDaysFromNow) {
              upcomingPayments.push({
                id: String(p._id),
                clientId: String(p.client?._id || ""),
                clientName,
                projectName,
                phaseName: ph.name,
                amount: Number(ph.amount) || 0,
                dueDate,
                status: ph.status,
              });
            }
          }
        }
      }
    } else {
      if (p.status !== "paid") {
        totalDue += Number(p.totalAmount) || 0;
        // Non-phased payments don't always have dueDate in schema, but check if it exists or use some logic
        // For now, only phases have explicit due dates in the current logic
      }
    }
  }
  totalDue = Math.round(totalDue);
  upcomingPayments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const monthlyPayroll = payrollAgg[0]?.total != null ? Math.round((payrollAgg[0].total as number) / 12) : 0;
  const payrollByProduct: PayrollBreakdownItem[] = (payrollByProductAgg as { _id: string; total: number }[]).map(
    (r) => ({ name: r._id || "~", monthlyPayroll: Math.round((r.total || 0) / 12) })
  );
  const payrollByService: PayrollBreakdownItem[] = (payrollByServiceAgg as { _id: string; total: number }[]).map(
    (r) => ({ name: r._id || "~", monthlyPayroll: Math.round((r.total || 0) / 12) })
  );

  function expenseMonthlyEquivalent(amount: number, frequency: string, customMonths?: number): number {
    if (frequency === "monthly") return amount;
    if (frequency === "yearly") return amount / 12;
    if (frequency === "custom" && customMonths && customMonths >= 1) return amount / customMonths;
    return amount;
  }
  let totalMonthlyExpense = 0;
  let serviceExpenseMonthly = 0;
  let productExpenseMonthly = 0;
  const expenseByProductMap = new Map<string, { kind: string; amount: number }>();
  for (const e of expenseDocs as (typeof expenseDocs)[number][] & { product?: { name?: string; kind?: string }; frequency?: string; customMonths?: number }[]) {
    const amt = expenseMonthlyEquivalent(
      Number(e.amount) || 0,
      e.frequency || "monthly",
      e.customMonths
    );
    totalMonthlyExpense += amt;
    const name = (e.product as any)?.name ?? "Other";
    const kind = (e.product as any)?.kind ?? "expense";
    const prev = expenseByProductMap.get(name);
    expenseByProductMap.set(name, {
      kind: prev ? prev.kind : kind,
      amount: (prev?.amount ?? 0) + amt,
    });
    if (kind === "service") serviceExpenseMonthly += amt;
    else if (kind === "product") productExpenseMonthly += amt;
  }
  const expenseByProduct = Array.from(expenseByProductMap.entries())
    .map(([name, v]) => ({ name, kind: v.kind, monthlyExpense: Math.round(v.amount) }))
    .sort((a, b) => b.monthlyExpense - a.monthlyExpense);
  const recurringMonthlyExpense = totalMonthlyExpense;

  const monthlyExpenseByProductService = [
    ...expenseByProduct.map((row) => ({
      name: row.name,
      kind: row.kind,
      monthlyExpense: Array(12).fill(row.monthlyExpense) as number[],
    })),
    ...(monthlyPayroll > 0
      ? [{ name: "Team cost", kind: "payroll" as const, monthlyExpense: Array(12).fill(monthlyPayroll) as number[] }]
      : []),
  ];

  const monthlyRevenueCurrentYear = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let totalRevenueCurrentYear = 0;
  const revenueByProductMap = new Map<string, { kind: string; totalRevenue: number }>();
  const revenueByProductIdMap = new Map<string, { name: string; kind: string; totalRevenue: number }>();
  const monthlyRevenueByProductMap = new Map<string, { kind: string; monthly: number[] }>();

  function addToMonthlyByProduct(key: string, kind: string, monthIndex: number, amount: number) {
    if (!monthlyRevenueByProductMap.has(key)) {
      monthlyRevenueByProductMap.set(key, { kind, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    }
    const entry = monthlyRevenueByProductMap.get(key)!;
    entry.monthly[monthIndex] += amount;
  }

  // Add external revenue to calculations
  for (const extRev of externalRevenues as (typeof externalRevenues)[number][] & {
    productId?: { name?: string; kind?: string; _id?: any } | null;
  }[]) {
    const product = extRev.productId && typeof extRev.productId === "object" ? extRev.productId : null;
    if (!product || !product.name) continue;

    const amount = Number(extRev.amount) || 0;
    if (amount <= 0) continue;

    const monthIndex = (extRev.month || 1) - 1; // Convert 1-12 to 0-11
    monthlyRevenueCurrentYear[monthIndex] += amount;
    totalRevenueCurrentYear += amount;

    const name = product.name;
    const kind = product.kind === "service" ? "service" : "product";
    const productId = product._id ? String(product._id) : null;
    const key = `${name}\0${kind}`;

    const prev = revenueByProductMap.get(key);
    revenueByProductMap.set(key, { kind, totalRevenue: (prev?.totalRevenue ?? 0) + amount });
    addToMonthlyByProduct(key, kind, monthIndex, amount);

    if (productId) {
      const prevId = revenueByProductIdMap.get(productId);
      revenueByProductIdMap.set(productId, {
        name,
        kind,
        totalRevenue: (prevId?.totalRevenue ?? 0) + amount,
      });
    }
  }

  // Handle Internal Project Revenue
  let totalRevenueLastYearYTD = 0;
  const sameDayLastYear = new Date(now);
  sameDayLastYear.setFullYear(currentYear - 1);

  // External Revenue only for current year for now as per current schema/usage
  // If we had historic external revenue, we'd add it to totalRevenueLastYearYTD here

  type InvoiceDoc = (typeof paidInvoices)[number] & {
    updatedAt?: Date;
    paidDate?: Date;
    invoiceDate?: Date;
    subTotal?: number;
    totalAmount?: number;
    projectPayment?: { product?: { _id?: any; name?: string; kind?: string } | null } | null;
  };

  for (const inv of paidInvoices as InvoiceDoc[]) {
    // Note: totalAmount includes taxes. If revenue should be tax-exclusive, use subTotal.
    // Using totalAmount to stay consistent with previous ProjectPayment.totalAmount logic.
    const paidAmount = Number(inv.totalAmount) || 0;
    if (paidAmount <= 0) continue;

    const paymentDateObj = inv.paidDate || inv.invoiceDate || inv.updatedAt;
    const d = paymentDateObj ? new Date(paymentDateObj) : null;
    if (!d) continue;

    const product = inv.projectPayment?.product || null;

    if (d.getFullYear() === currentYear) {
      const monthIndex = d.getMonth();
      monthlyRevenueCurrentYear[monthIndex] += paidAmount;
      totalRevenueCurrentYear += paidAmount;

      const name = product && (product as any).name ? (product as any).name : "Other";
      const kind = product && (product as any).kind === "service" ? "service" : "product";
      const productId = product && (product as any)._id ? String((product as any)._id) : null;

      const key = `${name}\0${kind}`;
      const prev = revenueByProductMap.get(key);
      revenueByProductMap.set(key, { kind, totalRevenue: (prev?.totalRevenue ?? 0) + paidAmount });
      addToMonthlyByProduct(key, kind, monthIndex, paidAmount);

      if (productId) {
        const prevId = revenueByProductIdMap.get(productId);
        revenueByProductIdMap.set(productId, { name, kind, totalRevenue: (prevId?.totalRevenue ?? 0) + paidAmount });
      }
    } else if (d.getFullYear() === currentYear - 1 && d <= sameDayLastYear) {
      totalRevenueLastYearYTD += paidAmount;
    }
  }

  const revenueGrowthPct = totalRevenueLastYearYTD > 0
    ? ((totalRevenueCurrentYear - totalRevenueLastYearYTD) / totalRevenueLastYearYTD) * 100
    : 0;

  const priorYearProjectsRevenue = 0;

  const revenueByProductService = Array.from(revenueByProductMap.entries())
    .map(([key, v]) => {
      const [name] = key.split("\0");
      return { name, kind: v.kind, totalRevenue: Math.round(v.totalRevenue) };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  const revenueByBusiness = Array.from(revenueByProductIdMap.entries())
    .map(([businessId, row]) => ({
      businessId,
      name: row.name,
      kind: row.kind,
      totalRevenue: Math.round(row.totalRevenue),
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  const monthlyRevenueByProductService = Array.from(monthlyRevenueByProductMap.entries())
    .map(([key, v]) => {
      const [name] = key.split("\0");
      return {
        name,
        kind: v.kind,
        monthlyRevenue: v.monthly.map((m) => Math.round(m)),
      };
    })
    .sort((a, b) => b.monthlyRevenue.reduce((s, m) => s + m, 0) - a.monthlyRevenue.reduce((s, m) => s + m, 0));

  const monthlyNetPL = monthlyRevenueCurrentYear.map((rev, idx) =>
    Math.round(rev - recurringMonthlyExpense)
  );

  let serviceRevenueYear = 0;
  let productRevenueYear = 0;
  for (const r of revenueByProductService) {
    if (r.kind === "service") serviceRevenueYear += r.totalRevenue;
    else productRevenueYear += r.totalRevenue;
  }
  const comparisonService = {
    revenue: Math.round(serviceRevenueYear / 12),
    expense: Math.round(serviceExpenseMonthly),
    netPL: Math.round(serviceRevenueYear / 12 - serviceExpenseMonthly),
  };
  const comparisonProduct = {
    revenue: Math.round(productRevenueYear / 12),
    expense: Math.round(productExpenseMonthly),
    netPL: Math.round(productRevenueYear / 12 - productExpenseMonthly),
  };

  // Top 5 profitable / top 5 losing employees (by product/service)
  const employeeCountByProduct = new Map<string, number>();
  for (const emp of employeesList as { assignedProduct?: string; assignedService?: string }[]) {
    const pid = emp.assignedProduct || emp.assignedService;
    if (pid) {
      employeeCountByProduct.set(pid, (employeeCountByProduct.get(pid) ?? 0) + 1);
    }
  }
  const employeePnlList: { name: string; productOrService: string; kind: string; netMonthly: number }[] = [];
  for (const emp of employeesList as { name: string; annualSalary?: number; assignedProduct?: string; assignedService?: string }[]) {
    const productId = emp.assignedProduct || emp.assignedService;
    const rev = productId ? revenueByProductIdMap.get(productId) : null;
    const count = productId ? (employeeCountByProduct.get(productId) ?? 1) : 0;
    const monthlySalary = (Number(emp.annualSalary) || 0) / 12;
    const monthlyRevenueShare = rev && count > 0 ? (rev.totalRevenue / 12) / count : 0;
    const netMonthly = Math.round(monthlyRevenueShare - monthlySalary);
    employeePnlList.push({
      name: emp.name || "~",
      productOrService: rev?.name ?? "Not assigned",
      kind: rev?.kind ?? "product",
      netMonthly,
    });
  }
  const topProfitableEmployees = [...employeePnlList]
    .sort((a, b) => b.netMonthly - a.netMonthly)
    .slice(0, 5);
  const topLosingEmployees = [...employeePnlList]
    .sort((a, b) => a.netMonthly - b.netMonthly)
    .slice(0, 5);

  return {
    clientsActive,
    clientsInactive,
    projectsOngoing,
    projectsMaintenance,
    projectsCompleted,
    employeesTotal,
    employeesOnProduct,
    employeesOnService,
    monthlyPayroll,
    payrollByProduct,
    payrollByService,
    monthlyRevenueCurrentYear,
    priorYearProjectsRevenue,
    currentYear,
    totalMonthlyExpense,
    expenseByProduct,
    monthlyExpenseByProductService,
    comparisonService,
    comparisonProduct,
    totalRevenueCurrentYear,
    revenueByProductService,
    revenueByBusiness,
    monthlyRevenueByProductService,
    monthlyNetPL,
    topProfitableEmployees,
    topLosingEmployees,
    totalDue,
    upcomingPayments,
    totalRevenueLastYearYTD,
    revenueGrowthPct,
  };
}
