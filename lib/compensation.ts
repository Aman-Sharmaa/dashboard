/** How compensation is structured in the hiring contract */
export type CompensationContractType = "monthly" | "one_time" | "phases";

export type CompensationPhase = {
  id: string;
  label: string;
  amount?: number;
  /** ISO date yyyy-mm-dd */
  dueDate?: string;
  sortOrder: number;
  notes?: string;
};

export type CompensationPaymentCategory =
  | "monthly_salary"
  | "bonus"
  | "phase_milestone"
  | "signing"
  | "other";

export type CompensationPayment = {
  id: string;
  /** ISO date yyyy-mm-dd */
  paidOn: string;
  amount: number;
  category: CompensationPaymentCategory;
  notes?: string;
  /** Links to CompensationPhase.id when applicable */
  phaseId?: string;
};

export const COMPENSATION_CONTRACT_LABELS: Record<CompensationContractType, string> = {
  monthly: "Monthly (annual CTC)",
  one_time: "One-time (lump sum)",
  phases: "Phased / milestones",
};

export const COMPENSATION_PAYMENT_CATEGORY_LABELS: Record<CompensationPaymentCategory, string> = {
  monthly_salary: "Monthly salary",
  bonus: "Bonus",
  phase_milestone: "Phase / milestone",
  signing: "Signing / joining",
  other: "Other",
};

export function newCompensationId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function safeCat(v: string): CompensationPaymentCategory {
  const allowed: CompensationPaymentCategory[] = [
    "monthly_salary",
    "bonus",
    "phase_milestone",
    "signing",
    "other",
  ];
  return (allowed.includes(v as CompensationPaymentCategory) ? v : "other") as CompensationPaymentCategory;
}

export function normalizeCompensationPhases(raw: unknown): CompensationPhase[] {
  if (!Array.isArray(raw)) return [];
  const out: CompensationPhase[] = [];
  let i = 0;
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const label = String(r.label || `Phase ${i + 1}`).trim().slice(0, 200);
    const amountRaw = r.amount;
    const amount =
      amountRaw === "" || amountRaw === undefined || amountRaw === null
        ? undefined
        : Number(amountRaw);
    out.push({
      id: String(r.id || newCompensationId()),
      label,
      amount: Number.isFinite(amount) ? amount : undefined,
      dueDate: r.dueDate != null ? String(r.dueDate).slice(0, 10) : undefined,
      sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : i,
      notes: r.notes != null ? String(r.notes).slice(0, 500) : undefined,
    });
    i += 1;
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function normalizeCompensationPaymentHistory(raw: unknown): CompensationPayment[] {
  if (!Array.isArray(raw)) return [];
  const out: CompensationPayment[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const amount = Number(r.amount);
    if (!Number.isFinite(amount) || amount < 0) continue;
    const paidOn = r.paidOn != null ? String(r.paidOn).slice(0, 10) : "";
    if (!paidOn) continue;
    out.push({
      id: String(r.id || newCompensationId()),
      paidOn,
      amount,
      category: safeCat(String(r.category || "other")),
      notes: r.notes != null ? String(r.notes).slice(0, 500) : undefined,
      phaseId: r.phaseId != null ? String(r.phaseId).slice(0, 64) : undefined,
    });
  }
  return out.sort((a, b) => (a.paidOn < b.paidOn ? 1 : a.paidOn > b.paidOn ? -1 : 0));
}

export function normalizeContractType(raw: unknown): CompensationContractType {
  if (raw === "one_time" || raw === "phases" || raw === "monthly") return raw;
  return "monthly";
}
