import { requireFeatureAccess } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import { Employee } from "@/models/Employee";
import { NewProjectFromSidebar } from "@/components/new-project-from-sidebar";

export default async function NewProjectPage() {
  await requireFeatureAccess("projects");
  await connectDB();

  const [clients, employees] = await Promise.all([
    Client.find().sort({ companyName: 1 }).select("companyName name").lean(),
    Employee.find({ isDismissed: { $ne: true } }).select("name email").lean(),
  ]);

  const clientsData = clients.map((c) => ({
    id: String(c._id),
    companyName: (c as any).companyName ?? "",
    name: (c as any).name ?? "",
  }));
  const employeesData = employees.map((e) => ({
    id: String(e._id),
    name: (e as any).name ?? "",
    email: (e as any).email ?? "",
  }));

  return (
    <div className="space-y-8">
      <div className="border-b pb-8">
        <h2 className="text-2xl font-bold tracking-tight">Create project</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a client and fill in project details. Assign team members from the dropdown (multi-select, no select all).
        </p>
      </div>
      <NewProjectFromSidebar clients={clientsData} employees={employeesData} />
    </div>
  );
}
