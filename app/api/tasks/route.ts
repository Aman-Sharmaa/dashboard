import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { verifyToken } from "@/lib/auth";
import { Notification } from "@/models/Notification";
import { sendMail } from "@/lib/mailer";
import { taskAssignedEmail, taskAssignedManagerEmail } from "@/lib/email-templates";
import { ensureEmployeeByEmail } from "@/lib/ensure-employee";

const COOKIE_NAME = "kalp_auth_token";

const TASK_TYPE_VALUES = ["task", "bug", "social_media_planner", "milestone"] as const;
const SOCIAL_PLATFORM_VALUES = ["instagram", "linkedin", "youtube", "twitter_x", "facebook", "multiple"] as const;
const SOCIAL_POST_TYPE_VALUES = ["reel", "carousel", "image_post", "story", "video", "thread"] as const;
const SOCIAL_PROGRESS_VALUES = [
  "content_planning",
  "script_ready",
  "design_ready",
  "scheduled",
  "posted",
  "performance_tracking",
  "completed",
] as const;

function toNonNegativeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

function sanitizeSocialMediaPlanner(input: any) {
  if (!input || typeof input !== "object") return null;
  const goalTargets = input.goalTargets && typeof input.goalTargets === "object" ? input.goalTargets : {};
  const contentPlan = input.contentPlan && typeof input.contentPlan === "object" ? input.contentPlan : {};
  const progressStatus = SOCIAL_PROGRESS_VALUES.includes(input.progressStatus)
    ? input.progressStatus
    : "content_planning";

  return {
    platforms: Array.isArray(input.platforms)
      ? input.platforms.filter((p: unknown) => SOCIAL_PLATFORM_VALUES.includes(p as any))
      : [],
    pagesAccounts: Array.isArray(input.pagesAccounts)
      ? input.pagesAccounts
        .filter((p: unknown) => typeof p === "string")
        .map((p: string) => p.trim())
        .filter(Boolean)
      : [],
    linkedProjectIds: Array.isArray(input.linkedProjectIds)
      ? input.linkedProjectIds.filter((id: unknown) => typeof id === "string" && id.trim().length > 0)
      : [],
    postTypes: Array.isArray(input.postTypes)
      ? input.postTypes.filter((p: unknown) => SOCIAL_POST_TYPE_VALUES.includes(p as any))
      : [],
    goalTargets: {
      targetViews: toNonNegativeNumber(goalTargets.targetViews),
      targetLikes: toNonNegativeNumber(goalTargets.targetLikes),
      targetComments: toNonNegativeNumber(goalTargets.targetComments),
      targetShares: toNonNegativeNumber(goalTargets.targetShares),
      targetFollowersGain: toNonNegativeNumber(goalTargets.targetFollowersGain),
    },
    contentPlan: {
      richText: typeof contentPlan.richText === "string" ? contentPlan.richText : "",
      captionIdea: typeof contentPlan.captionIdea === "string" ? contentPlan.captionIdea : "",
      hook: typeof contentPlan.hook === "string" ? contentPlan.hook : "",
      hashtags: typeof contentPlan.hashtags === "string" ? contentPlan.hashtags : "",
      callToAction: typeof contentPlan.callToAction === "string" ? contentPlan.callToAction : "",
    },
    postingDate: input.postingDate ? new Date(input.postingDate) : null,
    postingTime: typeof input.postingTime === "string" ? input.postingTime : null,
    progressStatus,
  };
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

async function requireAdmin() {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const boardId = searchParams.get("boardId");
  const assigneeId = searchParams.get("assigneeId");
  const priority = searchParams.get("priority");
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const scope = searchParams.get("scope");

  const Employee = (await import("@/models/Employee")).Employee;
  const Project = (await import("@/models/Project")).Project;
  const Board = (await import("@/models/Board")).Board;

  const filter: Record<string, unknown> = {};
  if (boardId && mongoose.Types.ObjectId.isValid(boardId)) {
    const boardObjId = new mongoose.Types.ObjectId(boardId);
    filter.$or = [{ board: boardObjId }, { board: null }, { board: { $exists: false } }];
  }
  if (projectId && projectId !== "__all__") {
    filter.project = projectId;
  }
  if (assigneeId === "__me__") {
    const employee = await ensureEmployeeByEmail(user.email);
    if (employee) {
      // Match tasks with this employee in assignees array OR legacy assignee field
      filter.$or = [
        ...(filter.$or ? (filter.$or as any[]) : []),
        { assignees: employee._id },
        { assignee: employee._id },
      ];
    }
  } else if (!boardId && !projectId && user.role === "employee" && scope !== "all") {
    // No explicit board/project and not "all" scope:
    // for employees, default to showing only their own tasks.
    const employee = await Employee.findOne({ email: user.email }).select("_id").lean();
    if (!employee) return NextResponse.json({ tasks: [] });
    filter.$or = [
      ...(filter.$or ? (filter.$or as any[]) : []),
      { assignees: employee._id },
      { assignee: employee._id },
    ];
  } else if (assigneeId && assigneeId !== "__all__") {
    filter.$or = [
      ...(filter.$or ? (filter.$or as any[]) : []),
      { assignees: assigneeId },
      { assignee: assigneeId },
    ];
  }

  // ── Outsider restriction: always force "own tasks only" ──
  if (user.role === "employee") {
    const empDoc = await Employee.findOne({ email: user.email }).select("_id isOutsider").lean();
    if (empDoc && (empDoc as any).isOutsider) {
      // Override any filter to only show tasks assigned to this outsider
      const outsiderId = empDoc._id;
      // Remove any previous $or so we can replace it
      delete (filter as any).$or;
      filter.$or = [
        { assignees: outsiderId },
        { assignee: outsiderId },
      ];
    }
  }
  const isMilestoneQuery = type === "milestone" || searchParams.get("isMilestone") === "true";
  if (isMilestoneQuery) {
    filter.$or = [
      ...(filter.$or ? (filter.$or as any[]) : []),
      { isMilestone: true },
      { type: "milestone" },
      { title: { $regex: /\[milestone\]/i } },
    ];
  } else if (type && TASK_TYPE_VALUES.includes(type as any)) {
    filter.type = type;
  }
  if (priority && ["low", "medium", "high", "urgent"].includes(priority)) {
    filter.priority = priority;
  }
  if (
    status &&
    ["backlog", "todo", "in_progress", "hold", "in_review", "done", "rejected"].includes(status)
  ) {
    filter.status = status;
  }

  const tasks = await Task.find(filter)
    .populate("assignee", "name email avatarUrl")
    .populate("assignees", "name email avatarUrl")
    .populate("reporter", "name email")
    .populate("project", "name client")
    .sort({ createdAt: -1, order: 1 })
    .lean();

  const projectIds = [...new Set(tasks.map((t) => String((t as any).project?._id ?? (t as any).project)).filter(Boolean))];
  const projects = projectIds.length > 0
    ? await Project.find({ _id: { $in: projectIds } })
      .populate("client", "companyName")
      .populate("manager", "name email")
      .lean()
    : [];
  const projectMap = new Map(
    projects.map((p) => [
      String(p._id),
      {
        id: String(p._id),
        name: (p as any).name,
        clientName: (p.client as any)?.companyName ?? "~",
        clientId: (p.client as any)?._id ? String((p.client as any)._id) : String(p.client),
        manager: (p as any).manager && typeof (p as any).manager === "object"
          ? { id: String((p as any).manager._id), name: (p as any).manager.name, email: (p as any).manager.email }
          : null,
      },
    ])
  );

  return NextResponse.json({
    tasks: tasks.map((t) => {
      const p = (t as any).project;
      const projectIdStr = p ? (typeof p === "object" && p?._id ? String(p._id) : String(p)) : null;
      const proj = projectIdStr ? projectMap.get(projectIdStr) : null;
      // Build assignees array: prefer new `assignees` field, fall back to legacy `assignee`
      const assigneesArr = ((t as any).assignees && (t as any).assignees.length > 0)
        ? (t as any).assignees.map((a: any) => ({
          id: String(a._id), name: a.name, email: a.email, avatarUrl: a.avatarUrl || null,
        }))
        : (t.assignee && typeof t.assignee === "object" && (t.assignee as any)._id)
          ? [{ id: String((t.assignee as any)._id), name: (t.assignee as any).name, email: (t.assignee as any).email, avatarUrl: (t.assignee as any).avatarUrl || null }]
          : [];

      return {
        id: String(t._id),
        project: projectIdStr,
        board: (t as any).board ? String((t as any).board) : null,
        parentTask: (t as any).parentTask ? String((t as any).parentTask) : null,
        reporter: (t as any).reporter && typeof (t as any).reporter === "object"
          ? {
            id: String((t as any).reporter._id),
            name: (t as any).reporter.name,
            email: (t as any).reporter.email,
          }
          : null,
        projectName: proj?.name ?? "~",
        clientId: proj?.clientId,
        clientName: proj?.clientName ?? "~",
        title: t.title,
        description: t.description,
        type: (t as any).type || "task",
        isMilestone: Boolean((t as any).isMilestone || (t as any).type === "milestone" || (t.title && t.title.toLowerCase().startsWith("[milestone]"))),
        status: t.status,
        // Keep `assignee` (first item) for backward compatibility
        assignee: assigneesArr.length > 0 ? assigneesArr[0] : null,
        assignees: assigneesArr,
        startDate: (t as any).startDate,
        dueDate: t.dueDate,
        timeEstimateMinutes: typeof (t as any).timeEstimateMinutes === "number" ? (t as any).timeEstimateMinutes : null,
        socialMediaPlanner: (t as any).socialMediaPlanner || null,
        priority: t.priority,
        order: t.order,
        createdAt: t.createdAt,
        reportingManager: proj?.manager ?? null,
      };
    }),
  });
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const {
    projectId,
    boardId,
    title,
    description,
    type,
    status,
    assigneeId,
    assigneeIds,
    startDate,
    dueDate,
    priority,
    sprintId,
    parentTaskId,
    reporterId,
    timeEstimateMinutes,
    assignToManager,
    includeProjectManager,
    socialMediaPlanner,
  } = body;

  if (!title || (typeof title === "string" && !title.trim())) {
    return NextResponse.json({ message: "Title is required" }, { status: 400 });
  }

  const Board = (await import("@/models/Board")).Board;
  const Employee = (await import("@/models/Employee")).Employee;
  const User = (await import("@/models/User")).User;
  const currentEmployee = await ensureEmployeeByEmail(user.email);
  let resolvedBoardId = boardId || null;
  let resolvedProjectId = projectId || null;
  async function getGeneralBoardId() {
    let generalBoard = await Board.findOne({ type: "General" }).lean();
    if (!generalBoard) {
      const count = await Board.countDocuments();
      const created = await Board.create({
        name: "General",
        type: "General",
        order: count,
      });
      generalBoard = created.toObject();
    }
    return String((generalBoard as any)._id);
  }
  if (!resolvedBoardId) {
    resolvedBoardId = await getGeneralBoardId();
  }

  let managerAssigneeId: string | null = null;
  if ((assignToManager || includeProjectManager) && resolvedProjectId) {
    const Project = (await import("@/models/Project")).Project;
    const projectDoc = await Project.findById(resolvedProjectId).select("manager").lean();
    if (projectDoc && (projectDoc as any).manager) {
      managerAssigneeId = String((projectDoc as any).manager);
    }
  }

  // Resolve assignees: prefer `assigneeIds` array, fall back to `assigneeId` single
  let finalAssigneeIds: string[] = [];
  if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
    finalAssigneeIds = assigneeIds.filter(Boolean);
  } else if (assigneeId) {
    finalAssigneeIds = [assigneeId];
  }

  // If an employee creates a task without selecting assignees,
  // automatically assign it to themselves so it remains visible
  if (finalAssigneeIds.length === 0 && currentEmployee) {
    finalAssigneeIds = [String((currentEmployee as any)._id)];
  }

  if (managerAssigneeId && !finalAssigneeIds.includes(managerAssigneeId)) {
    finalAssigneeIds.push(managerAssigneeId);
  }

  const filter = resolvedProjectId
    ? { project: resolvedProjectId }
    : { board: resolvedBoardId };
  const count = await Task.countDocuments(filter);
  const isMilestone = Boolean(body.isMilestone || type === "milestone" || (title && String(title).toLowerCase().startsWith("[milestone]")));

  const task = await Task.create({
    project: resolvedProjectId,
    board: resolvedBoardId || null,
    sprint: sprintId || null,
    parentTask: parentTaskId || null,
    reporter: reporterId || (currentEmployee ? String((currentEmployee as any)._id) : null),
    title: String(title).trim(),
    description: description || undefined,
    type: isMilestone ? "milestone" : TASK_TYPE_VALUES.includes(type) ? type : "task",
    isMilestone,
    status: status || "todo",
    assignee: finalAssigneeIds[0] || null,
    assignees: finalAssigneeIds,
    startDate: body.startDate ? new Date(body.startDate) : undefined,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    timeEstimateMinutes: typeof timeEstimateMinutes === "number" && timeEstimateMinutes >= 0
      ? Math.round(timeEstimateMinutes)
      : null,
    socialMediaPlanner:
      type === "social_media_planner"
        ? sanitizeSocialMediaPlanner(socialMediaPlanner)
        : null,
    priority: priority || "medium",
    order: count,
  });

  const populated = await Task.findById(task._id)
    .populate("assignees", "name email")
    .populate("assignee", "name email")
    .populate("reporter", "name email")
    .lean();

  const assigneesArr = ((populated as any).assignees || []).map((a: any) => ({
    id: String(a._id), name: a.name, email: a.email,
  }));

  // Create notifications + send emails for each assignee + manager
  try {
    const Project = (await import("@/models/Project")).Project;
    const notifications: Parameters<typeof Notification.create>[0][] = [];

    const creatorName = (currentEmployee as any)?.name || user.email;

    let projectName: string | undefined;
    let managerDoc: any = null;
    if (resolvedProjectId) {
      const proj = await Project.findById(resolvedProjectId)
        .populate("manager", "name email")
        .select("name manager")
        .lean();
      projectName = (proj as any)?.name;
      if ((proj as any)?.manager && typeof (proj as any).manager === "object") {
        managerDoc = (proj as any).manager;
      }
    }

    const startDateStr = startDate ? new Date(startDate).toLocaleDateString("en-IN") : null;
    const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString("en-IN") : null;

    const assigneeNames: string[] = [];
    for (const empId of finalAssigneeIds) {
      const employeeDoc = await Employee.findById(empId).select("email name").lean();
      if (!employeeDoc?.email) continue;
      assigneeNames.push((employeeDoc as any).name || employeeDoc.email);

      // Skip notification & email if the assignee is the person creating the task
      if (employeeDoc.email === user.email) continue;

      const assigneeUser = await User.findOne({ email: employeeDoc.email }).select("_id").lean();
      if (assigneeUser?._id) {
        notifications.push({
          user: assigneeUser._id,
          type: "task_assigned",
          title: "New task assigned to you",
          message: `Task "${String(title).trim()}" has been assigned to you`,
          link: "/dashboard/todo",
          data: {
            taskId: String(task._id),
            projectId: resolvedProjectId,
            boardId: resolvedBoardId,
          },
        });
      }

      try {
        await sendMail({
          to: employeeDoc.email,
          subject: `New Task Assigned: ${String(title).trim()}`,
          html: taskAssignedEmail({
            recipientName: (employeeDoc as any).name || "there",
            taskTitle: String(title).trim(),
            description,
            priority: priority || "medium",
            startDate: startDateStr,
            dueDate: dueDateStr,
            assignedBy: creatorName,
            projectName,
          }),
        });
      } catch (emailErr) {
        console.error("[tasks/POST] Failed to send assignee email:", emailErr);
      }
    }

    // Email project manager (if not the creator and not already an assignee)
    if (managerDoc?.email && managerDoc.email !== user.email) {
      const managerIsAssignee = finalAssigneeIds.includes(String(managerDoc._id));
      if (!managerIsAssignee) {
        try {
          await sendMail({
            to: managerDoc.email,
            subject: `New Task in Your Project: ${String(title).trim()}`,
            html: taskAssignedManagerEmail({
              managerName: managerDoc.name || "Manager",
              taskTitle: String(title).trim(),
              assigneeName: assigneeNames.join(", ") || "Unassigned",
              priority: priority || "medium",
              startDate: startDateStr,
              dueDate: dueDateStr,
              createdBy: creatorName,
              projectName,
            }),
          });
        } catch (emailErr) {
          console.error("[tasks/POST] Failed to send manager email:", emailErr);
        }
      }
    }

    if (notifications.length > 0) {
      await Notification.create(notifications);
    }
  } catch (notifErr) {
    console.error("[tasks/POST] Notification/email error:", notifErr);
  }

  return NextResponse.json(
    {
      task: {
        id: String(populated!._id),
        project: populated!.project ? String(populated!.project) : null,
        board: (populated as any).board ? String((populated as any).board) : null,
        parentTask: (populated as any).parentTask ? String((populated as any).parentTask) : null,
        reporter: (populated as any).reporter && typeof (populated as any).reporter === "object"
          ? {
            id: String((populated as any).reporter._id),
            name: (populated as any).reporter.name,
            email: (populated as any).reporter.email,
          }
          : null,
        title: populated!.title,
        description: populated!.description,
        type: (populated as any).type || "task",
        status: populated!.status,
        assignee: assigneesArr[0] || null,
        assignees: assigneesArr,
        startDate: (populated as any).startDate,
        dueDate: populated!.dueDate,
        timeEstimateMinutes: typeof (populated as any).timeEstimateMinutes === "number" ? (populated as any).timeEstimateMinutes : null,
        socialMediaPlanner: (populated as any).socialMediaPlanner || null,
        priority: populated!.priority,
        order: populated!.order,
      },
    },
    { status: 201 }
  );
}
