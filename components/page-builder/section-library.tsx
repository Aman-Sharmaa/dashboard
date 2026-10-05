"use client";

import { SECTION_LIBRARY, SectionMeta, SectionType } from "./section-types";
import * as Icons from "lucide-react";

const CATEGORIES = ["Layout", "Basic", "Forms", "Navigation", "Cards", "CMS", "Media", "Interactive", "Animation", "Marketing", "Kalp"] as const;

interface SectionLibraryProps {
  onAdd: (type: SectionType) => void;
}

export function SectionLibraryPanel({ onAdd }: SectionLibraryProps) {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-zinc-150 h-full flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-zinc-100">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Sections</h2>
        <p className="text-[11px] text-zinc-400 mt-0.5">Click to add to canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {CATEGORIES.map((category) => {
          const items = SECTION_LIBRARY.filter((s) => s.category === category);
          if (!items.length) return null;
          return (
            <div key={category}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1 mb-2">
                {category}
              </p>
              <div className="space-y-1">
                {items.map((meta) => (
                  <SectionCard key={meta.type} meta={meta} onAdd={onAdd} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function SectionCard({ meta, onAdd }: { meta: SectionMeta; onAdd: (t: SectionType) => void }) {
  // @ts-ignore dynamic icon
  const Icon = (Icons as any)[meta.icon] || Icons.Square;
  return (
    <button
      onClick={() => onAdd(meta.type)}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-zinc-50 active:bg-zinc-100 transition-colors group"
    >
      <div className="w-8 h-8 rounded-lg bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center shrink-0 transition-colors">
        <Icon className="w-4 h-4 text-zinc-700" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-900 leading-none">{meta.label}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug truncate">{meta.description}</p>
      </div>
    </button>
  );
}
