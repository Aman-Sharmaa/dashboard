import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CmsPage } from "@/models/CmsPage";
import { requireCmsAccess } from "@/lib/cms-auth";

export async function POST(req: NextRequest) {
  const auth = await requireCmsAccess();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  try {
    const { slug, title } = await req.json();
    if (!slug) return NextResponse.json({ message: "slug required" }, { status: 400 });

    await connectDB();

    // Check if a CMS page for this slug already exists
    const existing = await CmsPage.findOne({ slug });
    if (existing) {
      // Return existing id so we can redirect to its editor
      return NextResponse.json({ page: existing, existing: true });
    }

    // Pre-populate sections with the appropriate Kalp section if matching a known static route
    let initialSections: any[] = [];
    if (slug === "about-us") {
      initialSections = [{ id: "about-1", type: "kalp-about", props: {} }];
    } else if (slug === "gram") {
      initialSections = [{ id: "gram-1", type: "kalp-gram", props: {} }];
    } else if (slug === "sniffurl") {
      initialSections = [{ id: "sniffurl-1", type: "kalp-sniffurl", props: {} }];
    } else if (slug === "rapydlaunch") {
      initialSections = [{ id: "rapydlaunch-1", type: "kalp-rapydlaunch", props: {} }];
    }

    // Create a CMS page for this slug so the builder can take over
    const page = await CmsPage.create({
      title: title || slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      slug,
      content: "",
      sections: initialSections,
      status: "published",
      authorId: auth.userId,
      publishedAt: new Date(),
    });

    return NextResponse.json({ page: await page.toObject() }, { status: 201 });
  } catch (e) {
    console.error("static convert", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
