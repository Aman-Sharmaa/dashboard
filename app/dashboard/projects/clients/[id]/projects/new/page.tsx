import { redirect } from "next/navigation";
import { requireFeatureAccess } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import { Employee } from "@/models/Employee";
import { NewProjectClient } from "@/components/new-project-client";

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireFeatureAccess("projects");
  await connectDB();

  const { id } = await params;
  const client = await Client.findById(id).lean();
  if (!client) redirect("/dashboard/projects");

  const employees = await Employee.find().sort({ name: 1 }).select("name email").lean();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">New project</h2>
      <p className="text-muted-foreground">Client: {client.companyName}</p>
      <NewProjectClient
        clientId={id}
        employees={employees.map((e) => ({ id: String(e._id), name: e.name, email: e.email }))}
      />
    </div>
  );
}
