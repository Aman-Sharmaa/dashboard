import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClientOnboardingLink } from "@/models/ClientOnboardingLink";
import { ClientOnboardingSubmission } from "@/models/ClientOnboardingSubmission";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";

/** Public: submit onboarding form (token in body, no mongoose id) */
export async function POST(req: NextRequest) {
  await connectDB();

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ message: "Invalid link" }, { status: 400 });
  }

  const link = await ClientOnboardingLink.findOne({ token });
  if (!link) {
    return NextResponse.json({ message: "Link not found or expired" }, { status: 404 });
  }
  if (link.isActive === false) {
    return NextResponse.json({ message: "This link has expired or been deactivated" }, { status: 410 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  if (!name || !email || !companyName) {
    return NextResponse.json(
      { message: "Name, email and company name are required" },
      { status: 400 }
    );
  }

  const submission = await ClientOnboardingSubmission.create({
    linkToken: token,
    name,
    email,
    companyName,
    phone: typeof body.phone === "string" ? body.phone.trim() || undefined : undefined,
    designation: typeof body.designation === "string" ? body.designation.trim() || undefined : undefined,
    companyAddress: typeof body.companyAddress === "string" ? body.companyAddress.trim() || undefined : undefined,
    companyPhone: typeof body.companyPhone === "string" ? body.companyPhone.trim() || undefined : undefined,
    companyWebsite: typeof body.companyWebsite === "string" ? body.companyWebsite.trim() || undefined : undefined,
    gstin: typeof body.gstin === "string" ? body.gstin.trim() || undefined : undefined,
    pan: typeof body.pan === "string" ? body.pan.trim() || undefined : undefined,
    notes: typeof body.notes === "string" ? body.notes.trim() || undefined : undefined,
    status: "pending",
  });

  link.isActive = false;
  await link.save();

  // Notify all admin users about the new onboarding submission
  try {
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    if (admins.length > 0) {
      await Notification.create(
        admins.map((admin: any) => ({
          user: admin._id,
          type: "new_onboarding",
          title: "New client onboarding",
          message: `${name} from ${companyName} submitted an onboarding form.`,
          link: "/dashboard/clients",
          data: { submissionId: String(submission._id) },
        }))
      );
    }
  } catch {
    // Notification errors should not block submission
  }

  return NextResponse.json(
    {
      message: "Thank you! Your details have been submitted. We will review and get back to you.",
      submissionId: String(submission._id),
    },
    { status: 201 }
  );
}
