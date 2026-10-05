import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { AutoDMAutomation } from "@/models/AutoDMAutomation";
import { AutoDMRun } from "@/models/AutoDMRun";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const user = verifyToken(token);
    if (user.role !== "admin") return null;
    return user;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const { id } = await params;
    const automation = await AutoDMAutomation.findOne({ _id: id, owner: admin.userId }).lean() as any;
    if (!automation) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const runs = await AutoDMRun.find({ automationId: id }).sort({ createdAt: -1 }).limit(100).lean();

    return NextResponse.json({
      automation: { ...automation, id: String(automation._id) },
      runs: runs.map((r: any) => ({ ...r, id: String(r._id) })),
    });
  } catch {
    return NextResponse.json({ message: "Failed to load automation" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const { id } = await params;
    const body = await req.json();

    const updated = await AutoDMAutomation.findOneAndUpdate(
      { _id: id, owner: admin.userId },
      { $set: body },
      { new: true }
    );
    if (!updated) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const updatedObj = updated.toObject();
    return NextResponse.json({
      automation: {
        ...updatedObj,
        id: String(updatedObj._id),
        stats: { runs: 0, dmsSent: 0, followsGained: 0 },
      },
    });
  } catch {
    return NextResponse.json({ message: "Failed to update automation" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    await connectDB();

    const { id } = await params;
    await AutoDMAutomation.findOneAndDelete({ _id: id, owner: admin.userId });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Failed to delete automation" }, { status: 500 });
  }
}

// Patch endpoint for pause/resume/stop actions handled as PUT with {status}
