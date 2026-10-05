import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Asset } from "@/models/Asset";
import { Employee } from "@/models/Employee";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: employeeId } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return NextResponse.json({ message: "Invalid employee id" }, { status: 400 });
  }

  if (user.role === "employee") {
    const employee = await Employee.findOne({ email: user.email }).lean();
    if (!employee || String(employee._id) !== employeeId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  const assets = await Asset.find({ employee: employeeId })
    .sort({ givenDate: -1 })
    .lean();

  return NextResponse.json({
    assets: assets.map((a) => ({
      id: String(a._id),
      employeeId: String(a.employee),
      assetName: a.assetName,
      assetId: a.assetId,
      assetCost: a.assetCost,
      givenDate: a.givenDate ? new Date(a.givenDate).toISOString().slice(0, 10) : null,
      takenDate: a.takenDate ? new Date(a.takenDate).toISOString().slice(0, 10) : null,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: employeeId } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return NextResponse.json({ message: "Invalid employee id" }, { status: 400 });
  }

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return NextResponse.json({ message: "Employee not found" }, { status: 404 });
  }

  const body = await req.json();
  const { assetName, assetId, assetCost, givenDate, takenDate } = body as {
    assetName?: string;
    assetId?: string;
    assetCost?: number;
    givenDate?: string;
    takenDate?: string | null;
  };

  if (!assetName || typeof assetName !== "string" || !assetName.trim()) {
    return NextResponse.json({ message: "Asset name is required" }, { status: 400 });
  }
  if (!assetId || typeof assetId !== "string" || !assetId.trim()) {
    return NextResponse.json({ message: "Asset ID is required" }, { status: 400 });
  }
  const cost = typeof assetCost === "number" ? assetCost : Number(assetCost) || 0;
  if (!givenDate) {
    return NextResponse.json({ message: "Asset given date is required" }, { status: 400 });
  }
  const given = new Date(givenDate);
  if (Number.isNaN(given.getTime())) {
    return NextResponse.json({ message: "Invalid given date" }, { status: 400 });
  }
  const taken = takenDate ? new Date(takenDate) : null;
  if (taken !== null && Number.isNaN(taken.getTime())) {
    return NextResponse.json({ message: "Invalid taken date" }, { status: 400 });
  }

  const asset = await Asset.create({
    employee: employee._id,
    assetName: assetName.trim(),
    assetId: assetId.trim(),
    assetCost: cost,
    givenDate: given,
    takenDate: taken || undefined,
  });

  return NextResponse.json(
    {
      asset: {
        id: String(asset._id),
        employeeId: String(asset.employee),
        assetName: asset.assetName,
        assetId: asset.assetId,
        assetCost: asset.assetCost,
        givenDate: asset.givenDate ? new Date(asset.givenDate).toISOString().slice(0, 10) : null,
        takenDate: asset.takenDate ? new Date(asset.takenDate).toISOString().slice(0, 10) : null,
      },
    },
    { status: 201 }
  );
}
