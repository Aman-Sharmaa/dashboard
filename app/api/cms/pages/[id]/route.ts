import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { CmsPage } from "@/models/CmsPage";
import { requireCmsAccess, slugify } from "@/lib/cms-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const page = await CmsPage.findById(id).lean();
    if (!page) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ page });
  } catch (e) {
    console.error("CMS page GET", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCmsAccess();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const page = await CmsPage.findById(id);
    if (!page) return NextResponse.json({ message: "Not found" }, { status: 404 });

    // Ownership check: Admin or Author
    if (auth.role !== "admin" && String(page.authorId) !== auth.userId) {
      return NextResponse.json({ message: "You do not have permission to edit this page." }, { status: 403 });
    }

    if (body.title != null) page.title = body.title;
    if (body.slug != null) page.slug = body.slug.trim() || slugify(page.title);
    if (body.content != null) page.content = body.content;
    if (body.sections != null) page.sections = body.sections;
    if (body.metaTitle != null) page.metaTitle = body.metaTitle;
    if (body.metaDescription != null) page.metaDescription = body.metaDescription;
    if (body.metaKeywords != null) page.metaKeywords = body.metaKeywords;
    if (body.ogImage != null) page.ogImage = body.ogImage;
    if (body.layout != null) page.layout = body.layout;
    if (body.status != null) {
      page.status = body.status;
      if (body.status === "published" && !page.publishedAt) page.publishedAt = new Date();
    }
    await page.save();
    // Bust ISR cache so the live page reflects changes immediately
    try {
      revalidatePath(`/page/${page.slug}`);
      revalidatePath("/", "layout");
    } catch (_) {
      // revalidation is best-effort
    }
    return NextResponse.json({ page: await page.toObject() });
  } catch (e) {
    console.error("CMS page PATCH", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCmsAccess();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  try {
    await connectDB();
    const { id } = await params;
    const page = await CmsPage.findById(id);
    if (!page) return NextResponse.json({ message: "Not found" }, { status: 404 });

    // Ownership check: Admin or Author
    if (auth.role !== "admin" && String(page.authorId) !== auth.userId) {
      return NextResponse.json({ message: "You do not have permission to delete this page." }, { status: 403 });
    }

    await CmsPage.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("CMS page DELETE", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
