import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Employee } from "@/models/Employee";
import PayslipsPageClient from "./payslips-client";

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

export default async function PayslipsDashboardPage() {
  const user = await requireAuth();
  await connectDB();

  let employeeId: string | null = null;

  // Get employeeId for employees and admins who have an employee profile
  const employee = await Employee.findOne({ email: user.email }).lean();
  if (employee) {
    employeeId = String(employee._id);
  }

  return (
    <PayslipsPageClient
      userRole={user.role}
      employeeId={employeeId}
      userEmail={user.email}
    />
  );
}
