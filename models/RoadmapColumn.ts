import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoadmapColumn extends Document {
  key: string;    // unique slug used as item.status value e.g. "now", "next", "my_custom"
  label: string;  // display name e.g. "Now", "Next", "My Custom"
  color: string;  // hex colour for the column dot
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const RoadmapColumnSchema: Schema<IRoadmapColumn> = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    color: { type: String, default: "#71717a" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

RoadmapColumnSchema.index({ order: 1 });

export const RoadmapColumn: Model<IRoadmapColumn> =
  mongoose.models.RoadmapColumn ||
  mongoose.model<IRoadmapColumn>("RoadmapColumn", RoadmapColumnSchema);
