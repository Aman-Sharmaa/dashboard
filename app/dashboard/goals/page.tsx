import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { GoalsDashboardClient } from "@/components/goals-dashboard-client";

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

export default async function GoalsPage() {
  const user = await requireAuth();

  return <GoalsDashboardClient userRole={user.role as "admin" | "employee"} />;
}
