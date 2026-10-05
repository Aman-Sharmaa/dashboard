import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { CompanyProfile } from "@/models/CompanyProfile";
import { cacheGetOrFetch, cacheDel } from "@/lib/cron-cache";

const CACHE_TTL = 5 * 60 * 60 * 1000; // 5 hours
const PROJECTS_CACHE_KEY = "cron:domain-status:projects";
const PROFILE_CACHE_KEY = "cron:domain-status:profile";

export async function checkUrl(url: string): Promise<{ ok: boolean; statusCode?: number }> {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "KalpDomainStatus/1.0" },
    });
    const ok = res.status >= 200 && res.status < 300;
    return { ok, statusCode: res.status };
  } catch {
    return { ok: false };
  }
}

export type DownEvent = {
  projectId: string;
  projectName: string;
  clientName: string;
  domain: string;
  statusCode?: number;
};

export async function runDomainStatusCheck(): Promise<{
  projectsChecked: number;
  downCount: number;
  downEvents: DownEvent[];
  fromCache: boolean;
}> {
  await connectDB();

  // ── 1. Load project list from cache (refreshes every 5 hours) ──────────────
  let fromCache = true;
  const projects = await cacheGetOrFetch(
    PROJECTS_CACHE_KEY,
    async () => {
      fromCache = false;
      return Project.find({
        "domains.0": { $exists: true },
        domains: { $ne: [] },
      })
        .populate("client", "name companyName")
        .lean();
    },
    CACHE_TTL
  ) as any[];

  // ── 2. Check all domains in parallel per project ───────────────────────────
  const downEvents: DownEvent[] = [];
  // Collect bulk writes to run in a single round-trip
  const bulkOps: any[] = [];

  await Promise.all(
    projects.map(async (project) => {
      const domains = (project.domains ?? []) as Array<{
        url: string;
        label?: string;
        lastChecked?: Date;
        isUp?: boolean;
        lastStatusCode?: number;
      }>;
      if (!domains.length) return;

      const updated = await Promise.all(
        domains.map(async (d) => {
          const { ok, statusCode } = await checkUrl(d.url);
          if (!ok) {
            downEvents.push({
              projectId: String(project._id),
              projectName: project.name,
              clientName:
                project.client?.companyName || project.client?.name || "",
              domain: d.url,
              statusCode,
            });
          }
          return {
            url: d.url,
            label: d.label,
            lastChecked: new Date(),
            isUp: ok,
            lastStatusCode: statusCode,
          };
        })
      );

      bulkOps.push({
        updateOne: {
          filter: { _id: project._id },
          update: { $set: { domains: updated } },
        },
      });
    })
  );

  // ── 3. Single bulkWrite instead of N individual updateOne calls ─────────────
  if (bulkOps.length > 0) {
    await Project.bulkWrite(bulkOps, { ordered: false });
    // Invalidate cached project list so next fetch picks up latest domain data
    cacheDel(PROJECTS_CACHE_KEY);
  }

  // ── 4. Webhook (only if something is down) ~ profile also cached ───────────
  if (downEvents.length > 0) {
    const profile = await cacheGetOrFetch(
      PROFILE_CACHE_KEY,
      () => CompanyProfile.findOne().lean(),
      CACHE_TTL
    ) as any;

    const webhookUrl = profile?.webhookUrl;
    if (webhookUrl && typeof webhookUrl === "string" && webhookUrl.startsWith("http")) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "service_down",
            at: new Date().toISOString(),
            count: downEvents.length,
            services: downEvents,
          }),
          signal: AbortSignal.timeout(10000),
        });
      } catch (err) {
        console.error("Webhook notification failed:", err);
      }
    }
  }

  return {
    projectsChecked: projects.length,
    downCount: downEvents.length,
    downEvents,
    fromCache,
  };
}

