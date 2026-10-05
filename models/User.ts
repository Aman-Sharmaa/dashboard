import mongoose, { Schema, Document, Model } from "mongoose";
import type { UserRole } from "@/lib/auth";

export interface IUser extends Document {
  email: string;
  password: string;
  name?: string;
  role: UserRole;
  company?: string;
  /** When true, employee can manage CMS content (pages, posts, categories) */
  canManageContent?: boolean;
  /** Feature keys the employee has access to. Empty/undefined = default employee features. Admins always have full access. */
  featureAccess?: string[];
  /** Optional access-group template assigned from Settings > Roles & Access */
  accessGroupId?: string;
  /** Feature keys where this employee may manage data like an admin for that area only */
  featureAdminFor?: string[];
  /** Feature keys where the employee may view the app area but must not create or edit */
  featureReadOnlyFor?: string[];
  /** Per-widget visibility on /dashboard (keys depend on role; missing = default on) */
  dashboardWidgetPrefs?: Record<string, boolean>;
  /** Custom order of sidebar section labels; empty = product default */
  sidebarSectionOrder?: string[];
  /** Admin-only: feature keys to hide from the workspace sidebar (empty = show all) */
  adminSidebarHiddenFeatures?: string[];
  googleCalendarAccessToken?: string;
  googleCalendarRefreshToken?: string;
  googleCalendarExpiryDate?: Date;
  googleCalendarEmail?: string;
  lastViewedLeadsAt?: Date;
  lastViewedOnboardingAt?: Date;
  lastViewedTasksAt?: Date;
  lastViewedDeploymentsAt?: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    role: {
      type: String,
      enum: ["employee", "admin", "client", "lead"],
      default: "employee",
    },
    company: { type: String },
    canManageContent: { type: Boolean, default: false },
    featureAccess: { type: [String], default: [] },
    accessGroupId: { type: String },
    featureAdminFor: { type: [String], default: [] },
    featureReadOnlyFor: { type: [String], default: [] },
    dashboardWidgetPrefs: { type: Schema.Types.Mixed, default: undefined },
    sidebarSectionOrder: { type: [String], default: [] },
    adminSidebarHiddenFeatures: { type: [String], default: [] },
    googleCalendarAccessToken: { type: String },
    googleCalendarRefreshToken: { type: String },
    googleCalendarExpiryDate: { type: Date },
    googleCalendarEmail: { type: String },
    lastViewedLeadsAt: { type: Date },
    lastViewedOnboardingAt: { type: Date },
    lastViewedTasksAt: { type: Date },
    lastViewedDeploymentsAt: { type: Date },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

