import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { KhatabookArea } from "@/models/KhatabookArea";

const COOKIE_NAME = "kalp_auth_token";

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    const payload = verifyToken(token);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

async function getUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const payload = verifyToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    await connectDB();
    const areas = await KhatabookArea.find().sort({ name: 1 }).lean();
    return NextResponse.json({ areas });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to fetch areas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  }

  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ message: "Area name is required" }, { status: 400 });
    }

    await connectDB();
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    // Check if area already exists
    const existing = await KhatabookArea.findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json({ message: "Area already exists" }, { status: 400 });
    }

    const area = await KhatabookArea.create({
      name: name.trim(),
      createdBy: userId,
    });

    return NextResponse.json({ area, message: "Area created successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to create area" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
    if (!(await isAdmin())) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }
  
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");
      
      if (!id) {
        return NextResponse.json({ message: "Area ID is required" }, { status: 400 });
      }
  
      await connectDB();
      await KhatabookArea.findByIdAndDelete(id);
  
      return NextResponse.json({ message: "Area deleted successfully" });
    } catch (error: any) {
      return NextResponse.json({ message: error.message || "Failed to delete area" }, { status: 500 });
    }
  }
