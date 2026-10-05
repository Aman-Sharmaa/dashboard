import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Product } from "@/models/Product";
import { ExternalRevenue } from "@/models/ExternalRevenue";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "kalp_auth_token";

/**
 * Verify JWT token from Authorization header or cookie
 */
function getAuthUser(req: NextRequest) {
  // Try Authorization header first (for external API calls)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      return verifyToken(token);
    } catch {
      return null;
    }
  }

  // Fallback to cookie (for internal calls)
  const cookies = req.cookies;
  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * POST /api/products/[id]/external-revenue
 * 
 * Accepts revenue data from external backends with JWT authentication.
 * 
 * Request Body:
 * {
 *   "amount": 10000,
 *   "currency": "INR", // optional, defaults to INR
 *   "date": "2026-02-06T10:00:00Z", // ISO date string
 *   "source": "backend-api", // name of the external source
 *   "metadata": {} // optional, store full API response or additional data
 * }
 * 
 * Headers:
 * Authorization: Bearer <JWT_TOKEN>
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized. Valid JWT token required." },
      { status: 401 }
    );
  }

  await connectDB();

  // Verify product exists
  const product = await Product.findById(id).lean();
  if (!product) {
    return NextResponse.json(
      { message: "Product not found" },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const { amount, currency = "INR", date, source, metadata } = body;

    // Validation
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { message: "Date is required" },
        { status: 400 }
      );
    }

    if (!source || typeof source !== "string") {
      return NextResponse.json(
        { message: "Source is required and must be a string" },
        { status: 400 }
      );
    }

    const revenueDate = new Date(date);
    if (Number.isNaN(revenueDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format. Use ISO 8601 format." },
        { status: 400 }
      );
    }

    const month = revenueDate.getMonth() + 1; // 1-12
    const year = revenueDate.getFullYear();

    // Create external revenue record
    const externalRevenue = await ExternalRevenue.create({
      productId: id,
      amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
      currency: currency.toUpperCase(),
      date: revenueDate,
      month,
      year,
      source: source.trim(),
      metadata: metadata || {},
    });

    return NextResponse.json(
      {
        success: true,
        message: "External revenue recorded successfully",
        revenue: {
          id: String(externalRevenue._id),
          productId: id,
          productName: product.name,
          amount: externalRevenue.amount,
          currency: externalRevenue.currency,
          date: externalRevenue.date,
          month: externalRevenue.month,
          year: externalRevenue.year,
          source: externalRevenue.source,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("External revenue API error:", error);
    return NextResponse.json(
      {
        message: error.message || "Failed to record external revenue",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/products/[id]/external-revenue
 * 
 * Get external revenue records for a product.
 * Query params:
 * - year: filter by year (optional)
 * - month: filter by month 1-12 (optional)
 * - source: filter by source (optional)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized. Valid JWT token required." },
      { status: 401 }
    );
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const source = searchParams.get("source");

  const filter: Record<string, unknown> = { productId: id };
  if (year) filter.year = parseInt(year);
  if (month) filter.month = parseInt(month);
  if (source) filter.source = source;

  const revenues = await ExternalRevenue.find(filter)
    .sort({ date: -1 })
    .lean();

  return NextResponse.json({
    revenues: revenues.map((r: any) => ({
      id: String(r._id),
      productId: String(r.productId),
      amount: r.amount,
      currency: r.currency,
      date: r.date,
      month: r.month,
      year: r.year,
      source: r.source,
      metadata: r.metadata,
      createdAt: r.createdAt,
    })),
  });
}
