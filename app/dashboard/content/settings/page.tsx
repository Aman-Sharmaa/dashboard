"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CmsImageUpload } from "@/components/cms-image-upload";
import { AboutUsSettingsEditor } from "@/components/about-us-settings-editor";
import { useRouter, useSearchParams } from "next/navigation";
import {
    DEFAULT_HOME_PAGE_SETTINGS,
    type HomeFaqItem,
    type HomeSectionKey,
    type HomeTestimonialItem,
    type HomePageSettings,
} from "@/lib/home-page-defaults";

type RapydNavItem = { label: string; href: string; external: boolean };
type TeamMember = { name: string; role: string; image: string; linkedin: string; email: string; calendly: string };
type StatItem = { value: string; label: string };

type DashboardQuickLink = { label: string; href: string; icon: string };


type SeoForm = {
    enableGoogleAnalytics: boolean;
    googleAnalyticsId: string;
    googleSearchConsoleMetaTag: string;
    siteUrl: string;
    defaultMetaTitle: string;
    defaultMetaDescription: string;
    twitterHandle: string;
    openGraphImage: string;
};

type CustomScript = { type: "url" | "inline"; value: string };

type FormValues = {
    seo?: SeoForm;
    header: {
        logo: string;
        logoDark: string;
        cta: { label: string; href: string; show: boolean; dropdownTitle?: string };
        navItems: { label: string; href: string; type: "link" | "dropdown"; children: { label: string; href: string; description: string; icon: string }[] }[];
        customScripts?: CustomScript[];
        socialLinks?: { label: string; href: string; icon: string }[];
    };
    footer: {
        companyName: string;
        description: string;
        contactEmail: string;
        meetingCta: { label: string; href: string };
        social: { linkedin: string; twitter: string; instagram: string; facebook: string };
        columns: { title: string; links: { label: string; href: string }[] }[];
        socialLinks?: { label: string; href: string; icon: string }[];
    };
    products: { name: string; tagline: string; image: string; href: string }[];
    services: { title: string; icon: string; href: string }[];
    rapydlaunch: {
        header: {
            logo: string;
            navItems: RapydNavItem[];
            cta: { label: string; show: boolean };
            bookCallUrl: string;
        };
        footer: {
            description: string;
            email: string;
            companyLinks: RapydNavItem[];
        };
    };
    aboutUs: {
        hero: { title: string; subtitle: string; ratingText: string };
        mission: { title: string; description: string };
        stats: StatItem[];
        teamSectionTitle: string;
        teamSectionSubtitle: string;
        founders: TeamMember[];
        teamMembers: TeamMember[];
        timeline?: { year: string; title: string; description: string }[];
        culture?: { title: string; subtitle: string; cards: { icon: string; title: string; description: string }[] };
        hiring?: { title: string; location: string; type: string; link: string }[];
    };
    dashboardOverview: {
        admin: {
            title: string;
            subtitle: string;
            ctaLabel: string;
            ctaLink: string;
            showCta: boolean;
            quickLinks: DashboardQuickLink[];
            sections: {
                metrics: boolean;
                taskPerformance: boolean;
                upcomingPayments: boolean;
                monthlyOverall: boolean;
                secondaryMetrics: boolean;
                moneyInOut: boolean;
                profitLossChart: boolean;
                netPLGrowth: boolean;
                revenueChart: boolean;
                monitorOverview: boolean;
                meetingStatus: boolean;
                meetingStats: boolean;
            };
        };
        employee: {
            title: string;
            subtitle: string;
            quickLinks: DashboardQuickLink[];
            sections: {
                checkInOut: boolean;
                statsCards: boolean;
                taskCounts: boolean;
                taskPerformance: boolean;
                projects: boolean;
            };
        };
    };
    homePage: HomePageSettings;
    defaultHomePageId?: string;
};

function FooterColumnLinks({ control, columnIndex, register }: { control: any; columnIndex: number; register: any }) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `footer.columns.${columnIndex}.links`,
    });

    return (
        <div className="pl-6 space-y-3 border-l-2 border-muted ml-2">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Links</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => append({ label: "", href: "" })} className="h-7 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add Link
                </Button>
            </div>
            {fields.map((link, linkIndex) => (
                <div key={link.id} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                        <Input {...register(`footer.columns.${columnIndex}.links.${linkIndex}.label`)} placeholder="Link Label" className="h-8 text-sm" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <Input {...register(`footer.columns.${columnIndex}.links.${linkIndex}.href`)} placeholder="URL" className="h-8 text-sm" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(linkIndex)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ))}
            {fields.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No links added to this column.</p>
            )}
        </div>
    );
}

export default function SettingsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = searchParams?.get("tab") || "header";

    const [loading, setLoading] = useState(true);
    const [expandedNavIdx, setExpandedNavIdx] = useState<number | null>(null);
    const [cmsPages, setCmsPages] = useState<{ _id: string; title: string; slug: string }[]>([]);

    const form = useForm<FormValues>({
        defaultValues: {
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
            header: { navItems: [], cta: { show: true, label: "", href: "" }, customScripts: [], socialLinks: [] },
            footer: {
                columns: [],
                social: {} as any,
                contactEmail: "hello@Webwrite",
                meetingCta: { label: "Book a Meeting", href: "" },
                socialLinks: [],
            },
            products: [],
            services: [],
            rapydlaunch: {
                header: { logo: "/rl_logo.svg", navItems: [], cta: { label: "Get Started", show: true }, bookCallUrl: "" },
                footer: { description: "", email: "", companyLinks: [] },
            },
            aboutUs: {
                hero: { title: "", subtitle: "", ratingText: "" },
                mission: { title: "", description: "" },
                stats: [],
                teamSectionTitle: "",
                teamSectionSubtitle: "",
                founders: [],
                teamMembers: [],
                timeline: [],
                culture: { title: "", subtitle: "", cards: [] },
                hiring: [],
            },
            dashboardOverview: {
                admin: {
                    title: "Dashboard",
                    subtitle: "Overview for Webwrite",
                    ctaLabel: "New project",
                    ctaLink: "/dashboard/projects",
                    showCta: true,
                    quickLinks: [],
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
                    quickLinks: [],
                    sections: {
                        checkInOut: true,
                        statsCards: true,
                        taskCounts: true,
                        taskPerformance: true,
                        projects: true,
                    },
                },
            },
            homePage: DEFAULT_HOME_PAGE_SETTINGS,
        },
    });

    const { fields: customScriptFields, append: appendCustomScript, remove: removeCustomScript } = useFieldArray({
        control: form.control,
        name: "header.customScripts",
    });

    const { fields: navItemFields, append: appendNavItem, remove: removeNavItem } = useFieldArray({
        control: form.control,
        name: "header.navItems",
    });


    const { fields: productFields, append: appendProduct, remove: removeProduct } = useFieldArray({
        control: form.control,
        name: "products",
    });

    const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
        control: form.control,
        name: "services",
    });

    const { fields: footerColFields, append: appendFooterCol, remove: removeFooterCol } = useFieldArray({
        control: form.control,
        name: "footer.columns",
    });

    const { fields: headerSocialFields, append: appendHeaderSocial, remove: removeHeaderSocial } = useFieldArray({
        control: form.control,
        name: "header.socialLinks",
    });

    const { fields: footerSocialFields, append: appendFooterSocial, remove: removeFooterSocial } = useFieldArray({
        control: form.control,
        name: "footer.socialLinks",
    });

    // Rapydlaunch field arrays
    const { fields: rlNavFields, append: appendRlNav, remove: removeRlNav } = useFieldArray({
        control: form.control,
        name: "rapydlaunch.header.navItems",
    });

    const { fields: rlCompanyFields, append: appendRlCompany, remove: removeRlCompany } = useFieldArray({
        control: form.control,
        name: "rapydlaunch.footer.companyLinks",
    });

    // About Us field arrays
    const { fields: statFields, append: appendStat, remove: removeStat } = useFieldArray({
        control: form.control,
        name: "aboutUs.stats",
    });

    const { fields: founderFields, append: appendFounder, remove: removeFounder } = useFieldArray({
        control: form.control,
        name: "aboutUs.founders",
    });

    const { fields: teamFields, append: appendTeam, remove: removeTeam } = useFieldArray({
        control: form.control,
        name: "aboutUs.teamMembers",
    });

    const { fields: timelineFields, append: appendTimeline, remove: removeTimeline } = useFieldArray({
        control: form.control,
        name: "aboutUs.timeline",
    });

    const { fields: cultureCardsFields, append: appendCultureCard, remove: removeCultureCard } = useFieldArray({
        control: form.control,
        name: "aboutUs.culture.cards",
    });

    const { fields: hiringFields, append: appendHiring, remove: removeHiring } = useFieldArray({
        control: form.control,
        name: "aboutUs.hiring",
    });

    // Dashboard Overview field arrays
    const { fields: adminQLFields, append: appendAdminQL, remove: removeAdminQL } = useFieldArray({
        control: form.control,
        name: "dashboardOverview.admin.quickLinks",
    });

    const { fields: empQLFields, append: appendEmpQL, remove: removeEmpQL } = useFieldArray({
        control: form.control,
        name: "dashboardOverview.employee.quickLinks",
    });

    const { fields: homeTestimonialFields, append: appendHomeTestimonial, remove: removeHomeTestimonial } = useFieldArray({
        control: form.control,
        name: "homePage.testimonials.items",
    });

    const { fields: homeFaqFields, append: appendHomeFaq, remove: removeHomeFaq } = useFieldArray({
        control: form.control,
        name: "homePage.faq.items",
    });

    const { fields: homeLogoFields, append: appendHomeLogo, remove: removeHomeLogo } = useFieldArray({
        control: form.control as any,
        // react-hook-form's typed FieldArrayPath omits primitive arrays (string[]), so cast here.
        name: "homePage.hero.clientLogos" as any,
    });

    // Load existing settings
    useEffect(() => {
        fetch("/api/cms/settings", { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => {
                if (data.settings) {
                    const s = data.settings as FormValues;
                    if (!s.header) s.header = { navItems: [], cta: { show: true, label: "", href: "" }, customScripts: [], socialLinks: [] } as any;
                    if (!Array.isArray(s.header.customScripts)) s.header.customScripts = [];
                    if (!Array.isArray(s.header.socialLinks)) s.header.socialLinks = [];
                    if (!s.footer) s.footer = { columns: [], social: {} as any, contactEmail: "hello@Webwrite", socialLinks: [] } as any;
                    if (!Array.isArray(s.footer.socialLinks)) s.footer.socialLinks = [];
                    // Ensure seo exists so the tab form fields work
                    if (!s.seo) {
                        s.seo = {
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
                    if (!s.homePage) {
                        s.homePage = DEFAULT_HOME_PAGE_SETTINGS;
                    } else {
                        s.homePage = {
                            ...DEFAULT_HOME_PAGE_SETTINGS,
                            ...(s.homePage as any),
                            hero: { ...DEFAULT_HOME_PAGE_SETTINGS.hero, ...((s.homePage as any).hero || {}) },
                            about: { ...DEFAULT_HOME_PAGE_SETTINGS.about, ...((s.homePage as any).about || {}) },
                            testimonials: {
                                ...DEFAULT_HOME_PAGE_SETTINGS.testimonials,
                                ...((s.homePage as any).testimonials || {}),
                                items: ((s.homePage as any).testimonials?.items || DEFAULT_HOME_PAGE_SETTINGS.testimonials.items),
                            },
                            faq: {
                                ...DEFAULT_HOME_PAGE_SETTINGS.faq,
                                ...((s.homePage as any).faq || {}),
                                items: ((s.homePage as any).faq?.items || DEFAULT_HOME_PAGE_SETTINGS.faq.items),
                            },
                            videoTestimonial: {
                                ...DEFAULT_HOME_PAGE_SETTINGS.videoTestimonial,
                                ...((s.homePage as any).videoTestimonial || {}),
                            },
                        };
                    }
                    if (!s.footer?.meetingCta) {
                        s.footer = {
                            ...(s.footer as any),
                            meetingCta: { label: "Book a Meeting", href: "" },
                            contactEmail: s.footer?.contactEmail || "hello@Webwrite",
                        };
                    }
                    if (s.aboutUs) {
                        s.aboutUs.timeline = s.aboutUs.timeline || [];
                        s.aboutUs.culture = s.aboutUs.culture || { title: "", subtitle: "", cards: [] };
                        s.aboutUs.culture.cards = s.aboutUs.culture.cards || [];
                        s.aboutUs.hiring = s.aboutUs.hiring || [];
                    }
                    form.reset(s);
                }
            })
            .catch(() => toast.error("Failed to load settings"))
            .finally(() => setLoading(false));

        fetch("/api/cms/pages")
            .then((res) => res.json())
            .then((data) => {
                if (data.pages) setCmsPages(data.pages);
            })
            .catch(() => console.error("Failed to fetch CMS pages"));
    }, [form]);

    const onSubmit = async (values: FormValues) => {
        try {
            const allowedSectionKeys: HomeSectionKey[] = ["hero", "products", "services", "about", "videoTestimonial", "testimonials", "faq"];
            const normalizedOrder = (values.homePage.sectionOrder || []).filter((key): key is HomeSectionKey =>
                allowedSectionKeys.includes(key as HomeSectionKey)
            );
            values.homePage.sectionOrder = normalizedOrder.length > 0 ? normalizedOrder : DEFAULT_HOME_PAGE_SETTINGS.sectionOrder;

            const res = await fetch("/api/cms/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            if (!res.ok) throw new Error("Failed to save");
            toast.success("Settings saved successfully");
        } catch {
            toast.error("Failed to save settings");
        }
    };

    const handleTabChange = (val: string) => {
        const params = new URLSearchParams(searchParams?.toString());
        params.set("tab", val);
        router.push(`/dashboard/content/settings?${params.toString()}`);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Appearance Settings</h2>
                    <p className="text-muted-foreground">
                        Manage global header, footer, and shared content.
                    </p>
                </div>
                <Button onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                </Button>
            </div>

            <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="flex-wrap">
                    <TabsTrigger value="header">Header</TabsTrigger>
                    <TabsTrigger value="footer">Footer</TabsTrigger>
                    <TabsTrigger value="products">Products</TabsTrigger>
                    <TabsTrigger value="services">Services</TabsTrigger>
                    <TabsTrigger value="rapydlaunch">Rapydlaunch</TabsTrigger>
                    <TabsTrigger value="about-us">About Us</TabsTrigger>
                    <TabsTrigger value="home-page">Home Page</TabsTrigger>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="seo">SEO & Analytics</TabsTrigger>
                </TabsList>

                {/* HEADER TAB */}
                <TabsContent value="header" className="space-y-6">

                    {/* Public Header Navigation */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Public Header Navigation</CardTitle>
                                    <CardDescription>
                                        Manage links shown in the top navigation. Use type &quot;Dropdown&quot; to add sub-menu items.
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendNavItem({ label: "", href: "", type: "link", children: [] })}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Nav Item
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {navItemFields.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No nav items yet. Add one above.</p>
                            ) : (
                                <div className="space-y-3">
                                    {navItemFields.map((field, index) => (
                                        <div key={field.id} className="border rounded-xl p-3 space-y-3 bg-muted/10">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Input
                                                    {...form.register(`header.navItems.${index}.label`)}
                                                    className="h-8 max-w-[160px] text-sm"
                                                    placeholder="Label"
                                                />
                                                <Input
                                                    {...form.register(`header.navItems.${index}.href`)}
                                                    className="h-8 flex-1 min-w-[120px] text-sm"
                                                    placeholder="/href or https://..."
                                                />
                                                <Select
                                                    value={form.watch(`header.navItems.${index}.type`)}
                                                    onValueChange={(v: "link" | "dropdown") =>
                                                        form.setValue(`header.navItems.${index}.type`, v)
                                                    }
                                                >
                                                    <SelectTrigger className="w-32 h-8">
                                                        <SelectValue placeholder="Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="link">Link</SelectItem>
                                                        <SelectItem value="dropdown">Dropdown</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {form.watch(`header.navItems.${index}.type`) === "dropdown" && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => setExpandedNavIdx(expandedNavIdx === index ? null : index)}
                                                    >
                                                        {expandedNavIdx === index
                                                            ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                                            : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                                        }
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive ml-auto"
                                                    onClick={() => removeNavItem(index)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            {/* Dropdown children */}
                                            {form.watch(`header.navItems.${index}.type`) === "dropdown" && expandedNavIdx === index && (
                                                <div className="ml-4 space-y-2 border-l-2 border-muted pl-3">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dropdown items</p>
                                                    {(form.watch(`header.navItems.${index}.children`) || []).map((_child: any, cidx: number) => (
                                                        <div key={cidx} className="flex items-center gap-2 flex-wrap">
                                                            <Input
                                                                {...form.register(`header.navItems.${index}.children.${cidx}.label`)}
                                                                className="h-7 max-w-[130px] text-xs"
                                                                placeholder="Label"
                                                            />
                                                            <Input
                                                                {...form.register(`header.navItems.${index}.children.${cidx}.href`)}
                                                                className="h-7 flex-1 min-w-[100px] text-xs"
                                                                placeholder="/href"
                                                            />
                                                            <Input
                                                                {...form.register(`header.navItems.${index}.children.${cidx}.description`)}
                                                                className="h-7 flex-1 min-w-[100px] text-xs"
                                                                placeholder="Description (optional)"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-destructive"
                                                                onClick={() => {
                                                                    const children = form.getValues(`header.navItems.${index}.children`) || [];
                                                                    form.setValue(`header.navItems.${index}.children`, children.filter((_: any, ci: number) => ci !== cidx));
                                                                }}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => {
                                                            const children = form.getValues(`header.navItems.${index}.children`) || [];
                                                            form.setValue(`header.navItems.${index}.children`, [...children, { label: "", href: "", description: "", icon: "" }]);
                                                        }}
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" /> Add item
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Logo & Branding</CardTitle>
                            <CardDescription>Upload logos for light and dark modes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label>Light Mode Logo</Label>
                                    <CmsImageUpload
                                        value={form.watch("header.logo")}
                                        onChange={(url) => form.setValue("header.logo", url)}
                                        label="Upload Light Logo"
                                    />
                                </div>
                                <div>
                                    <Label>Dark Mode Logo (Optional)</Label>
                                    <CmsImageUpload
                                        value={form.watch("header.logoDark")}
                                        onChange={(url) => form.setValue("header.logoDark", url)}
                                        label="Upload Dark Logo"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Call to Action (CTA)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={form.watch("header.cta.show")}
                                    onCheckedChange={(checked: boolean) => form.setValue("header.cta.show", checked)}
                                />
                                <Label>Show CTA Button</Label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Label</Label>
                                    <Input {...form.register("header.cta.label")} placeholder="Book a call" />
                                </div>
                                <div>
                                    <Label>URL</Label>
                                    <Input {...form.register("header.cta.href")} placeholder="https://..." />
                                </div>
                                <div className="col-span-2">
                                    <Label>Dropdown Title (on Hover)</Label>
                                    <Input {...form.register("header.cta.dropdownTitle")} placeholder="Create an account" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Additional JavaScript</CardTitle>
                                    <CardDescription>
                                        Inject custom scripts into every page (in head). Use for analytics, chat widgets, or other third-party JS.
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendCustomScript({ type: "url", value: "" })}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add script
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {customScriptFields.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No scripts added.</p>
                            ) : (
                                customScriptFields.map((field, index) => (
                                    <div key={field.id} className="flex gap-3 p-4 border rounded-lg">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2 w-full">
                                                <Select
                                                    value={form.watch(`header.customScripts.${index}.type`)}
                                                    onValueChange={(v: "url" | "inline") =>
                                                        form.setValue(`header.customScripts.${index}.type`, v)
                                                    }
                                                >
                                                    <SelectTrigger className="w-28 shrink-0">
                                                        <SelectValue placeholder="Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="url">URL</SelectItem>
                                                        <SelectItem value="inline">Inline</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {form.watch(`header.customScripts.${index}.type`) === "url" ? (
                                                    <Input
                                                        {...form.register(`header.customScripts.${index}.value`)}
                                                        placeholder="https://example.com/script.js"
                                                        className="flex-1 font-mono text-xs"
                                                    />
                                                ) : (
                                                    <Textarea
                                                        {...form.register(`header.customScripts.${index}.value`)}
                                                        placeholder="console.log('hello');"
                                                        rows={3}
                                                        className="font-mono text-xs"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive shrink-0"
                                            onClick={() => removeCustomScript(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Header Social & Custom Icons</CardTitle>
                                    <CardDescription>
                                        Add links and icons dynamically to the header. Icon values can be Lucide icon names (e.g. "Linkedin", "Twitter", "Github", "Globe").
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendHeaderSocial({ label: "", href: "", icon: "Globe" })}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Icon Link
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {headerSocialFields.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No header icon links added.</p>
                            ) : (
                                headerSocialFields.map((field, index) => (
                                    <div key={field.id} className="flex gap-3 items-end p-3 border rounded-lg">
                                        <div className="flex-1 space-y-1">
                                            <Label>Platform/Label</Label>
                                            <Input {...form.register(`header.socialLinks.${index}.label`)} placeholder="e.g. LinkedIn" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label>URL</Label>
                                            <Input {...form.register(`header.socialLinks.${index}.href`)} placeholder="https://..." />
                                        </div>
                                        <div className="w-48 space-y-1">
                                            <Label>Icon Name</Label>
                                            <Input {...form.register(`header.socialLinks.${index}.icon`)} placeholder="e.g. Linkedin" />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive shrink-0"
                                            onClick={() => removeHeaderSocial(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FOOTER TAB */}
                <TabsContent value="footer" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Company Name</Label>
                                <Input {...form.register("footer.companyName")} />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea {...form.register("footer.description")} rows={2} />
                            </div>
                            <div>
                                <Label>Contact Email</Label>
                                <Input {...form.register("footer.contactEmail")} placeholder="hello@Webwrite" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Footer CTA Label</Label>
                                    <Input {...form.register("footer.meetingCta.label")} placeholder="Book a Meeting" />
                                </div>
                                <div>
                                    <Label>Footer CTA URL</Label>
                                    <Input {...form.register("footer.meetingCta.href")} placeholder="https://..." />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Social Links</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>LinkedIn</Label>
                                <Input {...form.register("footer.social.linkedin")} placeholder="https://linkedin.com/..." />
                            </div>
                            <div>
                                <Label>Twitter (X)</Label>
                                <Input {...form.register("footer.social.twitter")} placeholder="https://twitter.com/..." />
                            </div>
                            <div>
                                <Label>Instagram</Label>
                                <Input {...form.register("footer.social.instagram")} placeholder="https://instagram.com/..." />
                            </div>
                            <div>
                                <Label>Facebook</Label>
                                <Input {...form.register("footer.social.facebook")} placeholder="https://facebook.com/..." />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Footer Columns</CardTitle>
                                <Button variant="outline" size="sm" onClick={() => appendFooterCol({ title: "New Column", links: [] })}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Column
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {footerColFields.map((col, index) => (
                                <div key={col.id} className="p-4 border rounded-lg space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <Label>Column Title</Label>
                                            <Input {...form.register(`footer.columns.${index}.title`)} />
                                        </div>
                                        <Button variant="ghost" size="icon" className="mt-6 text-destructive" onClick={() => removeFooterCol(index)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <FooterColumnLinks
                                        control={form.control}
                                        columnIndex={index}
                                        register={form.register}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Dynamic Footer Icons & Links</CardTitle>
                                    <CardDescription>
                                        Add links and icons dynamically under the footer columns. Icon values can be Lucide icon names (e.g. "Linkedin", "Twitter", "Facebook", "Youtube", "Github", "Globe").
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendFooterSocial({ label: "", href: "", icon: "Globe" })}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Icon Link
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {footerSocialFields.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No dynamic footer icon links added.</p>
                            ) : (
                                footerSocialFields.map((field, index) => (
                                    <div key={field.id} className="flex gap-3 items-end p-3 border rounded-lg">
                                        <div className="flex-1 space-y-1">
                                            <Label>Platform/Label</Label>
                                            <Input {...form.register(`footer.socialLinks.${index}.label`)} placeholder="e.g. LinkedIn" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label>URL</Label>
                                            <Input {...form.register(`footer.socialLinks.${index}.href`)} placeholder="https://..." />
                                        </div>
                                        <div className="w-48 space-y-1">
                                            <Label>Icon Name</Label>
                                            <Input {...form.register(`footer.socialLinks.${index}.icon`)} placeholder="e.g. Linkedin" />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive shrink-0"
                                            onClick={() => removeFooterSocial(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PRODUCTS TAB */}
                <TabsContent value="products" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Products</CardTitle>
                                <Button variant="outline" size="sm" onClick={() => appendProduct({ name: "", tagline: "", image: "", href: "" })}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Product
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {productFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg relative group">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeProduct(index)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>

                                    <div className="space-y-2">
                                        <Label>Product Name</Label>
                                        <Input {...form.register(`products.${index}.name`)} placeholder="e.g. Gram" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tagline</Label>
                                        <Input {...form.register(`products.${index}.tagline`)} placeholder="Short description" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Link URL</Label>
                                        <Input {...form.register(`products.${index}.href`)} placeholder="https://..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Icon/Logo</Label>
                                        <CmsImageUpload
                                            value={form.watch(`products.${index}.image`)}
                                            onChange={(url) => form.setValue(`products.${index}.image`, url)}
                                            label="Upload Icon"
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SERVICES TAB */}
                <TabsContent value="services" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Services</CardTitle>
                                <Button variant="outline" size="sm" onClick={() => appendService({ title: "", icon: "Code", href: "" })}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Service
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {serviceFields.map((field, index) => (
                                <div key={field.id} className="p-4 border rounded-lg relative group space-y-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeService(index)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>

                                    <div>
                                        <Label>Service Title</Label>
                                        <Input {...form.register(`services.${index}.title`)} />
                                    </div>
                                    <div>
                                        <Label>Icon Name (Lucide)</Label>
                                        <Input {...form.register(`services.${index}.icon`)} placeholder="Code, Smartphone, etc." />
                                    </div>
                                    <div>
                                        <Label>Link URL</Label>
                                        <Input {...form.register(`services.${index}.href`)} />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* RAPYDLAUNCH TAB */}
                <TabsContent value="rapydlaunch" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Rapydlaunch Header</CardTitle>
                            <CardDescription>Configure the Rapydlaunch header logo, nav items, and CTA.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label>Logo Path</Label>
                                <Input {...form.register("rapydlaunch.header.logo")} placeholder="/rl_logo.svg" />
                            </div>
                            <div>
                                <Label>Book a Call URL</Label>
                                <Input {...form.register("rapydlaunch.header.bookCallUrl")} placeholder="https://cal.com/..." />
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={form.watch("rapydlaunch.header.cta.show")}
                                    onCheckedChange={(checked: boolean) => form.setValue("rapydlaunch.header.cta.show", checked)}
                                />
                                <Label>Show CTA Button</Label>
                            </div>
                            <div>
                                <Label>CTA Label</Label>
                                <Input {...form.register("rapydlaunch.header.cta.label")} placeholder="Get Started" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Navigation Items</CardTitle>
                                <Button variant="outline" size="sm" onClick={() => appendRlNav({ label: "", href: "", external: false })}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Nav Item
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {rlNavFields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-3 p-3 border rounded-lg">
                                    <div className="flex-1 space-y-1">
                                        <Label>Label</Label>
                                        <Input {...form.register(`rapydlaunch.header.navItems.${index}.label`)} placeholder="About Us" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label>URL</Label>
                                        <Input {...form.register(`rapydlaunch.header.navItems.${index}.href`)} placeholder="/about-us" />
                                    </div>
                                    <div className="flex items-center gap-2 pb-1">
                                        <Switch
                                            checked={form.watch(`rapydlaunch.header.navItems.${index}.external`)}
                                            onCheckedChange={(checked: boolean) => form.setValue(`rapydlaunch.header.navItems.${index}.external`, checked)}
                                        />
                                        <Label className="text-xs">External</Label>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRlNav(index)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Rapydlaunch Footer</CardTitle>
                            <CardDescription>Configure the Rapydlaunch footer description, email, and company links.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Description</Label>
                                <Textarea {...form.register("rapydlaunch.footer.description")} rows={2} />
                            </div>
                            <div>
                                <Label>Contact Email</Label>
                                <Input {...form.register("rapydlaunch.footer.email")} placeholder="hello@Webwrite" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Company Links</CardTitle>
                                <Button variant="outline" size="sm" onClick={() => appendRlCompany({ label: "", href: "", external: false })}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Link
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {rlCompanyFields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-3 p-3 border rounded-lg">
                                    <div className="flex-1 space-y-1">
                                        <Label>Label</Label>
                                        <Input {...form.register(`rapydlaunch.footer.companyLinks.${index}.label`)} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label>URL</Label>
                                        <Input {...form.register(`rapydlaunch.footer.companyLinks.${index}.href`)} />
                                    </div>
                                    <div className="flex items-center gap-2 pb-1">
                                        <Switch
                                            checked={form.watch(`rapydlaunch.footer.companyLinks.${index}.external`)}
                                            onCheckedChange={(checked: boolean) => form.setValue(`rapydlaunch.footer.companyLinks.${index}.external`, checked)}
                                        />
                                        <Label className="text-xs">External</Label>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRlCompany(index)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABOUT US TAB ~ now edited via Page Builder */}
                <TabsContent value="about-us" className="space-y-6">
                    <AboutUsSettingsEditor />
                </TabsContent>


                {/* HOME PAGE TAB ~ now edited via Page Builder */}
                <TabsContent value="home-page" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Default Home Page</CardTitle>
                            <CardDescription>Select a CMS Page to act as your primary home page.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Select
                                value={form.watch("defaultHomePageId") || ""}
                                onValueChange={(v) => form.setValue("defaultHomePageId", v)}
                            >
                                <SelectTrigger className="w-full max-w-sm">
                                    <SelectValue placeholder="Select a page..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {cmsPages.map((p) => (
                                        <SelectItem key={p._id} value={p._id}>{p.title} ({p.slug})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">This page will be served at the site root (/).</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Edit Home Page Content</CardTitle>
                            <CardDescription>
                                All home page sections (hero, products, services, FAQ, testimonials, etc.) are now fully managed through the <strong>Page Builder</strong>.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-3">
                                <p className="text-sm text-muted-foreground">
                                    Open the Pages list, select your home page, and click <em>Edit</em> to use the visual page builder.
                                </p>
                                <a
                                    href="/dashboard/content/pages"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-fit"
                                >
                                    Go to Pages →
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>


                {/* DASHBOARD OVERVIEW TAB */}
                <TabsContent value="dashboard" className="space-y-6">
                    {/* Admin Dashboard Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Admin Dashboard</CardTitle>
                            <CardDescription>Configure the admin dashboard overview page title, CTA, and visible sections.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Page Title</Label>
                                    <Input {...form.register("dashboardOverview.admin.title")} placeholder="Dashboard" />
                                </div>
                                <div>
                                    <Label>Subtitle</Label>
                                    <Input {...form.register("dashboardOverview.admin.subtitle")} placeholder="Overview for Webwrite" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label>CTA Button Label</Label>
                                    <Input {...form.register("dashboardOverview.admin.ctaLabel")} placeholder="New project" />
                                </div>
                                <div>
                                    <Label>CTA Button Link</Label>
                                    <Input {...form.register("dashboardOverview.admin.ctaLink")} placeholder="/dashboard/projects" />
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <Switch
                                        checked={form.watch("dashboardOverview.admin.showCta")}
                                        onCheckedChange={(checked: boolean) => form.setValue("dashboardOverview.admin.showCta", checked)}
                                    />
                                    <Label>Show CTA</Label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Admin Quick Links</CardTitle>
                                    <CardDescription>Sidebar quick actions shown on the admin dashboard.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => appendAdminQL({ label: "", href: "", icon: "ArrowUpRight" })}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Link
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {adminQLFields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-3 p-3 border rounded-lg">
                                    <div className="flex-1 space-y-1">
                                        <Label>Label</Label>
                                        <Input {...form.register(`dashboardOverview.admin.quickLinks.${index}.label`)} placeholder="Projects" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label>URL</Label>
                                        <Input {...form.register(`dashboardOverview.admin.quickLinks.${index}.href`)} placeholder="/dashboard/projects" />
                                    </div>
                                    <div className="w-36 space-y-1">
                                        <Label>Icon (Lucide)</Label>
                                        <Input {...form.register(`dashboardOverview.admin.quickLinks.${index}.icon`)} placeholder="FolderKanban" />
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeAdminQL(index)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {adminQLFields.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">No quick links configured. Add some above.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Admin Sections Visibility</CardTitle>
                            <CardDescription>Toggle which sections are visible on the admin dashboard.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                    { key: "metrics" as const, label: "Key Metrics", desc: "Revenue, Due, Clients, Projects, Team" },
                                    { key: "taskPerformance" as const, label: "Task Performance", desc: "Pie chart + leaderboards" },
                                    { key: "upcomingPayments" as const, label: "Upcoming Payments", desc: "Due-in-10-days alert" },
                                    { key: "monthlyOverall" as const, label: "Monthly Overall", desc: "Monthly expense & revenue summary" },
                                    { key: "secondaryMetrics" as const, label: "Secondary Metrics", desc: "Tasks, Monitor, Attendance, Meeting, Expense" },
                                    { key: "moneyInOut" as const, label: "Money In / Out", desc: "Revenue & expense tables by source" },
                                    { key: "profitLossChart" as const, label: "Profit & Loss Chart", desc: "Revenue vs Salary + Expense" },
                                    { key: "netPLGrowth" as const, label: "Net P&L & Growth", desc: "Month-on-month P&L and growth %" },
                                    { key: "revenueChart" as const, label: "Revenue Chart", desc: "Monthly revenue area chart" },
                                    { key: "monitorOverview" as const, label: "Monitor Overview", desc: "Service health status list" },
                                    { key: "meetingStatus" as const, label: "Meeting Status", desc: "Ongoing & today's meetings" },
                                    { key: "meetingStats" as const, label: "Meeting Statistics", desc: "Stats with filters" },
                                ].map(({ key, label, desc }) => (
                                    <div key={key} className="flex items-start gap-3 p-3 border rounded-lg">
                                        <Switch
                                            checked={form.watch(`dashboardOverview.admin.sections.${key}`)}
                                            onCheckedChange={(checked: boolean) => form.setValue(`dashboardOverview.admin.sections.${key}`, checked)}
                                        />
                                        <div>
                                            <p className="text-sm font-medium">{label}</p>
                                            <p className="text-xs text-muted-foreground">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Employee Dashboard Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Employee Dashboard</CardTitle>
                            <CardDescription>Configure the employee dashboard overview page title and visible sections.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Page Title</Label>
                                    <Input {...form.register("dashboardOverview.employee.title")} placeholder="Overview" />
                                </div>
                                <div>
                                    <Label>Subtitle</Label>
                                    <Input {...form.register("dashboardOverview.employee.subtitle")} placeholder="Your dashboard · Check in/out, projects, and quick links." />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Employee Quick Links</CardTitle>
                                    <CardDescription>Sidebar quick actions shown on the employee dashboard.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => appendEmpQL({ label: "", href: "", icon: "ArrowUpRight" })}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Link
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {empQLFields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-3 p-3 border rounded-lg">
                                    <div className="flex-1 space-y-1">
                                        <Label>Label</Label>
                                        <Input {...form.register(`dashboardOverview.employee.quickLinks.${index}.label`)} placeholder="My projects" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label>URL</Label>
                                        <Input {...form.register(`dashboardOverview.employee.quickLinks.${index}.href`)} placeholder="/dashboard/projects" />
                                    </div>
                                    <div className="w-36 space-y-1">
                                        <Label>Icon (Lucide)</Label>
                                        <Input {...form.register(`dashboardOverview.employee.quickLinks.${index}.icon`)} placeholder="FolderKanban" />
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeEmpQL(index)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {empQLFields.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">No quick links configured. Add some above.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Employee Sections Visibility</CardTitle>
                            <CardDescription>Toggle which sections are visible on the employee dashboard.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { key: "checkInOut" as const, label: "Check In / Out", desc: "Attendance check-in card" },
                                    { key: "statsCards" as const, label: "Stats Cards", desc: "Projects, Leave, Attendance, Payslips" },
                                    { key: "taskCounts" as const, label: "Task Counts", desc: "Task status breakdown" },
                                    { key: "taskPerformance" as const, label: "Task Performance", desc: "Pie chart + performance overview" },
                                    { key: "projects" as const, label: "Projects & Quick Links", desc: "Assigned projects list and quick actions" },
                                ].map(({ key, label, desc }) => (
                                    <div key={key} className="flex items-start gap-3 p-3 border rounded-lg">
                                        <Switch
                                            checked={form.watch(`dashboardOverview.employee.sections.${key}`)}
                                            onCheckedChange={(checked: boolean) => form.setValue(`dashboardOverview.employee.sections.${key}`, checked)}
                                        />
                                        <div>
                                            <p className="text-sm font-medium">{label}</p>
                                            <p className="text-xs text-muted-foreground">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SEO & Analytics TAB */}
                <TabsContent value="seo" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Site URL & Default Meta</CardTitle>
                            <CardDescription>
                                Used for sitemap, canonical URLs, and fallback meta tags. Set <code className="text-xs bg-muted px-1 rounded">NEXT_PUBLIC_SITE_URL</code> in env for production.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Site URL</Label>
                                <Input {...form.register("seo.siteUrl")} placeholder="https://Webwrite" />
                            </div>
                            <div>
                                <Label>Default meta title</Label>
                                <Input {...form.register("seo.defaultMetaTitle")} placeholder="Webwrite - Innovation Studio" />
                            </div>
                            <div>
                                <Label>Default meta description</Label>
                                <Textarea {...form.register("seo.defaultMetaDescription")} rows={2} placeholder="Short description for search results." />
                            </div>
                            <div>
                                <Label>Default Open Graph image (optional)</Label>
                                <Input {...form.register("seo.openGraphImage")} placeholder="https://Webwrite/og.png" />
                            </div>
                            <div>
                                <Label>Twitter handle (optional)</Label>
                                <Input {...form.register("seo.twitterHandle")} placeholder="@kalpltd" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Google Analytics</CardTitle>
                            <CardDescription>Enable Google Analytics (GA4) for traffic and ranking insights. Add your Measurement ID (e.g. G-XXXXXXXXXX).</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={form.watch("seo.enableGoogleAnalytics")}
                                    onCheckedChange={(checked: boolean) => form.setValue("seo.enableGoogleAnalytics", checked)}
                                />
                                <Label>Enable Google Analytics</Label>
                            </div>
                            <div>
                                <Label>Google Analytics Measurement ID (GA4)</Label>
                                <Input {...form.register("seo.googleAnalyticsId")} placeholder="G-XXXXXXXXXX" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Google Search Console</CardTitle>
                            <CardDescription>
                                Paste the <strong>content</strong> value of the meta tag Google gives you (e.g. <code className="text-xs bg-muted px-1 rounded">abc123...</code>). This verifies ownership for indexing and search performance.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div>
                                <Label>Verification meta content</Label>
                                <Input {...form.register("seo.googleSearchConsoleMetaTag")} placeholder="Paste content value only" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>How crawlers find your content</CardTitle>
                            <CardDescription>
                                Published posts and pages are listed in <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="underline">/sitemap.xml</a>. Google and other crawlers use this to discover and index your site. <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="underline">/robots.txt</a> points them to the sitemap.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
