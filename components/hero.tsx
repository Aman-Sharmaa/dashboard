"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  Star,
  ArrowRight,
  Play,
  Globe,
  Shield,
  Rocket,
  type LucideIcon,
} from "lucide-react";

const HERO_ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Zap,
  Star,
  ArrowRight,
  Play,
  Globe,
  Shield,
  Rocket,
};
import Link from "next/link";
import { DEFAULT_HOME_PAGE_SETTINGS, type HomeHeroSettings } from "@/lib/home-page-defaults";
import { KalpIntelligenceLinkPreviewChat } from "@/components/kalp-intelligence-link-preview";

// Inline SVG replacements for FaGooglePlay and FaApple from react-icons
// Saves ~500KB from the public bundle
const GooglePlayIcon = () => (
  <svg viewBox="0 0 512 512" className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" aria-hidden="true">
    <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" aria-hidden="true">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

type HeroProps = {
  settings?: any;
};

export function Hero({ settings }: HeroProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  const s = {
    ...DEFAULT_HOME_PAGE_SETTINGS.hero,
    ...Object.fromEntries(
      Object.entries(settings || {}).filter(([_, v]) => v !== undefined && v !== "")
    ),
  };

  const staticPart = s.titleStatic || "";
  const typingPart = s.titleTyping || "";

  useEffect(() => {
    setDisplayedText("");
    setIsTyping(true);
    let currentIndex = 0;
    const typingSpeed = 80;
    let typeInterval: ReturnType<typeof setInterval> | null = null;

    const startTyping = setTimeout(() => {
      typeInterval = setInterval(() => {
        if (currentIndex <= typingPart.length) {
          setDisplayedText(typingPart.substring(0, currentIndex));
          currentIndex++;
        } else {
          setTimeout(() => setIsTyping(false), 500);
          if (typeInterval) clearInterval(typeInterval);
        }
      }, typingSpeed);
    }, 1000);

    return () => {
      clearTimeout(startTyping);
      if (typeInterval) clearInterval(typeInterval);
    };
  }, [typingPart]);

  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 pb-10 pt-24 sm:px-6 sm:py-24 lg:min-h-[100dvh] lg:px-8">
      <div className="max-w-[1200px] mx-auto relative z-10 text-center w-full">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center space-y-6 sm:space-y-8">

          {/* Announcement badge ~ CSS fade-in */}
          <Link href={s.announcementHref || "#"} className="hero-fade-0">
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 backdrop-blur-sm transition hover:bg-white sm:gap-3 sm:px-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="min-w-0 truncate text-sm font-medium text-gray-900 sm:text-base">
                {s.announcementText}
              </span>
              <div className="flex shrink-0 items-center gap-2 text-gray-700">
                {s.announcementIcon && HERO_ICON_MAP[s.announcementIcon] ? (
                  (() => {
                    const Icon = HERO_ICON_MAP[s.announcementIcon];
                    return <Icon className="w-4 h-4 sm:w-5 sm:h-5" />;
                  })()
                ) : (
                  <>
                    <GooglePlayIcon />
                    <AppleIcon />
                  </>
                )}
              </div>
            </span>
          </Link>

          {/* Main Title ~ CSS fade-in */}
          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-medium text-gray-900 leading-snug sm:leading-tight break-words hero-fade-1"
          >
            <span>{staticPart}</span>
            <span
              className="italic inline-block transition-[filter] [transition-duration:1.5s] ease-out"
              style={{ filter: isTyping ? "blur(8px)" : "blur(0px)" }}
            >
              {displayedText}
              {isTyping && displayedText.length > 0 && (
                <span className="inline-block w-0.5 h-[1em] bg-gray-900 ml-1 animate-pulse" />
              )}
            </span>
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed max-w-2xl hero-fade-2">
            {s.description}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center w-full hero-fade-3">
            <button
              onClick={() => {
                document
                  .getElementById(s.primaryCtaTargetId || "product")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3 bg-black hover:bg-gray-900 text-white text-sm sm:text-base font-medium rounded-full transition-colors duration-300 shadow-lg shadow-black/30 active:scale-95"
            >
              <span>{s.primaryCtaLabel}</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </button>

            <Link
              href={s.secondaryCtaHref || ""}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3 bg-transparent hover:bg-gray-100 text-gray-900 text-sm sm:text-base font-medium rounded-full transition-colors duration-300 border border-gray-300 active:scale-95"
            >
              <span>{s.secondaryCtaLabel}</span>
            </Link>
          </div>

          {/* Partner Logos Marquee */}
          <div className="mt-12 sm:mt-16 w-full sm:w-3/4 mx-auto px-2 hero-fade-4">
            <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
              {s.trustedText}
            </p>

            <div
              className="relative w-full overflow-hidden h-10 sm:h-12"
              style={{
                maskImage:
                  "linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 10%, rgba(0,0,0,1) 90%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 10%, rgba(0,0,0,1) 90%, transparent 100%)",
              }}
            >
              <div className="flex overflow-hidden h-full">
                <div className="flex items-center gap-4 sm:gap-6 h-full logo-marquee">
                  {[
                    ...(s.clientLogos || []),
                    ...(s.clientLogos || []),
                    ...(s.clientLogos || []),
                  ].map((logo, index) => (
                    <div
                      key={`${logo}-${index}`}
                      className="flex items-center justify-center h-full flex-shrink-0 px-2"
                      style={{ width: "72px" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logo}
                        alt=""
                        aria-hidden="true"
                        className="object-contain opacity-70 h-6 sm:h-8 w-auto max-w-[72px]"
                        style={{ filter: "grayscale(100%) brightness(0.5)" }}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* CSS animations for hero entrance + logo marquee */}
      <style>{`
        .hero-fade-0 { animation: hero-rise 0.6s ease-out both; }
        .hero-fade-1 { animation: hero-rise 0.8s ease-out 0.3s both; }
        .hero-fade-2 { animation: hero-rise 0.6s ease-out 0.5s both; }
        .hero-fade-3 { animation: hero-rise 0.6s ease-out 0.7s both; }
        .hero-fade-4 { animation: hero-rise 0.6s ease-out 0.9s both; }
        @keyframes hero-rise {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .logo-marquee {
          animation: marquee-scroll 14s linear infinite;
        }
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(calc(-100% / 3)); }
        }
      `}</style>
    </section>
  );
}
