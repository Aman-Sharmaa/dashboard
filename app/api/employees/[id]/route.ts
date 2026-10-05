import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { connectDB } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { Task } from "@/models/Task";
import { CompanyProfile } from "@/models/CompanyProfile";
import { verifyToken, hashPassword } from "@/lib/auth";
import { calculateLeaveBalance } from "@/lib/leave-balance";


const COOKIE_NAME = "kalp_auth_token";

function generateTemporaryPassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) result += chars[bytes[i]! % chars.length];
  return result;
}

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
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
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

  const employee = await Employee.findById(id).lean();
  if (!employee) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // Employees can only view their own data, admins can view any
  if (user.role === "employee") {
    const emp = await Employee.findOne({ email: user.email }).lean();
    if (!emp || String(emp._id) !== id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  // If admin has manually set leave values, use them as-is; otherwise auto-calculate
  if ((employee as any).leaveManualOverride) {
    return NextResponse.json({ employee }, { status: 200 });
  }

  const companyProfile = await CompanyProfile.findOne({ owner: user.userId }).lean() ||
    await CompanyProfile.findOne().lean();

  const leaveBalance = await calculateLeaveBalance(employee, companyProfile);

  return NextResponse.json({
    employee: {
      ...employee,
      casualLeaveBalance: leaveBalance.casualLeaveBalance,
      casualLeaveTotal: leaveBalance.casualLeaveTotal,
      sickLeaveBalance: leaveBalance.sickLeaveBalance,
      sickLeaveTotal: leaveBalance.sickLeaveTotal,
    },
  }, { status: 200 });
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

  const body = await req.json();
  const { action } = body as { action: string };

  const employee = await Employee.findById(id);
  if (!employee) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (body.section === "leaves") {
    const {
      casualLeaveBalance,
      casualLeaveTotal,
      sickLeaveBalance,
      sickLeaveTotal,
    } = body;

    if (casualLeaveBalance !== undefined) employee.casualLeaveBalance = Number(casualLeaveBalance);
    if (casualLeaveTotal !== undefined) employee.casualLeaveTotal = Number(casualLeaveTotal);
    if (sickLeaveBalance !== undefined) employee.sickLeaveBalance = Number(sickLeaveBalance);
    if (sickLeaveTotal !== undefined) employee.sickLeaveTotal = Number(sickLeaveTotal);
    employee.leaveManualOverride = true;

    await employee.save();
    return NextResponse.json({ ok: true, employee }, { status: 200 });
  }

  if (action === "enableLogin") {
    const email = String((employee as any).email).trim().toLowerCase();
    const employeeName = String((employee as any).name || "").trim();
    const hashed = await hashPassword(generateTemporaryPassword(10));

    const user = await User.findOne({ email });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        $set: { password: hashed, role: "employee", name: employeeName || email },
      });
    } else {
      await User.create({
        email,
        password: hashed,
        name: employeeName || email,
        role: "employee",
      });
    }
    await Employee.findByIdAndUpdate(id, { $set: { isLoginDisabled: false } });
    return NextResponse.json(
      { ok: true, message: "OTP login enabled for employee" },
      { status: 200 }
    );
  }

  if (action === "dismiss") {
    employee.isDismissed = true;

    // Reassign all open tasks assigned to this employee to the admin
    const adminUser = await User.findOne({ role: "admin" }).lean();
    if (adminUser) {
      const adminEmployee = await Employee.findOne({ email: (adminUser as any).email }).lean();
      if (adminEmployee) {
        const adminEmpId = (adminEmployee as any)._id;
        // Safely replace employee with admin in assignees using standard operators
        await Task.updateMany(
          { assignees: employee._id, status: { $nin: ["done", "rejected"] } },
          {
            $addToSet: { assignees: adminEmpId },
            $set: { assignee: adminEmpId }
          }
        );
        await Task.updateMany(
          { assignees: employee._id, status: { $nin: ["done", "rejected"] } },
          {
            $pull: { assignees: employee._id }
          }
        );
      }
    }
  } else if (action === "stopSalary") {

    employee.isSalaryStopped = true;
  } else if (action === "disableLogin") {
    employee.isLoginDisabled = true;
  } else if (action === "activate") {
    employee.isDismissed = false;
  } else {
    return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  }

  await employee.save();

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const updates = await req.json();
  if (updates.type === "Contractor") updates.type = "Contract";

  const existingEmployee = await Employee.findById(id);
  if (!existingEmployee) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const oldEmail = existingEmployee.email;
  const newEmail = updates.email?.trim().toLowerCase();

  // If email is changing, we also need to update the User account so they can still log in
  if (newEmail && oldEmail && newEmail !== oldEmail) {
    // Check if new email is already taken by another User
    const emailTaken = await User.findOne({ email: newEmail });
    if (emailTaken) {
      return NextResponse.json(
        { message: "A user account with the new email already exists." },
        { status: 400 }
      );
    }
    // Update the User document linked to the old email
    await User.updateOne({ email: oldEmail }, { $set: { email: newEmail } });
  }

  const employee = await Employee.findByIdAndUpdate(id, updates, {
    new: true,
  }).lean();

  return NextResponse.json({ employee }, { status: 200 });
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

  const employee = await Employee.findById(id);
  if (!employee) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (!employee.isDismissed) {
    return NextResponse.json(
      { message: "Dismiss employee before deleting" },
      { status: 400 }
    );
  }

  await Employee.findByIdAndDelete(id);

  // Reassign any remaining tasks assigned to the deleted employee to the admin
  const adminUser = await User.findOne({ role: "admin" }).lean();
  if (adminUser) {
    const adminEmployee = await Employee.findOne({ email: (adminUser as any).email }).lean();
    if (adminEmployee) {
      const adminEmpId = (adminEmployee as any)._id;
      await Task.updateMany(
        { assignees: employee._id, status: { $nin: ["done", "rejected"] } },
        [
          {
            $set: {
              assignees: {
                $concatArrays: [
                  { $filter: { input: "$assignees", as: "a", cond: { $ne: ["$$a", employee._id] } } },
                  [adminEmpId],
                ],
              },
              assignee: adminEmpId,
            },
          },
        ]
      );
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });

}
