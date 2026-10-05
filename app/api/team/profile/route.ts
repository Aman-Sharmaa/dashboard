import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { CmsPost } from "@/models/CmsPost";
import "@/models/User";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ message: "Slug required" }, { status: 400 });
  }

  await connectDB();

  const employee = await Employee.findOne({
    profileSlug: slug,
    isDismissed: { $ne: true },
  }).lean();

  if (!employee) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const posts = await CmsPost.find({
    status: "published",
  })
    .populate("authorId", "name email")
    .populate("categoryId", "name slug")
    .sort({ publishedAt: -1 })
    .lean();

  const authorPosts = posts.filter((p: any) => {
    const author = p.authorId as { name?: string; email?: string } | null;
    return author && (author.email === employee.email);
  });

  const serializedPosts = authorPosts.map((p: any) => ({
    id: String(p._id),
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt || "",
    image: p.featuredImage || "",
    category: p.categoryId ? (p.categoryId as { name: string }).name : "",
    date: p.publishedAt
      ? new Date(p.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "",
    readTime: p.readTimeMinutes ? `${p.readTimeMinutes} min read` : "",
  }));

  return NextResponse.json({
    profile: {
      name: employee.name,
      title: employee.title || "",
      department: employee.department || "",
      location: employee.location || "",
      avatarUrl: employee.avatarUrl || "",
      type: employee.type,
    },
    posts: serializedPosts,
  });
}
