import { connectDB } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { Routine } from "@/models/Routine";
import "@/models/Employee";

const TIMEZONE = "Asia/Kolkata";

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  const weekdayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
    weekday: weekdayIndex[value("weekday")],
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] || character);
}

export async function runIncompleteRoutineReminders(): Promise<{
  emailsSent: number;
  routinesReminded: number;
  skippedBeforeWorkingHour: number;
}> {
  await connectDB();
  const now = new Date();
  const localNow = localParts(now);
  const routines = await Routine.find({ status: "active" })
    .populate("ownerId", "name email workEndTime isDismissed isLoginDisabled")
    .lean();

  const grouped = new Map<string, { name: string; routineIds: string[]; titles: string[] }>();
  let skippedBeforeWorkingHour = 0;

  for (const routine of routines as any[]) {
    const owner = routine.ownerId;
    if (!owner?.email || owner.isDismissed || owner.isLoginDisabled) continue;
    if (!Array.isArray(routine.workingDays) || !routine.workingDays.includes(localNow.weekday)) continue;
    const workEndTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(owner.workEndTime || "") ? owner.workEndTime : "18:00";
    if (localNow.time <= workEndTime) {
      skippedBeforeWorkingHour++;
      continue;
    }
    const completedToday = (routine.completions || []).some((completion: any) =>
      localParts(new Date(completion.date)).date === localNow.date
    );
    if (completedToday || routine.lastReminderDate === localNow.date) continue;

    const claimed = await Routine.updateOne(
      { _id: routine._id, lastReminderDate: { $ne: localNow.date } },
      { $set: { lastReminderDate: localNow.date } }
    );
    if (claimed.modifiedCount !== 1) continue;

    const existing: { name: string; routineIds: string[]; titles: string[] } =
      grouped.get(owner.email) || { name: owner.name || "there", routineIds: [], titles: [] };
    existing.routineIds.push(String(routine._id));
    existing.titles.push(routine.title);
    grouped.set(owner.email, existing);
  }

  let emailsSent = 0;
  let routinesReminded = 0;
  for (const [email, group] of grouped) {
    const items = group.titles.map((title) => `<li style="margin-bottom:8px"><strong>${escapeHtml(title)}</strong></li>`).join("");
    try {
      await sendMail({
        to: email,
        subject: `Incomplete routine reminder (${group.titles.length})`,
        html: `<div style="font-family:Arial,sans-serif;color:#222"><p>Hi ${escapeHtml(group.name)},</p><p>Your working hours have ended and the following scheduled routine${group.titles.length > 1 ? "s are" : " is"} still incomplete:</p><ul>${items}</ul><p>Please open the Kalp dashboard and update ${group.titles.length > 1 ? "their" : "its"} status.</p></div>`,
      });
      emailsSent++;
      routinesReminded += group.routineIds.length;
    } catch (error) {
      await Routine.updateMany(
        { _id: { $in: group.routineIds }, lastReminderDate: localNow.date },
        { $unset: { lastReminderDate: "" } }
      );
      console.error(`[routine-reminders] Failed to email ${email}`, error);
    }
  }

  return { emailsSent, routinesReminded, skippedBeforeWorkingHour };
}
