import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { verifyToken } from "@/lib/auth";

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

export async function GET() {
  await connectDB();
  const products = await Product.find().sort({ createdAt: 1 }).lean();
  return NextResponse.json({ products }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const { name, slug, kind, description, externalRevenueApiUrl, externalRevenueJwtToken } = body as {
    name?: string;
    slug?: string;
    kind?: "product" | "service";
    description?: string;
    externalRevenueApiUrl?: string;
    externalRevenueJwtToken?: string;
  };

  if (!name || !slug || !kind) {
    return NextResponse.json(
      { message: "Name, slug, and kind are required" },
      { status: 400 }
    );
  }

  const existing = await Product.findOne({ slug });
  if (existing) {
    return NextResponse.json(
      { message: "Slug already in use" },
      { status: 400 }
    );
  }

  const created = await Product.create({
    name,
    slug,
    kind,
    description,
    externalRevenueApiUrl: externalRevenueApiUrl || undefined,
    externalRevenueJwtToken: externalRevenueJwtToken || undefined,
  });

  return NextResponse.json({ product: created }, { status: 201 });
}

