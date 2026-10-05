"use client";

/**
 * CmsSettingsContext
 *
 * Fetches /api/cms/settings ONCE per page load and shares the result
 * to all consumers (Header, Footer, GoogleAnalytics, CustomScripts, etc.)
 * via React context ~ eliminating the 3–4 duplicate parallel fetches that
 * each component previously made independently.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ── Shared settings shape (add fields as needed) ─────────────────────────────
export type CmsSettings = {
  header: {
    logo: string;
    logoDark: string;
    cta: { label: string; href: string; show: boolean; dropdownTitle?: string };
    navItems: {
      label: string;
      href: string;
      type: "link" | "dropdown";
      children?: { label: string; href: string; description?: string }[];
    }[];
    customScripts?: { type: "url" | "inline"; value: string }[];
    socialLinks?: { label: string; href: string; icon: string }[];
  };
  footer: {
    companyName: string;
    description: string;
    contactEmail?: string;
    meetingCta?: { label: string; href: string };
    social: {
      linkedin?: string;
      twitter?: string;
      instagram?: string;
      facebook?: string;
      youtube?: string;
    };
    columns: { title: string; links: { label: string; href: string }[] }[];
    socialLinks?: { label: string; href: string; icon: string }[];
    legalLinks?: { label: string; href: string }[];
    employeeLoginHref?: string;
  };
  products: { name: string; tagline: string; image: string; href: string }[];
  services: { title: string; icon: string; href: string }[];
  seo?: {
    enableGoogleAnalytics?: boolean;
    googleAnalyticsId?: string;
    googleSearchConsoleMetaTag?: string;
  };
  aboutUs?: {
    founders?: {
      name: string;
      role: string;
      image: string;
      linkedin?: string;
      email?: string;
      calendly?: string;
    }[];
  };
};

const CmsSettingsContext = createContext<CmsSettings | null>(null);

let _settingsCache: CmsSettings | null = null;
let _fetchPromise: Promise<CmsSettings | null> | null = null;

/** Fetch once per browser session, cache in module-level var */
function fetchSettings(): Promise<CmsSettings | null> {
  if (_settingsCache) return Promise.resolve(_settingsCache);
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = fetch("/api/cms/settings", { next: { revalidate: 60 } } as RequestInit)
    .then(async (res) => {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        const settings = data?.settings ?? null;
        _settingsCache = settings;
        return settings;
      } catch {
        return null;
      }
    })
    .catch(() => null);

  return _fetchPromise;
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function CmsSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CmsSettings | null>(null);

  useEffect(() => {
    fetchSettings().then((s) => setSettings(s));
  }, []);

  return (
    <CmsSettingsContext.Provider value={settings}>
      {children}
    </CmsSettingsContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useCmsSettings(): CmsSettings | null {
  return useContext(CmsSettingsContext);
}
