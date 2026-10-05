import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { SettingsEmployeeView } from "@/components/settings-employee-view";
import type { EmployeeDetails } from "@/components/settings-employee-view";
import { SettingsOrgClient } from "@/components/settings-org-client";

const COOKIE_NAME = "kalp_auth_token";

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login");
  try {
    return verifyToken(token);
  } catch {
    redirect("/login");
  }
}

export default async function SettingsPage() {
  const user = await requireAuth();

  if (user.role === "employee") {
    await connectDB();
    const employee = await Employee.findOne({ email: user.email }).lean();
    if (!employee) {
      return (
        <div className="rounded-lg border border-muted bg-muted/30 p-8 text-center text-muted-foreground">
          <p className="font-medium">Profile not found</p>
          <p className="text-sm mt-1">Your employee record could not be loaded. Contact your administrator.</p>
        </div>
      );
    }
    const details: EmployeeDetails = {
      name: (employee as any).name,
      email: (employee as any).email,
      title: (employee as any).title,
      department: (employee as any).department,
      type: (employee as any).type,
      location: (employee as any).location,
      phoneNumber: (employee as any).otherInfo?.phoneNumber,
      dateOfHiring: (employee as any).dateOfHiring
        ? new Date((employee as any).dateOfHiring).toISOString().slice(0, 10)
        : undefined,
      employeeId: (employee as any).employeeId,
    };
    return <SettingsEmployeeView employee={details} />;
  }

  return <SettingsOrgClient />;
}
