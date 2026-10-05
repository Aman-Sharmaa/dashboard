import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@/components/seo-google-analytics";
import { CustomScripts } from "@/components/custom-scripts";
import { CmsSettingsProvider } from "@/components/cms-settings-context";
import { connectDB } from "@/lib/db";
import { CmsSetting } from "@/models/CmsSetting";

export const dynamic = "force-dynamic";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
  preload: true,
});

const getBaseUrl = () => {
  let url = process.env.NEXT_PUBLIC_SITE_URL || "https://Webwrite";
  if (!url.startsWith("http")) url = `https://${url}`;
  return new URL(url);
};

// Viewport export (fixes Next.js 15 themeColor warning)
export const viewport: Viewport = {
  themeColor: "#000000",
};

const defaultMetadata: Metadata = {
  metadataBase: getBaseUrl(),
  title: {
    default: "Webwrite",
    template: "%s | Webwrite",
  },
  description:
    "Born to create innovative products. Building modern SaaS, AI solutions, mobile apps, and digital products.",
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: "/fav.png",
    shortcut: "/fav.png",
    apple: "/fav.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Webwrite",
  },
  formatDetection: { telephone: false },
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    await connectDB();
    const doc = await CmsSetting.findOne().select("seo").lean();
    const verification = (doc?.seo as { googleSearchConsoleMetaTag?: string } | undefined)
      ?.googleSearchConsoleMetaTag?.trim();
    if (verification) {
      return { ...defaultMetadata, verification: { google: verification } };
    }
  } catch {
    // fall through to default
  }
  return defaultMetadata;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="font-sans">
        {/* Single provider ~ all components share one /api/cms/settings fetch */}
        <CmsSettingsProvider>
          {children}
          <GoogleAnalytics />
          <CustomScripts />
        </CmsSettingsProvider>
      </body>
    </html>
  );
}
