import { NextRequest, NextResponse } from "next/server";
import { Movie } from "@/models/Movie";
import { connectDB } from "@/lib/db";

// Mux sends webhook events when video processing completes.
// In your Mux dashboard: Settings > Webhooks > Add endpoint: https://yourdomain.com/api/movies/webhook
export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const body = await req.json();
    const { type, data } = body;

    // video.asset.ready ~ video finished processing, playback is available
    if (type === "video.asset.ready") {
      const assetId = data.id;
      const playbackId = data.playback_ids?.[0]?.id;

      if (assetId && playbackId) {
        await Movie.findOneAndUpdate(
          { muxAssetId: assetId },
          { muxPlaybackId: playbackId, status: "ready" }
        );
      }
    }

    // video.asset.errored ~ processing failed
    if (type === "video.asset.errored") {
      const assetId = data.id;
      if (assetId) {
        await Movie.findOneAndUpdate(
          { muxAssetId: assetId },
          { status: "failed" }
        );
      }
    }

    // video.upload.asset_created ~ upload linked to an asset, capture the real assetId
    if (type === "video.upload.asset_created") {
      const uploadId = data.upload_id;
      const assetId = data.id;
      if (uploadId && assetId) {
        // The movie was created with muxAssetId = upload.id (upload ID, not asset ID)
        // Update it to the real asset ID so the webhook above can match
        await Movie.findOneAndUpdate(
          { muxAssetId: uploadId },
          { muxAssetId: assetId }
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Mux webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
