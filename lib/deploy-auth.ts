import { requireAdminOrFeatureAdmin } from "@/lib/route-auth";
import type { JWTPayload } from "@/lib/auth";

const DEPLOYMENTS_FEATURE = "deployments";

/** Global admin or employee with Deployments feature admin (full manage + see all). */
export async function requireDeploymentsAdmin(): Promise<JWTPayload | null> {
  return requireAdminOrFeatureAdmin(DEPLOYMENTS_FEATURE);
}
