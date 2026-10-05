import cron, { type ScheduledTask } from "node-cron";
import { connectDB } from "@/lib/db";
import { Monitor } from "@/models/Monitor";
import { MonitorLog } from "@/models/MonitorLog";
import { MonitorGroup } from "@/models/MonitorGroup";
import { CompanyProfile } from "@/models/CompanyProfile";
import { checkMonitor, type DownEvent, type UpEvent } from "@/lib/monitor-check";
import { getIO } from "@/lib/socket-server";
import { sendMail } from "@/lib/mailer";

const BATCH_SIZE = 5;
const CHECK_INTERVAL_CRON = "*/2 * * * *"; // every 2 minutes

let isRunning = false;
let taskRef: ScheduledTask | null = null;

async function sendDiscordWebhook(
  webhookUrl: string,
  embeds: any[],
  content?: string | null
) {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, embeds }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error("[monitor-cron] Discord webhook failed:", err);
  }
}

async function notifyAlerts(downEvents: DownEvent[], upEvents: UpEvent[]) {
  const downByOwner = new Map<string, DownEvent[]>();
  for (const e of downEvents) {
    const key = e.groupOwnerId || "_none";
    const list = downByOwner.get(key) || [];
    list.push(e);
    downByOwner.set(key, list);
  }

  const upByOwner = new Map<string, UpEvent[]>();
  for (const e of upEvents) {
    const key = e.groupOwnerId || "_none";
    const list = upByOwner.get(key) || [];
    list.push(e);
    upByOwner.set(key, list);
  }

  const getProfile = async (ownerId: string) => {
    if (ownerId === "_none") return null;
    return CompanyProfile.findOne({ owner: ownerId }).lean();
  };

  for (const [ownerId, events] of downByOwner) {
    const profile = await getProfile(ownerId) as any;
    const webhook = profile?.webhookUrl;
    if (webhook && typeof webhook === "string" && webhook.startsWith("http")) {
      const embeds = events.slice(0, 10).map((e) => ({
        title: `${e.groupName} ~ ${e.monitorName} is down`,
        url: e.url.startsWith("http") ? e.url : `https://${e.url}`,
        color: 0xed4245,
        fields: [
          { name: "URL", value: e.url, inline: false },
          { name: "Type", value: (e.type || "http").toUpperCase(), inline: true },
          { name: "Status", value: e.statusCode != null ? String(e.statusCode) : "~", inline: true },
          { name: "Checked at", value: e.checkedAt || new Date().toISOString(), inline: true },
          ...(e.error ? [{ name: "Error", value: e.error.slice(0, 1000), inline: false }] : []),
        ],
        footer: { text: `Kalp Monitor · ${e.checkedAt || new Date().toISOString()}` },
      }));
      await sendDiscordWebhook(webhook, embeds, events.length > 1 ? `**${events.length} services are down.**` : null);
    }

    const emails = (profile?.monitorAlertEmails as string[] | undefined) || [];
    const personalEmail = profile?.personalDetails?.email;
    const toEmails = emails.length > 0
      ? emails.filter((em: string) => em && String(em).trim().includes("@"))
      : personalEmail ? [String(personalEmail).trim()] : [];

    if (toEmails.length > 0) {
      const list = events.slice(0, 20).map((e) =>
        `• ${e.monitorName} (${e.groupName}): ${e.url}\n  Status: ${e.statusCode ?? "~"} ${e.error ? `| Error: ${e.error}` : ""}`
      ).join("\n");
      const subject = events.length === 1
        ? `[Monitor] ${events[0].groupName} ~ ${events[0].monitorName} is down`
        : `[Monitor] ${events.length} services are down`;
      const html = `<h2>Monitor Alert ~ Service(s) Down</h2><pre style="background:#f5f5f5;padding:12px;border-radius:6px;">${list}</pre><p><small>Kalp Monitor</small></p>`;
      for (const to of toEmails) {
        try { await sendMail({ to, subject, html }); } catch { }
      }
    }
  }

  for (const [ownerId, events] of upByOwner) {
    const profile = await getProfile(ownerId) as any;
    const webhook = profile?.webhookUrl;
    if (webhook && typeof webhook === "string" && webhook.startsWith("http")) {
      const embeds = events.slice(0, 10).map((e) => ({
        title: `${e.groupName} ~ ${e.monitorName} is back up`,
        url: e.url.startsWith("http") ? e.url : `https://${e.url}`,
        color: 0x57f67b,
        fields: [
          { name: "URL", value: e.url, inline: false },
          { name: "Status", value: e.statusCode != null ? String(e.statusCode) : "~", inline: true },
          { name: "Response time", value: e.responseTimeMs != null ? `${e.responseTimeMs} ms` : "~", inline: true },
        ],
        footer: { text: `Kalp Monitor · ${e.checkedAt || new Date().toISOString()}` },
      }));
      await sendDiscordWebhook(webhook, embeds, events.length > 1 ? `**${events.length} services are back up.**` : null);
    }
  }
}

async function runCronCycle() {
  if (isRunning) {
    console.log("[monitor-cron] Previous cycle still running, skipping");
    return;
  }
  isRunning = true;

  try {
    await connectDB();
    // Ensure referenced models are registered before populate
    void MonitorGroup.modelName;
    void CompanyProfile.modelName;

    const now = Date.now();

    const monitors = await Monitor.find({ enabled: true })
      .populate("group", "name owner")
      .sort({ group: 1, order: 1 })
      .lean();

    const toCheck = monitors.filter((m: any) => {
      const last = m.lastChecked ? new Date(m.lastChecked).getTime() : 0;
      const intervalMs = (m.intervalMinutes || 5) * 60 * 1000;
      return now - last >= intervalMs;
    });

    if (toCheck.length === 0) {
      isRunning = false;
      return;
    }

    console.log(`[monitor-cron] Checking ${toCheck.length} monitors...`);

    const downEvents: DownEvent[] = [];
    const upEvents: UpEvent[] = [];
    const updatedMonitorIds: string[] = [];

    for (let i = 0; i < toCheck.length; i += BATCH_SIZE) {
      const batch = toCheck.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (mon) => {
          const g = mon.group as any;
          const wasDown = mon.isUp === false;
          const result = await checkMonitor({
            url: mon.url,
            method: mon.method,
            requestBody: mon.requestBody,
            upStatusCodes: mon.upStatusCodes,
          });

          await MonitorLog.create({
            monitor: mon._id,
            checkedAt: new Date(),
            isUp: result.ok,
            statusCode: result.statusCode,
            responseTimeMs: result.responseTimeMs,
            error: result.ok ? undefined : result.error,
          });

          await Monitor.updateOne(
            { _id: mon._id },
            {
              $set: {
                lastChecked: new Date(),
                isUp: result.ok,
                lastStatusCode: result.statusCode,
                lastResponseTimeMs: result.responseTimeMs,
              },
            }
          );

          updatedMonitorIds.push(String(mon._id));

          const checkedAt = new Date().toISOString();
          if (!result.ok) {
            downEvents.push({
              monitorId: String(mon._id),
              monitorName: mon.name,
              groupName: g?.name || "Monitor",
              groupOwnerId: g?.owner ? String(g.owner) : undefined,
              url: mon.url,
              type: mon.type || "http",
              statusCode: result.statusCode,
              error: result.error,
              checkedAt,
            });
          } else if (wasDown) {
            upEvents.push({
              monitorId: String(mon._id),
              monitorName: mon.name,
              groupName: g?.name || "Monitor",
              groupOwnerId: g?.owner ? String(g.owner) : undefined,
              url: mon.url,
              type: mon.type || "http",
              statusCode: result.statusCode,
              responseTimeMs: result.responseTimeMs,
              checkedAt,
            });
          }

          return { monitorId: String(mon._id), ...result };
        })
      );

      for (const r of results) {
        if (r.status === "rejected") {
          console.error("[monitor-cron] Check failed:", r.reason);
        }
      }
    }

    // Send alerts for down/recovered monitors
    if (downEvents.length > 0 || upEvents.length > 0) {
      await notifyAlerts(downEvents, upEvents);
    }

    // Push real-time update via Socket.io to all connected dashboard clients
    const io = getIO();
    if (io) {
      io.emit("monitor-update", {
        timestamp: Date.now(),
        checked: toCheck.length,
        downCount: downEvents.length,
        upCount: upEvents.length,
        updatedMonitorIds,
        downEvents: downEvents.map((e) => ({
          monitorId: e.monitorId,
          monitorName: e.monitorName,
          groupName: e.groupName,
          url: e.url,
          statusCode: e.statusCode,
          error: e.error,
        })),
        upEvents: upEvents.map((e) => ({
          monitorId: e.monitorId,
          monitorName: e.monitorName,
          groupName: e.groupName,
          url: e.url,
          statusCode: e.statusCode,
          responseTimeMs: e.responseTimeMs,
        })),
      });
    }

    console.log(`[monitor-cron] Done. Checked: ${toCheck.length}, Down: ${downEvents.length}, Recovered: ${upEvents.length}`);
  } catch (err) {
    console.error("[monitor-cron] Cycle error:", err);
  } finally {
    isRunning = false;
  }
}

export function startMonitorCron() {
  if (taskRef) {
    console.log("[monitor-cron] Already running");
    return;
  }

  console.log("[monitor-cron] Starting scheduler (every 2 minutes)");

  taskRef = cron.schedule(CHECK_INTERVAL_CRON, () => {
    runCronCycle();
  });

  // Run the first check 10 seconds after startup to let the server fully initialize
  setTimeout(() => {
    console.log("[monitor-cron] Running initial check...");
    runCronCycle();
  }, 10_000);
}

export function stopMonitorCron() {
  if (taskRef) {
    taskRef.stop();
    taskRef = null;
    console.log("[monitor-cron] Stopped");
  }
}
