"use client";

import {
  PageSection,
  HeroProps,
  TextProps,
  ImageProps,
  CtaProps,
  FeaturesProps,
  FaqProps,
  SpacerProps,
  ColumnsProps,
  BlogsProps,
  TeamCardProps,
} from "./section-types";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { TeamCard } from "@/components/team-card";
// Kalp brand sections ~ use the exact homepage components, design is preserved
import { Hero as KalpHeroComponent } from "@/components/hero";
import { ProductsSection as KalpProductsComponent } from "@/components/products-section";
import { ServicesSection as KalpServicesComponent } from "@/components/services-section";
import { KalpFoundersSection } from "@/components/kalp-founders-section";
import { TestimonialsSection as KalpTestimonialsComponent } from "@/components/testimonials-section";
import { FAQSection as KalpFAQComponent } from "@/components/faq-section";
import { AboutUsClient as KalpAboutComponent } from "@/components/about-us-client";
import { FoundersSection } from "@/components/founders-section";
import { cn } from "@/lib/utils";


// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ props }: { props: HeroProps }) {
  const align = props.align === "left" ? "text-left items-start" : props.align === "right" ? "text-right items-end" : "text-center items-center";
  return (
    <section
      className="py-24 px-6"
      style={{
        backgroundColor: props.bgColor || "#ffffff",
        color: props.textColor || "#0a0a0a",
        backgroundImage: props.bgImage ? `url(${props.bgImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className={`max-w-4xl mx-auto flex flex-col gap-6 ${align}`}>
        {props.badge && (
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-black/10 w-fit">
            {props.badge}
          </span>
        )}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
          {props.title}
        </h1>
        {props.subtitle && (
          <p className="text-lg sm:text-xl opacity-70 max-w-2xl leading-relaxed">
            {props.subtitle}
          </p>
        )}
        <div className="flex flex-wrap gap-3 mt-2" style={{ justifyContent: props.align === "center" ? "center" : props.align === "right" ? "flex-end" : "flex-start" }}>
          {props.ctaLabel && (
            <a
              href={props.ctaHref || "#"}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ backgroundColor: props.textColor || "#0a0a0a", color: props.bgColor || "#ffffff" }}
            >
              {props.ctaLabel}
            </a>
          )}
          {props.secondaryCtaLabel && (
            <a
              href={props.secondaryCtaHref || "#"}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm border transition-opacity hover:opacity-80"
              style={{ borderColor: "currentColor" }}
            >
              {props.secondaryCtaLabel}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Text Block ───────────────────────────────────────────────────────────────

function TextSection({ props }: { props: TextProps }) {
  const maxW = { sm: "max-w-xl", md: "max-w-2xl", lg: "max-w-4xl", full: "max-w-full" }[props.maxWidth] || "max-w-2xl";
  const align = { left: "text-left", center: "text-center", right: "text-right" }[props.align] || "text-left";
  return (
    <section style={{ backgroundColor: props.bgColor || "transparent", color: props.textColor || "inherit" }} className="py-10 px-6">
      <div className={`${maxW} mx-auto`}>
        <div
          className={`prose prose-zinc max-w-none ${align}`}
          dangerouslySetInnerHTML={{ __html: props.content || "" }}
        />
      </div>
    </section>
  );
}

// ─── Image ────────────────────────────────────────────────────────────────────

function ImageSection({ props }: { props: ImageProps }) {
  const rounded = props.rounded ? "rounded-2xl" : "";

  if (props.layout === "full") {
    return (
      <section className="py-6 px-0">
        {props.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.src} alt={props.alt} className={`w-full object-cover max-h-[600px] ${rounded}`} />
        ) : (
          <div className="w-full h-64 bg-zinc-100 flex items-center justify-center text-zinc-400">No image set</div>
        )}
        {props.caption && <p className="text-sm text-center text-zinc-500 mt-3 px-6">{props.caption}</p>}
      </section>
    );
  }

  const isRight = props.layout === "split-right";
  return (
    <section className="py-16 px-6">
      <div className={`max-w-5xl mx-auto flex flex-col ${isRight ? "md:flex-row-reverse" : "md:flex-row"} gap-12 items-center`}>
        <div className="flex-1">
          {props.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.src} alt={props.alt} className={`w-full object-cover ${rounded}`} />
          ) : (
            <div className="w-full aspect-video bg-zinc-100 flex items-center justify-center text-zinc-400 rounded-2xl">No image</div>
          )}
        </div>
        <div className="flex-1">
          <div className="prose prose-zinc max-w-none" dangerouslySetInnerHTML={{ __html: props.splitText || "" }} />
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

function CtaSection({ props }: { props: CtaProps }) {
  const align = { left: "text-left items-start", center: "text-center items-center", right: "text-right items-end" }[props.align] || "text-center items-center";
  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div
        className="max-w-[1200px] mx-auto rounded-[2.5rem] overflow-hidden"
        style={{
          backgroundColor: props.bgColor || "#0a0a0a",
          color: props.textColor || "#ffffff",
          ...(props.bgImage ? {
            backgroundImage: `url(${props.bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          } : {}),
        }}
      >
        <div className={`px-6 py-20 sm:py-24 max-w-4xl mx-auto flex flex-col gap-6 ${align}`}>
          <h2 className="text-4xl sm:text-5xl font-medium tracking-tight leading-tight">{props.headline}</h2>
          {props.subtext && <p className="text-lg opacity-80 max-w-2xl leading-relaxed">{props.subtext}</p>}
          {props.buttonLabel && (
            <a
              href={props.buttonHref || "#"}
              className={`mt-4 inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-base transition-all hover:scale-105 active:scale-95 w-fit ${props.buttonStyle === "outline"
                  ? "border border-current hover:bg-white/10"
                  : props.buttonStyle === "ghost"
                    ? "underline underline-offset-4 hover:opacity-80"
                    : "bg-white text-black shadow-xl"
                }`}
            >
              {props.buttonLabel}
              <Icons.ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection({ props }: { props: FeaturesProps }) {
  const colClass = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[props.columns] || "sm:grid-cols-3";
  return (
    <section className="py-24 sm:py-32" style={{ backgroundColor: props.bgColor || "#ffffff", color: props.textColor || "#0a0a0a" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {(props.title || props.subtitle) && (
          <div className="text-center max-w-2xl mx-auto mb-16">
            {props.title && <h2 className="text-3xl sm:text-4xl font-medium tracking-tight mb-4">{props.title}</h2>}
            {props.subtitle && <p className="opacity-70 text-lg leading-relaxed">{props.subtitle}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 ${colClass} gap-6`}>
          {props.items.map((item, i) => {
            // @ts-ignore ~ dynamic lucide icon
            const IconComp = (Icons as any)[item.icon] || Icons.Sparkles;
            return (
              <div key={i} className="bg-[#f8f6f2] rounded-3xl p-8 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm border border-zinc-100">
                  <IconComp className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-sm opacity-70 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FaqSection({ props }: { props: FaqProps }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section className="py-24 sm:py-32" style={{ backgroundColor: props.bgColor || "#ffffff" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {(props.title || props.subtitle) && (
          <div className="text-center mb-16">
            {props.title && <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium text-gray-900 leading-tight">{props.title}</h2>}
            {props.subtitle && <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">{props.subtitle}</p>}
          </div>
        )}
        <div className="max-w-4xl mx-auto space-y-4">
          {props.items.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i} className="bg-[#f8f6f2] rounded-2xl px-6 py-5 transition-all">
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="text-base font-medium text-gray-900 pr-4">{item.question}</span>
                  <span className={`flex-shrink-0 text-xl text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-4 text-gray-600 text-sm leading-relaxed animate-in fade-in slide-in-from-top-2">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Spacer ───────────────────────────────────────────────────────────────────

function SpacerSection({ props }: { props: SpacerProps }) {
  const h = { xs: "h-8", sm: "h-16", md: "h-24", lg: "h-32", xl: "h-48" }[props.size] || "h-24";
  return <div className={h} />;
}

// ─── Columns ──────────────────────────────────────────────────────────────────

function ColumnsSection({ section }: { section: PageSection }) {
  const props = section.props as ColumnsProps;
  const colClass = props.count === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  const gapClass = { sm: "gap-6", md: "gap-10", lg: "gap-16" }[props.gap] || "gap-10";
  return (
    <section className="py-14 px-6" style={{ backgroundColor: props.bgColor || "transparent" }}>
      <div className={`max-w-5xl mx-auto grid grid-cols-1 ${colClass} ${gapClass}`}>
        {section.children && section.children.length > 0 ? (
          section.children.map(child => (
            <div key={child.id} className="relative">
              <SectionRenderer section={child} />
            </div>
          ))
        ) : (
          props.columns?.map((col, i) => (
            <div key={i} className="prose prose-zinc max-w-none" dangerouslySetInnerHTML={{ __html: col.content || "" }} />
          ))
        )}
      </div>
    </section>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

function GridSection({ section }: { section: PageSection }) {
  const props = section.props;
  const cols = props.columns || 2;
  const gapClass = { sm: "gap-4", md: "gap-8", lg: "gap-12" }[props.gap as string] || "gap-8";
  return (
    <section className="py-14 px-6" style={{ backgroundColor: props.bgColor || "transparent" }}>
      <div className={`max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-${cols} ${gapClass}`}>
        {section.children?.map(child => (
          <div key={child.id} className="relative">
            <SectionRenderer section={child} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Fallback Renderer ────────────────────────────────────────────────────────
function FallbackSection({ type, props }: { type: string; props: any }) {
  const hasData = props.title || props.subtitle || props.src || props.content || (props.items && props.items.length > 0);

  if (!hasData) {
    return (
      <div className="p-8 border-2 border-dashed border-zinc-200 rounded-lg bg-zinc-50 flex items-center justify-center flex-col gap-2 text-zinc-500 w-full h-full min-h-[120px]">
        <Icons.Box className="w-6 h-6 text-zinc-400" />
        <p className="text-sm font-medium capitalize">{type.replace("-", " ")} Placeholder</p>
      </div>
    );
  }

  return (
    <div className="py-12 px-6" style={{ backgroundColor: props.bgColor || "transparent", color: props.textColor || "inherit" }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-6 items-center text-center">
        {props.title && <h2 className="text-3xl font-bold">{props.title}</h2>}
        {props.subtitle && <p className="text-lg opacity-70">{props.subtitle}</p>}
        {props.src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.src} alt={props.alt || ""} className="max-w-full rounded-xl shadow-sm" />
        )}
        {props.content && (
          <div className="prose prose-zinc max-w-none text-left w-full" dangerouslySetInnerHTML={{ __html: props.content }} />
        )}
        {props.items && props.items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full mt-6">
            {props.items.map((item: any, i: number) => (
              <div key={i} className="border border-zinc-200 rounded-lg p-4 text-left">
                {item.title && <h4 className="font-bold">{item.title}</h4>}
                {item.description && <p className="text-sm opacity-80 mt-2">{item.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Blogs Section ───────────────────────────────────────────────────────────

function BlogsSection({ props }: { props: BlogsProps }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url = "/api/cms/posts?";
    if (props.categories && props.categories.length > 0) {
      url += `categoryId=${props.categories.join(",")}&`;
    }
    if (props.limit) {
      url += `limit=${props.limit}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => setPosts(data.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [props.categories, props.limit]);

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6" style={{ backgroundColor: props.bgColor || "#ffffff" }}>
      <div className="max-w-[1200px] mx-auto">
        {(props.title || props.subtitle) && (
          <div className="text-center mb-10 md:mb-16">
            {props.title && <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-3 md:mb-4 tracking-tight">{props.title}</h2>}
            {props.subtitle && <p className="text-gray-500 text-sm sm:text-base max-w-2xl mx-auto">{props.subtitle}</p>}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-10"><Icons.Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {posts.slice(0, props.limit || 3).map((post: any) => (
              <a key={post._id || post.id} href={`/post/${post.slug}`} className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="relative aspect-video w-full bg-zinc-100 overflow-hidden">
                  {post.featuredImage || post.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.featuredImage || post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icons.Image className="w-8 h-8 text-zinc-300" />
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-semibold text-lg md:text-xl mb-2 line-clamp-2 text-gray-900 group-hover:text-blue-600 transition-colors">{post.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-3 flex-1 mb-4 leading-relaxed">{post.excerpt || "Read more about this topic..."}</p>
                  <span className="text-sm font-semibold text-blue-600 flex items-center">Read Article <Icons.ArrowRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" /></span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
            <p className="text-zinc-500">No blogs found.</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Team Card Section ────────────────────────────────────────────────────────

function TeamCardSection({ props }: { props: TeamCardProps }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employees")
      .then(res => res.json())
      .then(data => {
        const allEmployees = data.employees || [];
        if (props.members && props.members.length > 0) {
          setMembers(allEmployees.filter((m: any) => props.members.includes(m.id || m._id)));
        } else {
          setMembers(allEmployees);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [props.members]);

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6" style={{ backgroundColor: props.bgColor || "#f7f5f0" }}>
      <div className="max-w-[1200px] mx-auto">
        {(props.title || props.subtitle) && (
          <div className="text-center mb-12 md:mb-16">
            {props.title && <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-3 md:mb-4 tracking-tight">{props.title}</h2>}
            {props.subtitle && <p className="text-gray-500 text-sm sm:text-base max-w-2xl mx-auto">{props.subtitle}</p>}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-10"><Icons.Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>
        ) : members.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 pb-10">
            {members.map((member: any) => (
              <TeamCard
                key={member.id || member._id}
                name={member.name}
                role={member.title || "Team Member"}
                image={member.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=f4f4f5&color=3f3f46&size=256`}
                linkedin={member.linkedin}
                email={member.email ? `mailto:${member.email}` : undefined}
                calendly={member.calendly}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
            <p className="text-zinc-500">No team members selected.</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Marketing Sections ────────────────────────────────────────────────────────

function PricingTableSection({ props }: { props: any }) {
  return (
    <section className="py-20 px-6 bg-zinc-50" style={{ backgroundColor: props.bgColor }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-4">{props.title}</h2>
          <p className="text-lg text-zinc-500">{props.subtitle}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-center max-w-5xl mx-auto">
          {props.items?.map((item: any, i: number) => (
            <div key={i} className={`rounded-2xl p-8 bg-white border ${item.recommended ? 'border-zinc-900 shadow-xl scale-105 z-10' : 'border-zinc-200'}`}>
              {item.recommended && <div className="text-xs font-bold uppercase tracking-wider text-zinc-900 bg-zinc-100 px-3 py-1 rounded-full inline-block mb-4">Recommended</div>}
              <h3 className="text-2xl font-semibold mb-2 text-zinc-900">{item.title}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold tracking-tight text-zinc-900">{item.price}</span>
              </div>
              <ul className="space-y-4 mb-8">
                {item.features?.map((f: string, j: number) => (
                  <li key={j} className="flex gap-3 text-sm text-zinc-600">
                    <Icons.Check className="w-5 h-5 text-zinc-900 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href={item.buttonHref || "#"} className={`block w-full py-3 px-4 rounded-xl text-center text-sm font-semibold transition-colors ${item.recommended ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'}`}>
                {item.buttonLabel}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSection({ props, isLive }: { props: any; isLive: boolean }) {
  return (
    <section className="py-20 px-6 bg-zinc-900 text-white" style={{ backgroundColor: props.bgColor }}>
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{props.title}</h2>
        <p className="text-lg text-zinc-400 mb-10 max-w-2xl mx-auto">{props.subtitle}</p>

        <form
          className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!isLive) return;
            const form = e.target as HTMLFormElement;
            const email = (form.elements.namedItem('email') as HTMLInputElement).value;
            try {
              await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name: 'Newsletter Subscriber', source: 'newsletter' })
              });
              form.reset();
              toast.success('Successfully subscribed to newsletter!');
            } catch (err) {
              toast.error('Failed to subscribe. Please try again.');
            }
          }}
        >
          <input
            type="email"
            name="email"
            required
            disabled={!isLive}
            placeholder={props.placeholder || "Enter your email"}
            className="flex-1 rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          />
          <button
            type="submit"
            disabled={!isLive}
            className="rounded-xl bg-white text-zinc-900 px-6 py-3 font-semibold hover:bg-zinc-100 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {props.buttonLabel || "Subscribe"}
          </button>
        </form>
      </div>
    </section>
  );
}

// ─── Kalp About placeholder ──────────────────────────────────────────────────
// ─── Main Renderer ────────────────────────────────────────────────────────────

export function SectionRenderer({ section, isLive = false }: { section: PageSection; isLive?: boolean }) {
  const styles = section.styles || {};

  const renderContent = () => {
    switch (section.type) {
      case "hero": return <HeroSection props={section.props as HeroProps} />;
      case "text": return <TextSection props={section.props as TextProps} />;
      case "image": return <ImageSection props={section.props as ImageProps} />;
      case "cta": return <CtaSection props={section.props as CtaProps} />;
      case "features": return <FeaturesSection props={section.props as FeaturesProps} />;
      case "faq":
      case "accordion": return <FaqSection props={section.props as FaqProps} />;
      case "spacer": return <SpacerSection props={section.props as SpacerProps} />;
      case "columns": return <ColumnsSection section={section} />;
      case "grid": return <GridSection section={section} />;
      case "blogs": return <BlogsSection props={section.props as BlogsProps} />;
      case "team-card": return <TeamCardSection props={section.props as TeamCardProps} />;
      case "pricing-table": return <PricingTableSection props={section.props} />;
      case "newsletter": return <NewsletterSection props={section.props} isLive={isLive} />;

      // Basic Elements
      case "heading": return <div className="px-6 py-4" style={{ textAlign: (section.props.align as any) || "left" }}>{React.createElement((section.props.tag as any) || "h2", { className: "text-3xl font-bold" }, section.props.title)}</div>;
      case "paragraph": return <div className="px-6 py-4 text-zinc-600" style={{ textAlign: (section.props.align as any) || "left" }}>{section.props.content}</div>;
      case "rich-text": return <div className="px-6 py-4 prose prose-zinc max-w-none" dangerouslySetInnerHTML={{ __html: section.props.content || "" }} />;
      case "video": return <div className="px-6 py-4"><iframe className="w-full aspect-video rounded-xl" src={section.props.src as string} allowFullScreen /></div>;

      // Cards & Media (Basic Generic Implementations)
      case "card":
      case "feature-card":
        return (
          <div className="p-6 rounded-2xl border border-zinc-200 bg-white m-4 shadow-sm">
            {section.props.icon && <div className="mb-4 text-zinc-900"><Icons.Star className="w-8 h-8" /></div>}
            {section.props.image && <img src={section.props.image as string} className="w-full h-48 object-cover rounded-lg mb-4" />}
            <h3 className="text-xl font-bold mb-2">{section.props.title}</h3>
            <p className="text-zinc-600">{section.props.content}</p>
          </div>
        );
      case "gallery":
      case "carousel":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
            {section.props.items?.map((item: any, i: number) => (
              <img key={i} src={item.src} alt={item.alt} className="w-full h-48 object-cover rounded-xl" />
            ))}
          </div>
        );

      // Animation & Interactive (Simplified Fallbacks)
      case "scroll-animation":
      case "hover-animation":
      case "modal":
      case "tabs":
        return (
          <div className="p-6 m-4 border-2 border-dashed border-zinc-300 rounded-xl text-center bg-zinc-50">
            <h3 className="font-bold text-zinc-700 capitalize">{section.type.replace("-", " ")} Placeholder</h3>
            <p className="text-sm text-zinc-500 mt-1">This component requires custom implementation for the live site. Edit its properties in the sidebar.</p>
          </div>
        );
      // Kalp brand sections ~ render using the real homepage components
      case "kalp-hero": return <KalpHeroComponent settings={section.props as any} />;
      case "kalp-products": return <KalpProductsComponent title={(section.props as any).title} subtitle={(section.props as any).subtitle} items={(section.props as any).items} />;
      case "kalp-services": return <KalpServicesComponent {...(section.props as any)} />;
      case "kalp-testimonials": return <KalpTestimonialsComponent settings={section.props as any} />;
      case "kalp-faq": return <KalpFAQComponent settings={section.props as any} />;
      case "kalp-about": return <KalpAboutComponent hideHeaderFooter={true} settings={section.props as any} overrideTitle={(section.props as any).title} overrideSubtitle={(section.props as any).subtitle} />;
      case "kalp-founders": return <KalpFoundersSection {...(section.props as any)} />;

      default:
        return <FallbackSection type={section.type} props={section.props} />;
    }
  };

  return (
    <div
      style={styles as React.CSSProperties}
      className={cn("relative w-full", styles.backgroundColor && "[&>section]:!bg-transparent [&>div]:!bg-transparent")}
    >
      {renderContent()}
    </div>
  );
}
