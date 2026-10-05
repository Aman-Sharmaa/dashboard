import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Reimbursement } from "@/models/Reimbursement";
import { Payslip } from "@/models/Payslip";
import { Employee } from "@/models/Employee";
import { syncPayslipReimbursementTotal } from "@/lib/payslip-reimbursement";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";

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

/** Allow edit/delete only when payslip is not paid (or no payslip). */
async function assertEditable(reimbursementId: string): Promise<{ ok: false; status: number; message: string } | { ok: true }> {
  const r = await Reimbursement.findById(reimbursementId).lean();
  if (!r) return { ok: false, status: 404, message: "Reimbursement not found" };
  if (!r.payslip) return { ok: true };
  const payslip = await Payslip.findById(r.payslip).lean();
  if (!payslip) return { ok: true };
  if (payslip.isPaid) {
    return { ok: false, status: 403, message: "Cannot edit or delete reimbursement after invoice is paid." };
  }
  return { ok: true };
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

  const r = await Reimbursement.findById(id).lean();
  if (!r) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (user.role === "employee") {
    const employee = await Employee.findOne({ email: user.email }).lean();
    if (!employee || String(employee._id) !== String(r.employee)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  const raw = r as { editRequestedAt?: Date; editRequestNote?: string };
  return NextResponse.json({
    reimbursement: {
      id: String(r._id),
      employeeId: String(r.employee),
      payslipId: r.payslip ? String(r.payslip) : null,
      month: r.month,
      year: r.year,
      amount: r.amount,
      type: r.type || undefined,
      note: r.note || undefined,
      description: r.description || undefined,
      editRequestedAt: raw.editRequestedAt ?? undefined,
      editRequestNote: raw.editRequestNote ?? undefined,
      status: (r as any).status || "approved",
      approvedAt: (r as any).approvedAt ?? undefined,
      rejectedAt: (r as any).rejectedAt ?? undefined,
      rejectionReason: (r as any).rejectionReason ?? undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const doc = await Reimbursement.findById(id);
  if (!doc) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const isEmployee = user.role === "employee";
  if (isEmployee) {
    const employee = await Employee.findOne({ email: user.email }).lean();
    if (!employee || String(employee._id) !== String(doc.employee)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  } else if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { amount, type, note, description, editRequestNote, clearEditRequest, action, rejectionReason } = body as {
    amount?: number;
    type?: string;
    note?: string;
    description?: string;
    editRequestNote?: string;
    clearEditRequest?: boolean;
    action?: "approve" | "reject";
    rejectionReason?: string;
  };

  if (isEmployee) {
    // Employee can only request edit (set note and timestamp)
    (doc as any).editRequestedAt = new Date();
    (doc as any).editRequestNote = typeof editRequestNote === "string" ? editRequestNote.trim() : "";
    await doc.save();
  } else {
    if (action === "approve") {
      const oldPayslipId = doc.payslip ? String(doc.payslip) : null;
      const now = new Date();
      const reimbursementMonth = doc.month;
      const reimbursementYear = doc.year;

      const targetPayslip = await Payslip.findOne({
        employee: doc.employee,
        month: reimbursementMonth,
        year: reimbursementYear,
        isPaid: false,
      }).lean();

      // Keep reimbursement in the same cycle it was raised for.
      doc.payslip = targetPayslip ? (targetPayslip._id as any) : null;
      (doc as any).status = "approved";
      (doc as any).approvedAt = now;
      (doc as any).approvedBy = new mongoose.Types.ObjectId(user.userId);
      (doc as any).rejectedAt = undefined;
      (doc as any).rejectedBy = undefined;
      (doc as any).rejectionReason = undefined;
      await doc.save();

      if (oldPayslipId && oldPayslipId !== String(doc.payslip || "")) {
        await syncPayslipReimbursementTotal(new mongoose.Types.ObjectId(oldPayslipId));
      }
      if (doc.payslip) {
        await syncPayslipReimbursementTotal(doc.payslip as mongoose.Types.ObjectId);
      }

      try {
        const employee = await Employee.findById(doc.employee).lean();
        const empUser = employee?.email ? await User.findOne({ email: employee.email }).select("_id").lean() : null;
        if (empUser?._id) {
          await Notification.create({
            user: empUser._id,
            type: "reimbursement_approved",
            title: "Reimbursement approved",
            message: `Your reimbursement has been approved for ${reimbursementMonth}/${reimbursementYear} salary cycle.`,
            data: { reimbursementId: String(doc._id) },
          });
        }
      } catch {}
    } else if (action === "reject") {
      const oldPayslipId = doc.payslip ? String(doc.payslip) : null;
      (doc as any).status = "rejected";
      (doc as any).rejectedAt = new Date();
      (doc as any).rejectedBy = new mongoose.Types.ObjectId(user.userId);
      (doc as any).rejectionReason = rejectionReason?.trim() || undefined;
      doc.payslip = null;
      await doc.save();

      if (oldPayslipId) {
        await syncPayslipReimbursementTotal(new mongoose.Types.ObjectId(oldPayslipId));
      }
      try {
        const employee = await Employee.findById(doc.employee).lean();
        const empUser = employee?.email ? await User.findOne({ email: employee.email }).select("_id").lean() : null;
        if (empUser?._id) {
          await Notification.create({
            user: empUser._id,
            type: "reimbursement_rejected",
            title: "Reimbursement rejected",
            message: (doc as any).rejectionReason
              ? `Your reimbursement was rejected: ${(doc as any).rejectionReason}`
              : "Your reimbursement was rejected.",
            data: { reimbursementId: String(doc._id) },
          });
        }
      } catch {}
    } else {
      const editable = await assertEditable(id);
      if (!editable.ok) {
        return NextResponse.json({ message: editable.message }, { status: editable.status });
      }
      if (clearEditRequest) {
        (doc as any).editRequestedAt = undefined;
        (doc as any).editRequestNote = undefined;
      }
      if (typeof amount === "number" && !Number.isNaN(amount) && amount >= 0) {
        doc.amount = amount;
      }
      if (type !== undefined) doc.type = type || undefined;
      if (note !== undefined) doc.note = note || undefined;
      if (description !== undefined) doc.description = description || undefined;
      if (!clearEditRequest && (typeof amount === "number" || type !== undefined || note !== undefined || description !== undefined)) {
        (doc as any).editRequestedAt = undefined;
        (doc as any).editRequestNote = undefined;
      }
      await doc.save();
      if (doc.payslip) {
        await syncPayslipReimbursementTotal(doc.payslip as mongoose.Types.ObjectId);
      }
    }
  }

  const saved = await Reimbursement.findById(doc._id).lean();
  const s = saved as any;
  return NextResponse.json({
    reimbursement: {
      id: String(saved!._id),
      employeeId: String(saved!.employee),
      payslipId: saved!.payslip ? String(saved!.payslip) : null,
      month: saved!.month,
      year: saved!.year,
      amount: saved!.amount,
      type: saved!.type || undefined,
      note: saved!.note || undefined,
      description: saved!.description || undefined,
      editRequestedAt: s.editRequestedAt ?? undefined,
      editRequestNote: s.editRequestNote ?? undefined,
      status: s.status || "approved",
      approvedAt: s.approvedAt ?? undefined,
      rejectedAt: s.rejectedAt ?? undefined,
      rejectionReason: s.rejectionReason ?? undefined,
      createdAt: saved!.createdAt,
      updatedAt: saved!.updatedAt,
    },
  });
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

  const editable = await assertEditable(id);
  if (!editable.ok) {
    return NextResponse.json({ message: editable.message }, { status: editable.status });
  }

  const doc = await Reimbursement.findById(id);
  if (!doc) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const payslipId = doc.payslip ? (doc.payslip as mongoose.Types.ObjectId) : null;
  await Reimbursement.findByIdAndDelete(id);

  if (payslipId) {
    await syncPayslipReimbursementTotal(payslipId);
  }

  return NextResponse.json({ ok: true });
}
