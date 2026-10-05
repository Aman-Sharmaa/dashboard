import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMeeting extends Document {
  title: string;
  description?: string;
  project: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  googleCalendarEventId?: string;
  googleCalendarId?: string;
  meetingLink?: string; // Join link for the meeting (Google Meet, Zoom, Teams, etc.)
  // Recurrence fields
  isRecurring?: boolean;
  recurrenceType?: "daily" | "weekly" | "monthly" | "custom";
  recurrenceEndDate?: Date;
  recurrenceCount?: number; // Number of occurrences
  recurrenceDaysOfWeek?: number[]; // For weekly: [0=Sunday, 1=Monday, ..., 6=Saturday]
  recurrenceDayOfMonth?: number; // For monthly: day of month (1-31)
  recurrenceInterval?: number; // Interval (e.g., every 2 weeks)
  parentMeetingId?: mongoose.Types.ObjectId; // Reference to parent recurring meeting
  recurrenceInstance?: number; // Instance number in the series
  createdAt?: Date;
  updatedAt?: Date;
}

const MeetingSchema: Schema<IMeeting> = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    attendees: [{ type: String }],
    googleCalendarEventId: { type: String },
    googleCalendarId: { type: String },
    meetingLink: { type: String }, // Join link for the meeting
    // Recurrence fields
    isRecurring: { type: Boolean, default: false },
    recurrenceType: { type: String, enum: ["daily", "weekly", "monthly", "custom"] },
    recurrenceEndDate: { type: Date },
    recurrenceCount: { type: Number },
    recurrenceDaysOfWeek: [{ type: Number }], // 0-6 for Sunday-Saturday
    recurrenceDayOfMonth: { type: Number }, // 1-31
    recurrenceInterval: { type: Number, default: 1 }, // Every N days/weeks/months
    parentMeetingId: { type: Schema.Types.ObjectId, ref: "Meeting" },
    recurrenceInstance: { type: Number },
  },
  { timestamps: true }
);

MeetingSchema.index({ project: 1, startTime: 1 });
MeetingSchema.index({ createdBy: 1, startTime: 1 });
MeetingSchema.index({ parentMeetingId: 1 });
MeetingSchema.index({ isRecurring: 1, startTime: 1 });

export const Meeting: Model<IMeeting> =
  mongoose.models.Meeting || mongoose.model<IMeeting>("Meeting", MeetingSchema);

