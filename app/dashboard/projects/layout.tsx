import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

export default async function ProjectsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login");
  try {
    verifyToken(token);
  } catch {
    redirect("/login");
  }
  return <>{children}</>;
}
