import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const { workers } = body;

  if (!Array.isArray(workers)) {
    return NextResponse.json({ message: "Invalid payload format. Expected 'workers' array." }, { status: 400 });
  }

  let importedCount = 0;
  let skippedCount = 0;

  for (const worker of workers) {
    // Expected format: id, name, photo, role, "joining date", manager
    const id = worker.id || worker._id || Math.random().toString(36).substring(7);
    const name = worker.name;
    const email = worker.email || `gigworker-${id}@Webwrite`.toLowerCase();
    const photo = worker.photo || worker.avatarUrl;
    const role = worker.role;
    const joiningDate = worker["joining date"] || worker.joiningDate;
    const manager = worker.manager;

    if (!name) {
      skippedCount++;
      continue;
    }

    try {
      // Upsert by email
      const existing = await Employee.findOne({ email });
      if (existing) {
        existing.type = "Gig Worker";
        existing.name = name;
        if (photo) existing.avatarUrl = photo;
        if (role) existing.title = role;
        if (manager) existing.manager = manager;
        if (joiningDate) existing.dateOfHiring = new Date(joiningDate);
        await existing.save();
      } else {
        await Employee.create({
          type: "Gig Worker",
          name,
          email,
          avatarUrl: photo,
          title: role,
          manager,
          dateOfHiring: joiningDate ? new Date(joiningDate) : undefined,
        });
      }
      importedCount++;
    } catch (e) {
      console.error("Error importing gig worker:", e);
      skippedCount++;
    }
  }

  return NextResponse.json(
    { message: `Imported ${importedCount} gig workers. Skipped ${skippedCount}.` },
    { status: 200 }
  );
}
