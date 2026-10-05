"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ClientMarquee } from "@/components/client-marquee";
import { TeamCard } from "@/components/team-card";
import { FoundersSection } from "@/components/founders-section";
import { motion } from "framer-motion";
import { Star, Loader2, ShieldCheck, TrendingUp, Award, Link as LinkIcon, RefreshCw, Layers, ArrowUpRight } from "lucide-react";

type TeamMember = {
  name: string;
  role: string;
  image: string;
  linkedin?: string;
  email?: string;
  calendly?: string;
};

type Stat = {
  value: string;
  label: string;
};

type TimelineItem = {
  year: string;
  title: string;
  description: string;
};

type CultureCard = {
  icon: string;
  title: string;
  description: string;
};

type HiringRole = {
  title: string;
  location: string;
  type: string;
  link: string;
};

const IconMap: Record<string, any> = {
  ShieldCheck, TrendingUp, Award, Link: LinkIcon, RefreshCw, Layers, Star
};

type AboutUsData = {
  hero: {
    title: string;
    subtitle: string;
    ratingText: string;
  };
  mission: {
    title: string;
    description: string;
  };
  stats: Stat[];
  teamSectionTitle: string;
  teamSectionSubtitle: string;
  founders: TeamMember[];
  teamMembers: TeamMember[];
  timeline?: TimelineItem[];
  culture?: {
    title: string;
    subtitle: string;
    cards: CultureCard[];
  };
  hiring?: HiringRole[];
  clientLogos?: string[];
};

// Defaults matching the previous hardcoded values
const defaultAboutUs: AboutUsData = {
  hero: {
    title: "We empower startups to scale smarter and faster",
    subtitle:
      "We are a team of designers and engineers driven by one goal ~ helping ambitious startups build products that grow.",
    ratingText: "Rated 5.0 by founders worldwide",
  },
  mission: {
    title: "Our Mission",
    description:
      "Empower teams and founders with tools that reduce friction, simplify workflows, and enable sustainable growth.",
  },
  stats: [
    { value: "250+", label: "Projects Supported" },
    { value: "85%", label: "Client Retention Rate" },
    { value: "98%", label: "Client Satisfaction" },
    { value: "30+", label: "Integrations Supported" },
  ],
  teamSectionTitle: "Our Founders & Team",
  teamSectionSubtitle:
    "Our team combines deep industry knowledge with hands-on experience to help startups grow smarter and faster.",
  founders: [],
  teamMembers: [],
  timeline: [],
  culture: {
    title: "Our Culture at Cycle",
    subtitle: "A culture shaped by trust, humility, and a shared mission to elevate software teams.",
    cards: [
      { icon: "ShieldCheck", title: "Strength & Integrity", description: "True impact starts with strong execution and honest action ~ we lead with." },
      { icon: "TrendingUp", title: "Continuous Growth", description: "We grow through feedback, failure, and progress ~ always learning, always evolving." },
      { icon: "Award", title: "Trust", description: "We build trust by handling every idea and interaction with care." },
      { icon: "Link", title: "Resilience in Adversity", description: "We face challenges with calm and clarity, knowing ease always follows." },
      { icon: "RefreshCw", title: "Change Starts With Us", description: "Change starts within ~ we improve for ourselves before improving for others." },
      { icon: "Layers", title: "Collaboration Over Ego", description: "We build together, valuing teamwork over ego ~ the mission comes first." }
    ]
  },
  hiring: [],
  clientLogos: [
    "/clients/dm.svg",
    "/clients/as.svg",
    "/clients/medone.svg",
    "/clients/zuari.svg",
    "/clients/dmca.svg",
    "/clients/flp.svg",
    "/clients/smep.svg",
    "/clients/floro.svg",
    "/clients/serrisvg.svg",
    "/clients/pmc.png",
  ],
};

interface AboutUsClientProps {
  hideHeaderFooter?: boolean;
  overrideTitle?: string;
  overrideSubtitle?: string;
  settings?: any;
}

export function AboutUsClient({ hideHeaderFooter = false, overrideTitle, overrideSubtitle, settings }: AboutUsClientProps = {}) {
  const [aboutUs, setAboutUs] = useState<AboutUsData>(defaultAboutUs);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch("/api/cms/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const dbAboutUs = data.settings?.aboutUs || {};

        // Merge dbAboutUs with defaultAboutUs to form base
        const baseAboutUs: AboutUsData = {
          hero: {
            title: dbAboutUs.hero?.title || dbAboutUs.title || defaultAboutUs.hero.title,
            subtitle: dbAboutUs.hero?.subtitle || dbAboutUs.description || dbAboutUs.subtitle || defaultAboutUs.hero.subtitle,
            ratingText: dbAboutUs.hero?.ratingText || dbAboutUs.ratingText || defaultAboutUs.hero.ratingText,
          },
          mission: {
            title: dbAboutUs.mission?.title || defaultAboutUs.mission.title,
            description: dbAboutUs.mission?.description || defaultAboutUs.mission.description,
          },
          stats: Array.isArray(dbAboutUs.stats) ? dbAboutUs.stats : defaultAboutUs.stats,
          teamSectionTitle: dbAboutUs.teamSectionTitle ?? defaultAboutUs.teamSectionTitle,
          teamSectionSubtitle: dbAboutUs.teamSectionSubtitle ?? defaultAboutUs.teamSectionSubtitle,
          founders: Array.isArray(dbAboutUs.founders) ? dbAboutUs.founders : defaultAboutUs.founders,
          teamMembers: Array.isArray(dbAboutUs.teamMembers) ? dbAboutUs.teamMembers : defaultAboutUs.teamMembers,
          timeline: Array.isArray(dbAboutUs.timeline) ? dbAboutUs.timeline : defaultAboutUs.timeline,
          culture: dbAboutUs.culture?.cards ? dbAboutUs.culture : defaultAboutUs.culture,
          hiring: Array.isArray(dbAboutUs.hiring) ? dbAboutUs.hiring : defaultAboutUs.hiring,
          clientLogos: Array.isArray(dbAboutUs.clientLogos) ? dbAboutUs.clientLogos : defaultAboutUs.clientLogos,
        };

        // If settings props are provided, override fields that are actually defined in settings
        if (settings && Object.keys(settings).length > 0) {
          const merged: AboutUsData = {
            hero: {
              title: settings.title !== undefined ? settings.title : (settings.hero?.title || baseAboutUs.hero.title),
              subtitle: settings.subtitle !== undefined ? settings.subtitle : (settings.description !== undefined ? settings.description : (settings.hero?.subtitle || baseAboutUs.hero.subtitle)),
              ratingText: settings.ratingText !== undefined ? settings.ratingText : (settings.hero?.ratingText || baseAboutUs.hero.ratingText),
            },
            mission: settings.mission || baseAboutUs.mission,
            stats: settings.stats || baseAboutUs.stats,
            teamSectionTitle: settings.teamSectionTitle !== undefined ? settings.teamSectionTitle : baseAboutUs.teamSectionTitle,
            teamSectionSubtitle: settings.teamSectionSubtitle !== undefined ? settings.teamSectionSubtitle : baseAboutUs.teamSectionSubtitle,
            founders: settings.founders || baseAboutUs.founders,
            teamMembers: settings.teamMembers || baseAboutUs.teamMembers,
            timeline: settings.timeline || baseAboutUs.timeline,
            culture: settings.culture || baseAboutUs.culture,
            hiring: settings.hiring || baseAboutUs.hiring,
            clientLogos: settings.clientLogos || baseAboutUs.clientLogos,
          };
          setAboutUs(merged);
        } else {
          setAboutUs(baseAboutUs);
        }
      })
      .catch((err) => {
        console.error("Failed to load about us settings", err);
        if (!active) return;
        // Fallback to defaultAboutUs + settings
        if (settings && Object.keys(settings).length > 0) {
          const merged: AboutUsData = {
            hero: {
              title: settings.title !== undefined ? settings.title : (settings.hero?.title || defaultAboutUs.hero.title),
              subtitle: settings.subtitle !== undefined ? settings.subtitle : (settings.description !== undefined ? settings.description : (settings.hero?.subtitle || defaultAboutUs.hero.subtitle)),
              ratingText: settings.ratingText !== undefined ? settings.ratingText : (settings.hero?.ratingText || defaultAboutUs.hero.ratingText),
            },
            mission: settings.mission || defaultAboutUs.mission,
            stats: settings.stats || defaultAboutUs.stats,
            teamSectionTitle: settings.teamSectionTitle !== undefined ? settings.teamSectionTitle : defaultAboutUs.teamSectionTitle,
            teamSectionSubtitle: settings.teamSectionSubtitle !== undefined ? settings.teamSectionSubtitle : defaultAboutUs.teamSectionSubtitle,
            founders: settings.founders || defaultAboutUs.founders,
            teamMembers: settings.teamMembers || defaultAboutUs.teamMembers,
            timeline: settings.timeline || defaultAboutUs.timeline,
            culture: settings.culture || defaultAboutUs.culture,
            hiring: settings.hiring || defaultAboutUs.hiring,
            clientLogos: settings.clientLogos || defaultAboutUs.clientLogos,
          };
          setAboutUs(merged);
        } else {
          setAboutUs(defaultAboutUs);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [settings]);

  if (loading) {
    return <main className="min-h-screen bg-[#f7f5f0]" />;
  }

  const HeroHeading = hideHeaderFooter ? "h2" : "h1";
  const MissionHeading = hideHeaderFooter ? "h3" : "h2";
  const StatsHeading = hideHeaderFooter ? "h4" : "h3";

  return (
    <main className={`${hideHeaderFooter ? "" : "min-h-screen"} bg-[#f7f5f0] text-gray-900`}>
      {!hideHeaderFooter && <Header />}

      {/* HERO */}
      <section className="pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <HeroHeading className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
            {(() => {
              const currentTitle = overrideTitle || aboutUs.hero.title;
              return currentTitle.includes("\n")
                ? currentTitle.split("\n").map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < currentTitle.split("\n").length - 1 && <br />}
                  </span>
                ))
                : currentTitle;
            })()}
          </HeroHeading>

          <p className="mt-4 text-gray-600 text-sm sm:text-base leading-relaxed">
            {overrideSubtitle || aboutUs.hero.subtitle}
          </p>

          {aboutUs.hero.ratingText && (
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <span>{aboutUs.hero.ratingText}</span>
            </div>
          )}
        </div>
      </section>

      {/* MISSION + STATS */}
      <section className="pb-16 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Mission */}
          <div className="lg:col-span-1 rounded-2xl bg-[#1e1e1e] p-6 sm:p-8 text-white">
            <MissionHeading className="text-lg font-semibold mb-2">{aboutUs.mission.title}</MissionHeading>
            <p className="text-sm leading-relaxed text-gray-300">
              {aboutUs.mission.description}
            </p>
          </div>

          {/* Stats */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {(aboutUs.stats || []).map((stat, idx) => (
              <div
                key={stat.label || idx}
                className="rounded-2xl bg-white p-6 sm:p-8"
              >
                <StatsHeading className="text-2xl sm:text-3xl font-semibold">
                  {stat.value}
                </StatsHeading>
                <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOGOS */}
      <section className="pb-16 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          <ClientMarquee logos={aboutUs.clientLogos} />
        </div>
      </section>

      {/* TEAM */}
      <FoundersSection
        title={aboutUs.teamSectionTitle}
        subtitle={aboutUs.teamSectionSubtitle}
        founders={aboutUs.founders}
        teamMembers={aboutUs.teamMembers}
      />

      {/* TIMELINE */}
      {aboutUs.timeline && aboutUs.timeline.length > 0 && (
        <section className="pb-16 px-4 sm:px-6">
          <div className="max-w-[800px] mx-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-8 text-center">Our Journey</h2>
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
              {(aboutUs.timeline || []).map((item, i) => (
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-gray-100 text-gray-500 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                      <time className="text-sm font-medium text-blue-600">{item.year}</time>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CULTURE */}
      {aboutUs.culture && aboutUs.culture.cards && (
        <section className="pb-24 px-4 sm:px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#4d4540] mb-4">
                {aboutUs.culture.title}
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                {aboutUs.culture.subtitle}
              </p>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {(aboutUs.culture?.cards || []).map((card, i) => {
                  const IconComponent = IconMap[card.icon] || Star;
                  return (
                    <div
                      key={i}
                      className={`p-8 border-gray-100 ${i % 3 !== 2 ? 'lg:border-r' : ''
                        } ${i < (aboutUs.culture?.cards?.length || 0) - 3 ? 'lg:border-b' : ''
                        } ${i % 2 === 0 ? 'md:border-r' : ''
                        } ${i < (aboutUs.culture?.cards?.length || 0) - 2 ? 'md:border-b' : ''
                        } ${i < (aboutUs.culture?.cards?.length || 0) - 1 ? 'border-b md:border-b-0' : ''
                        }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 mb-6 text-gray-700">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">{card.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* JOIN OUR TEAM */}
      {aboutUs.hiring && aboutUs.hiring.length > 0 && (
        <section className="pb-24 px-4 sm:px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2">Join Our Team</h2>
                <p className="text-gray-600">Help us build the next generation of products.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(aboutUs.hiring || []).map((role, i) => (
                <a
                  key={i}
                  href={role.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all group"
                >
                  <div className="mb-4 sm:mb-0">
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                      {role.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        {role.type}
                      </span>
                      <span>•</span>
                      <span>{role.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    View Role
                    <ArrowUpRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {!hideHeaderFooter && <Footer />}
    </main>
  );
}
