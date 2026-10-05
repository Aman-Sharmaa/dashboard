import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CmsPost } from "@/models/CmsPost";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const post = await CmsPost.findOne({ slug, status: "published" })
      .populate("categoryId", "name slug")
      .lean();
    if (!post) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ post });
  } catch (e) {
    console.error("CMS post by-slug GET", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
