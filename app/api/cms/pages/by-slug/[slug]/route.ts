import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CmsPage } from "@/models/CmsPage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const page = await CmsPage.findOne({ slug, status: "published" }).lean();
    if (!page) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ page });
  } catch (e) {
    console.error("CMS page by-slug GET", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
