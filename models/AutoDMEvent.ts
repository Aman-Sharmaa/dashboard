import mongoose, { Schema, Document } from "mongoose";

export interface IAutoDMEvent extends Document {
  eventId: string; // The ID from Meta webhook payload
  eventType: string; // e.g. "comments", "messages"
  instagramAccountId: mongoose.Types.ObjectId;
  payload: any;
  processed: boolean;
  processedAt?: Date;
  createdAt: Date;
}

const AutoDMEventSchema: Schema<IAutoDMEvent> = new Schema(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    instagramAccountId: { type: Schema.Types.ObjectId, ref: "InstagramAccount" },
    payload: { type: Schema.Types.Mixed },
    processed: { type: Boolean, default: false },
    processedAt: Date,
  },
  { timestamps: true }
);

export const AutoDMEvent = mongoose.models.AutoDMEvent || mongoose.model<IAutoDMEvent>("AutoDMEvent", AutoDMEventSchema);
