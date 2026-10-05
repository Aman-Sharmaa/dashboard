import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Employee } from "@/models/Employee";
import { Notification } from "@/models/Notification";
import { DEFAULT_EMPLOYEE_FEATURES } from "@/lib/features";
import { getIO } from "@/lib/socket-server";
import { sanitizeFeatureFlags } from "@/lib/employee-feature-grants";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "kalp_auth_token";

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

/**
 * GET /api/users/access
 * Returns all employees with their current feature access.
 * Admin only.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  // Get all employee users
  const users = await User.find({ role: "employee" })
    .select("email name featureAccess canManageContent accessGroupId featureAdminFor featureReadOnlyFor")
    .lean();

  // Get employee records for extra info (title, department, avatar, dismissed status)
  const emails = users.map((u: any) => String(u.email || "").toLowerCase()).filter(Boolean);
  const employees = await Employee.find({ email: { $in: emails } })
    .select("email name title department avatarUrl isDismissed isLoginDisabled")
    .lean();

  const employeeMap: Record<string, any> = {};
  for (const emp of employees) {
    employeeMap[String((emp as any).email || "").toLowerCase()] = emp;
  }

  const result = users
    .filter((u: any) => !!employeeMap[String(u.email || "").toLowerCase()])
    .map((u: any) => {
    const emp = employeeMap[String(u.email || "").toLowerCase()];
    const access = u.featureAccess && u.featureAccess.length > 0
      ? u.featureAccess
      : DEFAULT_EMPLOYEE_FEATURES;

    const { featureAdminFor, featureReadOnlyFor } = sanitizeFeatureFlags(
      access,
      (u as any).featureAdminFor,
      (u as any).featureReadOnlyFor
    );

    return {
      _id: u._id,
      email: u.email,
      name: u.name || emp?.name || "",
      title: emp?.title || "",
      department: emp?.department || "",
      avatarUrl: emp?.avatarUrl || "",
      isDismissed: emp?.isDismissed || false,
      isLoginDisabled: emp?.isLoginDisabled || false,
      featureAccess: access,
      featureAdminFor,
      featureReadOnlyFor,
      canManageContent: u.canManageContent || false,
      accessGroupId: u.accessGroupId || null,
    };
  });

  return NextResponse.json({ employees: result });
}

/**
 * PUT /api/users/access
 * Update feature access for a specific employee.
 * Body: { userId: string, featureAccess: string[], accessGroupId?: string | null, featureAdminFor?: string[], featureReadOnlyFor?: string[] }
 * Admin only.
 */
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await req.json();
  const { userId, featureAccess, accessGroupId, featureAdminFor, featureReadOnlyFor } = body;

  if (!userId || !Array.isArray(featureAccess)) {
    return NextResponse.json(
      { message: "userId and featureAccess[] are required" },
      { status: 400 }
    );
  }

  // Ensure "dashboard" is always included
  const accessSet = new Set(featureAccess);
  accessSet.add("dashboard");
  const accessList = Array.from(accessSet);

  const adminArr = Array.isArray(featureAdminFor) ? featureAdminFor : [];
  const readOnlyArr = Array.isArray(featureReadOnlyFor) ? featureReadOnlyFor : [];
  const { featureAdminFor: adminClean, featureReadOnlyFor: roClean } = sanitizeFeatureFlags(
    accessList,
    adminArr,
    readOnlyArr
  );

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        featureAccess: accessList,
        // Sync canManageContent based on whether cms is in featureAccess
        canManageContent: accessSet.has("cms"),
        accessGroupId: accessGroupId ? String(accessGroupId) : null,
        featureAdminFor: adminClean,
        featureReadOnlyFor: roClean,
      },
    },
    { new: true }
  ).select("email name featureAccess canManageContent featureAdminFor featureReadOnlyFor");

  if (!updated) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  // Emit real-time event to the affected employee so their sidebar updates instantly
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit("access-updated", {
      featureAccess: accessList,
      featureAdminFor: adminClean,
      featureReadOnlyFor: roClean,
    });
  }

  // Notify the employee about their updated access
  try {
    await Notification.create({
      user: userId,
      type: "access_updated",
      title: "Your access has been updated",
      message: `Your feature access has been updated. You now have access to: ${Array.from(accessSet).join(", ")}.`,
      link: "/dashboard",
    });
  } catch {
    // Notification errors should not block access update
  }

  return NextResponse.json({ user: updated });
}
