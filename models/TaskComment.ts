import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITaskComment extends Document {
  task: mongoose.Types.ObjectId;
  parent?: mongoose.Types.ObjectId | null;
  authorEmail: string;
  authorName?: string;
  body: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const TaskCommentSchema: Schema<ITaskComment> = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    parent: { type: Schema.Types.ObjectId, ref: "TaskComment", default: null },
    authorEmail: { type: String, required: true },
    authorName: { type: String, default: "" },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

TaskCommentSchema.index({ task: 1, createdAt: 1 });
TaskCommentSchema.index({ parent: 1 });

export const TaskComment: Model<ITaskComment> =
  mongoose.models.TaskComment ||
  mongoose.model<ITaskComment>("TaskComment", TaskCommentSchema);
