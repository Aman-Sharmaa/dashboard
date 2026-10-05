import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CmsPage } from "@/models/CmsPage";
import { requireCmsAccess, slugify } from "@/lib/cms-auth";
import path from "path";
import fs from "fs";

// Static page directories in app/ that represent public pages
const SKIP_DIRS = new Set([
  "api", "dashboard", "login", "onboarding", "drive",
  "invoices", "proposals", "status",
  "terminal", "form", "post", "page", "view-page", "view-plan",
  "blogs", "category",
]);

function getStaticPages(): { slug: string; title: string }[] {
  const appDir = path.join(process.cwd(), "app");
  const entries = fs.readdirSync(appDir, { withFileTypes: true });
  const result: { slug: string; title: string }[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (SKIP_DIRS.has(name) || name.startsWith(".") || name.startsWith("[") || name.startsWith("_")) continue;
    // Only include if it has a page.tsx (is a real route)
    const pagePath = path.join(appDir, name, "page.tsx");
    if (!fs.existsSync(pagePath)) continue;
    const title = name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    result.push({ slug: name, title });
  }
  return result;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const authorId = searchParams.get("authorId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (authorId) query.authorId = authorId;

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    if (startDate || endDate) {
      const dateQuery: Record<string, unknown> = {};
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);
      query.updatedAt = dateQuery;
    }

    const cmsPages = await CmsPage.find(query)
      .populate("authorId", "name email")
      .sort({ updatedAt: -1 })
      .lean();

    // Build a set of slugs already managed by CMS
    const cmsSlugs = new Set(cmsPages.map((p: any) => p.slug));

    // Get static pages that are NOT yet converted to CMS pages
    const staticPages = getStaticPages()
      .filter((p) => !cmsSlugs.has(p.slug))
      .filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()))
      .map((p) => ({
        _id: `static:${p.slug}`,
        title: p.title,
        slug: p.slug,
        status: "static",
        source: "static",
        authorId: null,
        updatedAt: new Date().toISOString(),
      }));

    return NextResponse.json({ pages: [...cmsPages, ...staticPages] });
  } catch (e) {
    console.error("CMS pages GET", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  const auth = await requireCmsAccess();
  if (!auth) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  try {
    await connectDB();
    const body = await req.json();
    const slug = body.slug?.trim() || slugify(body.title || "untitled");
    const existing = await CmsPage.findOne({ slug });
    if (existing) {
      return NextResponse.json({ message: "Page with this slug already exists" }, { status: 400 });
    }
    const page = await CmsPage.create({
      title: body.title || "Untitled",
      slug,
      content: body.content || "",
      sections: body.sections || [],
      metaTitle: body.metaTitle || body.title,
      metaDescription: body.metaDescription,
      metaKeywords: body.metaKeywords,
      ogImage: body.ogImage,
      layout: body.layout || "default",
      status: body.status || "published",
      authorId: auth.userId,
      publishedAt: body.status === "published" ? new Date() : undefined,
    });
    return NextResponse.json({ page: await page.toObject() }, { status: 201 });
  } catch (e) {
    console.error("CMS pages POST", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
