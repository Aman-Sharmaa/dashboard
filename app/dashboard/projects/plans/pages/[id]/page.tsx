"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  FileText,
  Clock,
  Globe,
  Lock,
  Building2,
  Share2,
  Printer,
  Copy,
  Check,
  Calendar,
  ExternalLink,
  BookOpen,
  Eye,
  AlignLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichTextDisplay } from "@/components/rich-text-editor";
import { cn } from "@/lib/utils";

export default function ViewPlanPage() {
  const router = useRouter();
  const params = useParams();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [outline, setOutline] = useState<{ text: string; level: string; id: string }[]>([]);

  useEffect(() => {
    async function fetchPage() {
      try {
        const res = await fetch(`/api/plans/pages/${params?.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to fetch document");
        setPage(data.page);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load document");
        router.push("/dashboard/projects/plans");
      } finally {
        setLoading(false);
      }
    }
    if (params?.id) fetchPage();
  }, [params?.id, router]);

  // Parse headings outline
  useEffect(() => {
    if (!page?.content || typeof window === "undefined") return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(page.content, "text/html");
    const headings = Array.from(doc.querySelectorAll("h1, h2, h3"));
    const parsed = headings.map((h, i) => ({
      text: h.textContent || "",
      level: h.tagName.toLowerCase(),
      id: `heading-${i}`,
    }));
    setOutline(parsed);
  }, [page?.content]);

  // Reading time and stats
  const stats = useMemo(() => {
    if (!page?.content) return { words: 0, readingTime: 1 };
    const text = page.content.replace(/<[^>]*>/g, " ");
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { words, readingTime };
  }, [page?.content]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Document link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Opening document...</p>
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="w-full min-h-screen pb-16 space-y-6">
      {/* ── Top Navigation Bar ── */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 -mx-4 md:-mx-6 px-4 md:px-6 py-3 flex items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="rounded-xl h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <Link href="/dashboard/projects/plans">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline text-xs font-medium">Documents</span>
            </Link>
          </Button>

          <div className="h-4 w-[1px] bg-border hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <h1 className="text-sm md:text-base font-bold truncate text-foreground">
              {page.name}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 shadow-2xs"
            title="Copy Link"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">{copied ? "Copied" : "Copy Link"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 shadow-2xs hidden sm:inline-flex"
            title="Print Document"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Print</span>
          </Button>

          <Button
            size="sm"
            asChild
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Link href={`/dashboard/projects/plans/pages/${params?.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Document</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Main Document Container ── */}
      <div className="max-w-4xl mx-auto px-2 sm:px-4 space-y-6">
        {/* Document Header Card */}
        <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 md:p-8 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex flex-wrap items-center gap-2.5">
              {page.visibility === "public" ? (
                <Badge variant="outline" className="gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200">
                  <Globe className="h-3 w-3" /> Public
                </Badge>
              ) : page.visibility === "org" ? (
                <Badge variant="outline" className="gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border-blue-200">
                  <Building2 className="h-3 w-3" /> Organization
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-[11px] font-semibold text-neutral-700 bg-neutral-100 border-neutral-200">
                  <Lock className="h-3 w-3" /> Private
                </Badge>
              )}

              <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                <Clock className="h-3.5 w-3.5" />
                {stats.readingTime} min read ({stats.words} words)
              </span>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Updated {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : page.createdAt ? new Date(page.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recently"}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight leading-tight">
              {page.name}
            </h1>
            {page.url && (
              <div className="pt-1">
                <a
                  href={page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {page.url}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Outline / Quick Jump Bar (if headings exist) */}
        {outline.length > 1 && (
          <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
              <AlignLeft className="h-3.5 w-3.5 text-primary" />
              Table of Contents
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {outline.map((item, idx) => (
                <span
                  key={idx}
                  className="text-xs font-medium text-muted-foreground bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 rounded-md"
                >
                  {item.text}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Document Content Sheet */}
        <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 sm:p-12 md:p-16 shadow-sm min-h-[500px]">
          {page.content ? (
            <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-li:leading-relaxed prose-img:rounded-xl">
              <RichTextDisplay html={page.content} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <BookOpen className="h-10 w-10 text-muted-foreground/30" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  This document is empty
                </p>
                <p className="text-xs text-muted-foreground">
                  Get started by adding notes, specs, checklists, or project guidelines.
                </p>
              </div>
              <Button size="sm" asChild className="rounded-xl mt-2 text-xs font-semibold gap-1.5">
                <Link href={`/dashboard/projects/plans/pages/${params?.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                  Start Writing
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
