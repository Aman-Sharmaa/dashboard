import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { syncProductExternalRevenue, syncAllExternalRevenue } from "@/lib/external-revenue-sync";

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * POST /api/products/sync-external-revenue
 * Sync external revenue for all products or a specific product
 * 
 * Query params:
 * - productId: (optional) Sync only this product
 */
export async function POST(req: NextRequest) {
  const admin = requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");

  if (productId) {
    // Sync specific product
    const result = await syncProductExternalRevenue(productId);
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } else {
    // Sync all products
    const result = await syncAllExternalRevenue();
    return NextResponse.json(result, { status: 200 });
  }
}
