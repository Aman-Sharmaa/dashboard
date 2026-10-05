"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type TimelineEvent = {
  year: string;
  label: string;
  height: "low" | "mid" | "high";
  description?: string;
};

const EVENTS: TimelineEvent[] = [
  { year: "2012", label: "Founded", height: "low", description: "Kalp started its journey with a small team of passionate developers." },
  { year: "2012", label: "First $1M revenue", height: "high", description: "Reached our first major revenue milestone within 12 months." },
  { year: "2015", label: "Turned down $600M", height: "mid", description: "Decided to stay independent to protect our long-term vision." },
  { year: "2018", label: "Studios, acquire...", height: "low", description: "Acquired digital design studios to expand our product capabilities." },
  { year: "2021", label: "Launched Gram", height: "high", description: "Released our flagship hyperlocal delivery service platform." },
  { year: "2024", label: "Launched SniffUrl", height: "mid", description: "Introduced advanced URL shortener & analytics platform." },
  { year: "2026", label: "Reaching $20M ARR", height: "low", description: "Projected to cross $20M ARR milestone with global products." },
];

export function Timeline() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const getHeightClass = (height: "low" | "mid" | "high") => {
    switch (height) {
      case "low":
        return "h-16";
      case "mid":
        return "h-28";
      case "high":
        return "h-40";
    }
  };

  return (
    <div className="relative py-12 overflow-hidden w-full">
      {/* Title & Scroll Nav */}
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          What we've accomplished
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            className="h-9 w-9 rounded-full border-zinc-200 dark:border-zinc-800"
          >
            <ArrowLeft className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            className="h-9 w-9 rounded-full border-zinc-200 dark:border-zinc-800"
          >
            <ArrowRight className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          </Button>
        </div>
      </div>

      {/* Timeline Scroll Window */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-none flex gap-8 pb-10 pt-48 px-4 relative w-full select-none"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {/* Horizontal Baseline */}
        <div className="absolute bottom-[68px] left-0 right-0 h-[2px] bg-zinc-200 dark:bg-zinc-800 pointer-events-none" />

        {EVENTS.map((event, idx) => {
          const heightVal = getHeightClass(event.height);
          
          return (
            <div
              key={idx}
              className="flex-shrink-0 flex flex-col items-center justify-end relative w-72 scroll-snap-align-start"
            >
              {/* Event Card */}
              <div
                className={`absolute bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800 rounded-xl p-4 w-64 text-center transition-all hover:-translate-y-1 hover:shadow-lg`}
                style={{
                  bottom: event.height === "low" ? "130px" : event.height === "mid" ? "180px" : "230px",
                }}
              >
                <span className="text-xs font-semibold uppercase text-red-600 tracking-wider">
                  Milestone
                </span>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mt-1">
                  {event.label}
                </h4>
                {event.description && (
                  <p className="text-xs text-zinc-500 mt-2 font-normal leading-relaxed">
                    {event.description}
                  </p>
                )}
              </div>

              {/* Vertical Connector Line */}
              <div
                className={`w-[2px] bg-zinc-200 dark:bg-zinc-800 mb-[2px]`}
                style={{
                  height: event.height === "low" ? "60px" : event.height === "mid" ? "110px" : "160px",
                }}
              />

              {/* Node on Baseline */}
              <div className="w-3.5 h-3.5 rounded-full bg-red-600 border-4 border-white dark:border-zinc-950 shadow z-10 -mb-[7px]" />

              {/* Year Label */}
              <div className="mt-6 flex flex-col items-center">
                <span className="text-xs font-bold font-mono text-white bg-black dark:bg-zinc-800 px-3 py-1 rounded-full">
                  {event.year}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
