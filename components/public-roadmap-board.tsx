"use client";

import { useEffect, useState, useMemo } from "react";
import { ExpandableDescription } from "@/components/expandable-description";
import { Loader2, CalendarIcon, ArrowRight, CheckCircle2 } from "lucide-react";
import Image from "next/image";

type Project = { id: string; name: string; description?: string };

type Employee = {
  id: string;
  name: string;
  title?: string;
  department?: string;
  avatarUrl?: string;
  type: string;
};

type RoadmapItem = {
  id: string;
  title: string;
  description?: string;
  status: string;
  targetDate?: string | null;
  impactScore?: number | null;
  theme?: string;
  createdBy?: string;
  createdByName?: string;
  completed?: boolean;
  completedBy?: string;
  completedByName?: string;
  completedAt?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  createdAt?: string;
};

type RoadmapColumn = {
  id: string;
  key: string;
  label: string;
  color: string;
  order: number;
};

function Avatar({ name, url }: { name?: string; url?: string }) {
  if (url) {
    return (
      <div className="h-7 w-7 rounded-full overflow-hidden border-2 border-white relative bg-zinc-200 shrink-0 shadow-sm">
        <Image src={url} alt={name || "User"} fill className="object-cover" sizes="28px" />
      </div>
    );
  }
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[9px] font-bold shrink-0 shadow-sm border-2 border-white">
      {initials}
    </span>
  );
}

function StatusDot({ color }: { color: string }) {
  return (
    <span
      className="h-2 w-2 rounded-full shrink-0 inline-block"
      style={{ backgroundColor: color }}
    />
  );
}

export function PublicRoadmapBoard() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [columns, setColumns] = useState<RoadmapColumn[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        const res = await fetch("/api/public/roadmap");
        if (!res.ok) {
          if (res.status === 403) throw new Error("This roadmap is currently private.");
          throw new Error("Failed to load roadmap.");
        }
        const data = await res.json();
        setItems(data.items || []);
        setColumns(data.columns || []);
        setProjects(data.projects || []);
        setEmployees(data.employees || []);
      } catch (err: any) {
        setError(err.message || "Could not load roadmap");
      } finally {
        setLoading(false);
      }
    };
    fetchRoadmap();
  }, []);

  // Group items by project
  const grouped = useMemo(() => {
    const map = new Map<string, { project: Project | null; items: RoadmapItem[] }>();
    projects.forEach((p) => map.set(p.id, { project: p, items: [] }));
    items.forEach((item) => {
      const pId = item.projectId;
      if (pId && map.has(pId)) {
        map.get(pId)!.items.push(item);
      } else {
        if (!map.has("other")) map.set("other", { project: null, items: [] });
        map.get("other")!.items.push(item);
      }
    });
    return Array.from(map.values()).filter((g) => g.items.length > 0);
  }, [items, projects]);

  // Status counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    columns.forEach((col) => {
      c[col.key] = items.filter((i) => i.status === col.key).length;
    });
    return c;
  }, [items, columns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-200" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">Loading roadmap…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4 text-3xl">🗺️</div>
        <h3 className="text-xl font-bold text-zinc-900">Roadmap Unavailable</h3>
        <p className="text-zinc-500 text-sm mt-2 max-w-sm">{error}</p>
      </div>
    );
  }

  const filteredGrouped = grouped.map((g) => ({
    ...g,
    items: g.items
      .filter((i) => activeFilter === "all" || i.status === activeFilter)
      .sort((a, b) => {
        const colA = columns.find(c => c.key === a.status);
        const colB = columns.find(c => c.key === b.status);
        const oa = colA ? colA.order : 99;
        const ob = colB ? colB.order : 99;
        return oa - ob;
      }),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-[#F7F5F1]">
      {/* ── Hero Header ── */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="max-w-[1100px] mx-auto px-6 py-14 md:py-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-[11px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full border border-indigo-100 mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 inline-block animate-pulse" />
                Product Roadmap
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-950 tracking-tight leading-[1.1]">
                Where We&apos;re<br className="hidden md:block" /> Headed
              </h1>
              <p className="mt-4 text-zinc-500 text-base leading-relaxed max-w-xl">
                A transparent view of what we&apos;re building — what&apos;s shipped, what&apos;s
                in progress, and what&apos;s on the horizon.
              </p>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="h-4 w-px bg-zinc-200" />
                <span className="font-medium text-zinc-700">{items.length}</span> total initiatives
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="h-4 w-px bg-zinc-200" />
                Last updated <span className="font-medium text-zinc-700 ml-1">{new Date().toLocaleString("default", { month: "long", year: "numeric" })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-zinc-200 shadow-sm">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-3">
            {[
              { key: "all", label: "All", color: "" },
              ...columns.map((c) => ({ key: c.key, label: c.label, color: c.color })),
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`shrink-0 flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border ${
                  activeFilter === key
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                    : "text-zinc-500 border-transparent hover:bg-zinc-100 hover:text-zinc-800"
                }`}
              >
                {key !== "all" && <StatusDot color={color} />}
                {label}
                <span className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeFilter === key ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
                }`}>
                  {counts[key] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-[1100px] mx-auto px-6 py-12 md:py-16">
        {filteredGrouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-4xl mb-3">🎯</div>
            <p className="text-zinc-500 text-sm">No items match the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-20">
            {filteredGrouped.map((group, idx) => {
              const pName = group.project ? group.project.name : "Other Initiatives";
              const pDesc = group.project?.description || "Ongoing improvements and standalone features.";
              const numStr = String(idx + 1).padStart(2, "0");
              const statusBreakdown = columns.filter(
                (c) => group.items.some((i) => i.status === c.key)
              );

              return (
                <div key={group.project?.id || "other"}>
                  {/* Project Header */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
                    <div className="flex items-start gap-4">
                      <span className="shrink-0 w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[11px] font-bold text-zinc-500 font-mono mt-0.5">
                        {numStr}
                      </span>
                      <div>
                        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{pName}</h2>
                        <p className="text-sm text-zinc-500 mt-1 max-w-xl leading-relaxed">{pDesc}</p>
                        {/* Status chips */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {statusBreakdown.map((col) => {
                            const n = group.items.filter((i) => i.status === col.key).length;
                            return (
                              <span
                                key={col.key}
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                                style={{
                                  color: col.color,
                                  backgroundColor: col.color + "10",
                                  borderColor: col.color + "20"
                                }}
                              >
                                <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ backgroundColor: col.color }} />
                                {col.label}
                                <span className="opacity-60">{n}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Timeline */}
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[19px] top-0 bottom-0 w-px bg-zinc-200 hidden md:block" />

                    <div className="space-y-3">
                      {group.items.map((item) => {
                        const colCfg = columns.find(c => c.key === item.status) || { label: item.status, color: "#71717a" };
                        let creatorAvatarUrl: string | undefined;
                        let creatorName = item.createdByName || item.createdBy;
                        if (item.createdBy && employees.length > 0) {
                          const emp = employees.find(
                            (e) => e.id === item.createdBy || e.name === item.createdByName
                          );
                          if (emp) { creatorAvatarUrl = emp.avatarUrl; creatorName = emp.name; }
                        }

                        return (
                          <div key={item.id} className="flex gap-0 md:gap-6 group">
                            {/* Timeline node */}
                            <div className="shrink-0 hidden md:flex flex-col items-center" style={{ width: 40 }}>
                              <div
                                className="h-[18px] w-[18px] rounded-full border-4 border-[#F7F5F1] shadow-sm mt-4 shrink-0 transition-transform duration-200 group-hover:scale-110"
                                style={{ backgroundColor: colCfg.color }}
                              />
                            </div>

                            {/* Card */}
                            <div className="flex-1 min-w-0 bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 hover:shadow-md transition-all duration-200 overflow-hidden">
                              <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-5">
                                {/* Left: content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start gap-3 flex-wrap">
                                    {/* Mobile dot */}
                                    <span className="md:hidden mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: colCfg.color }} />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start gap-2 flex-wrap">
                                        <h3 className={`text-[14px] font-semibold leading-snug ${item.completed ? "text-zinc-500 line-through decoration-zinc-400" : "text-zinc-900"}`}>{item.title}</h3>
                                        {item.theme && (
                                          <span className="shrink-0 text-[10px] font-medium text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full">
                                            {item.theme}
                                          </span>
                                        )}
                                      </div>
                                      {item.description && (
                                        <div className="mt-1.5">
                                          <ExpandableDescription html={item.description} />
                                        </div>
                                      )}
                                      {item.completed && item.completedByName && (
                                        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          Completed by {item.completedByName}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Right: meta */}
                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0">
                                  {/* Status badge */}
                                  <span
                                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border font-mono"
                                    style={{
                                      color: colCfg.color,
                                      backgroundColor: colCfg.color + "10",
                                      borderColor: colCfg.color + "20"
                                    }}
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colCfg.color }} />
                                    {colCfg.label}
                                  </span>

                                  {/* Target date */}
                                  {item.targetDate && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
                                      <CalendarIcon className="h-3 w-3" />
                                      {new Date(item.targetDate).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </div>
                                  )}

                                  {/* Creator avatar */}
                                  {creatorName && (
                                    <div className="flex items-center gap-1.5" title={creatorName}>
                                      <Avatar name={creatorName} url={creatorAvatarUrl} />
                                      <span className="text-[11px] text-zinc-500 hidden sm:inline truncate max-w-[80px]">
                                        {creatorName.split(" ")[0]}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {idx < filteredGrouped.length - 1 && (
                    <div className="mt-20 flex items-center gap-4">
                      <div className="flex-1 h-px bg-zinc-200" />
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-300 shrink-0" />
                      <div className="flex-1 h-px bg-zinc-200" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer note ── */}
        <div className="mt-20 pt-8 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-6">
            {columns.map((col) => (
              <span key={col.key} className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                {col.label}
              </span>
            ))}
          </div>
          <span>Updated {new Date().toLocaleString("default", { month: "long", year: "numeric" })}</span>
        </div>
      </div>
    </div>
  );
}
