import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TeamMemberOnboardingLink } from "@/models/TeamMemberOnboardingLink";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const token = (await params).token?.trim();
  if (!token) return NextResponse.json({ message: "Invalid link" }, { status: 400 });

  await connectDB();
  const link = await TeamMemberOnboardingLink.findOne({ token }).lean();
  if (!link) return NextResponse.json({ message: "Link not found or expired" }, { status: 404 });
  if ((link as any).isActive === false) return NextResponse.json({ message: "Link has expired or been deactivated" }, { status: 410 });

  return NextResponse.json({ valid: true });
}
