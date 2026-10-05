import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Department } from "@/models/Department";

const COOKIE_NAME = "kalp_auth_token";

async function getUserFromCookie() {
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
  const auth = await getUserFromCookie();
  if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const departments = await Department.find().sort({ name: 1 }).lean();
  return NextResponse.json({ departments });
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromCookie();
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { name, description } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ message: "Name is required" }, { status: 400 });
  }

  const existing = await Department.findOne({ name: name.trim() });
  if (existing) {
    return NextResponse.json({ message: "Department already exists" }, { status: 409 });
  }

  const dept = await Department.create({ name: name.trim(), description: description?.trim() });
  return NextResponse.json({ department: dept }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await getUserFromCookie();
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { id, name, description } = await req.json();
  if (!id || !name?.trim()) {
    return NextResponse.json({ message: "ID and name are required" }, { status: 400 });
  }

  const dept = await Department.findByIdAndUpdate(
    id,
    { name: name.trim(), description: description?.trim() },
    { new: true }
  );
  if (!dept) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({ department: dept });
}

export async function DELETE(req: NextRequest) {
  const auth = await getUserFromCookie();
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

  await Department.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
