import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import { ClientsPageTabs } from "@/components/clients-page-tabs";

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

export default async function ClientsPage() {
  const user = await requireAuth();
  await connectDB();

  const clients = await Client.find().sort({ isActive: -1, companyName: 1 }).lean();

  const serialized = clients.map((c) => ({
    id: String(c._id),
    name: (c as any).name,
    email: (c as any).email,
    companyName: (c as any).companyName,
    phone: (c as any).phone,
    isActive: (c as any).isActive,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b pb-6 sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 pt-4 lg:-mx-6 lg:px-6 lg:pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage clients. View details, projects, and payments.
          </p>
        </div>
      </div>

      <ClientsPageTabs
        clients={serialized}
        isAdmin={user.role === "admin"}
      />
    </div>
  );
}
