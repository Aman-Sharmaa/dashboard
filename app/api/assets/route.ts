import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Asset } from "@/models/Asset";
import "@/models/Employee";

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const c = await cookies();
  const t = c.get(COOKIE_NAME)?.value;
  if (!t) return null;
  try {
    const u = verifyToken(t);
    return u?.role === "admin" ? u : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin()))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const sp = new URL(req.url).searchParams;
  const search = sp.get("search") || "";
  const status = sp.get("status") || "";

  const filter: Record<string, any> = {};
  if (search) {
    filter.$or = [
      { assetName: { $regex: search, $options: "i" } },
      { assetId: { $regex: search, $options: "i" } },
    ];
  }
  if (status === "assigned") {
    filter.takenDate = null;
  } else if (status === "returned") {
    filter.takenDate = { $ne: null };
  }

  const assets = await Asset.find(filter)
    .populate("employee", "name email designation department")
    .sort({ createdAt: -1 })
    .lean();

  const totalCost = assets.reduce((sum, a) => sum + (a.assetCost || 0), 0);
  const assignedCount = assets.filter((a) => !a.takenDate).length;
  const returnedCount = assets.filter((a) => !!a.takenDate).length;

  return NextResponse.json({
    assets: assets.map((a: any) => ({
      id: String(a._id),
      assetName: a.assetName,
      assetId: a.assetId,
      assetCost: a.assetCost,
      givenDate: a.givenDate
        ? new Date(a.givenDate).toISOString().slice(0, 10)
        : null,
      takenDate: a.takenDate
        ? new Date(a.takenDate).toISOString().slice(0, 10)
        : null,
      employee: a.employee
        ? {
            id: String(a.employee._id),
            name: a.employee.name,
            email: a.employee.email,
            designation: a.employee.designation,
            department: a.employee.department,
          }
        : null,
      createdAt: a.createdAt,
    })),
    stats: {
      total: assets.length,
      assigned: assignedCount,
      returned: returnedCount,
      totalCost,
    },
  });
}
