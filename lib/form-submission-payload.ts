import type { CustomFormField } from "@/lib/custom-form-fields";
import { legacyFromResponses, normalizeCustomFormFields } from "@/lib/custom-form-fields";

const LEGACY_STRING_KEYS = [
  "name",
  "email",
  "phone",
  "role",
  "linkedin",
  "startupName",
  "startupAbout",
  "startupUrl",
  "investmentStage",
  "ticketSize",
  "portfolioUrl",
  "resumeUrl",
  "experienceYears",
  "preferredRoles",
  "companyName",
  "jobTitle",
] as const;

export type LegacySubmissionStrings = Record<(typeof LEGACY_STRING_KEYS)[number], string>;

export function emptyLegacySubmission(): LegacySubmissionStrings {
  const o = {} as LegacySubmissionStrings;
  for (const k of LEGACY_STRING_KEYS) o[k] = "";
  return o;
}

export function legacyFromBody(body: Record<string, unknown>): LegacySubmissionStrings {
  const base = emptyLegacySubmission();
  for (const k of LEGACY_STRING_KEYS) {
    const v = body[k];
    base[k] = v == null ? "" : String(v).trim();
  }
  return base;
}

export function validateResponses(
  fields: CustomFormField[],
  responses: Record<string, unknown>
): string | null {
  for (const f of fields) {
    if (!f.required) continue;
    const v = responses[f.key];
    if (f.type === "checkboxes") {
      if (!Array.isArray(v) || v.length === 0) return `Missing: ${f.label}`;
    } else if (f.type === "yes_no") {
      if (v !== "yes" && v !== "no") return `Missing: ${f.label}`;
    } else if (String(v ?? "").trim() === "") {
      return `Missing: ${f.label}`;
    }
  }
  return null;
}

export function buildFormSubmissionPayload(
  formFieldsRaw: unknown,
  body: Record<string, unknown>
): { legacy: LegacySubmissionStrings; responses?: Record<string, unknown> } {
  const fields = normalizeCustomFormFields(formFieldsRaw);
  if (fields.length === 0) {
    return { legacy: legacyFromBody(body) };
  }
  const responses =
    body.responses && typeof body.responses === "object" && !Array.isArray(body.responses)
      ? (body.responses as Record<string, unknown>)
      : {};
  const err = validateResponses(fields, responses);
  if (err) throw new Error(err);
  const legacy = { ...emptyLegacySubmission(), ...legacyFromResponses(responses, fields) };
  return { legacy, responses };
}
