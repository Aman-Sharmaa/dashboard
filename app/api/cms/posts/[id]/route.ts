import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CmsPost } from "@/models/CmsPost";
import { CmsCategory } from "@/models/CmsCategory";
import { requireCmsAccess, slugify } from "@/lib/cms-auth";

function estimateReadTime(content: string): number {
  const words = content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const post = await CmsPost.findById(id).populate("categoryId", "name slug").lean();
    if (!post) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ post });
  } catch (e) {
    console.error("CMS post GET", e);
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
    const post = await CmsPost.findById(id);
    if (!post) return NextResponse.json({ message: "Not found" }, { status: 404 });

    if (auth.role !== "admin" && String(post.authorId) !== auth.userId) {
      return NextResponse.json({ message: "Forbidden: Not the owner" }, { status: 403 });
    }

    const oldCategoryId = post.categoryId ? String(post.categoryId) : null;
    const newCategoryId = body.categoryId ? String(body.categoryId) : null;
    if (body.title != null) post.title = body.title;
    if (body.slug != null) post.slug = body.slug.trim() || slugify(post.title);
    if (body.excerpt != null) post.excerpt = body.excerpt;
    if (body.content != null) {
      post.content = body.content;
      post.readTimeMinutes = estimateReadTime(body.content);
    }
    if (body.featuredImage != null) post.featuredImage = body.featuredImage;
    if (body.categoryId != null) post.categoryId = body.categoryId || undefined;
    if (body.metaTitle != null) post.metaTitle = body.metaTitle;
    if (body.metaDescription != null) post.metaDescription = body.metaDescription;
    if (body.metaKeywords != null) post.metaKeywords = body.metaKeywords;
    if (body.ogImage != null) post.ogImage = body.ogImage;
    if (body.layout != null) post.layout = body.layout;
    if (body.status != null) {
      post.status = body.status;
      if (body.status === "published" && !post.publishedAt) post.publishedAt = new Date();
    }
    if (body.password !== undefined) post.password = body.password || undefined;
    await post.save();
    if (oldCategoryId !== newCategoryId) {
      if (oldCategoryId) await CmsCategory.findByIdAndUpdate(oldCategoryId, { $inc: { postCount: -1 } });
      if (newCategoryId) await CmsCategory.findByIdAndUpdate(newCategoryId, { $inc: { postCount: 1 } });
    }
    const populated = await CmsPost.findById(post._id).populate("categoryId", "name slug").lean();
    return NextResponse.json({ post: populated });
  } catch (e) {
    console.error("CMS post PATCH", e);
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
    const post = await CmsPost.findById(id);
    if (!post) return NextResponse.json({ message: "Not found" }, { status: 404 });

    if (auth.role !== "admin" && String(post.authorId) !== auth.userId) {
      return NextResponse.json({ message: "Forbidden: Not the owner" }, { status: 403 });
    }

    if (post.categoryId) {
      await CmsCategory.findByIdAndUpdate(post.categoryId, { $inc: { postCount: -1 } });
    }
    await CmsPost.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("CMS post DELETE", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
