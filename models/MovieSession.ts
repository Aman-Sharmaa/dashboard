import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMovieSession extends Document {
  movie: mongoose.Types.ObjectId;
  shareId: string;
  hostId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const MovieSessionSchema: Schema<IMovieSession> = new Schema(
  {
    movie: { type: Schema.Types.ObjectId, ref: "Movie", required: true },
    shareId: { type: String, required: true, unique: true },
    hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MovieSession: Model<IMovieSession> =
  mongoose.models.MovieSession ||
  mongoose.model<IMovieSession>("MovieSession", MovieSessionSchema);
