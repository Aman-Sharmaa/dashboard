import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { AttendancePageClient } from "@/components/attendance-page-client";

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

export default async function AttendanceDashboardPage() {
  const user = await requireAuth();
  await connectDB();

  let employeeId: string | null = null;

  // Both employees and admins get their own employeeId if they have a profile (admin is also an employee for attendance)
  const employee = await Employee.findOne({ email: user.email }).lean();
  if (employee) {
    employeeId = String(employee._id);
  }

  return (
    <AttendancePageClient
      userRole={user.role}
      employeeId={employeeId}
      userEmail={user.email}
    />
  );
}

