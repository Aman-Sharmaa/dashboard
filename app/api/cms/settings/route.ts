import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { CmsSetting } from "@/models/CmsSetting";
import { requireCmsAccess } from "@/lib/cms-auth";
import { DEFAULT_HOME_PAGE_SETTINGS } from "@/lib/home-page-defaults";

export const dynamic = "force-dynamic";

const DEFAULT_DASHBOARD_OVERVIEW = {
    admin: {
        title: "Dashboard",
        subtitle: "Overview for Webwrite",
        ctaLabel: "New project",
        ctaLink: "/dashboard/projects",
        showCta: true,
        quickLinks: [
            { label: "Projects", href: "/dashboard/projects", icon: "FolderKanban" },
            { label: "Team", href: "/dashboard/people", icon: "Users" },
            { label: "Clients", href: "/dashboard/clients", icon: "Building2" },
            { label: "Expenses", href: "/dashboard/expenses", icon: "Wallet" },
            { label: "Monitor", href: "/dashboard/monitor", icon: "Activity" },
            { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
        ],
        sections: {
            metrics: true,
            taskPerformance: true,
            upcomingPayments: true,
            monthlyOverall: true,
            secondaryMetrics: true,
            moneyInOut: true,
            profitLossChart: true,
            netPLGrowth: true,
            revenueChart: true,
            monitorOverview: true,
            meetingStatus: true,
            meetingStats: true,
        },
    },
    employee: {
        title: "Overview",
        subtitle: "Your dashboard · Check in/out, projects, and quick links.",
        quickLinks: [
            { label: "My projects", href: "/dashboard/projects", icon: "FolderKanban" },
            { label: "Team members", href: "/dashboard/people", icon: "Users" },
            { label: "Attendance", href: "/dashboard/attendance", icon: "Clock" },
            { label: "Reimbursement", href: "/dashboard/reimbursements", icon: "Receipt" },
            { label: "Payslips", href: "/dashboard/payslips", icon: "FileText" },
            { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
        ],
        sections: {
            checkInOut: true,
            statsCards: true,
            taskCounts: true,
            taskPerformance: true,
            projects: true,
        },
    },
};

export async function GET() {
    try {
        await connectDB();
        let settings = await CmsSetting.findOne().lean();
        if (!settings) {
            // Return default structure if no settings exist
            settings = {
                seo: {
                    enableGoogleAnalytics: false,
                    googleAnalyticsId: "",
                    googleSearchConsoleMetaTag: "",
                    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://Webwrite",
                    defaultMetaTitle: "Webwrite - Innovation Studio",
                    defaultMetaDescription: "Born to create innovative products. Building modern SaaS & digital products.",
                    twitterHandle: "",
                    openGraphImage: "",
                },
                header: {
                    navItems: [],
                    cta: { show: false, label: "", href: "" },
                    socialLinks: [],
                },
                footer: {
                    companyName: "Webwrite",
                    description: "",
                    contactEmail: "",
                    meetingCta: { label: "", href: "" },
                    columns: [],
                    social: {},
                    socialLinks: [],
                    legalLinks: [
                        { label: "Policy Center", href: "#" },
                        { label: "Terms of Use", href: "#" },
                        { label: "Privacy", href: "#" },
                    ],
                    employeeLoginHref: "/login",
                },
                products: [],
                services: [],
                aboutUs: {
                    hero: {
                        title: "",
                        subtitle: "",
                        ratingText: "",
                    },
                    mission: {
                        title: "",
                        description: "",
                    },
                    stats: [],
                    teamSectionTitle: "",
                    teamSectionSubtitle: "",
                    founders: [],
                    teamMembers: [],
                },
                dashboardOverview: DEFAULT_DASHBOARD_OVERVIEW,
                homePage: DEFAULT_HOME_PAGE_SETTINGS,
            };
        }
        // Ensure rapydlaunch and aboutUs fields exist even if settings were saved before these were added
        if (!settings.rapydlaunch) {
            settings.rapydlaunch = {
                header: {
                    logo: "/rl_logo.svg",
                    navItems: [
                        { label: "About Us", href: "/about-us", external: false },
                        { label: "Book a Call", href: "https://cal.com/amansharma", external: true },
                    ],
                    cta: { label: "Get Started", show: true },
                    bookCallUrl: "https://cal.com/amansharma",
                },
                footer: {
                    description: "Full-service digital partner for brands, startups, and businesses worldwide. One team, one goal.",
                    email: "hello@Webwrite",
                    companyLinks: [
                        { label: "About Us", href: "/about-us", external: false },
                        { label: "Book a Call", href: "https://cal.com/amansharma", external: true },
                        { label: "Webwrite Home", href: "/", external: false },
                    ],
                },
            };
        }
        if (!(settings as any).dashboardOverview) {
            (settings as any).dashboardOverview = DEFAULT_DASHBOARD_OVERVIEW;
        }
        if (!(settings as any).seo) {
            (settings as any).seo = {
                enableGoogleAnalytics: false,
                googleAnalyticsId: "",
                googleSearchConsoleMetaTag: "",
                siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://Webwrite",
                defaultMetaTitle: "Webwrite - Innovation Studio",
                defaultMetaDescription: "Born to create innovative products. Building modern SaaS & digital products.",
                twitterHandle: "",
                openGraphImage: "",
            };
        }
        if (!(settings as any).homePage) {
            (settings as any).homePage = DEFAULT_HOME_PAGE_SETTINGS;
        }
        if (!(settings as any).footer?.contactEmail) {
            (settings as any).footer = {
                ...(settings as any).footer,
                contactEmail: "hello@Webwrite",
            };
        }
        if (!(settings as any).footer?.meetingCta) {
            (settings as any).footer = {
                ...(settings as any).footer,
                meetingCta: { label: "", href: "" },
            };
        }
        if (!(settings as any).header) {
            (settings as any).header = { navItems: [], cta: { show: false, label: "", href: "" } };
        }
        if (!(settings as any).header.socialLinks) {
            (settings as any).header.socialLinks = [];
        }
        if (!(settings as any).footer) {
            (settings as any).footer = {};
        }
        if (!(settings as any).footer.socialLinks) {
            (settings as any).footer.socialLinks = [];
        }
        // Hydrate legalLinks default if missing from older settings documents
        if (!(settings as any).footer.legalLinks) {
            (settings as any).footer.legalLinks = [
                { label: "Policy Center", href: "#" },
                { label: "Terms of Use", href: "#" },
                { label: "Privacy", href: "#" },
            ];
        }
        if (!(settings as any).footer.contactEmail) {
            (settings as any).footer.contactEmail = "";
        }
        if (!settings.aboutUs) {
            settings.aboutUs = {
                hero: {
                    title: "",
                    subtitle: "",
                    ratingText: "",
                },
                mission: {
                    title: "",
                    description: "",
                },
                stats: [],
                teamSectionTitle: "",
                teamSectionSubtitle: "",
                founders: [],
                teamMembers: [],
            };
        }
        return NextResponse.json({ settings });
    } catch (e) {
        console.error("GET settings error", e);
        // Always return JSON - never let HTML error page leak through
        return NextResponse.json(
            { settings: null, message: "Server error" },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    const auth = await requireCmsAccess();
    if (!auth) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    try {
        await connectDB();
        const body = await req.json();

        // Update or create the single settings document
        // We use findOneAndUpdate with upsert to ensure only one document exists
        const settings = await CmsSetting.findOneAndUpdate(
            {},
            { $set: body },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Revalidate the entire site so changes reflect immediately without manual refresh
        revalidatePath("/", "layout");

        return NextResponse.json({ settings });
    } catch (e) {
        console.error("PUT settings error", e);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
