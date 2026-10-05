import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Employee } from "@/models/Employee";
import { TeamMemberOnboardingSubmission } from "@/models/TeamMemberOnboardingSubmission";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

async function requireAdmin() {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const submission = await TeamMemberOnboardingSubmission.findById(id);
  if (!submission) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = body.action; // "approve" | "reject"

  if (action === "approve") {
    if (submission.status !== "pending") {
      return NextResponse.json(
        { message: "Only pending submissions can be approved" },
        { status: 400 }
      );
    }
    const existing = await Employee.findOne({ email: submission.email }).lean();
    if (existing) {
      return NextResponse.json(
        { message: "An employee with this email already exists" },
        { status: 400 }
      );
    }
    const employee = await Employee.create({
      name: submission.name,
      email: submission.email,
      type: submission.type || "Employee",
      title: submission.title,
      otherInfo: submission.phone ? { phoneNumber: submission.phone } : undefined,
    });
    submission.status = "approved";
    submission.createdEmployeeId = employee._id;
    await submission.save();
    return NextResponse.json({
      submission: {
        id: String(submission._id),
        status: submission.status,
        createdEmployeeId: String(employee._id),
      },
      employee: {
        id: String(employee._id),
        name: employee.name,
        email: employee.email,
        title: employee.title,
      },
    });
  }

  if (action === "reject") {
    if (submission.status !== "pending") {
      return NextResponse.json(
        { message: "Only pending submissions can be rejected" },
        { status: 400 }
      );
    }
    submission.status = "rejected";
    await submission.save();
    return NextResponse.json({
      submission: {
        id: String(submission._id),
        status: submission.status,
      },
    });
  }

  return NextResponse.json({ message: "Invalid action" }, { status: 400 });
}
