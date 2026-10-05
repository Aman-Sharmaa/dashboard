import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { PlansPageClient } from "@/components/plans-page-client";

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

export default async function PlansPage() {
  await requireAuth();

  return (
    <div className="w-full">
      <Suspense fallback={<div className="text-muted-foreground text-sm py-10 text-center">Loading documents...</div>}>
        <PlansPageClient />
      </Suspense>
    </div>
  );
}

