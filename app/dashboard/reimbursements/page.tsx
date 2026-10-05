import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { EmployeeReimbursementSection } from "@/components/employee-reimbursement-section";

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

export default async function ReimbursementsDashboardPage() {
  const user = await requireAuth();
  await connectDB();

  const employee = await Employee.findOne({ email: user.email }).lean();
  if (!employee) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Reimbursement</h1>
        <p className="text-muted-foreground">
          Employee profile not found. Please contact your administrator.
        </p>
      </div>
    );
  }

  const employeeId = String(employee._id);
  const dateOfHiring = employee.dateOfHiring
    ? new Date(employee.dateOfHiring).toISOString().slice(0, 10)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reimbursement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit and track your reimbursement claims.
        </p>
      </div>
      <EmployeeReimbursementSection
        employeeId={employeeId}
        isAdmin={user.role === "admin"}
        dateOfHiring={dateOfHiring}
      />
    </div>
  );
}
