import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { sendMail } from "@/lib/mailer";
import { CompanyProfile } from "@/models/CompanyProfile";
import { format } from "date-fns";

// Side-effect import: registers the Employee model so populate() works
import "@/models/Employee";

export async function runOverdueTaskEmails(): Promise<{
  emailsSent: number;
  totalOverdueProcessed: number;
}> {
  await connectDB();
  const now = new Date();

  const overdueTasks = await Task.find({
    dueDate: { $lt: now },
    status: { $nin: ["done", "rejected", "production"] },
  }).populate("assignees", "name email isOutsider");

  // Group tasks by assignee email
  const emailsToSend: Record<string, { employeeName: string; tasks: any[] }> = {};

  for (const task of overdueTasks) {
    if (!task.assignees || task.assignees.length === 0) continue;
    for (const employee of task.assignees as any[]) {
      if (!employee.email || employee.isOutsider) continue;
      if (!emailsToSend[employee.email]) {
        emailsToSend[employee.email] = { employeeName: employee.name, tasks: [] };
      }
      emailsToSend[employee.email].tasks.push(task);
    }
  }

  let emailsSent = 0;
  for (const [email, data] of Object.entries(emailsToSend)) {
    if (data.tasks.length === 0) continue;

    const taskItems = data.tasks
      .map((t) => {
        const dueDateFormatted = t.dueDate
          ? format(new Date(t.dueDate), "do MMM yyyy, h:mm a")
          : "Passed";
        return `
          <li style="margin-bottom: 8px;">
            <strong>${t.title}</strong>
            <br />
            <span style="color: #ef4444; font-size: 0.9em;">Overdue since: ${dueDateFormatted}</span>
          </li>
        `;
      })
      .join("");

    const subject = `You have ${data.tasks.length} overdue task(s)`;
    const html = `
      <div style="font-family: sans-serif; color: #333;">
        <p>Hi ${data.employeeName},</p>
        <p>This is a gentle reminder that the following task(s) assigned to you are currently overdue:</p>
        <ul style="padding-left: 20px;">${taskItems}</ul>
        <p>Please log in to the Kalp dashboard to update their status.</p>
      </div>
    `;

    try {
      await sendMail({ to: email, subject, html });
      emailsSent++;
    } catch (err) {
      console.error(`Failed to send overdue notification to ${email}`, err);
    }
  }

  return { emailsSent, totalOverdueProcessed: overdueTasks.length };
}

export async function runScheduledOverdueTaskEmails(): Promise<{
  skipped?: "disabled" | "not_due" | "already_sent" | "not_configured";
  emailsSent: number;
  totalOverdueProcessed: number;
}> {
  await connectDB();

  const profile = await CompanyProfile.findOne()
    .select("taskEmailNotifications")
    .lean();
  if (!profile) {
    return { skipped: "not_configured", emailsSent: 0, totalOverdueProcessed: 0 };
  }

  const settings = (profile as any).taskEmailNotifications || {};
  if (settings.enabled === false) {
    return { skipped: "disabled", emailsSent: 0, totalOverdueProcessed: 0 };
  }

  const timezone = settings.timezone || "Asia/Kolkata";
  const sendTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.sendTime || "")
    ? settings.sendTime
    : "14:30";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  const today = `${value("year")}-${value("month")}-${value("day")}`;
  const currentTime = `${value("hour")}:${value("minute")}`;

  if (currentTime < sendTime) {
    return { skipped: "not_due", emailsSent: 0, totalOverdueProcessed: 0 };
  }

  const claimed = await CompanyProfile.findOneAndUpdate(
    {
      _id: (profile as any)._id,
      "taskEmailNotifications.enabled": { $ne: false },
      "taskEmailNotifications.lastSentDate": { $ne: today },
    },
    { $set: { "taskEmailNotifications.lastSentDate": today } },
    { new: true }
  ).lean();
  if (!claimed) {
    return { skipped: "already_sent", emailsSent: 0, totalOverdueProcessed: 0 };
  }

  return runOverdueTaskEmails();
}
