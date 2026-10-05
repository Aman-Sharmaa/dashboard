import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMovie extends Document {
  title: string;
  thumbnail?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  status: "uploading" | "processing" | "ready" | "failed";
  createdBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const MovieSchema: Schema<IMovie> = new Schema(
  {
    title: { type: String, required: true },
    thumbnail: { type: String },
    muxAssetId: { type: String },
    muxPlaybackId: { type: String },
    status: {
      type: String,
      enum: ["uploading", "processing", "ready", "failed"],
      default: "uploading",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Movie: Model<IMovie> =
  mongoose.models.Movie || mongoose.model<IMovie>("Movie", MovieSchema);
