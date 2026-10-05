"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Globe,
  Linkedin,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Github,
  Mail,
  Phone,
  MessageSquare,
  Send,
  Link as LinkIcon,
  type LucideIcon,
} from "lucide-react";

const SOCIAL_ICON_MAP: Record<string, LucideIcon> = {
  Globe,
  Linkedin,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Github,
  Mail,
  Phone,
  MessageSquare,
  Send,
  Link: LinkIcon,
};

import { useCmsSettings } from "@/components/cms-settings-context";

// Define a type for settings
type FooterSettings = {
  header: {
    logo?: string;
    logoDark?: string;
  };
  footer: {
    companyName: string;
    description: string;
    contactEmail?: string;
    meetingCta?: { label: string; href: string };
    social: { linkedin?: string; twitter?: string; instagram?: string; facebook?: string; youtube?: string };
    columns: { title: string; links: { label: string; href: string }[] }[];
    legalLinks?: { label: string; href: string }[];
    employeeLoginHref?: string;
    socialLinks?: { label: string; href: string; icon: string }[];
  };
  products: { name: string; href: string }[];
  services: { title: string; href: string }[];
};

const DEFAULT_FOOTER: FooterSettings = {
  header: {
    logo: "/header_logo.svg",
    logoDark: "/header_logo.svg",
  },
  footer: {
    companyName: "Webwrite",
    description: "Empowering startups to scale smarter and faster.",
    contactEmail: "hello@kalpintelligence.com",
    meetingCta: { label: "Book a Meeting", href: "" },
    columns: [],
    social: {
      linkedin: "https://linkedin.com/company/webwrite",
      twitter: "https://twitter.com/kalp_ltd",
      instagram: "https://instagram.com/kalp_ltd",
      facebook: "https://facebook.com/Webwrite",
      youtube: "https://youtube.com/@kalp_ltd"
    },
  },
  products: [],
  services: [],
};

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export function Footer() {
  const pathname = usePathname();
  const isRapydlaunchPage = pathname === "/rapydlaunch";
  const isDarkFooter = isRapydlaunchPage;
  const settings = useCmsSettings();
  const [status, setStatus] = useState<"loading" | "all-up" | "degraded">("loading");

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.groups || data.groups.length === 0) {
          setStatus("all-up");
          return;
        }
        let allUp = true;
        for (const group of data.groups) {
          for (const monitor of group.monitors) {
            if (monitor.isUp === false) {
              allUp = false;
              break;
            }
          }
          if (!allUp) break;
        }
        setStatus(allUp ? "all-up" : "degraded");
      })
      .catch(() => setStatus("all-up"));
  }, []);

  const footerData = settings?.footer || DEFAULT_FOOTER.footer;
  const products = settings?.products || DEFAULT_FOOTER.products;
  const services = settings?.services || DEFAULT_FOOTER.services;

  // Use dynamic logos from header config in website dashboard settings
  const logoSrc = isDarkFooter
    ? (settings?.header?.logoDark || DEFAULT_FOOTER.header.logoDark)
    : (settings?.header?.logo || DEFAULT_FOOTER.header.logo);

  const renderLink = (name: string, href: string) => {
    const isExternal = href?.startsWith("http");
    const linkClass = `text-sm font-normal transition-colors duration-200 ${isDarkFooter ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-black"
      }`;

    if (isExternal) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline transition-colors duration-200">
          <span className={linkClass}>{name}</span>
          <span className={`text-[10px] ${isDarkFooter ? "text-zinc-500" : "text-zinc-400"}`}>↗</span>
        </a>
      );
    }
    return (
      <Link href={href || "#"} className={`hover:underline ${linkClass}`}>
        {name}
      </Link>
    );
  };

  return (
    <footer className={`px-6 sm:px-8 lg:px-12 py-16 border-t transition-colors duration-300 ${isDarkFooter ? "bg-black border-zinc-900 text-white" : "bg-white border-zinc-150 text-black"
      }`}>
      <div className="max-w-[1200px] mx-auto">
        {/* Brand Logo Row */}
        <div className="mb-12">
          <Link href="/" aria-label="Go to homepage">
            {logoSrc && (
              <Image
                src={logoSrc}
                alt={footerData.companyName || "Webwrite Logo"}
                width={120}
                height={35}
                className={`h-7 w-auto object-contain ${isDarkFooter ? "brightness-0 invert" : ""
                  }`}
                priority
              />
            )}
          </Link>
        </div>

        {/* Link Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 mb-16">
          {/* Column 1: Products */}
          {products && products.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className={`font-bold text-sm tracking-wider uppercase ${isDarkFooter ? "text-white" : "text-zinc-900"}`}>
                Products
              </h3>
              <div className="flex flex-col gap-2.5">
                {products.map((product) => (
                  <div key={product.name}>{renderLink(product.name, product.href)}</div>
                ))}
              </div>
            </div>
          )}

          {/* Column 2: Services */}
          {services && services.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className={`font-bold text-sm tracking-wider uppercase ${isDarkFooter ? "text-white" : "text-zinc-900"}`}>
                Services
              </h3>
              <div className="flex flex-col gap-2.5">
                {services.map((service) => (
                  <div key={service.title}>{renderLink(service.title, service.href)}</div>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Columns from Dashboard CMS Settings */}
          {footerData.columns?.map((col, idx) => (
            <div key={idx} className="flex flex-col gap-4">
              <h3 className={`font-bold text-sm tracking-wider uppercase ${isDarkFooter ? "text-white" : "text-zinc-900"}`}>
                {col.title}
              </h3>
              <div className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <div key={link.label}>{renderLink(link.label, link.href)}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Divider Line */}
        <div className={`border-t ${isDarkFooter ? "border-zinc-900" : "border-zinc-100"} mb-8`} />

        {/* Language & Socials Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
          <div className="flex items-center gap-6">
            {/* Language Selector */}
            <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDarkFooter ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-black"
              } cursor-pointer select-none`}>
              <Globe className="h-4 w-4" />
              <span>English</span>
            </div>

            {/* Status indicator */}
            <Link
              href="/status"
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDarkFooter ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-black"
                }`}
            >
              <span className="relative flex h-2 w-2">
                {status === "all-up" ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </>
                ) : status === "degraded" ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-300 animate-pulse"></span>
                )}
              </span>
              <span>
                {status === "all-up" ? "All systems operational" : status === "degraded" ? "Some systems degraded" : "Checking status..."}
              </span>
            </Link>
          </div>

          {/* Premium Clean Social Links */}
          <div className="flex items-center gap-6">
            {footerData.social?.linkedin && (
              <a
                href={footerData.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors duration-200 ${isDarkFooter ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-black"
                  }`}
                title="LinkedIn"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            )}
            {footerData.social?.twitter && (
              <a
                href={footerData.social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors duration-200 ${isDarkFooter ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-black"
                  }`}
                title="Twitter / X"
                aria-label="Twitter / X"
              >
                <XIcon className="w-4 h-4" />
              </a>
            )}
            {footerData.social?.youtube && (
              <a
                href={footerData.social.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors duration-200 ${isDarkFooter ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-black"
                  }`}
                title="YouTube"
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5" />
              </a>
            )}
            {footerData.social?.instagram && (
              <a
                href={footerData.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors duration-200 ${isDarkFooter ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-black"
                  }`}
                title="Instagram"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {/* Dynamic icon links from CMS Settings */}
            {((footerData as any).socialLinks || []).map((link: { label: string; href: string; icon: string }, i: number) => {
              const IconComp = SOCIAL_ICON_MAP[link.icon] || Globe;
              return (
                <a
                  key={i}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`transition-colors duration-200 ${isDarkFooter ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-black"}`}
                  title={link.label}
                  aria-label={link.label}
                >
                  {IconComp ? <IconComp className="w-5 h-5" /> : <span className="text-xs font-semibold">{link.label}</span>}
                </a>
              );
            })}
            {footerData.social?.facebook && (
              <a
                href={footerData.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors duration-200 ${isDarkFooter ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-black"
                  }`}
                title="Facebook"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>

      </div>
    </footer>
  );
}