import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TeamMemberOnboardingLink } from "@/models/TeamMemberOnboardingLink";
import { TeamMemberOnboardingSubmission } from "@/models/TeamMemberOnboardingSubmission";

export async function POST(req: NextRequest) {
  await connectDB();

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ message: "Invalid link" }, { status: 400 });
  }

  const link = await TeamMemberOnboardingLink.findOne({ token });
  if (!link) {
    return NextResponse.json({ message: "Link not found or expired" }, { status: 404 });
  }
  if (link.isActive === false) {
    return NextResponse.json({ message: "This link has expired or been deactivated" }, { status: 410 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!name || !email) {
    return NextResponse.json(
      { message: "Name and email are required" },
      { status: 400 }
    );
  }

  const submission = await TeamMemberOnboardingSubmission.create({
    linkToken: token,
    name,
    email,
    phone: typeof body.phone === "string" ? body.phone.trim() || undefined : undefined,
    title: typeof body.title === "string" ? body.title.trim() || undefined : undefined,
    type: ["Intern", "Employee", "Part-Time", "Contract"].includes(body.type) ? body.type : "Employee",
    status: "pending",
  });

  link.isActive = false;
  await link.save();

  return NextResponse.json(
    {
      message: "Thank you! Your details have been submitted. We will review and get back to you.",
      submissionId: String(submission._id),
    },
    { status: 201 }
  );
}
