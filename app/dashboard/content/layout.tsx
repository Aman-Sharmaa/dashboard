import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

async function requireContentAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login");
  try {
    const payload = verifyToken(token);
    return payload;
  } catch {
    redirect("/login");
  }
}

export default async function ContentLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireContentAccess();
  return <>{children}</>;
}
