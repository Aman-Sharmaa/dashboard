"use client";

import { DEFAULT_HOME_PAGE_SETTINGS, type HomeTestimonialsSettings } from "@/lib/home-page-defaults";
import { MessageSquare, ChevronRight, Star } from "lucide-react";

type TestimonialsSectionProps = {
  settings?: HomeTestimonialsSettings;
};

function TestimonialCard({
  quote,
  name,
  role,
  avatar,
  companyLogo,
  gender,
}: {
  quote: string;
  name: string;
  role: string;
  avatar?: string;
  companyLogo?: string;
  gender?: string;
}) {
  let displayAvatar = avatar;
  if (!displayAvatar && gender && gender !== "any") {
    displayAvatar = `https://avatar.iran.liara.run/public/${gender === "male" ? "boy" : "girl"
      }?username=${name.replace(/\s+/g, "")}`;
  }

  return (
    <div className="w-[300px] sm:w-[360px] shrink-0 rounded-2xl p-5 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      {/* Stars */}
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
        ))}
      </div>

      {/* Quote */}
      <p className="text-[13.5px] leading-relaxed text-gray-600 flex-1">
        &ldquo;{quote}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
        <div className="relative w-9 h-9 shrink-0">
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={name}
              className="w-full h-full rounded-full object-cover border border-gray-100"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border border-gray-200 flex items-center justify-center text-gray-600 font-semibold text-xs">
              {name.charAt(0)}
            </div>
          )}
          {companyLogo && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
              <img src={companyLogo} alt={role} className="w-full h-full object-contain rounded-full" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-gray-900 truncate">{name}</div>
          <div className="text-[11px] text-gray-400 truncate">{role}</div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection({
  settings = DEFAULT_HOME_PAGE_SETTINGS.testimonials,
}: TestimonialsSectionProps) {
  const testimonials = settings.items || [];

  if (testimonials.length === 0) return null;

  const mid = Math.ceil(testimonials.length / 2);
  const row1 = testimonials.slice(0, mid);
  const row2 = testimonials.slice(mid);

  // Duplicate once ~ CSS shift is -50%
  const loopRow1 = [...row1, ...row1];
  const loopRow2 = [...row2, ...row2];

  return (
    <section className="py-24 bg-gradient-to-br from-[#f8f9fa] via-white to-[#eef2f5] overflow-hidden">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 mb-14 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full border border-gray-200 bg-white shadow-sm text-sm font-medium text-gray-600">
          <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
          Testimonials
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
          {settings.title}
        </h2>

        <p className="text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
          {settings.subtitle}
        </p>
      </div>

      {/* Marquee rows */}
      <div
        className="flex flex-col gap-5"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        {/* Row 1 ~ scrolls left */}
        <div
          className="flex gap-5 w-max"
          style={{ animation: "marquee-left 35s linear infinite" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = "paused")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = "running")}
        >
          {loopRow1.map((t, i) => (
            <TestimonialCard
              key={`r1-${i}`}
              quote={t.quote}
              name={t.name}
              role={t.role}
              avatar={t.avatar}
              companyLogo={t.companyLogo}
              gender={(t as any).gender}
            />
          ))}
        </div>

        {/* Row 2 ~ scrolls right */}
        <div
          className="flex gap-5 w-max"
          style={{ animation: "marquee-right 35s linear infinite" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = "paused")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = "running")}
        >
          {loopRow2.map((t, i) => (
            <TestimonialCard
              key={`r2-${i}`}
              quote={t.quote}
              name={t.name}
              role={t.role}
              avatar={t.avatar}
              companyLogo={t.companyLogo}
              gender={(t as any).gender}
            />
          ))}
        </div>
      </div>

      {/* See all button */}
      <div className="mt-14 text-center">
        <button className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50 transition-all">
          See all Reviews <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

    </section>
  );
}