import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Client } from "@/models/Client";
import { ClientOnboardingSubmission } from "@/models/ClientOnboardingSubmission";

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
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const submission = await ClientOnboardingSubmission.findById(id);
  if (!submission) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = body.action; // "approve" | "reject" | "done"

  if (action === "approve") {
    if (submission.status !== "pending") {
      return NextResponse.json(
        { message: "Only pending submissions can be approved" },
        { status: 400 }
      );
    }
    const existing = await Client.findOne({ email: submission.email }).lean();
    if (existing) {
      return NextResponse.json(
        { message: "A client with this email already exists" },
        { status: 400 }
      );
    }
    const client = await Client.create({
      name: submission.name,
      email: submission.email,
      companyName: submission.companyName,
      phone: submission.phone,
      designation: submission.designation,
      companyAddress: submission.companyAddress,
      companyPhone: submission.companyPhone,
      companyWebsite: submission.companyWebsite,
      gstin: submission.gstin,
      pan: submission.pan,
      notes: submission.notes,
      isActive: true,
    });
    submission.status = "approved";
    submission.createdClientId = client._id;
    await submission.save();
    return NextResponse.json({
      submission: {
        id: String(submission._id),
        status: submission.status,
        createdClientId: String(client._id),
      },
      client: {
        id: String(client._id),
        name: client.name,
        email: client.email,
        companyName: client.companyName,
      },
    });
  }

  if (action === "reject" || action === "done") {
    if (submission.status === "pending" && action === "done") {
      submission.status = "done";
    } else if (action === "reject") {
      submission.status = "rejected";
    } else if (action === "done" && submission.status === "approved") {
      submission.status = "done";
    } else {
      submission.status = action === "reject" ? "rejected" : "done";
    }
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
