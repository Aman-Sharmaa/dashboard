import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { TaskComment } from "@/models/TaskComment";
import { Employee } from "@/models/Employee";
import { Task } from "@/models/Task";
import { Notification } from "@/models/Notification";
import { sendMail } from "@/lib/mailer";
import { taskCommentEmail } from "@/lib/email-templates";

const COOKIE_NAME = "kalp_auth_token";

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

// GET: list all comments for a task (flat list, client builds thread tree)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await connectDB();

    const comments = await TaskComment.find({ task: taskId })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      comments: comments.map((c: any) => ({
        id: String(c._id),
        taskId: String(c.task),
        parentId: c.parent ? String(c.parent) : null,
        authorEmail: c.authorEmail,
        authorName: c.authorName || c.authorEmail.split("@")[0],
        body: c.body,
        createdAt: c.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("GET /api/tasks/[id]/comments error:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

// POST: add a comment (or reply)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await connectDB();

    const body = await req.json();
    const { body: commentBody, parentId } = body;

    if (!commentBody || !String(commentBody).trim()) {
      return NextResponse.json({ message: "Comment body is required" }, { status: 400 });
    }

    let authorName = user.email.split("@")[0];
    const emp = await Employee.findOne({ email: user.email }).select("name").lean();
    if (emp && (emp as any).name) authorName = (emp as any).name;

    const comment = await TaskComment.create({
      task: taskId,
      parent: parentId || null,
      authorEmail: user.email,
      authorName,
      body: String(commentBody).trim(),
    });

    // Notify all assignees of the task (except the commenter)
    try {
      const task = await Task.findById(taskId)
        .populate("assignees", "name email")
        .populate("project", "name")
        .lean();

      if (task) {
        const User = (await import("@/models/User")).User;
        const Project = (await import("@/models/Project")).Project;
        const notifications: Parameters<typeof Notification.create>[0][] = [];

        let projectName: string | undefined;
        if (task.project) {
          const proj = typeof task.project === "object" && (task.project as any).name
            ? task.project
            : await Project.findById(task.project).select("name").lean();
          projectName = (proj as any)?.name;
        }

        const assignees: any[] = (task as any).assignees || [];
        for (const assignee of assignees) {
          if (!assignee?.email || assignee.email === user.email) continue;

          const assigneeUser = await User.findOne({ email: assignee.email }).select("_id").lean();
          if (assigneeUser?._id) {
            notifications.push({
              user: assigneeUser._id,
              type: "task_comment",
              title: parentId ? "New reply on task" : "New comment on task",
              message: `${authorName} ${parentId ? "replied on" : "commented on"} "${task.title}"`,
              link: "/dashboard/todo",
              data: { taskId, commentId: String(comment._id) },
            });
          }

          try {
            await sendMail({
              to: assignee.email,
              subject: `${parentId ? "Reply" : "Comment"} on Task: ${task.title}`,
              html: taskCommentEmail({
                recipientName: assignee.name || "there",
                taskTitle: task.title,
                commenterName: authorName,
                commentBody: String(commentBody).trim(),
                projectName,
                isReply: !!parentId,
              }),
            });
          } catch (emailErr) {
            console.error("[comments/POST] Failed to send comment email:", emailErr);
          }
        }

        if (notifications.length > 0) {
          await Notification.create(notifications);
        }
      }
    } catch (notifErr) {
      console.error("[comments/POST] Notification/email error:", notifErr);
    }

    return NextResponse.json({
      comment: {
        id: String(comment._id),
        taskId: String(comment.task),
        parentId: comment.parent ? String(comment.parent) : null,
        authorEmail: comment.authorEmail,
        authorName: comment.authorName || authorName,
        body: comment.body,
        createdAt: comment.createdAt,
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/tasks/[id]/comments error:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}
