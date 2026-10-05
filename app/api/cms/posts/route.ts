import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CmsPost } from "@/models/CmsPost";
import { CmsCategory } from "@/models/CmsCategory";
import { requireCmsAccess, slugify } from "@/lib/cms-auth";

function estimateReadTime(content: string): number {
  const words = content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const authorId = searchParams.get("authorId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const publicOnly = searchParams.get("public") === "true";

    const query: Record<string, any> = {};
    const search = searchParams.get("search");

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
      ];
    }

    if (publicOnly) {
      query.status = "published";
    } else if (status) {
      query.status = status;
    }

    if (categoryId) {
      if (categoryId.includes(",")) {
        query.categoryId = { $in: categoryId.split(",") };
      } else {
        query.categoryId = categoryId;
      }
    }
    if (authorId) query.authorId = authorId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      CmsPost.find(query)
        .populate("categoryId", "name slug")
        .populate("authorId", "name email")
        .sort(publicOnly ? { publishedAt: -1 } : { updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CmsPost.countDocuments(query),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error("CMS posts GET", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireCmsAccess();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  try {
    await connectDB();
    const body = await req.json();
    const slug = body.slug?.trim() || slugify(body.title || "untitled");
    const existing = await CmsPost.findOne({ slug });
    if (existing) {
      return NextResponse.json({ message: "Post with this slug already exists" }, { status: 400 });
    }
    const content = body.content || "";
    const post = await CmsPost.create({
      title: body.title || "Untitled",
      slug,
      excerpt: body.excerpt,
      content,
      featuredImage: body.featuredImage,
      categoryId: body.categoryId || null,
      metaTitle: body.metaTitle || body.title,
      metaDescription: body.metaDescription || body.excerpt,
      metaKeywords: body.metaKeywords,
      ogImage: body.ogImage || body.featuredImage,
      layout: body.layout || "default",
      status: body.status || "draft",
      authorId: auth.userId,
      publishedAt: body.status === "published" ? new Date() : undefined,
      readTimeMinutes: body.readTimeMinutes ?? estimateReadTime(content),
      password: body.password || undefined,
    });
    if (post.categoryId) {
      await CmsCategory.findByIdAndUpdate(post.categoryId, { $inc: { postCount: 1 } });
    }
    const populated = await CmsPost.findById(post._id).populate("categoryId", "name slug").lean();
    return NextResponse.json({ post: populated }, { status: 201 });
  } catch (e) {
    console.error("CMS posts POST", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
