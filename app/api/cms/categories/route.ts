import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CmsCategory } from "@/models/CmsCategory";
import { CmsPost } from "@/models/CmsPost";
import { requireCmsAccess, slugify } from "@/lib/cms-auth";

export async function GET() {
  try {
    await connectDB();
    const categories = await CmsCategory.find().sort({ name: 1 }).lean();
    // Attach post counts
    const postCounts = await CmsPost.aggregate([
      { $match: { status: "published", categoryId: { $ne: null } } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(postCounts.map((c) => [String(c._id), c.count]));
    const withCounts = categories.map((c) => ({
      ...c,
      postCount: countMap[String(c._id)] ?? 0,
    }));
    return NextResponse.json({ categories: withCounts });
  } catch (e) {
    console.error("CMS categories GET", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireCmsAccess();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  try {
    await connectDB();
    const body = await req.json();
    const slug = body.slug?.trim() || slugify(body.name || "untitled");
    const existing = await CmsCategory.findOne({ slug });
    if (existing) {
      return NextResponse.json({ message: "Category with this slug already exists" }, { status: 400 });
    }
    const category = await CmsCategory.create({
      name: body.name || "Untitled",
      slug,
      description: body.description,
    });
    return NextResponse.json({ category: await category.toObject() }, { status: 201 });
  } catch (e) {
    console.error("CMS categories POST", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
