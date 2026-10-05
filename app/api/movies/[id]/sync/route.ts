import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { Movie } from "@/models/Movie";
import { connectDB } from "@/lib/db";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
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

// Manually sync a movie's status from Mux (called by admin UI)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  try {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const movie = await Movie.findById(id);
    if (!movie) return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    if (!movie.muxAssetId) return NextResponse.json({ error: "No Mux asset ID on this movie" }, { status: 400 });

    // muxAssetId may currently hold an Upload ID (not an Asset ID).
    // We use the Uploads API to get the real Asset ID, then update the record.
    let assetId = movie.muxAssetId;

    // Try to resolve Upload ID → Asset ID
    try {
      const upload = await mux.video.uploads.retrieve(movie.muxAssetId);
      if (upload.asset_id) {
        assetId = upload.asset_id;
        // Persist the real asset ID so future syncs go directly to assets API
        await Movie.findByIdAndUpdate(id, { muxAssetId: assetId });
      } else {
        // Upload exists but asset not created yet ~ still uploading
        return NextResponse.json({ ...movie.toObject(), status: "uploading", _message: "Upload not yet processed into an asset. Make sure the file upload completed." });
      }
    } catch {
      // If the retrieve fails it means muxAssetId is already a real Asset ID ~ proceed
    }

    // Fetch asset status from Mux
    const asset = await mux.video.assets.retrieve(assetId);

    const update: Record<string, string> = {
      status: asset.status === "ready" ? "ready" : "processing",
      muxAssetId: assetId,
    };

    if (asset.status === "ready") {
      const playbackId = asset.playback_ids?.[0]?.id;
      if (playbackId) update.muxPlaybackId = playbackId;
    }

    const updated = await Movie.findByIdAndUpdate(id, update, { new: true });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync" }, { status: 500 });
  }
}
