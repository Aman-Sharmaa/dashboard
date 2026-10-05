import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Payslip } from "@/models/Payslip";
import { Employee } from "@/models/Employee";
import { Attendance } from "@/models/Attendance";
import { Reimbursement } from "@/models/Reimbursement";
import { ReimbursementStash } from "@/models/ReimbursementStash";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { syncPayslipReimbursementTotal } from "@/lib/payslip-reimbursement";
import "@/models/User"; // Register User model so Payslip can populate("paidBy")

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

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const employeeIdFromQuery = searchParams.get("employeeId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    let filter: Record<string, unknown> = {};

    if (user.role === "admin") {
      if (employeeIdFromQuery) {
        try {
          filter.employee = mongoose.Types.ObjectId.isValid(employeeIdFromQuery)
            ? new mongoose.Types.ObjectId(employeeIdFromQuery)
            : employeeIdFromQuery;
        } catch {
          filter.employee = employeeIdFromQuery;
        }
      }
    } else if (user.role === "employee") {
      // Employees can only view their own payslips
      const employee = await Employee.findOne({ email: user.email }).lean();
      if (!employee) {
        return NextResponse.json(
          { message: "Employee profile not found for this user" },
          { status: 404 }
        );
      }
      filter.employee = employee._id;
    } else {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);

    const payslips = await Payslip.find(filter)
      .sort({ year: -1, month: -1 })
      .populate("employee", "name email")
      .populate("paidBy", "email")
      .lean();

    const payslipIds = payslips.map((p) => p._id);
    const reimbursementsByPayslip: Record<string, { id: string; amount: number; type?: string; note?: string; description?: string; status?: string; rejectionReason?: string; editRequestedAt?: string; editRequestNote?: string }[]> = {};
    if (payslipIds.length > 0) {
      const allReimbursements = await Reimbursement.find({
        payslip: { $in: payslipIds },
        $or: [{ status: "approved" }, { status: { $exists: false } }],
      })
        .sort({ createdAt: 1 })
        .lean();
      for (const r of allReimbursements) {
        const raw = r as { editRequestedAt?: Date; editRequestNote?: string };
        const pid = String(r.payslip);
        if (!reimbursementsByPayslip[pid]) reimbursementsByPayslip[pid] = [];
        reimbursementsByPayslip[pid].push({
          id: String(r._id),
          amount: r.amount,
          type: r.type || undefined,
          note: r.note || undefined,
          description: r.description || undefined,
          status: (r as any).status || "approved",
          rejectionReason: (r as any).rejectionReason || undefined,
          editRequestedAt: raw.editRequestedAt ? raw.editRequestedAt.toISOString() : undefined,
          editRequestNote: raw.editRequestNote ?? undefined,
        });
      }
    }

    return NextResponse.json(
      {
        payslips: payslips.map((p) => {
          const raw = p as unknown as Record<string, unknown>;
          const fromCollection = reimbursementsByPayslip[String(p._id)];
          let items: { id?: string; amount: number; type?: string; note?: string; description?: string; status?: string; rejectionReason?: string; editRequestedAt?: string; editRequestNote?: string }[];
          if (fromCollection && fromCollection.length > 0) {
            items = fromCollection.map((i) => ({
              id: i.id,
              amount: Number(i.amount) || 0,
              type: i.type,
              note: i.note,
              description: i.description,
              status: (i as any).status,
              rejectionReason: (i as any).rejectionReason,
              editRequestedAt: i.editRequestedAt,
              editRequestNote: i.editRequestNote,
            }));
          } else {
            items = (raw.reimbursementItems as { amount: number; type?: string; note?: string; description?: string }[] | undefined) || [];
            if (items.length === 0 && (Number(raw.reimbursement) || 0) > 0) {
              items = [{
                amount: Number(raw.reimbursement) || 0,
                type: (raw.reimbursementType as string) || undefined,
                note: (raw.reimbursementNote as string) || undefined,
                description: (raw.reimbursementDescription as string) || undefined,
              }];
            }
            items = items.map((i) => ({
              amount: Number(i.amount) || 0,
              type: (i.type as string) || undefined,
              note: (i.note as string) || undefined,
              description: (i.description as string) || undefined,
            }));
          }
          const reimbursement = Number(raw.reimbursement) ?? items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
          return {
            id: String(p._id),
            payslipId: (p as { payslipId?: string }).payslipId || `PSL-${p.year}-${String(p.month).padStart(2, "0")}-${String(p._id).slice(-4)}`,
            employeeId: String(p.employee?._id || p.employee),
            employeeName:
              typeof p.employee === "object" && p.employee && "name" in p.employee
                ? (p.employee as { name?: string }).name
                : undefined,
            employeeEmail:
              typeof p.employee === "object" && p.employee && "email" in p.employee
                ? (p.employee as { email?: string }).email
                : undefined,
            month: p.month,
            year: p.year,
            grossSalary: p.grossSalary,
            reimbursement,
            reimbursementType: (raw.reimbursementType as string) || undefined,
            reimbursementNote: (raw.reimbursementNote as string) || undefined,
            reimbursementDescription: (raw.reimbursementDescription as string) || undefined,
            reimbursementItems: items,
            deductions: p.deductions,
            netSalary: p.netSalary,
            isPaid: p.isPaid,
            paidAt: p.paidAt,
            paidBy: p.paidBy ? String(p.paidBy) : null,
            pdfUrl: p.pdfUrl,
            notes: p.notes,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          };
        }),
        ...(employeeIdFromQuery && user.role === "admin"
          ? await (async () => {
            const empId = filter.employee as mongoose.Types.ObjectId;
            const [stashDocs, orphanDocs] = await Promise.all([
              ReimbursementStash.find({ employee: empId }).sort({ year: -1, month: -1 }).lean(),
              Reimbursement.find({ employee: empId, payslip: null }).sort({ year: -1, month: -1, createdAt: 1 }).lean(),
            ]);
            const byMonthYear: Record<string, { id: string; amount: number; type?: string; note?: string; description?: string; status?: string; rejectionReason?: string; editRequestedAt?: string; editRequestNote?: string }[]> = {};
            for (const r of orphanDocs) {
              const raw = r as { editRequestedAt?: Date; editRequestNote?: string };
              const key = `${r.year}-${r.month}`;
              if (!byMonthYear[key]) byMonthYear[key] = [];
              byMonthYear[key].push({
                id: String(r._id),
                amount: r.amount,
                type: r.type || undefined,
                note: r.note || undefined,
                description: r.description || undefined,
                status: (r as any).status || "approved",
                editRequestedAt: raw.editRequestedAt ? raw.editRequestedAt.toISOString() : undefined,
                editRequestNote: raw.editRequestNote ?? undefined,
              });
            }
            const orphanReimbursements = Object.entries(byMonthYear)
              .map(([key, items]) => {
                const [y, m] = key.split("-").map(Number);
                return { month: m, year: y, items };
              })
              .sort((a, b) => b.year - a.year || b.month - a.month);
            return {
              reimbursementStash: stashDocs.map((s) => ({
                month: s.month,
                year: s.year,
                items: (s.items || []).map((i) => ({
                  amount: Number(i.amount) || 0,
                  type: i.type || undefined,
                  note: i.note || undefined,
                  description: i.description || undefined,
                })),
              })),
              orphanReimbursements,
            };
          })()
          : {}),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Payslips GET error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to load payslips" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Only admins can create payslips
  if (user.role !== "admin") {
    return NextResponse.json(
      { message: "Only admins can create payslips" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    employeeId,
    month,
    year,
    grossSalary,
    reimbursement,
    reimbursementType,
    reimbursementNote,
    reimbursementDescription,
    deductions,
    netSalary,
    notes,
  } = body as {
    employeeId: string;
    month: number;
    year: number;
    grossSalary?: number;
    reimbursement?: number;
    reimbursementType?: string;
    reimbursementNote?: string;
    reimbursementDescription?: string;
    deductions?: {
      tds?: number;
      pf?: number;
      esic?: number;
      professionalTax?: number;
      advanceSalary?: number;
      attendanceDeduction?: number;
      other?: number;
    };
    netSalary?: number;
    notes?: string;
  };

  if (!employeeId || !month || !year) {
    return NextResponse.json(
      { message: "employeeId, month, and year are required" },
      { status: 400 }
    );
  }

  if (month < 1 || month > 12) {
    return NextResponse.json(
      { message: "Month must be between 1 and 12" },
      { status: 400 }
    );
  }

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return NextResponse.json(
      { message: "Employee not found" },
      { status: 404 }
    );
  }

  // Restrict generation to from joining date through current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    return NextResponse.json(
      { message: "Payslip cannot be generated for a future month." },
      { status: 400 }
    );
  }
  const joining = employee.dateOfHiring ? new Date(employee.dateOfHiring) : null;
  if (!joining || Number.isNaN(joining.getTime())) {
    return NextResponse.json(
      { message: "Employee joining date is required. Set date of hiring to generate payslips." },
      { status: 400 }
    );
  }
  const joinYear = joining.getFullYear();
  const joinMonth = joining.getMonth() + 1;
  if (year < joinYear || (year === joinYear && month < joinMonth)) {
    return NextResponse.json(
      { message: "Payslip can only be generated from the employee's joining date onwards." },
      { status: 400 }
    );
  }

  // Calculate attendance deduction based on unpaid leaves for this month
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const attendanceRecords = await Attendance.find({
    employee: employee._id,
    date: { $gte: monthStart, $lte: monthEnd },
    status: "leave",
    isPaid: false,
    approvalStatus: "approved",
  }).lean();

  const unpaidLeaveDays = attendanceRecords.length;
  const dailySalary = employee.annualSalary ? employee.annualSalary / 365 : 0;
  const attendanceDeduction = unpaidLeaveDays * dailySalary;

  // Calculate gross salary (monthly from annual)
  const calculatedGrossSalary =
    grossSalary || (employee.annualSalary ? employee.annualSalary / 12 : 0);

  // PF: only deduct if employee is opted into EPF (pfOptIn !== false). Default 12% of gross when opted in.
  const pfOptIn = (employee as { pfOptIn?: boolean }).pfOptIn !== false;
  const defaultPf = pfOptIn ? Math.round(calculatedGrossSalary * 0.12 * 100) / 100 : 0;
  const calculatedPf = !pfOptIn ? 0 : (deductions?.pf ?? defaultPf);

  // Calculate deductions
  const calculatedDeductions = {
    tds: deductions?.tds || employee.tdsDeducted || 0,
    pf: calculatedPf,
    esic: deductions?.esic || 0,
    professionalTax: deductions?.professionalTax || 0,
    advanceSalary: deductions?.advanceSalary || employee.currentAdvanceSalary || 0,
    attendanceDeduction: deductions?.attendanceDeduction ?? attendanceDeduction,
    other: deductions?.other || 0,
  };

  const totalDeductions =
    calculatedDeductions.tds +
    calculatedDeductions.pf +
    calculatedDeductions.esic +
    calculatedDeductions.professionalTax +
    calculatedDeductions.advanceSalary +
    calculatedDeductions.attendanceDeduction +
    calculatedDeductions.other;

  try {
    const existing = await Payslip.findOne({ employee: employee._id, month, year }).lean();
    if (existing) {
      return NextResponse.json(
        { message: "A payslip already exists for this month. Add reimbursement only for months without a payslip; use Edit on the reimbursement list to change an existing entry." },
        { status: 400 }
      );
    }

    const stash = await ReimbursementStash.findOne({
      employee: employee._id,
      month,
      year,
    }).lean();

    // Generate a collision-safe human-readable ID.
    let payslipIdStr = "";
    for (let seq = 1; seq <= 9999; seq++) {
      const candidate = `PSL-${year}-${String(month).padStart(2, "0")}-${String(seq).padStart(4, "0")}`;
      const exists = await Payslip.exists({ payslipId: candidate });
      if (!exists) {
        payslipIdStr = candidate;
        break;
      }
    }
    if (!payslipIdStr) {
      return NextResponse.json(
        { message: "Could not allocate a unique payslip ID. Please try again." },
        { status: 500 }
      );
    }

    const payslip = await Payslip.findOneAndUpdate(
      { employee: employee._id, month, year },
      {
        payslipId: payslipIdStr,
        employee: employee._id,
        month,
        year,
        grossSalary: calculatedGrossSalary,
        reimbursement: 0,
        deductions: calculatedDeductions,
        netSalary: calculatedGrossSalary - totalDeductions,
        notes: notes || undefined,
      },
      { upsert: true, new: true }
    );

    await Reimbursement.updateMany(
      {
        employee: employee._id,
        month,
        year,
        payslip: null,
        $or: [{ status: "approved" }, { status: { $exists: false } }],
      },
      { $set: { payslip: payslip._id } }
    );

    if (stash && Array.isArray(stash.items) && stash.items.length > 0) {
      await Reimbursement.insertMany(
        stash.items.map((i) => ({
          employee: employee._id,
          payslip: payslip._id,
          month,
          year,
          amount: Number(i.amount) || 0,
          type: i.type,
          note: i.note,
          description: i.description,
        }))
      );
      await ReimbursementStash.findOneAndDelete({
        employee: employee._id,
        month,
        year,
      });
    }

    await syncPayslipReimbursementTotal(payslip._id as mongoose.Types.ObjectId);

    const updatedPayslip = await Payslip.findById(payslip._id).lean();
    const createdReimbursements = await Reimbursement.find({ payslip: payslip._id }).lean();
    const createdItems = createdReimbursements.map((r) => ({
      id: String(r._id),
      amount: r.amount,
      type: r.type || undefined,
      note: r.note || undefined,
      description: r.description || undefined,
    }));
    // Notifications: employee and acting admin
    try {
      // employee -> User
      const employeeUser = await User.findOne({ email: employee.email })
        .select("_id")
        .lean();
      const notifications: Parameters<typeof Notification.create>[0][] = [];

      if (employeeUser?._id) {
        notifications.push({
          user: employeeUser._id,
          type: "payslip_created",
          title: "Payslip generated",
          message: `Your payslip for ${month}/${year} has been generated.`,
          data: {
            payslipId: String(payslip._id),
            month,
            year,
          },
        });
      }

      if (user.userId) {
        notifications.push({
          user: user.userId,
          type: "payslip_created",
          title: "Payslip created",
          message: `You created a payslip for ${employee.name || employee.email} (${month}/${year}).`,
          data: {
            payslipId: String(payslip._id),
            month,
            year,
          },
        });
      }

      if (notifications.length > 0) {
        await Notification.create(notifications);
      }
    } catch {
      // ignore notification failures
    }

    return NextResponse.json(
      {
        payslip: {
          id: String(updatedPayslip!._id),
          payslipId: (updatedPayslip as { payslipId?: string }).payslipId,
          employeeId: String(employee._id),
          month: updatedPayslip!.month,
          year: updatedPayslip!.year,
          grossSalary: updatedPayslip!.grossSalary,
          reimbursement: (updatedPayslip as { reimbursement?: number }).reimbursement ?? 0,
          reimbursementType: (updatedPayslip as { reimbursementType?: string }).reimbursementType,
          reimbursementNote: (updatedPayslip as { reimbursementNote?: string }).reimbursementNote,
          reimbursementDescription: (updatedPayslip as { reimbursementDescription?: string }).reimbursementDescription,
          reimbursementItems: createdItems,
          deductions: updatedPayslip!.deductions,
          netSalary: updatedPayslip!.netSalary,
          isPaid: updatedPayslip!.isPaid,
          paidAt: updatedPayslip!.paidAt,
          paidBy: updatedPayslip!.paidBy ? String(updatedPayslip!.paidBy) : null,
          pdfUrl: updatedPayslip!.pdfUrl,
          notes: updatedPayslip!.notes,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Could not save payslip";
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}
