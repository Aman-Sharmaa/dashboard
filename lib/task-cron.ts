import cron, { type ScheduledTask } from "node-cron";
import { runScheduledOverdueTaskEmails } from "@/lib/tasks-overdue";

let taskRef: ScheduledTask | null = null;

const SCHEDULE_CHECK = "* * * * *";

export function startTaskCron() {
  if (taskRef) {
    console.log("[task-cron] Already running");
    return;
  }

  console.log("[task-cron] Starting dynamic overdue-email schedule checker");

  taskRef = cron.schedule(SCHEDULE_CHECK, () => {
    void runScheduledOverdueTaskEmails().catch((err) => {
      console.error("[task-cron] Overdue digest error:", err);
    });
  });
}

export function stopTaskCron() {
  if (taskRef) {
    taskRef.stop();
    taskRef = null;
    console.log("[task-cron] Stopped");
  }
}
