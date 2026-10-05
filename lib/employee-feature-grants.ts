import type { UserRole } from "@/lib/auth";
import { DEFAULT_EMPLOYEE_FEATURES, ALL_FEATURES } from "@/lib/features";

export type EmployeeFeatureGrants = {
  featureAccess: string[];
  featureAdminFor: string[];
  featureReadOnlyFor: string[];
};

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((x) => String(x || "").trim()).filter(Boolean))];
}

/** Effective feature list for an employee (defaults when unset). */
export function effectiveFeatureAccess(raw: string[] | undefined | null): string[] {
  const fa = normalizeStringArray(raw);
  const base = fa.length > 0 ? fa : [...DEFAULT_EMPLOYEE_FEATURES];
  
  // Ensure always-on features are included
  const alwaysOnKeys = ALL_FEATURES.filter((f) => f.alwaysOn).map((f) => f.key);
  return [...new Set([...base, ...alwaysOnKeys])];
}

/**
 * Prune admin/read-only flags to granted features only; resolve conflicts (admin wins).
 */
export function sanitizeFeatureFlags(
  featureAccess: string[],
  featureAdminFor: string[],
  featureReadOnlyFor: string[]
): { featureAdminFor: string[]; featureReadOnlyFor: string[] } {
  const granted = new Set(featureAccess);
  const admin = normalizeStringArray(featureAdminFor).filter((k) => granted.has(k));
  const adminSet = new Set(admin);
  const readOnly = normalizeStringArray(featureReadOnlyFor).filter(
    (k) => granted.has(k) && !adminSet.has(k)
  );
  return { featureAdminFor: admin, featureReadOnlyFor: readOnly };
}

export function grantsFromUserDoc(doc: {
  featureAccess?: string[];
  featureAdminFor?: string[];
  featureReadOnlyFor?: string[];
} | null): EmployeeFeatureGrants {
  const featureAccess = effectiveFeatureAccess(doc?.featureAccess);
  const rawAdmin = normalizeStringArray(doc?.featureAdminFor);
  const rawRo = normalizeStringArray(doc?.featureReadOnlyFor);
  const { featureAdminFor, featureReadOnlyFor } = sanitizeFeatureFlags(
    featureAccess,
    rawAdmin,
    rawRo
  );
  return { featureAccess, featureAdminFor, featureReadOnlyFor };
}

export function isGlobalAdmin(role: UserRole): boolean {
  return role === "admin";
}

export function employeeHasFeatureAdmin(
  role: UserRole,
  grants: EmployeeFeatureGrants,
  featureKey: string
): boolean {
  if (role === "admin") return true;
  if (role !== "employee") return false;
  return grants.featureAccess.includes(featureKey) && grants.featureAdminFor.includes(featureKey);
}

export function employeeFeatureIsReadOnly(
  role: UserRole,
  grants: EmployeeFeatureGrants,
  featureKey: string
): boolean {
  if (role === "admin") return false;
  if (role !== "employee") return true;
  if (!grants.featureAccess.includes(featureKey)) return true;
  if (grants.featureAdminFor.includes(featureKey)) return false;
  return grants.featureReadOnlyFor.includes(featureKey);
}
