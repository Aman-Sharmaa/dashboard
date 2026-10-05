import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";

const COOKIE_NAME = "kalp_auth_token";

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  try {
    const project = await Project.findById(id).lean();
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const willBePublic = !(project as any).isPublic;
    let publicSlug = (project as any).publicSlug;

    if (willBePublic && !publicSlug) {
      // Generate a slug from the project name
      const base = toSlug((project as any).name || "project");
      // Check for uniqueness
      let candidate = base;
      let suffix = 1;
      while (await Project.findOne({ publicSlug: candidate, _id: { $ne: id } }).lean()) {
        candidate = `${base}-${suffix++}`;
      }
      publicSlug = candidate;
    }

    const updated = await Project.findByIdAndUpdate(
      id,
      { isPublic: willBePublic, publicSlug: willBePublic ? publicSlug : null },
      { new: true }
    ).lean();

    return NextResponse.json({
      isPublic: (updated as any).isPublic,
      publicSlug: (updated as any).publicSlug,
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message || "Failed to toggle public status" },
      { status: 500 }
    );
  }
}
