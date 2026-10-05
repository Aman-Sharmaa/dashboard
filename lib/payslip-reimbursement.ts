import mongoose from "mongoose";
import { Payslip } from "@/models/Payslip";
import { Reimbursement } from "@/models/Reimbursement";

/** Recompute payslip.reimbursement and payslip.netSalary from Reimbursement collection. */
export async function syncPayslipReimbursementTotal(payslipId: mongoose.Types.ObjectId): Promise<void> {
  const payslip = await Payslip.findById(payslipId);
  if (!payslip) return;

  const docs = await Reimbursement.find({
    payslip: payslipId,
    $or: [{ status: "approved" }, { status: { $exists: false } }],
  }).lean();
  const total = docs.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const totalDed =
    (payslip.deductions.tds || 0) +
    (payslip.deductions.pf || 0) +
    (payslip.deductions.esic || 0) +
    (payslip.deductions.professionalTax || 0) +
    (payslip.deductions.advanceSalary || 0) +
    (payslip.deductions.attendanceDeduction || 0) +
    (payslip.deductions.other || 0);

  payslip.reimbursement = total;
  payslip.netSalary = payslip.grossSalary + total - totalDed;
  if (docs.length > 0) {
    const first = docs[0];
    (payslip as { reimbursementType?: string }).reimbursementType = first.type;
    (payslip as { reimbursementNote?: string }).reimbursementNote = first.note;
    (payslip as { reimbursementDescription?: string }).reimbursementDescription = first.description;
  }
  await payslip.save();
}
