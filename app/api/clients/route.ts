import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";
import { verifyToken } from "@/lib/auth";
import {
  getAuthUserFromCookies,
  requireAdminOrFeatureAdmin,
  employeeIsReadOnlyForFeature,
} from "@/lib/route-auth";

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

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const clients = await Client.find().sort({ companyName: 1 }).lean();

  return NextResponse.json({
    clients: clients.map((c) => ({
      id: String(c._id),
      name: c.name,
      email: c.email,
      phone: c.phone,
      designation: c.designation,
      companyName: c.companyName,
      companyAddress: c.companyAddress,
      companyPhone: c.companyPhone,
      companyWebsite: c.companyWebsite,
      gstin: c.gstin,
      pan: c.pan,
      taxAddress: c.taxAddress,
      notes: c.notes,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  });
}

export async function POST(req: Request) {
  const user = await getAuthUserFromCookies();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (await employeeIsReadOnlyForFeature(user.userId, user.role, "clients")) {
    return NextResponse.json(
      { message: "Your access to Clients is read-only" },
      { status: 403 }
    );
  }
  const allowed = await requireAdminOrFeatureAdmin("clients");
  if (!allowed) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await connectDB();

  const body = await req.json();
  const {
    name,
    email,
    phone,
    designation,
    companyName,
    companyAddress,
    companyPhone,
    companyWebsite,
    gstin,
    pan,
    taxAddress,
    notes,
    isActive,
  } = body;

  if (!name || !email || !companyName) {
    return NextResponse.json(
      { message: "Name, email and company name are required" },
      { status: 400 }
    );
  }

  const existing = await Client.findOne({ email: String(email).trim().toLowerCase() });
  if (existing) {
    return NextResponse.json(
      { message: "A client with this email already exists" },
      { status: 400 }
    );
  }

  const client = await Client.create({
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: phone || undefined,
    designation: designation || undefined,
    companyName: String(companyName).trim(),
    companyAddress: companyAddress || undefined,
    companyPhone: companyPhone || undefined,
    companyWebsite: companyWebsite || undefined,
    gstin: gstin || undefined,
    pan: pan || undefined,
    taxAddress: taxAddress || undefined,
    notes: notes || undefined,
    isActive: isActive !== false,
  });

  return NextResponse.json(
    {
      client: {
        id: String(client._id),
        name: client.name,
        email: client.email,
        companyName: client.companyName,
      },
    },
    { status: 201 }
  );
}
