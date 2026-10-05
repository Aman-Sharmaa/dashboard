"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Instagram } from "lucide-react";
import { DEFAULT_HOME_PAGE_SETTINGS, type HomeVideoTestimonialSettings } from "@/lib/home-page-defaults";

type VideoTestimonialProps = {
  settings?: HomeVideoTestimonialSettings;
};

export function VideoTestimonial({
  settings = DEFAULT_HOME_PAGE_SETTINGS.videoTestimonial,
}: VideoTestimonialProps) {
  const quoteLines = (settings.quote || "").split("\n");
  return (
    <section className="py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* SECTION HEADING */}
          <div className="mb-16 max-w-3xl">
            <p className="text-sm font-medium tracking-wide text-gray-500 uppercase">
              {settings.sectionLabel}
            </p>
          
            <h2 className="text-3xl sm:text-4xl font-medium text-gray-900">
              {settings.title}
          </h2>
          </div>

          <div
            className="
              grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr]
              gap-10 lg:gap-14
              items-center
            "
          >
            {/* LEFT , CONTENT */}
            <div>
              {/* Founder */}
              <div className="flex items-center gap-4 mb-10">
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  <Image
                    src={settings.founderImage}
                    alt={settings.founderName}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {settings.founderName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {settings.founderRole}
                  </p>
                </div>
              </div>

              {/* Quote */}
              <blockquote className="text-3xl lg:text-4xl font-semibold text-gray-900 leading-tight max-w-3xl">
                “{quoteLines.map((line, index) => (
                  <span key={`${line}-${index}`}>
                    {line}
                    {index < quoteLines.length - 1 && <br />}
                  </span>
                ))}”
              </blockquote>

              {/* Description */}
              <p className="mt-6 text-base text-gray-600 max-w-2xl">
                {settings.description}
              </p>

              {/* Company + Social Proof */}
              <div className="mt-10 flex flex-wrap items-center gap-8">
                {/* Company */}
                <Link
                  href={settings.companyLink}
                  target="_blank"
                  className="flex items-center gap-3 group"
                >
                  <Image
                    src={settings.companyImage}
                    alt={settings.companyName}
                    width={40}
                    height={40}
                    className="rounded-lg"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:underline">
                      {settings.companyName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {settings.companyCategory}
                    </p>
                  </div>
                </Link>

                {/* Metrics */}
                <div className="flex items-center gap-6 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    <span className="font-semibold">{settings.instagramFollowers}</span>
                    <span className="text-gray-500">followers</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M23.498 6.186a2.958 2.958 0 0 0-2.08-2.08C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.418.606a2.958 2.958 0 0 0-2.08 2.08C0 8.1 0 12 0 12s0 3.9.502 5.814a2.958 2.958 0 0 0 2.08 2.08C4.495 20.5 12 20.5 12 20.5s7.505 0 9.418-.606a2.958 2.958 0 0 0 2.08-2.08C24 15.9 24 12 24 12s0-3.9-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    <span className="font-semibold">{settings.youtubeSubscribers}</span>
                    <span className="text-gray-500">subscribers</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT , REEL */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-[260px] aspect-[9/16] rounded-[28px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.25)] bg-black">
                {/* IG Badge */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-black/70 backdrop-blur px-3 py-1 rounded-full text-white text-xs">
                  <Instagram className="w-3.5 h-3.5" />
                  {settings.socialHandle}
                </div>

                <iframe
                  src={settings.reelEmbedUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
