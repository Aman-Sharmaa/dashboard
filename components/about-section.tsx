"use client";

import { useEffect, useState } from "react";
import { TeamCard } from "@/components/team-card";
import { DEFAULT_HOME_PAGE_SETTINGS, type HomeAboutSettings } from "@/lib/home-page-defaults";

type Founder = {
  name: string;
  role: string;
  image: string;
  linkedin?: string;
  email?: string;
  calendly?: string;
};

const defaultFounders: Founder[] = [];

type AboutSectionProps = {
  settings?: HomeAboutSettings;
};

export function AboutSection({ settings = DEFAULT_HOME_PAGE_SETTINGS.about }: AboutSectionProps) {
  const [founders, setFounders] = useState<Founder[]>(defaultFounders);

  useEffect(() => {
    fetch("/api/cms/settings")
      .then((res) => res.json())
      .then((data) => {
        const cms = data.settings?.aboutUs?.founders;
        if (Array.isArray(cms) && cms.length > 0) {
          setFounders(cms.filter((f: Founder) => f.name !== "Muskan Sharma"));
        }
      })
      .catch(() => { });
  }, []);

  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Text ~ CSS slide-in from left */}
          <div className="about-slide-left">
            <h2 className="text-4xl sm:text-5xl font-medium mb-6">{settings.title}</h2>
            <p className="text-lg text-gray-600 max-w-md leading-relaxed">
              {settings.description}
            </p>
            <a
              href={settings.linkHref || "/about-us"}
              className="inline-flex items-center gap-2 mt-6 text-base font-medium text-black hover:gap-3 transition-all"
            >
              {settings.linkLabel}
              <span aria-hidden>→</span>
            </a>
          </div>

          {/* Founders ~ CSS slide-in from right */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 about-slide-right">
            {founders.map((founder) => (
              <TeamCard
                key={founder.name}
                name={founder.name}
                role={founder.role}
                image={founder.image}
                linkedin={founder.linkedin}
                email={founder.email}
                calendly={founder.calendly}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .about-slide-left  { animation: slide-from-left  0.65s ease-out both; }
        .about-slide-right { animation: slide-from-right 0.65s ease-out both; }
        @keyframes slide-from-left  {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-from-right {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
