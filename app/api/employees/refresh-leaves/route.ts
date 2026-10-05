import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Employee } from "@/models/Employee";
import { Attendance } from "@/models/Attendance";
import { CompanyProfile } from "@/models/CompanyProfile";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const user = verifyToken(token);
    if (user.role !== "admin") return null;
    return user;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  try {
    // Get company leave settings
    const companyProfile = await CompanyProfile.findOne({ owner: admin.userId }).lean();
    const carryForward = companyProfile?.leaveSettings?.carryForward || false;
    const monthlyPaidLimit = companyProfile?.leaveSettings?.monthlyPaidLimit || 2; // Default 2 leaves per month

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Get all active employees
    const employees = await Employee.find({ isDismissed: false }).lean();

    let updatedCount = 0;
    let skippedCount = 0;

    for (const emp of employees) {
      const employee = emp as any;

      // Skip employees whose leave balances are manually managed by admin
      if (employee.leaveManualOverride) {
        skippedCount++;
        continue;
      }

      const dateOfHiring = employee.dateOfHiring ? new Date(employee.dateOfHiring) : null;

      if (!dateOfHiring || Number.isNaN(dateOfHiring.getTime())) {
        skippedCount++;
        continue;
      }

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

      // Calculate expected total leaves (2 per month)
      const expectedTotalLeaves = totalMonths * monthlyPaidLimit;

      // Get all approved paid leaves for this employee, categorized by type
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
      // For now, all monthly leaves go to casual leave balance
      // You can adjust this logic if you want to split between casual and sick
      let casualBalance = expectedTotalLeaves - casualLeavesUsed;
      let sickBalance = 0 - sickLeavesUsed; // Sick leaves are separate, start from 0

      // Handle carry forward
      if (!carryForward) {
        // If carry forward is disabled, balance cannot go below 0
        casualBalance = Math.max(0, casualBalance);
        sickBalance = Math.max(0, sickBalance);
      }

      // Update employee leave balances
      const employeeDoc = await Employee.findById(employee._id);
      if (employeeDoc) {
        employeeDoc.casualLeaveBalance = casualBalance;
        employeeDoc.casualLeaveTotal = expectedTotalLeaves;
        employeeDoc.sickLeaveBalance = sickBalance;
        employeeDoc.sickLeaveTotal = 0; // Sick leaves are not monthly allocated

        await employeeDoc.save();
        updatedCount++;
      }
    }

    return NextResponse.json({
      message: "Leaves refreshed successfully",
      updated: updatedCount,
      skipped: skippedCount,
      total: employees.length,
    });
  } catch (error: any) {
    console.error("Error refreshing leaves:", error);
    return NextResponse.json(
      { message: `Failed to refresh leaves: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
