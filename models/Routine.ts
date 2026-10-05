import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoutineCompletion {
  date: Date;
  completedAt: Date;
  completedBy: string;
}

export interface IRoutine extends Document {
  organizationId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  groupId?: string | null;
  title: string;
  description?: string;
  frequency: "daily" | "weekly";
  /** Days of week: 0=Sun … 6=Sat */
  workingDays: number[];
  /** "HH:MM" format e.g. "11:00" */
  dueTime?: string;
  /** Running streak in working days */
  streak: number;
  lastCompletedAt?: Date;
  /** Local YYYY-MM-DD date of the last after-hours incomplete reminder. */
  lastReminderDate?: string;
  status: "active" | "archived";
  /** Recent completion history (last 30 records) */
  completions: IRoutineCompletion[];
  createdAt?: Date;
  updatedAt?: Date;
}

const RoutineCompletionSchema = new Schema(
  {
    date: { type: Date, required: true },
    completedAt: { type: Date, required: true },
    completedBy: { type: String, required: true },
  },
  { _id: false }
);

const RoutineSchema: Schema<IRoutine> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    groupId: { type: String, default: null, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    frequency: {
      type: String,
      enum: ["daily", "weekly"],
      default: "daily",
    },
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
    dueTime: { type: String, default: null },
    streak: { type: Number, default: 0 },
    lastCompletedAt: { type: Date, default: null },
    lastReminderDate: { type: String, default: null },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
    completions: { type: [RoutineCompletionSchema], default: [] },
  },
  { timestamps: true }
);

RoutineSchema.index({ organizationId: 1, status: 1 });
RoutineSchema.index({ ownerId: 1, status: 1 });
RoutineSchema.index({ groupId: 1 });

export const Routine: Model<IRoutine> =
  mongoose.models.Routine || mongoose.model<IRoutine>("Routine", RoutineSchema);
