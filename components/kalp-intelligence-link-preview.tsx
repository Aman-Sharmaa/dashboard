"use client";

import { motion } from "framer-motion";
import { Link2 } from "lucide-react";

const PREVIEW_DATA = {
  title: "Webwrite ~ Innovation Studio",
  description:
    "Born to create innovative products. Building modern SaaS, AI solutions, mobile apps, and digital products.",
  image: "https://kalpintelligence.com/opengraph-image",
  favicon: "https://kalpintelligence.com/favicon.png",
  domain: "kalpintelligence.com",
  url: "https://kalpintelligence.com",
};

export function KalpIntelligenceLinkPreview() {
  return (
    <motion.a
      href={PREVIEW_DATA.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group block w-full max-w-[340px] rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.08) inset",
      }}
    >
      {/* ── OG image ── */}
      <div className="relative w-full aspect-[1200/630] bg-gray-900 overflow-hidden">
        {/* shimmer placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />

        {/* actual image */}
        <img
          src={PREVIEW_DATA.image}
          alt={PREVIEW_DATA.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          onLoad={(e) => {
            (e.currentTarget.previousElementSibling as HTMLElement).style.display =
              "none";
          }}
          onError={(e) => {
            // fallback gradient when OG image fails
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />

        {/* subtle top glare */}
        <div
          className="absolute top-0 left-0 right-0 h-16 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Meta info ── */}
      <div className="px-4 py-3.5">
        {/* title */}
        <p className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-gray-100 transition-colors">
          {PREVIEW_DATA.title}
        </p>

        {/* description */}
        <p className="mt-1 text-xs text-white/50 leading-relaxed line-clamp-2">
          {PREVIEW_DATA.description}
        </p>

        {/* domain row */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* favicon */}
            <div className="w-4 h-4 rounded-sm overflow-hidden flex-shrink-0 bg-white/10">
              <img
                src={PREVIEW_DATA.favicon}
                alt=""
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-white/30 m-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>';
                }}
              />
            </div>

            {/* link icon + domain */}
            <Link2 className="w-3 h-3 text-white/30 flex-shrink-0" />
            <span className="text-xs text-white/40 truncate font-mono">
              {PREVIEW_DATA.domain}
            </span>
          </div>

          {/* external badge */}
          <div
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors group-hover:bg-white/15"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5 text-white/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </div>
        </div>
      </div>
    </motion.a>
  );
}

/* ── Standalone chat-bubble wrapper (WhatsApp-style) ── */
export function KalpIntelligenceLinkPreviewChat() {
  return (
    <div className="flex flex-col items-end gap-1 select-none">
      {/* url chip ~ like WhatsApp shows the raw link above */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="px-3 py-1.5 rounded-full text-xs font-medium"
        style={{
          background: "rgba(34,197,94,0.15)",
          border: "1px solid rgba(34,197,94,0.25)",
          color: "rgba(134,239,172,0.9)",
        }}
      >
        https://kalpintelligence.com
      </motion.div>

      {/* preview card bubble */}
      <KalpIntelligenceLinkPreview />

      {/* timestamp row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="flex items-center gap-1.5 pr-1"
      >
        <span className="text-[11px] text-white/25">
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {/* double-tick */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M2 12l5 5L17 5"
            stroke="rgba(134,239,172,0.6)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 12l5 5L22 5"
            stroke="rgba(134,239,172,0.6)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </div>
  );
}
