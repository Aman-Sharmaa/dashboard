import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CmsPage } from "@/models/CmsPage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    await CmsPage.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
