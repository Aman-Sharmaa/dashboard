import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Asset } from "@/models/Asset";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const asset = await Asset.findById(id);
  if (!asset) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  const body = await req.json();
  const { assetName, assetId, assetCost, givenDate, takenDate } = body as {
    assetName?: string;
    assetId?: string;
    assetCost?: number;
    givenDate?: string;
    takenDate?: string | null;
  };

  if (assetName !== undefined) {
    if (typeof assetName !== "string" || !assetName.trim()) {
      return NextResponse.json({ message: "Asset name cannot be empty" }, { status: 400 });
    }
    asset.assetName = assetName.trim();
  }
  if (assetId !== undefined) {
    if (typeof assetId !== "string" || !assetId.trim()) {
      return NextResponse.json({ message: "Asset ID cannot be empty" }, { status: 400 });
    }
    asset.assetId = assetId.trim();
  }
  if (assetCost !== undefined) {
    asset.assetCost = typeof assetCost === "number" ? assetCost : Number(assetCost) || 0;
  }
  if (givenDate !== undefined) {
    const given = new Date(givenDate);
    if (Number.isNaN(given.getTime())) {
      return NextResponse.json({ message: "Invalid given date" }, { status: 400 });
    }
    asset.givenDate = given;
  }
  if (takenDate !== undefined) {
    if (takenDate === null || takenDate === "") {
      asset.takenDate = undefined;
    } else {
      const taken = new Date(takenDate);
      if (Number.isNaN(taken.getTime())) {
        return NextResponse.json({ message: "Invalid taken date" }, { status: 400 });
      }
      asset.takenDate = taken;
    }
  }

  await asset.save();

  return NextResponse.json({
    asset: {
      id: String(asset._id),
      employeeId: String(asset.employee),
      assetName: asset.assetName,
      assetId: asset.assetId,
      assetCost: asset.assetCost,
      givenDate: asset.givenDate ? new Date(asset.givenDate).toISOString().slice(0, 10) : null,
      takenDate: asset.takenDate ? new Date(asset.takenDate).toISOString().slice(0, 10) : null,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const deleted = await Asset.findByIdAndDelete(id);
  if (!deleted) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
