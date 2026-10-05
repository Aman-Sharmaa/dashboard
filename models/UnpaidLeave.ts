import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUnpaidLeave extends Document {
  employeeId: mongoose.Types.ObjectId;
  reason: string;
  startDate: Date;
  endDate: Date;
  days: number;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UnpaidLeaveSchema: Schema<IUnpaidLeave> = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    reason: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 0.5 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Employee" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

UnpaidLeaveSchema.index({ employeeId: 1, status: 1 });
UnpaidLeaveSchema.index({ startDate: 1, endDate: 1 });

export const UnpaidLeave: Model<IUnpaidLeave> =
  mongoose.models.UnpaidLeave ||
  mongoose.model<IUnpaidLeave>("UnpaidLeave", UnpaidLeaveSchema);
