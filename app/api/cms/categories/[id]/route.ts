import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CmsCategory } from "@/models/CmsCategory";
import { requireCmsAccess, slugify } from "@/lib/cms-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const category = await CmsCategory.findById(id).lean();
    if (!category) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ category });
  } catch (e) {
    console.error("CMS category GET", e);
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
    const category = await CmsCategory.findById(id);
    if (!category) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (body.name != null) category.name = body.name;
    if (body.slug != null) category.slug = body.slug.trim() || slugify(category.name);
    if (body.description != null) category.description = body.description;
    await category.save();
    return NextResponse.json({ category: await category.toObject() });
  } catch (e) {
    console.error("CMS category PATCH", e);
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
    const category = await CmsCategory.findByIdAndDelete(id);
    if (!category) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("CMS category DELETE", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
