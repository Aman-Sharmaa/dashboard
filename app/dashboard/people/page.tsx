import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { AddEmployeeDialog } from "@/components/add-employee-dialog";
import { PeoplePageTabs } from "@/components/people-page-tabs";

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

export default async function PeoplePage() {
  const user = await requireAuth();
  await connectDB();

  // Fetch ALL employees (active + dismissed) in one go ~ tabs switch client-side
  const employees = await Employee.find({}).lean();

  const serialized = employees
    .map((emp) => ({
      _id: String(emp._id),
      name: emp.name,
      email: emp.email,
      title: emp.title,
      department: emp.department,
      manager: emp.manager,
      location: emp.location,
      type: emp.type,
      employeeId: emp.employeeId,
      phone: (emp as any).otherInfo?.phoneNumber,
      dateOfHiring: emp.dateOfHiring ? new Date(emp.dateOfHiring).toISOString() : null,
      isDismissed: emp.isDismissed ?? false,
      avatarUrl: emp.avatarUrl,
      assignedProduct: emp.assignedProduct,
      assignedService: emp.assignedService,
    }))
    .sort((a, b) => {
      const idA = a.employeeId ?? 999999;
      const idB = b.employeeId ?? 999999;
      return idA - idB;
    });

  const activeCount = serialized.filter((e) => !e.isDismissed).length;
  const pastCount = serialized.filter((e) => e.isDismissed).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b pb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Members</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {user.role === "admin"
              ? "Manage your organization's human capital and access controls."
              : "View your team members and their details."}
          </p>
        </div>
        {user.role === "admin" && (
          <div className="flex items-center gap-3 sm:ml-auto">
            <Button variant="outline" size="sm" className="rounded-xl px-4 h-10 border-muted-foreground/20 hover:bg-muted/50">
              Export CSV
            </Button>
            <AddEmployeeDialog />
          </div>
        )}
      </div>

      <PeoplePageTabs
        employees={serialized}
        isAdmin={user.role === "admin"}
        activeCount={activeCount}
        pastCount={pastCount}
      />
    </div>
  );
}

// inline Button import so page.tsx compiles standalone
import { Button } from "@/components/ui/button";
