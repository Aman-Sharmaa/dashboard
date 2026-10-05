import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBoardColumn extends Document {
  boardId: string; // ID of the Board (workspace tab) this column belongs to
  key: string;     // Unique key / status e.g. "backlog", "in_progress", "my_custom"
  label: string;   // Display name e.g. "Backlog"
  color: string;   // color e.g. "#9ca3af" or hex color
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const BoardColumnSchema: Schema<IBoardColumn> = new Schema(
  {
    boardId: { type: String, required: true },
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    color: { type: String, default: "#9ca3af" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BoardColumnSchema.index({ boardId: 1, order: 1 });
BoardColumnSchema.index({ boardId: 1, key: 1 }, { unique: true });

export const BoardColumn: Model<IBoardColumn> =
  mongoose.models.BoardColumn ||
  mongoose.model<IBoardColumn>("BoardColumn", BoardColumnSchema);
