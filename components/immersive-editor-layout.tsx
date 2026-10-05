"use client";

import { useState } from "react";
import { ArrowLeft, PanelRightClose, PanelRightOpen, Save, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ImmersiveEditorLayoutProps {
    children: React.ReactNode;
    sidebarContent: React.ReactNode;
    title: string;
    subtitle?: string;
    onSave: () => void;
    onCancel: () => void;
    isSaving?: boolean;
    onShare?: () => void;
    breadcrumbs?: { label: string; href?: string }[];
}

export function ImmersiveEditorLayout({
    children,
    sidebarContent,
    title,
    subtitle,
    onSave,
    onCancel,
    isSaving,
    onShare,
    breadcrumbs,
}: ImmersiveEditorLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in duration-300">
            {/* Top Header */}
            <header className="h-14 border-b flex items-center justify-between px-4 gap-4 bg-background/80 backdrop-blur-md z-10 sticky top-0">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold overflow-hidden whitespace-nowrap">
                            {breadcrumbs?.map((bc, i) => (
                                <span key={i} className="flex items-center gap-1">
                                    {bc.label} {i < breadcrumbs.length - 1 && <span>/</span>}
                                </span>
                            ))}
                        </div>
                        <h1 className="text-sm font-semibold truncate">{title}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={onShare} className="gap-2 rounded-full hidden sm:flex">
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                    </Button>
                    <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-2 rounded-full px-4 shadow-sm">
                        <Save className="h-3.5 w-3.5" />
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={cn("rounded-full h-8 w-8 transition-colors", isSidebarOpen && "bg-accent")}
                        title={isSidebarOpen ? "Close Settings" : "Open Settings"}
                    >
                        {isSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Editor Area */}
                <main className="flex-1 overflow-y-auto bg-zinc-50/30 dark:bg-zinc-950/30 selection:bg-primary/10">
                    <div className="max-w-4xl mx-auto px-6 py-12 min-h-full flex flex-col">
                        {children}
                    </div>
                </main>

                {/* Sidebar */}
                <aside
                    className={cn(
                        "border-l bg-background transition-all duration-300 ease-in-out flex flex-col",
                        isSidebarOpen ? "w-80 lg:w-96" : "w-0 opacity-0 pointer-events-none"
                    )}
                >
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-8 min-w-[320px]">
                            {sidebarContent}
                        </div>
                    </ScrollArea>
                </aside>
            </div>
        </div>
    );
}
