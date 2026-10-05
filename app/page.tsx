import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("kalp_auth_token")?.value;

  if (token) {
    try {
      verifyToken(token);
      redirect("/dashboard");
    } catch {
      // Invalid or expired token
    }
  }

  redirect("/login");
}
