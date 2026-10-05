import { Employee } from "@/models/Employee";

function fallbackNameFromEmail(email: string) {
  const local = email.split("@")[0] || "User";
  return local
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function ensureEmployeeByEmail(email: string, preferredName?: string) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  const existing = await Employee.findOne({ email: normalizedEmail }).select("_id name email").lean();
  if (existing) return existing as { _id: unknown; name?: string; email: string };

  const created = await Employee.create({
    name: (preferredName || "").trim() || fallbackNameFromEmail(normalizedEmail),
    email: normalizedEmail,
    type: "Employee",
    role: "employee",
    isDismissed: false,
  });

  return { _id: created._id, name: created.name, email: created.email };
}
