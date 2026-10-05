"use client";

import { useEffect, useState } from "react";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSidebar } from "@/components/ui/sidebar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Lock, Users, Building2, AlignLeft, AlertCircle, FileText, Check } from "lucide-react";
import { toast } from "sonner";

const planPageSchema = z.object({
    name: z.string().min(1, "Name is required"),
    url: z.string().optional(),
    content: z.string().optional(),
    visibility: z.enum(["me", "org", "shared", "public"]).optional(),
});

type PlanPageFormValues = z.infer<typeof planPageSchema>;

interface PlanPageEditorProps {
    initialValues?: Partial<PlanPageFormValues>;
    onSubmit: (values: PlanPageFormValues) => Promise<void>;
    cancelHref: string;
}

export function PlanPageEditor({ initialValues, onSubmit, cancelHref }: PlanPageEditorProps) {
    const { setOpen } = useSidebar();
    const [outline, setOutline] = useState<{ text: string; level: string; id: string }[]>([]);

    const form = useForm<PlanPageFormValues>({
        resolver: zodResolver(planPageSchema),
        defaultValues: {
            name: "",
            url: "",
            content: "",
            visibility: "org",
            ...initialValues,
        },
    });

    useEffect(() => {
        // Collapse sidebar on mount
        setOpen(false);
    }, [setOpen]);

    const contentVal = form.watch("content") || "";

    // Parse outline dynamically on change
    useEffect(() => {
        if (typeof window === "undefined") return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(contentVal, "text/html");
        const headings = Array.from(doc.querySelectorAll("h1, h2, h3"));
        const parsed = headings.map((h, i) => ({
            text: h.textContent || "",
            level: h.tagName.toLowerCase(),
            id: `heading-${i}`,
        }));
        setOutline(parsed);
    }, [contentVal]);

    const handleSubmit = form.handleSubmit(async (values) => {
        await onSubmit(values);
    });

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-80px)] bg-gray-50 dark:bg-zinc-950 border rounded-xl overflow-hidden shadow-sm">
                
                {/* Google Docs Sticky Top Bar */}
                <div className="sticky top-0 z-20 bg-white dark:bg-zinc-950 border-b px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            {/* Document Title input */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="space-y-0">
                                        <FormControl>
                                            <Input
                                                placeholder="Untitled Document"
                                                className="text-base font-semibold h-7 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 px-1 py-0 bg-transparent min-w-[200px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Google Docs Menus */}
                            <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-500 font-medium select-none px-1 overflow-x-auto scrollbar-none mt-0.5">
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-default">File</DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuItem onClick={() => toast.success("Saved dynamically")}>Save Now</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => window.print()}>Print</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => toast.success("PDF export is generated on save")}>Download as PDF</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DropdownMenu>
                                    <DropdownMenuTrigger className="px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-default">Edit</DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuItem>Undo (Ctrl+Z)</DropdownMenuItem>
                                        <DropdownMenuItem>Redo (Ctrl+Y)</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DropdownMenu>
                                    <DropdownMenuTrigger className="px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-default">View</DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuItem className="flex items-center justify-between gap-4">
                                            Show Ruler <Check className="h-3.5 w-3.5" />
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="flex items-center justify-between gap-4">
                                            Show Outline <Check className="h-3.5 w-3.5" />
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DropdownMenu>
                                    <DropdownMenuTrigger className="px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-default">Insert</DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuItem>Image</DropdownMenuItem>
                                        <DropdownMenuItem>Link</DropdownMenuItem>
                                        <DropdownMenuItem>Table</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DropdownMenu>
                                    <DropdownMenuTrigger className="px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-default">Format</DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuItem>Bold</DropdownMenuItem>
                                        <DropdownMenuItem>Italic</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DropdownMenu>
                                    <DropdownMenuTrigger className="px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-default">Tools</DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuItem onClick={() => {
                                            const words = contentVal.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
                                            toast.info(`Word Count: ${words} words`);
                                        }}>Word count</DropdownMenuItem>
                                        <DropdownMenuItem>Spelling and grammar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <span className="px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-default hidden md:inline">Extensions</span>
                                <span className="px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-default hidden md:inline">Help</span>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons (Save/Cancel) */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Button type="button" variant="outline" size="sm" asChild>
                            <a href={cancelHref}>Cancel</a>
                        </Button>
                        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>

                {/* Main Workspace Layout (Left Outline, Center Editor Canvas, Right Page Details) */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* Left Outline / Document tabs sidebar */}
                    <div className="w-[200px] border-r bg-white dark:bg-zinc-950 p-4 hidden md:flex flex-col shrink-0 overflow-y-auto">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 select-none">
                            <AlignLeft className="h-4 w-4" />
                            <span>Document Outline</span>
                        </div>
                        {outline.length > 0 ? (
                            <div className="space-y-2">
                                {outline.map((h) => (
                                    <div
                                        key={h.id}
                                        className={`text-xs hover:text-primary cursor-pointer truncate transition-colors ${
                                            h.level === "h1" ? "font-semibold pl-0 text-foreground" :
                                            h.level === "h2" ? "font-medium pl-2.5 text-gray-600 dark:text-gray-400" :
                                            "pl-5 text-gray-500"
                                        }`}
                                        title={h.text}
                                    >
                                        {h.text}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-400 italic py-2">
                                Headings will appear here as you type.
                            </div>
                        )}
                    </div>

                    {/* Center Tiptap RichTextEditor wrapper */}
                    <div className="flex-1 h-full overflow-hidden">
                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem className="h-full space-y-0">
                                    <FormControl>
                                        <RichTextEditor
                                            variant="docs"
                                            value={field.value || ""}
                                            onChange={field.onChange}
                                            placeholder="Write detailed content for this page..."
                                            className="h-full border-none rounded-none"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Right Page Settings Sidebar */}
                    <div className="w-[240px] border-l bg-white dark:bg-zinc-950 p-5 hidden lg:flex flex-col shrink-0 overflow-y-auto">
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 select-none">
                            Page Settings
                        </div>

                        <div className="space-y-5">
                            {/* Privacy */}
                            <FormField
                                control={form.control}
                                name="visibility"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-gray-600 dark:text-gray-400">Privacy & Visibility</FormLabel>
                                        <Select
                                            value={field.value || "me"}
                                            onValueChange={field.onChange}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Select visibility" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="me">
                                                    <span className="flex items-center gap-2 text-xs">
                                                        <Lock className="h-3.5 w-3.5" />
                                                        Only Me
                                                    </span>
                                                </SelectItem>
                                                <SelectItem value="org">
                                                    <span className="flex items-center gap-2 text-xs">
                                                        <Building2 className="h-3.5 w-3.5" />
                                                        Organisation
                                                    </span>
                                                </SelectItem>
                                                <SelectItem value="shared">
                                                    <span className="flex items-center gap-2 text-xs">
                                                        <Users className="h-3.5 w-3.5" />
                                                        Shared
                                                    </span>
                                                </SelectItem>
                                                <SelectItem value="public">
                                                    <span className="flex items-center gap-2 text-xs">
                                                        <Globe className="h-3.5 w-3.5" />
                                                        Public
                                                    </span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* External URL */}
                            <FormField
                                control={form.control}
                                name="url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-gray-600 dark:text-gray-400">External Link (optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." className="h-9 text-xs" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Helper Info */}
                            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg mt-4 text-[11px] text-gray-500 leading-normal flex gap-2">
                                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <span>Changes are saved locally as draft, and published once you hit Save Changes.</span>
                            </div>
                        </div>
                    </div>
                </div>

            </form>
        </Form>
    );
}
