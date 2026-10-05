import { connectDB } from "@/lib/db";
import { Monitor } from "@/models/Monitor";
import { MonitorGroup } from "@/models/MonitorGroup";
import { MonitorLog } from "@/models/MonitorLog";
import { CompanyProfile } from "@/models/CompanyProfile";
import { sendMail } from "@/lib/mailer";
import { cacheGetOrFetch } from "@/lib/cron-cache";

const CACHE_TTL = 5 * 60 * 60 * 1000; // 5 hours
const MONITORS_CACHE_KEY = "cron:monitors:list";
// Profile cache key per owner ~ avoids repeated CompanyProfile.findOne() calls

export type CheckResult = {
  ok: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
};

function isStatusUp(statusCode: number, upStatusCodes: number[] | undefined): boolean {
  if (!upStatusCodes?.length) return statusCode >= 200 && statusCode < 300;
  return upStatusCodes.includes(statusCode);
}

export async function checkMonitor(monitor: {
  url: string;
  method?: string;
  requestBody?: string;
  upStatusCodes?: number[];
}): Promise<CheckResult> {
  const start = Date.now();
  const method = (monitor.method || "GET").toUpperCase();
  const upStatusCodes = monitor.upStatusCodes || [];
  try {
    const normalized = monitor.url.startsWith("http") ? monitor.url : `https://${monitor.url}`;
    const init: RequestInit = {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "KalpMonitor/1.0", "Content-Type": "application/json" },
    };
    if (monitor.requestBody && ["POST", "PUT", "PATCH"].includes(method)) {
      init.body = monitor.requestBody;
    }
    const res = await fetch(normalized, init);
    const responseTimeMs = Date.now() - start;
    const ok = isStatusUp(res.status, upStatusCodes.length ? upStatusCodes : undefined);
    return { ok, statusCode: res.status, responseTimeMs };
  } catch (err: any) {
    const responseTimeMs = Date.now() - start;
    return {
      ok: false,
      responseTimeMs,
      error: err?.message || "Request failed",
    };
  }
}

export type DownEvent = {
  monitorId: string;
  monitorName: string;
  groupName: string;
  groupOwnerId?: string;
  url: string;
  type?: "http" | "api";
  statusCode?: number;
  error?: string;
  checkedAt?: string; // ISO
};

export type UpEvent = {
  monitorId: string;
  monitorName: string;
  groupName: string;
  groupOwnerId?: string;
  url: string;
  type?: "http" | "api";
  statusCode?: number;
  responseTimeMs?: number;
  checkedAt?: string; // ISO
};

async function sendDiscordAlert(
  webhookUrl: string,
  events: DownEvent[],
  _groupName: string
): Promise<void> {
  const content =
    events.length === 1
      ? null
      : `**${events.length} services are down.**`;

  const embeds = events.slice(0, 10).map((e) => {
    const title = `${e.groupName} ~ ${e.monitorName} is down`;
    const checkedAt = e.checkedAt || new Date().toISOString();
    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: "URL", value: e.url, inline: false },
      { name: "Type", value: (e.type || "http").toUpperCase(), inline: true },
      { name: "Status", value: e.statusCode != null ? String(e.statusCode) : "~", inline: true },
      { name: "Checked at", value: checkedAt, inline: true },
    ];
    if (e.error) {
      fields.push({ name: "Error", value: e.error.slice(0, 1000), inline: false });
    }
    return {
      title,
      url: e.url.startsWith("http") ? e.url : `https://${e.url}`,
      color: 0xed_42_45,
      fields,
      footer: { text: `Kalp Monitor · ${checkedAt}` },
    };
  });

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, embeds }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`Discord webhook failed: ${res.status}`);
  }
}

async function sendEmailAlert(
  toEmails: string[],
  events: DownEvent[],
  _groupName: string
): Promise<void> {
  if (!toEmails.length) return;

  const list = events
    .slice(0, 20)
    .map(
      (e) =>
        `• ${e.monitorName} (${e.groupName}): ${e.url}\n  Status: ${e.statusCode ?? "~"} ${e.error ? `| Error: ${e.error}` : ""}`
    )
    .join("\n");

  const subject =
    events.length === 1
      ? `[Monitor] ${events[0].groupName} ~ ${events[0].monitorName} is down`
      : `[Monitor] ${events.length} services are down`;

  const html = `
    <h2>Monitor Alert ~ Service(s) Down</h2>
    <p>The following monitored service(s) are not responding:</p>
    <pre style="background:#f5f5f5;padding:12px;border-radius:6px;overflow:auto;">${list}</pre>
    <p><small>Checked at ${events[0]?.checkedAt || new Date().toISOString()}</small></p>
    <p><small>Kalp Monitor</small></p>
  `;

  for (const to of toEmails) {
    const email = String(to).trim();
    if (email && email.includes("@")) {
      try {
        await sendMail({ to: email, subject, html });
      } catch (err) {
        console.error("Monitor email alert failed:", err);
      }
    }
  }
}

async function sendDiscordRecoveredAlert(
  webhookUrl: string,
  events: UpEvent[]
): Promise<void> {
  const content =
    events.length === 1
      ? null
      : `**${events.length} services are back up.**`;

  const embeds = events.slice(0, 10).map((e) => {
    const title = `${e.groupName} ~ ${e.monitorName} is back up`;
    const checkedAt = e.checkedAt || new Date().toISOString();
    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: "URL", value: e.url, inline: false },
      { name: "Type", value: (e.type || "http").toUpperCase(), inline: true },
      { name: "Status", value: e.statusCode != null ? String(e.statusCode) : "~", inline: true },
      { name: "Response time", value: e.responseTimeMs != null ? `${e.responseTimeMs} ms` : "~", inline: true },
      { name: "Checked at", value: checkedAt, inline: true },
    ];
    return {
      title,
      url: e.url.startsWith("http") ? e.url : `https://${e.url}`,
      color: 0x57f67b, // green
      fields,
      footer: { text: `Kalp Monitor · ${checkedAt}` },
    };
  });

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, embeds }),
    signal: AbortSignal.timeout(10000),
  });
}

export async function runMonitorChecks(): Promise<{
  checked: number;
  downCount: number;
  downEvents: DownEvent[];
  upCount: number;
  upEvents: UpEvent[];
  fromCache: boolean;
}> {
  await connectDB();

  const now = Date.now();

  // ── 1. Load monitor list from cache (refreshes every 5 hours) ─────────────
  let fromCache = true;
  const monitors = await cacheGetOrFetch(
    MONITORS_CACHE_KEY,
    async () => {
      fromCache = false;
      return Monitor.find({ enabled: true })
        .populate("group", "name owner")
        .sort({ group: 1, order: 1 })
        .lean();
    },
    CACHE_TTL
  ) as any[];

  const toCheck = monitors.filter((m: any) => {
    const last = m.lastChecked ? new Date(m.lastChecked).getTime() : 0;
    const intervalMs = (m.intervalMinutes || 5) * 60 * 1000;
    return now - last >= intervalMs;
  });

  // ── 2. Run all checks in parallel ─────────────────────────────────────────
  const downEvents: DownEvent[] = [];
  const upEvents: UpEvent[] = [];

  // Batched writes
  const logDocs: any[] = [];
  const monitorBulkOps: any[] = [];

  await Promise.all(
    toCheck.map(async (mon: any) => {
      const g = mon.group as any;
      const wasDown = mon.isUp === false;
      const { ok, statusCode, responseTimeMs, error } = await checkMonitor({
        url: mon.url,
        method: mon.method,
        requestBody: mon.requestBody,
        upStatusCodes: mon.upStatusCodes,
      });

      // Collect log doc for batch insert
      logDocs.push({
        monitor: mon._id,
        checkedAt: new Date(),
        isUp: ok,
        statusCode,
        responseTimeMs,
        error: ok ? undefined : error,
      });

      // Collect monitor status update for bulk write
      monitorBulkOps.push({
        updateOne: {
          filter: { _id: mon._id },
          update: {
            $set: {
              lastChecked: new Date(),
              isUp: ok,
              lastStatusCode: statusCode,
              lastResponseTimeMs: responseTimeMs,
            },
          },
        },
      });

      const checkedAt = new Date().toISOString();
      if (!ok) {
        downEvents.push({
          monitorId: String(mon._id),
          monitorName: mon.name,
          groupName: g?.name || "Monitor",
          groupOwnerId: g?.owner ? String(g.owner) : undefined,
          url: mon.url,
          type: mon.type || "http",
          statusCode,
          error,
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
          statusCode,
          responseTimeMs,
          checkedAt,
        });
      }
    })
  );

  // ── 3. Batch DB writes ~ single round-trip each ────────────────────────────
  await Promise.all([
    logDocs.length > 0 ? MonitorLog.insertMany(logDocs, { ordered: false }) : Promise.resolve(),
    monitorBulkOps.length > 0 ? Monitor.bulkWrite(monitorBulkOps, { ordered: false }) : Promise.resolve(),
  ]);

  // ── 4. Group events by owner for notifications ─────────────────────────────
  const downByGroup = new Map<string, DownEvent[]>();
  for (const e of downEvents) {
    const list = downByGroup.get(e.groupName) || [];
    list.push(e);
    downByGroup.set(e.groupName, list);
  }

  const upByGroup = new Map<string, UpEvent[]>();
  for (const e of upEvents) {
    const list = upByGroup.get(e.groupName) || [];
    list.push(e);
    upByGroup.set(e.groupName, list);
  }

  // ── 5. Cached profile lookups per owner ────────────────────────────────────
  const getProfile = async (ownerId: string | undefined) => {
    if (!ownerId) return null;
    return cacheGetOrFetch(
      `cron:monitors:profile:${ownerId}`,
      () => CompanyProfile.findOne({ owner: ownerId }).lean(),
      CACHE_TTL
    );
  };

  const sendWebhook = async (ownerId: string | undefined, fn: (url: string) => Promise<void>) => {
    const profile = await getProfile(ownerId);
    const webhook = (profile as any)?.webhookUrl;
    if (webhook && typeof webhook === "string" && webhook.startsWith("http")) {
      try {
        await fn(webhook);
      } catch (err) {
        console.error("Discord webhook alert failed:", err);
      }
    }
  };

  const sendEmailForDown = async (ownerId: string | undefined, events: DownEvent[], groupName: string) => {
    const profile = await getProfile(ownerId);
    const emails = (profile as any)?.monitorAlertEmails as string[] | undefined;
    const personalEmail = (profile as any)?.personalDetails?.email;
    const toEmails = Array.isArray(emails) && emails.length > 0
      ? emails.filter((e: string) => e && String(e).trim().includes("@"))
      : personalEmail
        ? [String(personalEmail).trim()]
        : [];
    if (toEmails.length > 0) {
      try {
        await sendEmailAlert(toEmails, events, groupName);
      } catch (err) {
        console.error("Monitor email alert failed:", err);
      }
    }
  };

  // Notify: down (Discord + Email)
  for (const [groupName, events] of downByGroup) {
    const ownerId = events[0]?.groupOwnerId;
    await sendWebhook(ownerId, (url) => sendDiscordAlert(url, events, groupName));
    await sendEmailForDown(ownerId, events, groupName);
  }

  // Notify: back up (recovered)
  for (const [_groupName, events] of upByGroup) {
    const ownerId = events[0]?.groupOwnerId;
    await sendWebhook(ownerId, (url) => sendDiscordRecoveredAlert(url, events));
  }

  return {
    checked: toCheck.length,
    downCount: downEvents.length,
    downEvents,
    upCount: upEvents.length,
    upEvents,
    fromCache,
  };
}
