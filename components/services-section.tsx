"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Rocket,
  CalendarCheck2,
  Workflow,
  Sparkles,
  CheckCircle2,
  Shield,
  Zap,
  Award,
  Star,
  Clock,
  Layers,
  Code,
  type LucideIcon,
} from "lucide-react";

const SERVICE_ICON_MAP: Record<string, LucideIcon> = {
  Rocket,
  CalendarCheck2,
  Workflow,
  Sparkles,
  CheckCircle2,
  Shield,
  Zap,
  Award,
  Star,
  Clock,
  Layers,
  Code,
};

interface ServiceBullet {
  icon: string;
  title: string;
  description: string;
}

interface ServicesSectionProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  bullets?: ServiceBullet[];
  cardBadge?: string;
  cardTitle?: string;
  cardDescription?: string;
  cardTimeline?: string;
  cardLaunches?: string;
  exploreLabel?: string;
  exploreHref?: string;
  launchLabel?: string;
  launchHref?: string;
}

const defaultBullets: ServiceBullet[] = [
  {
    icon: "Rocket",
    title: "0 to 1 in production",
    description: "Design, build, and ship a real, usable product, not just a prototype or slide deck."
  },
  {
    icon: "CalendarCheck2",
    title: "45-day launch window",
    description: "Opinionated, time-boxed process that forces clarity on scope, priorities, and must-have features."
  },
  {
    icon: "Workflow",
    title: "Strategy + build, not just dev",
    description: "We shape the product, architecture, and go-to-market together so you are ready to sell on day one."
  }
];

export function ServicesSection({
  badge,
  title,
  subtitle,
  bullets,
  cardBadge,
  cardTitle,
  cardDescription,
  cardTimeline,
  cardLaunches,
  exploreLabel,
  exploreHref,
  launchLabel,
  launchHref
}: ServicesSectionProps = {}) {
  const currentBadge = badge ?? "Our Service";
  const currentTitle = title ?? "Rapydlaunch · launch anything in 45 days";
  const currentSubtitle = subtitle ?? "A focused launch program for B2B SaaS and AI products, from idea and prototype to a production-ready launch in weeks, not months.";
  const currentBullets = bullets && bullets.length > 0 ? bullets : defaultBullets;
  
  const currentCardBadge = cardBadge ?? "Rapydlaunch";
  const currentCardTitle = cardTitle ?? "Launch your next product with a proven playbook.";
  const currentCardDescription = cardDescription ?? "Join founders who have shipped SaaS, AI tools, and platforms with us. We bring the same launch rigor that powers the dedicated Rapydlaunch offering.";
  const currentCardTimeline = cardTimeline ?? "<= 45 days";
  const currentCardLaunches = cardLaunches ?? "20+ products";
  
  const currentExploreLabel = exploreLabel ?? "Explore";
  const currentExploreHref = exploreHref ?? "/rapydlaunch";
  const currentLaunchLabel = launchLabel ?? "Launch";
  const currentLaunchHref = launchHref ?? "";

  return (
    <section id="service" className="py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-14 text-center"
        >
          <p className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white sm:text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            {currentBadge}
          </p>
          <h2 className="mt-4 text-3xl font-medium text-gray-900 sm:text-4xl">
            {currentTitle}
          </h2>
          <p className="mt-3 mx-auto max-w-2xl text-gray-600">
            {currentSubtitle}
          </p>
        </motion.div>

        {/* Content */}
        <div className="grid items-stretch grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Left: bullets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-6"
          >
            {currentBullets.map((bullet, idx) => {
              const IconComp = SERVICE_ICON_MAP[bullet.icon] || Sparkles;
              let iconBg = "bg-black text-white";
              if (idx === 1) iconBg = "bg-gray-900 text-white";
              if (idx === 2) iconBg = "bg-gray-100 text-gray-900";
              return (
                <div key={idx} className="flex gap-4 pl-1">
                  <div className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {bullet.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {bullet.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* Right: highlight card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-black via-gray-900 to-gray-800 p-8 text-white shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
          >
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
            </div>

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/70">
                  {currentCardBadge}
                </p>
                <h3 className="mt-3 text-2xl font-semibold sm:text-3xl">
                  {currentCardTitle}
                </h3>
                <p className="mt-4 max-w-md text-sm text-white/80">
                  {currentCardDescription}
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-6 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
                <p className="text-xs text-white/60">Launch timeline</p>
                <p className="mt-1 text-lg font-semibold">{currentCardTimeline}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
                <p className="text-xs text-white/60">Past launches</p>
                <p className="mt-1 text-lg font-semibold">{currentCardLaunches}</p>
              </div>
            </div>

            <div className="relative z-10 mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href={currentExploreHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-100 hover:shadow-xl active:translate-y-0 sm:w-auto"
              >
                {currentExploreLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={currentLaunchHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-3 text-sm font-medium text-white/90 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/5 active:translate-y-0 sm:w-auto"
              >
                {currentLaunchLabel}
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
