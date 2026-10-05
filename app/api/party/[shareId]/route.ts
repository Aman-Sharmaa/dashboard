import { NextRequest, NextResponse } from "next/server";
import { MovieSession } from "@/models/MovieSession";
import { Movie } from "@/models/Movie";
import { connectDB } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  await connectDB();
  try {
    const { shareId } = await params;
    
    const movieSession = await MovieSession.findOne({ shareId, isActive: true }).populate({
      path: "movie",
      model: Movie,
    });

    if (!movieSession) {
      return NextResponse.json({ error: "Session not found or ended" }, { status: 404 });
    }

    return NextResponse.json(movieSession);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

// Host can end the session
export async function DELETE(req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  await connectDB();
  try {
    // In a real app, we should verify that the requester is the host via `auth()`
    const { shareId } = await params;
    await MovieSession.findOneAndUpdate({ shareId }, { isActive: false });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to end session" }, { status: 500 });
  }
}
