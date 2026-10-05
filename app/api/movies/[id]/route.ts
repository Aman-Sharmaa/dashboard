import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { Movie } from "@/models/Movie";
import { MovieSession } from "@/models/MovieSession";
import { connectDB } from "@/lib/db";

async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("kalp_auth_token")?.value;
  if (!token) return null;
  try {
    const user = verifyToken(token);
    if (user.role === "admin") return user;
    return null;
  } catch {
    return null;
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  try {
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await req.json();
    
    const movie = await Movie.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(movie);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update movie" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  try {
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = await params;
    
    // End any active sessions before deleting
    await MovieSession.updateMany({ movie: id, isActive: true }, { isActive: false });
    
    await Movie.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete movie" }, { status: 500 });
  }
}
