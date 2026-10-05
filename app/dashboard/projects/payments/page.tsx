import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { ProjectsPaymentsClient } from "@/components/projects-payments-client";

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

export default async function ProjectsPaymentsPage() {
  const user = await requireAuth();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b pb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Project payments (separate schema), monthly breakdown, and bills.
          </p>
        </div>
      </div>
      <ProjectsPaymentsClient isAdmin={user.role === "admin"} />
    </div>
  );
}
