import { NextRequest, NextResponse } from "next/server";
import { requireCmsAccess } from "@/lib/cms-auth";
import path from "path";
import fs from "fs";

// System directories that must never be deleted
const PROTECTED = new Set([
  "api", "dashboard", "login", "onboarding", "drive", "gram",
  "invoices", "proposals", "rapydlaunch", "sniffurl", "status",
  "terminal", "form", "post", "page", "view-page", "view-plan",
  "blogs", "category", "llms.txt", "ai-product-keywords.txt",
]);

export async function DELETE(req: NextRequest) {
  const auth = await requireCmsAccess();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  try {
    const { slug } = await req.json();
    if (!slug) return NextResponse.json({ message: "slug required" }, { status: 400 });

    if (PROTECTED.has(slug)) {
      return NextResponse.json({ message: "This page is protected and cannot be deleted." }, { status: 403 });
    }

    const appDir = path.join(process.cwd(), "app");
    const targetDir = path.join(appDir, slug);

    // Security: ensure target is actually inside app/
    if (!targetDir.startsWith(appDir + path.sep)) {
      return NextResponse.json({ message: "Invalid path" }, { status: 400 });
    }

    if (!fs.existsSync(targetDir)) {
      return NextResponse.json({ message: "Directory not found" }, { status: 404 });
    }

    fs.rmSync(targetDir, { recursive: true, force: true });
    return NextResponse.json({ message: "Deleted" });
  } catch (e) {
    console.error("static delete", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
