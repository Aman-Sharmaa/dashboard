/** Supported field types (Google Forms–style). */
export const CUSTOM_FORM_FIELD_TYPES = [
  "short_text",
  "paragraph",
  "email",
  "phone",
  "number",
  "url",
  "dropdown",
  "checkboxes",
  "date",
  "yes_no",
] as const;

export type CustomFormFieldType = (typeof CUSTOM_FORM_FIELD_TYPES)[number];

export type CustomFormField = {
  id: string;
  /** Stable key stored in submission `responses` */
  key: string;
  label: string;
  type: CustomFormFieldType;
  required: boolean;
  placeholder?: string;
  /** One entry per line for dropdown / checkboxes */
  options: string[];
  order: number;
};

export function newFieldId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function slugifyKey(label: string, existing: Set<string>): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48) || "field";
  let key = base;
  let n = 0;
  while (existing.has(key)) {
    n += 1;
    key = `${base}_${n}`;
  }
  existing.add(key);
  return key;
}

export function parseOptionsFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function optionsToText(options: string[]): string {
  return (options || []).join("\n");
}

export function normalizeCustomFormFields(raw: unknown): CustomFormField[] {
  if (!Array.isArray(raw)) return [];
  const seenKeys = new Set<string>();
  const out: CustomFormField[] = [];
  let auto = 0;
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const type = String(r.type || "short_text") as CustomFormFieldType;
    if (!CUSTOM_FORM_FIELD_TYPES.includes(type)) continue;
    const label = String(r.label || "Untitled").trim().slice(0, 200);
    let key = String(r.key || "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 64);
    if (!key) key = slugifyKey(label, seenKeys);
    while (seenKeys.has(key)) {
      auto += 1;
      key = `field_${auto}`;
    }
    seenKeys.add(key);
    const options = Array.isArray(r.options)
      ? r.options.map((x) => String(x).trim()).filter(Boolean).slice(0, 100)
      : parseOptionsFromText(String(r.optionsText || ""));
    const order = typeof r.order === "number" && Number.isFinite(r.order) ? Number(r.order) : out.length;
    out.push({
      id: String(r.id || newFieldId()),
      key,
      label,
      type,
      required: Boolean(r.required),
      placeholder: r.placeholder != null ? String(r.placeholder).slice(0, 200) : undefined,
      options: type === "dropdown" || type === "checkboxes" ? options : [],
      order,
    });
  }
  return out.sort((a, b) => a.order - b.order);
}

/** Sensible defaults when creating a new form or event registration. */
export function defaultCustomFormFields(): CustomFormField[] {
  const mk = (
    key: string,
    label: string,
    type: CustomFormFieldType,
    required: boolean,
    order: number,
    options: string[] = []
  ): CustomFormField => ({
    id: newFieldId(),
    key,
    label,
    type,
    required,
    options,
    order,
  });
  return [
    mk("name", "Full name", "short_text", true, 0),
    mk("email", "Email", "email", true, 1),
    mk("phone", "Phone", "phone", false, 2),
    mk("role", "How would you describe yourself?", "dropdown", true, 3, [
      "Founder",
      "Investor",
      "Student",
      "Job Seeker",
      "Working Professional",
      "Other",
    ]),
    mk("notes", "Anything else we should know?", "paragraph", false, 4),
  ];
}

export function emptyResponsesForFields(
  fields: CustomFormField[]
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const f of fields) {
    out[f.key] = f.type === "checkboxes" ? [] : "";
  }
  return out;
}

/** Pull legacy flat fields from dynamic responses for DB compatibility. */
export function legacyFromResponses(
  responses: Record<string, unknown>,
  fields: CustomFormField[]
): {
  name: string;
  email: string;
  phone: string;
  role: string;
} {
  const get = (k: string) => {
    const v = responses[k];
    if (v == null) return "";
    if (Array.isArray(v)) return v.join(", ");
    return String(v).trim();
  };
  const fieldByKey = new Map(fields.map((f) => [f.key, f]));
  const findByType = (t: CustomFormFieldType) =>
    fields.find((f) => f.type === t)?.key;

  const nameKey = fieldByKey.has("name") ? "name" : findByType("short_text");
  const emailKey = fieldByKey.has("email") ? "email" : findByType("email");
  const phoneKey = fieldByKey.has("phone") ? "phone" : findByType("phone");
  const roleKey = fieldByKey.has("role") ? "role" : fields.find((f) => f.type === "dropdown")?.key;

  return {
    name: (nameKey && get(nameKey)) || get("name") || "Anonymous",
    email: (emailKey && get(emailKey)) || get("email") || "unknown@example.invalid",
    phone: (phoneKey && get(phoneKey)) || get("phone") || "~",
    role: (roleKey && get(roleKey)) || get("role") || "Other",
  };
}
