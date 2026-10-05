import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { MovieSession } from "@/models/MovieSession";
import { Movie } from "@/models/Movie";
import { connectDB } from "@/lib/db";
import { randomBytes } from "crypto";

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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  try {
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check movie exists and is ready to stream
    const movie = await Movie.findById(id);
    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }
    if (movie.status !== "ready" || !movie.muxPlaybackId) {
      return NextResponse.json(
        { error: "Movie is still processing. Please wait until status is 'ready' before starting a party." },
        { status: 400 }
      );
    }

    const shareId = randomBytes(4).toString("hex");

    const movieSession = await MovieSession.create({
      movie: id,
      shareId,
      hostId: user.userId,
      isActive: true,
    });

    return NextResponse.json(movieSession);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
