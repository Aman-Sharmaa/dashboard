import { normalizeCustomFormFields } from "@/lib/custom-form-fields";

const BG = ["solid", "gradient", "aurora", "mesh"] as const;

export function sanitizeFormCreate(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? "").trim(),
    slug: String(body.slug ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-"),
    description: body.description != null ? String(body.description) : "",
    aboutForm: body.aboutForm != null ? String(body.aboutForm) : "",
    photoUrl: body.photoUrl != null ? String(body.photoUrl) : undefined,
    themeColor: body.themeColor != null ? String(body.themeColor) : "#3f2b4f",
    textColor: body.textColor != null ? String(body.textColor) : "#ffffff",
    backgroundStyle: BG.includes(body.backgroundStyle as any)
      ? body.backgroundStyle
      : "solid",
    isActive: body.isActive !== false,
    fields: normalizeCustomFormFields(body.fields),
  };
}

export function sanitizeFormUpdate(body: Record<string, unknown>) {
  const update: Record<string, unknown> = {};
  const str = (k: string) =>
    body[k] !== undefined && body[k] !== null ? String(body[k]) : undefined;

  if ("name" in body) update.name = str("name")?.trim() ?? "";
  if ("slug" in body)
    update.slug = (str("slug") ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  if ("description" in body) update.description = str("description") ?? "";
  if ("aboutForm" in body) update.aboutForm = str("aboutForm") ?? "";
  if ("photoUrl" in body) update.photoUrl = str("photoUrl");
  if ("themeColor" in body) update.themeColor = str("themeColor");
  if ("textColor" in body) update.textColor = str("textColor");
  if ("backgroundStyle" in body) {
    const v = body.backgroundStyle;
    update.backgroundStyle = BG.includes(v as any) ? v : "solid";
  }
  if ("isActive" in body) update.isActive = Boolean(body.isActive);
  if ("fields" in body) update.fields = normalizeCustomFormFields(body.fields);
  return update;
}
