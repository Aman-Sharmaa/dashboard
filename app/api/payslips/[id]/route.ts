import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Payslip } from "@/models/Payslip";
import { Employee } from "@/models/Employee";
import { Reimbursement } from "@/models/Reimbursement";
import { ReimbursementStash } from "@/models/ReimbursementStash";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import "@/models/User"; // Register User model for populate("paidBy")

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

async function requireAdmin() {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const payslip = await Payslip.findById(id)
    .populate("employee", "name email")
    .populate("paidBy", "email")
    .lean();

  if (!payslip) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // Employees can only view their own payslips
  if (user.role === "employee") {
    const employee = await Employee.findOne({ email: user.email }).lean();
    if (!employee || String(employee._id) !== String(payslip.employee?._id || payslip.employee)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ payslip }, { status: 200 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const payslip = await Payslip.findById(id);
  if (!payslip) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    isPaid,
    pdfUrl,
    notes,
    reimbursement,
    reimbursementType,
    reimbursementNote,
    reimbursementDescription,
    reimbursementItems,
  } = body as {
    isPaid?: boolean;
    pdfUrl?: string;
    notes?: string;
    reimbursement?: number;
    reimbursementType?: string;
    reimbursementNote?: string;
    reimbursementDescription?: string;
    reimbursementItems?: { amount: number; type?: string; note?: string; description?: string }[];
  };

  let transitionedToPaid = false;
  if (typeof isPaid === "boolean") {
    transitionedToPaid = isPaid && !payslip.isPaid;
    payslip.isPaid = isPaid;
    if (isPaid && !payslip.paidAt) {
      payslip.paidAt = new Date();
      payslip.paidBy = new mongoose.Types.ObjectId(admin.userId);
    } else if (!isPaid) {
      payslip.paidAt = undefined;
      payslip.paidBy = undefined;
    }
  }

  if (typeof pdfUrl !== "undefined") {
    payslip.pdfUrl = pdfUrl || undefined;
  }

  if (typeof notes !== "undefined") {
    payslip.notes = notes || undefined;
  }

  const totalDed =
    (payslip.deductions.tds || 0) +
    (payslip.deductions.pf || 0) +
    (payslip.deductions.esic || 0) +
    (payslip.deductions.professionalTax || 0) +
    (payslip.deductions.advanceSalary || 0) +
    (payslip.deductions.attendanceDeduction || 0) +
    (payslip.deductions.other || 0);

  if (Array.isArray(reimbursementItems)) {
    payslip.reimbursementItems = reimbursementItems.map((i) => ({
      amount: Number(i.amount) || 0,
      type: i.type !== undefined && i.type !== null ? String(i.type) : undefined,
      note: i.note !== undefined && i.note !== null ? String(i.note) : undefined,
      description: i.description !== undefined && i.description !== null ? String(i.description) : undefined,
    }));
    payslip.markModified("reimbursementItems");
    const totalReimbursement = payslip.reimbursementItems.reduce((s, i) => s + (i.amount || 0), 0);
    payslip.reimbursement = totalReimbursement;
    payslip.netSalary = payslip.grossSalary + totalReimbursement - totalDed;
    if (payslip.reimbursementItems.length > 0) {
      const first = payslip.reimbursementItems[0];
      payslip.reimbursementType = first.type;
      payslip.reimbursementNote = first.note;
      payslip.reimbursementDescription = first.description;
    } else {
      payslip.reimbursementType = undefined;
      payslip.reimbursementNote = undefined;
      payslip.reimbursementDescription = undefined;
    }
  } else {
    if (typeof reimbursement === "number" && reimbursement >= 0) {
      payslip.reimbursement = reimbursement;
      payslip.netSalary = payslip.grossSalary + reimbursement - totalDed;
    }
    if (reimbursementType !== undefined) {
      payslip.reimbursementType = reimbursementType === "" ? undefined : reimbursementType;
    }
    if (reimbursementNote !== undefined) {
      payslip.reimbursementNote = reimbursementNote === "" ? undefined : reimbursementNote;
    }
    if (reimbursementDescription !== undefined) {
      payslip.reimbursementDescription = reimbursementDescription === "" ? undefined : reimbursementDescription;
    }
  }

  await payslip.save();

  if (transitionedToPaid) {
    try {
      const paidPayslips = await Payslip.find({
        month: payslip.month,
        year: payslip.year,
        isPaid: true,
      })
        .populate("employee", "name email")
        .lean();

      const totalPayout = paidPayslips.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
      const employeePayouts = paidPayslips.map((p: any) => ({
        name: p.employee?.name || p.employee?.email || "Employee",
        amount: Number(p.netSalary) || 0,
      }));
      const payoutText = employeePayouts
        .map((e) => `${e.name}: ₹${e.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`)
        .join(", ");

      const admins = await User.find({ role: "admin" }).select("_id").lean();
      if (admins.length > 0) {
        await Notification.create(
          admins.map((a) => ({
            user: a._id,
            type: "salary_payout_summary",
            title: `Monthly payout update (${payslip.month}/${payslip.year})`,
            message: `Total payout: ₹${totalPayout.toLocaleString("en-IN", { minimumFractionDigits: 2 })}. Employees: ${payoutText}`,
            data: {
              month: payslip.month,
              year: payslip.year,
              totalPayout,
              employees: employeePayouts,
            },
          }))
        );
      }
    } catch {}
  }

  const saved = await Payslip.findById(payslip._id)
    .populate("employee", "name email")
    .populate("paidBy", "email")
    .lean();

  if (!saved) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const raw = saved as unknown as Record<string, unknown>;
  const items = (raw.reimbursementItems as { amount: number; type?: string; note?: string; description?: string }[] | undefined) || [];
  return NextResponse.json({
    payslip: {
      ...raw,
      id: String(raw._id),
      reimbursementItems: items.map((i) => ({
        amount: Number(i.amount) || 0,
        type: i.type || undefined,
        note: i.note || undefined,
        description: i.description || undefined,
      })),
    },
  }, { status: 200 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  await Reimbursement.updateMany(
    { payslip: id },
    { $set: { payslip: null } }
  );

  const payslip = await Payslip.findById(id).lean();
  if (payslip) {
    const raw = payslip as unknown as Record<string, unknown>;
    const items = (raw.reimbursementItems as { amount: number; type?: string; note?: string; description?: string }[] | undefined) || [];
    const hasItems = items.length > 0;
    const legacyAmount = Number(raw.reimbursement) || 0;
    const hasLegacy = legacyAmount > 0;
    if (hasItems || hasLegacy) {
      const stashItems =
        items.length > 0
          ? items.map((i) => ({
            amount: Number(i.amount) || 0,
            type: i.type,
            note: i.note,
            description: i.description,
          }))
          : [
            {
              amount: legacyAmount,
              type: (raw.reimbursementType as string) || undefined,
              note: (raw.reimbursementNote as string) || undefined,
              description: (raw.reimbursementDescription as string) || undefined,
            },
          ];
      await ReimbursementStash.findOneAndUpdate(
        {
          employee: payslip.employee,
          month: payslip.month,
          year: payslip.year,
        },
        { $set: { items: stashItems } },
        { upsert: true, new: true }
      );
    }
  }

  await Payslip.findByIdAndDelete(id);

  return NextResponse.json({ ok: true }, { status: 200 });
}
