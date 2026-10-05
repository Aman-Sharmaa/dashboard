import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import { Project } from "@/models/Project";
import { ClientDetailClient } from "@/components/client-detail-client";

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

const VALID_ID = /^[a-f0-9]{24}$/i;

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  if (!id || id === "null" || id === "undefined" || !VALID_ID.test(id)) {
    redirect("/dashboard/clients");
  }
  // Employees cannot access client details (personal, company, tax, etc.)
  if (user.role === "employee") {
    redirect("/dashboard/projects");
  }
  await connectDB();

  const [client, projects] = await Promise.all([
    Client.findById(id).lean(),
    Project.find({ client: id }).sort({ startDate: -1, createdAt: -1 }).lean()
  ]);
  if (!client) redirect("/dashboard/clients");

  const serialized = {
    id: String(client._id),
    name: client.name,
    email: client.email,
    phone: client.phone,
    designation: client.designation,
    companyName: client.companyName,
    companyAddress: client.companyAddress,
    companyPhone: client.companyPhone,
    companyWebsite: client.companyWebsite,
    gstin: client.gstin,
    pan: client.pan,
    taxAddress: client.taxAddress,
    notes: client.notes,
    isActive: client.isActive,
    paymentProjectId: (client as any).paymentProjectId ? String((client as any).paymentProjectId) : null,
    paymentType: (client as any).paymentType || "project",
    scheduleType: (client as any).scheduleType || "phases",
    totalBudget: Number((client as any).totalBudget) || 0,
    budgetPhases: Array.isArray((client as any).budgetPhases)
      ? (client as any).budgetPhases.map((p: any) => ({
        name: String(p.name ?? "").trim() || "Phase",
        percentage: Number(p.percentage) || 0,
        amount: Number(p.amount) || 0,
        description: String(p.description ?? "").trim(),
      }))
      : [],
    updatedAt: (client as any).updatedAt,
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-6">
        <h2 className="text-2xl font-bold tracking-tight">{client.companyName}</h2>
        <p className="text-sm text-muted-foreground">{client.name} · {client.email}</p>
      </div>

      <ClientDetailClient
        client={serialized}
        clientId={id}
        isAdmin={user.role === "admin"}
        initialProjects={projects.map(p => ({
          id: String(p._id),
          name: p.name,
          status: p.status,
          startDate: p.startDate ? (p.startDate as Date).toISOString() : undefined,
          endDate: p.endDate ? (p.endDate as Date).toISOString() : undefined,
          isPinned: p.isPinned || false,
          isPinnedToSidebar: p.isPinnedToSidebar || false,
        }))}
      />
    </div>
  );
}
