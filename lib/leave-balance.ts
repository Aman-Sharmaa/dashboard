import { Employee } from "@/models/Employee";
import { Attendance } from "@/models/Attendance";
import { CompanyProfile } from "@/models/CompanyProfile";

export interface LeaveBalance {
  casualLeaveBalance: number;
  casualLeaveTotal: number;
  sickLeaveBalance: number;
  sickLeaveTotal: number;
}

/**
 * Calculate dynamic leave balance for an employee based on:
 * - Date of joining
 * - Monthly leave allocation (from company settings)
 * - Approved paid leaves
 * - Carry forward setting
 */
export async function calculateLeaveBalance(
  employee: any,
  companyProfile: any
): Promise<LeaveBalance> {
  const dateOfHiring = employee.dateOfHiring ? new Date(employee.dateOfHiring) : null;
  
  if (!dateOfHiring || Number.isNaN(dateOfHiring.getTime())) {
    return {
      casualLeaveBalance: 0,
      casualLeaveTotal: 0,
      sickLeaveBalance: 0,
      sickLeaveTotal: 0,
    };
  }

  const carryForward = companyProfile?.leaveSettings?.carryForward || false;
  const monthlyPaidLimit = companyProfile?.leaveSettings?.monthlyPaidLimit || 2;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const hiringYear = dateOfHiring.getFullYear();
  const hiringMonth = dateOfHiring.getMonth();

  // Calculate total months eligible for leaves
  // Employee gets 2 leaves per month for each month from hiring month to current month (inclusive)
  // If they joined before the current month started, they get leaves for the current month
  let totalMonths = 0;
  
  // Start from the hiring month and count forward to current month (inclusive)
  let year = hiringYear;
  let month = hiringMonth;

  // Count months from hiring month to current month (inclusive)
  while (year < currentYear || (year === currentYear && month <= currentMonth)) {
    // For current month: only count if they joined before the month started
    if (year === currentYear && month === currentMonth) {
      const monthStart = new Date(year, month, 1);
      if (dateOfHiring < monthStart) {
        totalMonths++;
      }
    } else {
      // For all other months (including hiring month if not current), they get leaves
      totalMonths++;
    }
    
    // Move to next month
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  // Calculate expected total leaves
  const expectedTotalLeaves = totalMonths * monthlyPaidLimit;

  // Get all approved paid leaves
  const approvedLeaves = await Attendance.find({
    employee: employee._id,
    status: "leave",
    isPaid: true,
    approvalStatus: "approved",
  }).lean();

  // Categorize leaves by type
  let casualLeavesUsed = 0;
  let sickLeavesUsed = 0;

  for (const leave of approvedLeaves) {
    const leaveType = (leave as any).leaveType || "";
    const lowerType = leaveType.toLowerCase();
    if (lowerType.includes("casual")) {
      casualLeavesUsed++;
    } else if (lowerType.includes("sick")) {
      sickLeavesUsed++;
    } else {
      // Default to casual if type is unclear
      casualLeavesUsed++;
    }
  }

  // Calculate balances
  let casualBalance = expectedTotalLeaves - casualLeavesUsed;
  let sickBalance = 0 - sickLeavesUsed;

  // Handle carry forward
  if (!carryForward) {
    casualBalance = Math.max(0, casualBalance);
    sickBalance = Math.max(0, sickBalance);
  }

  return {
    casualLeaveBalance: casualBalance,
    casualLeaveTotal: expectedTotalLeaves,
    sickLeaveBalance: sickBalance,
    sickLeaveTotal: 0,
  };
}
