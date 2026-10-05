import mongoose, { Schema, Document, Model } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "leave";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface IAttendance extends Document {
  employee: mongoose.Types.ObjectId;
  date: Date;
  status: AttendanceStatus;
  leaveType?: string;
  isPaid?: boolean;
  approvalStatus: ApprovalStatus;
  approvedBy?: mongoose.Types.ObjectId | null;
  reason?: string;
  checkInAt?: Date;
  checkOutAt?: Date;
  leaveFrom?: Date;
  leaveTo?: Date;
}

const AttendanceSchema: Schema<IAttendance> = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["present", "absent", "leave"],
      required: true,
      default: "leave",
    },
    leaveType: { type: String },
    isPaid: { type: Boolean, default: true },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reason: { type: String },
    checkInAt: { type: Date },
    checkOutAt: { type: Date },
    leaveFrom: { type: Date },
    leaveTo: { type: Date },
  },
  {
    timestamps: true,
  }
);

AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);

