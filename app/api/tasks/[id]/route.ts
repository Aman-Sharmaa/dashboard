import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { verifyToken } from "@/lib/auth";
import { Notification } from "@/models/Notification";
import { sendMail } from "@/lib/mailer";
import { getEmployeeWorkScope } from "@/lib/employee-work-scope";
import {
  taskAssignedEmail,
  taskAssignedManagerEmail,
  taskUpdatedEmail,
} from "@/lib/email-templates";

const COOKIE_NAME = "kalp_auth_token";

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  hold: "Hold",
  in_review: "In Review",
  done: "Completed",
  rejected: "Rejected",
};

const TASK_TYPE_VALUES = ["task", "bug", "social_media_planner"] as const;
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();

  const task = await Task.findById(id);
  if (!task) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const body = await req.json();

  // Snapshot previous values for change detection
  const prev = {
    title: task.title,
    description: task.description || "",
    type: (task as any).type || "task",
    status: task.status,
    priority: task.priority,
    label: (task as any).label || null,
    startDate: (task as any).startDate ? new Date((task as any).startDate).toISOString().slice(0, 10) : "",
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
    timeEstimateMinutes: typeof (task as any).timeEstimateMinutes === "number" ? Number((task as any).timeEstimateMinutes) : null,
    assigneeIds: ((task as any).assignees || []).map(String),
  };

  if (body.title !== undefined) task.title = body.title;
  if (body.description !== undefined) task.description = body.description;
  if (body.type !== undefined) {
    (task as any).type = TASK_TYPE_VALUES.includes(body.type) ? body.type : "task";
  }
  if (body.status !== undefined) {
    const wasDone = task.status === "done" || task.status === "completed";
    const willBeDone = body.status === "done" || body.status === "completed";
    task.status = body.status;
    if (willBeDone && !wasDone) (task as any).completedAt = new Date();
    if (!willBeDone && wasDone) (task as any).completedAt = null;
  }
  if (body.startDate !== undefined) (task as any).startDate = body.startDate ? new Date(body.startDate) : null;

  // Allow anyone to change dueDate; always record history when it changes
  if (body.dueDate !== undefined) {
    const newDueDate = body.dueDate ? new Date(body.dueDate) : null;
    const oldDueDateMs = task.dueDate ? new Date(task.dueDate).getTime() : 0;
    const newDueDateMs = newDueDate ? newDueDate.getTime() : 0;
    if (oldDueDateMs !== newDueDateMs) {
      if (!task.history) (task as any).history = [];
      (task as any).history.push({
        field: "dueDate",
        oldValue: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        newValue: newDueDate ? newDueDate.toISOString() : null,
        updatedBy: (user as any).name || (user as any).email || "Unknown",
        updatedAt: new Date(),
      });
    }
    task.dueDate = newDueDate;
  }

  if (body.timeEstimateMinutes !== undefined) {
    const estimate =
      typeof body.timeEstimateMinutes === "number" && body.timeEstimateMinutes >= 0
        ? Math.round(body.timeEstimateMinutes)
        : null;
    (task as any).timeEstimateMinutes = estimate;
  }
  if (body.priority !== undefined) task.priority = body.priority;
  if (body.label !== undefined) (task as any).label = body.label ? String(body.label).trim() : null;
  if (body.order !== undefined) task.order = body.order;
  if (body.projectId !== undefined) task.project = body.projectId || null;
  const previousBoardId = (task as any).board ? String((task as any).board) : null;
  let nextBoardId = previousBoardId;
  if (body.boardId !== undefined) {
    const Board = (await import("@/models/Board")).Board;
    if (body.boardId) {
      const targetBoard = await Board.findById(body.boardId).select("_id").lean();
      if (!targetBoard) return NextResponse.json({ message: "Board not found" }, { status: 404 });
      nextBoardId = String((targetBoard as any)._id);
      (task as any).board = nextBoardId;
    } else {
      let generalBoard = await Board.findOne({ type: "General" }).select("_id").lean();
      if (!generalBoard) {
        generalBoard = (await Board.create({ name: "General", type: "General", order: await Board.countDocuments() })).toObject();
      }
      nextBoardId = String((generalBoard as any)._id);
      (task as any).board = nextBoardId;
    }
  }
  if (body.sprintId !== undefined) (task as any).sprint = body.sprintId || null;
  if (body.parentTaskId !== undefined) (task as any).parentTask = body.parentTaskId || null;
  if (body.reporterId !== undefined) (task as any).reporter = body.reporterId || null;
  if (body.socialMediaPlanner !== undefined) {
    (task as any).socialMediaPlanner =
      body.type === "social_media_planner" || (task as any).type === "social_media_planner"
        ? sanitizeSocialMediaPlanner(body.socialMediaPlanner)
        : null;
  } else if ((task as any).type !== "social_media_planner") {
    (task as any).socialMediaPlanner = null;
  }

  let managerAssigneeId: string | null = null;
  if (body.includeProjectManager || body.assignToManager) {
    const Project = (await import("@/models/Project")).Project;
    const effectiveProjectId = body.projectId !== undefined ? body.projectId : task.project;
    if (effectiveProjectId) {
      const projectDoc = await Project.findById(effectiveProjectId).select("manager").lean();
      if (projectDoc && (projectDoc as any).manager) {
        managerAssigneeId = String((projectDoc as any).manager);
      }
    }
  }

  if (body.assigneeIds !== undefined) {
    const ids = Array.isArray(body.assigneeIds) ? body.assigneeIds.filter(Boolean) : [];
    if (managerAssigneeId && !ids.includes(managerAssigneeId)) {
      ids.push(managerAssigneeId);
    }
    (task as any).assignees = ids;
    task.assignee = ids[0] || null;
  } else if (body.assigneeId !== undefined) {
    const ids = body.assigneeId ? [body.assigneeId] : [];
    if (managerAssigneeId && !ids.includes(managerAssigneeId)) {
      ids.push(managerAssigneeId);
    }
    task.assignee = ids[0] || null;
    (task as any).assignees = ids;
  } else if (managerAssigneeId) {
    const ids = Array.isArray((task as any).assignees) ? (task as any).assignees.map(String) : [];
    if (!ids.includes(managerAssigneeId)) {
      ids.push(managerAssigneeId);
      (task as any).assignees = ids;
      task.assignee = ids[0] || null;
    }
  }

  await task.save();

  // A parent task and its subtasks are a single movable unit across boards.
  if (body.boardId !== undefined && nextBoardId !== previousBoardId && !(task as any).parentTask) {
    await Task.updateMany({ parentTask: task._id }, { $set: { board: nextBoardId } });
  }

  const updated = await Task.findById(task._id)
    .populate("assignees", "name email avatarUrl")
    .populate("assignee", "name email avatarUrl")
    .populate("reporter", "name email")
    .lean();

  const assigneesArr = ((updated as any).assignees || []).map((a: any) => ({
    id: String(a._id), name: a.name, email: a.email, avatarUrl: a.avatarUrl || null,
  }));

  const currentAssigneeIds = assigneesArr.map((a: any) => a.id);
  const newlyAdded = currentAssigneeIds.filter((aid: string) => !prev.assigneeIds.includes(aid));

  // Build change log (skip order-only or no-op changes)
  const changes: { field: string; from?: string; to: string }[] = [];
  if (body.status !== undefined && body.status !== prev.status) {
    changes.push({ field: "Status", from: body.status !== prev.status ? prev.status : undefined, to: body.status });
  }
  if (body.title !== undefined && body.title !== prev.title) {
    changes.push({ field: "Title", from: prev.title, to: body.title });
  }
  if (body.priority !== undefined && body.priority !== prev.priority) {
    changes.push({ field: "Priority", from: prev.priority, to: body.priority });
  }
  if (body.type !== undefined && body.type !== prev.type) {
    changes.push({ field: "Type", from: prev.type, to: body.type });
  }
  if (body.startDate !== undefined) {
    const newSD = body.startDate ? new Date(body.startDate).toISOString().slice(0, 10) : "";
    if (newSD !== prev.startDate) {
      changes.push({
        field: "Start Date",
        from: prev.startDate ? new Date(prev.startDate).toLocaleDateString("en-IN") : "Not set",
        to: newSD ? new Date(newSD).toLocaleDateString("en-IN") : "Removed",
      });
    }
  }
  if (body.dueDate !== undefined) {
    const newDD = body.dueDate ? new Date(body.dueDate).toISOString().slice(0, 10) : "";
    if (newDD !== prev.dueDate) {
      changes.push({
        field: "End Date",
        from: prev.dueDate ? new Date(prev.dueDate).toLocaleDateString("en-IN") : "Not set",
        to: newDD ? new Date(newDD).toLocaleDateString("en-IN") : "Removed",
      });
    }
  }
  if (body.description !== undefined && body.description !== prev.description) {
    changes.push({ field: "Description", to: "Updated" });
  }
  if (body.timeEstimateMinutes !== undefined && body.timeEstimateMinutes !== prev.timeEstimateMinutes) {
    changes.push({
      field: "Time Estimate",
      from: prev.timeEstimateMinutes ? `${prev.timeEstimateMinutes}m` : "Not set",
      to: body.timeEstimateMinutes ? `${body.timeEstimateMinutes}m` : "Removed",
    });
  }

  // Notifications + emails
  try {
    const Employee = (await import("@/models/Employee")).Employee;
    const User = (await import("@/models/User")).User;
    const Project = (await import("@/models/Project")).Project;

    const notifications: Parameters<typeof Notification.create>[0][] = [];

    const creatorEmployee = await Employee.findOne({ email: user.email }).select("name").lean();
    const creatorName = (creatorEmployee as any)?.name || user.email;

    let projectName: string | undefined;
    let managerDoc: any = null;
    if (updated?.project) {
      const proj = await Project.findById(updated.project)
        .populate("manager", "name email")
        .select("name manager")
        .lean();
      projectName = (proj as any)?.name;
      if ((proj as any)?.manager && typeof (proj as any).manager === "object") {
        managerDoc = (proj as any).manager;
      }
    }

    const startDateStr = (updated as any)?.startDate
      ? new Date((updated as any).startDate).toLocaleDateString("en-IN")
      : null;
    const dueDateStr = updated?.dueDate
      ? new Date(updated.dueDate).toLocaleDateString("en-IN")
      : null;

    const assigneeNames: string[] = [];

    // ── 1. Newly assigned members → "Task Assigned" email ──
    for (const empId of newlyAdded) {
      const employeeDoc = await Employee.findById(empId).select("email name").lean();
      if (!employeeDoc?.email) continue;
      assigneeNames.push((employeeDoc as any).name || employeeDoc.email);
      if (employeeDoc.email === user.email) continue;

      const assigneeUser = await User.findOne({ email: employeeDoc.email }).select("_id").lean();
      if (assigneeUser?._id) {
        notifications.push({
          user: assigneeUser._id,
          type: "task_assigned",
          title: "You were assigned a task",
          message: `Task "${updated?.title ?? ""}" has been assigned to you`,
          link: "/dashboard/todo",
          data: { taskId: String(task._id), projectId: updated?.project ? String(updated.project) : null, boardId: (updated as any).board ? String((updated as any).board) : null },
        });
      }

      try {
        await sendMail({
          to: employeeDoc.email,
          subject: `Task Assigned: ${updated?.title ?? ""}`,
          html: taskAssignedEmail({
            recipientName: (employeeDoc as any).name || "there",
            taskTitle: updated?.title ?? "",
            description: updated?.description,
            priority: updated?.priority || "medium",
            startDate: startDateStr,
            dueDate: dueDateStr,
            assignedBy: creatorName,
            projectName,
          }),
        });
      } catch (emailErr) {
        console.error("[tasks/PATCH] Failed to send assignee email:", emailErr);
      }
    }

    // ── 2. Manager notification for new assignees ──
    if (newlyAdded.length > 0 && managerDoc?.email && managerDoc.email !== user.email) {
      const managerIsAssignee = currentAssigneeIds.includes(String(managerDoc._id));
      if (!managerIsAssignee) {
        try {
          await sendMail({
            to: managerDoc.email,
            subject: `Task Updated in Your Project: ${updated?.title ?? ""}`,
            html: taskAssignedManagerEmail({
              managerName: managerDoc.name || "Manager",
              taskTitle: updated?.title ?? "",
              assigneeName: assigneeNames.join(", ") || "Unassigned",
              priority: updated?.priority || "medium",
              startDate: startDateStr,
              dueDate: dueDateStr,
              createdBy: creatorName,
              projectName,
            }),
          });
        } catch (emailErr) {
          console.error("[tasks/PATCH] Failed to send manager email:", emailErr);
        }
      }
    }

    // ── 3. Any changes → "Task Updated" email to existing assignees ──
    if (changes.length > 0) {
      const statusChanged = changes.some((c) => c.field === "Status");
      const subjectLine = statusChanged
        ? `Task ${STATUS_LABELS[body.status] || body.status}: ${updated?.title ?? ""}`
        : `Task Updated: ${updated?.title ?? ""}`;
      const notifMsg = statusChanged
        ? `Status changed to "${STATUS_LABELS[body.status] || body.status}" on "${updated?.title ?? ""}"`
        : `Task "${updated?.title ?? ""}" was updated`;

      for (const empId of currentAssigneeIds) {
        if (newlyAdded.includes(empId)) continue;
        const employeeDoc = await Employee.findById(empId).select("email name").lean();
        if (!employeeDoc?.email || employeeDoc.email === user.email) continue;

        const assigneeUser = await User.findOne({ email: employeeDoc.email }).select("_id").lean();
        if (assigneeUser?._id) {
          notifications.push({
            user: assigneeUser._id,
            type: "task_updated",
            title: statusChanged ? "Task status updated" : "Task updated",
            message: notifMsg,
            link: "/dashboard/todo",
            data: { taskId: String(task._id), projectId: updated?.project ? String(updated.project) : null, boardId: (updated as any).board ? String((updated as any).board) : null },
          });
        }

        try {
          await sendMail({
            to: employeeDoc.email,
            subject: subjectLine,
            html: taskUpdatedEmail({
              recipientName: (employeeDoc as any).name || "there",
              taskTitle: updated?.title ?? "",
              updatedBy: creatorName,
              projectName,
              changes,
              priority: updated?.priority || "medium",
              startDate: startDateStr,
              dueDate: dueDateStr,
            }),
          });
        } catch (emailErr) {
          console.error("[tasks/PATCH] Failed to send update email:", emailErr);
        }
      }
    }

    if (notifications.length > 0) {
      await Notification.create(notifications);
    }
  } catch (notifErr) {
    console.error("[tasks/PATCH] Notification/email error:", notifErr);
  }

  return NextResponse.json({
    task: {
      id: String(updated!._id),
      project: updated!.project ? String(updated!.project) : null,
      sprint: (updated as any).sprint ? String((updated as any).sprint) : null,
      board: (updated as any).board ? String((updated as any).board) : null,
      parentTask: (updated as any).parentTask ? String((updated as any).parentTask) : null,
      reporter: (updated as any).reporter && typeof (updated as any).reporter === "object"
        ? {
            id: String((updated as any).reporter._id),
            name: (updated as any).reporter.name,
            email: (updated as any).reporter.email,
          }
        : null,
      title: updated!.title,
      description: updated!.description,
      type: (updated as any).type || "task",
      status: updated!.status,
      assignee: assigneesArr[0] || null,
      assignees: assigneesArr,
      startDate: (updated as any).startDate,
      dueDate: updated!.dueDate,
      timeEstimateMinutes: typeof (updated as any).timeEstimateMinutes === "number" ? (updated as any).timeEstimateMinutes : null,
      socialMediaPlanner: (updated as any).socialMediaPlanner || null,
      priority: updated!.priority,
      label: (updated as any).label || null,
      order: updated!.order,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const existingTask = await Task.findById(id).select("assignee assignees").lean();
  if (!existingTask) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (user.role !== "admin") {
    const scope = await getEmployeeWorkScope(user.email);
    if (!scope.isManager) return NextResponse.json({ message: "Only admins or managers can delete tasks" }, { status: 403 });
    const assignedIds = [
      ...((existingTask as any).assignees || []).map(String),
      ...((existingTask as any).assignee ? [String((existingTask as any).assignee)] : []),
    ];
    if (!assignedIds.some((employeeId) => scope.employeeIds.map(String).includes(employeeId))) {
      return NextResponse.json({ message: "You can only delete your team's tasks" }, { status: 403 });
    }
  }
  const task = await Task.findByIdAndDelete(id);
  if (!task) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
