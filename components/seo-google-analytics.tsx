"use client";

import Script from "next/script";
import { useCmsSettings } from "@/components/cms-settings-context";

export function GoogleAnalytics() {
  const settings = useCmsSettings();
  const seo = settings?.seo;
  const enabled = seo?.enableGoogleAnalytics && seo?.googleAnalyticsId?.trim();
  const id = (seo?.googleAnalyticsId || "").trim();

  if (!enabled || !id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}');
        `}
      </Script>
    </>
  );
}
