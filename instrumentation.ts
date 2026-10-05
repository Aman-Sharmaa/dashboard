export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMonitorCron } = await import("@/lib/monitor-cron");
    startMonitorCron();

    const { startTaskCron } = await import("@/lib/task-cron");
    startTaskCron();
  }
}
