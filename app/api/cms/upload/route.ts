import { NextRequest, NextResponse } from "next/server";
import { requireCmsAccess } from "@/lib/cms-auth";
import { uploadCmsImage } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const auth = await requireCmsAccess();
  if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }
    const url = await uploadCmsImage(file);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("CMS upload", e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
