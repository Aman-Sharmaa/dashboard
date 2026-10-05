import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { Movie } from "@/models/Movie";
import { MovieSession } from "@/models/MovieSession";
import { connectDB } from "@/lib/db";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "dummy",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "dummy",
});

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

export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const movies = await Movie.find().sort({ createdAt: -1 }).lean();

    // Attach active session info (shareId + sessionId) to each movie
    const movieIds = movies.map((m: any) => m._id);
    const activeSessions = await MovieSession.find({ movie: { $in: movieIds }, isActive: true }).lean();
    const sessionMap: Record<string, any> = {};
    for (const s of activeSessions) {
      sessionMap[s.movie.toString()] = { shareId: s.shareId, sessionId: (s as any)._id };
    }

    const result = movies.map((m: any) => ({
      ...m,
      _id: m._id.toString(),
      activeSession: sessionMap[m._id.toString()] || null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.MUX_TOKEN_ID || process.env.MUX_TOKEN_ID === "dummy") {
      return NextResponse.json(
        { error: "Mux configuration missing. Please add MUX_TOKEN_ID and MUX_TOKEN_SECRET to your environment variables." },
        { status: 400 }
      );
    }

    const { title, thumbnail } = await req.json();

    const upload = await mux.video.uploads.create({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: ["public"],
        max_resolution_tier: "1080p", // ensure HD rendition is created
      },
    });

    const movie = await Movie.create({
      title,
      thumbnail,
      status: "uploading",
      createdBy: user.userId,
      muxAssetId: upload.id,
    });

    return NextResponse.json({ movie: { ...movie.toObject(), _id: movie._id.toString() }, uploadUrl: upload.url });
  } catch (error: any) {
    console.error("Movie creation error details:", error);
    let errorMessage = "Failed to create movie";
    if (error.status === 401) {
      errorMessage = "Mux Authentication Failed (401). Please verify your MUX_TOKEN_ID and MUX_TOKEN_SECRET are correct and have Video permissions.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
