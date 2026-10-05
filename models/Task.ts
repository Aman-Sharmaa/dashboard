import mongoose, { Schema, Document, Model } from "mongoose";

export type TaskStatus = string;
export type TaskType = "task" | "bug" | "social_media_planner" | "milestone";
export type SocialMediaPlatform =
  | "instagram"
  | "linkedin"
  | "youtube"
  | "twitter_x"
  | "facebook"
  | "multiple";
export type SocialMediaPostType =
  | "reel"
  | "carousel"
  | "image_post"
  | "story"
  | "video"
  | "thread";
export type SocialMediaProgressStatus =
  | "content_planning"
  | "script_ready"
  | "design_ready"
  | "scheduled"
  | "posted"
  | "performance_tracking"
  | "completed";

export interface ISocialMediaPlanner {
  platforms: SocialMediaPlatform[];
  pagesAccounts: string[];
  linkedProjectIds: mongoose.Types.ObjectId[];
  postTypes: SocialMediaPostType[];
  goalTargets?: {
    targetViews?: number | null;
    targetLikes?: number | null;
    targetComments?: number | null;
    targetShares?: number | null;
    targetFollowersGain?: number | null;
  };
  contentPlan?: {
    richText?: string;
    captionIdea?: string;
    hook?: string;
    hashtags?: string;
    callToAction?: string;
  };
  postingDate?: Date | null;
  postingTime?: string | null;
  progressStatus: SocialMediaProgressStatus;
}

export interface ITask extends Document {
  project?: mongoose.Types.ObjectId | null;
  board?: mongoose.Types.ObjectId | null;
  sprint?: mongoose.Types.ObjectId | null;
  parentTask?: mongoose.Types.ObjectId | null;
  reporter?: mongoose.Types.ObjectId | null;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  isMilestone?: boolean;
  /** @deprecated Use assignees instead */
  assignee?: mongoose.Types.ObjectId | null;
  /** Array of assigned employees */
  assignees: mongoose.Types.ObjectId[];
  startDate?: Date | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  timeEstimateMinutes?: number | null;
  socialMediaPlanner?: ISocialMediaPlanner | null;
  priority: "low" | "medium" | "high" | "urgent";
  label?: string | null;
  order: number;
  history?: {
    field: string;
    oldValue: string | null;
    newValue: string | null;
    updatedBy: string;
    updatedAt: Date;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

const TaskSchema: Schema<ITask> = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    board: { type: Schema.Types.ObjectId, ref: "Board", default: null },
    sprint: { type: Schema.Types.ObjectId, ref: "Sprint", default: null },
    parentTask: { type: Schema.Types.ObjectId, ref: "Task", default: null },
    reporter: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    title: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ["task", "bug", "social_media_planner", "milestone"],
      default: "task",
    },
    isMilestone: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      default: "backlog",
    },
    /** @deprecated kept for backward compat with old docs */
    assignee: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    assignees: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    startDate: Date,
    dueDate: Date,
    completedAt: { type: Date, default: null },
    timeEstimateMinutes: { type: Number, default: null, min: 0 },
    socialMediaPlanner: {
      platforms: [{
        type: String,
        enum: ["instagram", "linkedin", "youtube", "twitter_x", "facebook", "multiple"],
      }],
      pagesAccounts: [{ type: String }],
      linkedProjectIds: [{ type: Schema.Types.ObjectId, ref: "Project" }],
      postTypes: [{
        type: String,
        enum: ["reel", "carousel", "image_post", "story", "video", "thread"],
      }],
      goalTargets: {
        targetViews: { type: Number, default: null, min: 0 },
        targetLikes: { type: Number, default: null, min: 0 },
        targetComments: { type: Number, default: null, min: 0 },
        targetShares: { type: Number, default: null, min: 0 },
        targetFollowersGain: { type: Number, default: null, min: 0 },
      },
      contentPlan: {
        richText: { type: String, default: "" },
        captionIdea: { type: String, default: "" },
        hook: { type: String, default: "" },
        hashtags: { type: String, default: "" },
        callToAction: { type: String, default: "" },
      },
      postingDate: { type: Date, default: null },
      postingTime: { type: String, default: null },
      progressStatus: {
        type: String,
        enum: [
          "content_planning",
          "script_ready",
          "design_ready",
          "scheduled",
          "posted",
          "performance_tracking",
          "completed",
        ],
        default: "content_planning",
      },
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    label: { type: String, default: null },
    order: { type: Number, default: 0 },
    history: [
      {
        field: { type: String, required: true },
        oldValue: { type: String, default: null },
        newValue: { type: String, default: null },
        updatedBy: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

TaskSchema.index({ project: 1, status: 1 });
TaskSchema.index({ board: 1, status: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ assignee: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ order: 1, createdAt: -1 });
TaskSchema.index({ sprint: 1 });
TaskSchema.index({ parentTask: 1 });

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
