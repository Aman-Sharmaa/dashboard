"use client";

import { useState, useCallback, useEffect } from "react";
import { nanoid } from "nanoid";
import { PageSection, SectionType, DEFAULT_PROPS } from "./section-types";
import { SectionLibraryPanel } from "./section-library";
import { SectionCanvas } from "./section-canvas";
import { SectionInspector } from "./section-inspector";
import { SectionRenderer } from "./section-renderer";
import { toast } from "sonner";
import {
  Eye,
  Code2,
  Layers,
  Save,
  Loader2,
  X,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CmsImageUpload } from "@/components/cms-image-upload";
import { slugify } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

type ViewMode = "builder" | "preview";
type PreviewWidth = "desktop" | "tablet" | "mobile";

interface PageBuilderProps {
  pageId?: string;
  pageSlug?: string;
  initialTitle?: string;
  initialStatus?: "draft" | "published";
  initialLayout?: "default" | "full-width" | "narrow";
  initialOgImage?: string;
  initialMetaTitle?: string;
  initialMetaDescription?: string;
  initialSections?: PageSection[];
  onSave: (
    sections: PageSection[],
    metadata: {
      title: string;
      status: "draft" | "published";
      slug: string;
      layout: "default" | "full-width" | "narrow";
      ogImage?: string;
      metaTitle?: string;
      metaDescription?: string;
    }
  ) => Promise<void>;
}

export function PageBuilder({
  pageId,
  pageSlug = "",
  initialTitle = "",
  initialStatus = "published",
  initialLayout = "full-width",
  initialOgImage = "",
  initialMetaTitle = "",
  initialMetaDescription = "",
  initialSections = [],
  onSave,
}: PageBuilderProps) {
  const [sections, setSections] = useState<PageSection[]>(initialSections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("builder");
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("desktop");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { setOpen } = useSidebar();

  useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<"draft" | "published">(initialStatus);
  const [slug, setSlug] = useState(pageSlug);
  const [layout, setLayout] = useState<"default" | "full-width" | "narrow">(initialLayout);
  const [ogImage, setOgImage] = useState(initialOgImage);
  const [metaTitle, setMetaTitle] = useState(initialMetaTitle);
  const [metaDescription, setMetaDescription] = useState(initialMetaDescription);

  const [slugEdited, setSlugEdited] = useState(!!pageSlug);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const markDirty = () => setDirty(true);

  // Auto-generate slug from title if user hasn't edited the slug manually
  useEffect(() => {
    if (!slugEdited && title) {
      setSlug(slugify(title));
    }
  }, [title, slugEdited]);

  // ─── Add section ────────────────────────────────────────────────────────────
  const addSection = useCallback((type: SectionType, afterId?: string) => {
    const newSection: PageSection = {
      id: nanoid(8),
      type,
      props: { ...DEFAULT_PROPS[type] } as PageSection["props"],
    };

    setSections((prev) => {
      if (!afterId) return [...prev, newSection];
      // Recursive insertion after a specific ID
      function insertAfter(list: PageSection[]): PageSection[] {
        const result: PageSection[] = [];
        for (const s of list) {
          if (s.id === afterId) {
            result.push(s);
            result.push(newSection);
          } else {
            result.push(s.children ? { ...s, children: insertAfter(s.children) } : s);
          }
        }
        return result;
      }
      return insertAfter(prev);
    });

    setSelectedId(newSection.id);
    markDirty();
  }, []);

  const addChildSection = useCallback((parentId: string, type: SectionType) => {
    const newSection: PageSection = {
      id: nanoid(8),
      type,
      props: { ...DEFAULT_PROPS[type] } as PageSection["props"],
    };
    
    setSections((prev) => {
      function insertChild(list: PageSection[]): PageSection[] {
        return list.map(s => {
          if (s.id === parentId) {
            return { ...s, children: [...(s.children || []), newSection] };
          }
          if (s.children) {
            return { ...s, children: insertChild(s.children) };
          }
          return s;
        });
      }
      return insertChild(prev);
    });
    
    setSelectedId(newSection.id);
    markDirty();
  }, []);

  // ─── Delete section ──────────────────────────────────────────────────────────
  const deleteSection = useCallback((id: string) => {
    setSections((prev) => {
      function del(list: PageSection[]): PageSection[] {
        return list.filter(s => s.id !== id).map(s => s.children ? { ...s, children: del(s.children) } : s);
      }
      return del(prev);
    });
    setSelectedId(null);
    markDirty();
  }, []);

  // ─── Duplicate section ───────────────────────────────────────────────────────
  const duplicateSection = useCallback((id: string) => {
    setSections((prev) => {
      function dup(list: PageSection[]): PageSection[] {
        const result: PageSection[] = [];
        for (const s of list) {
          if (s.id === id) {
            result.push(s);
            result.push({ ...JSON.parse(JSON.stringify(s)), id: nanoid(8) });
          } else {
            result.push(s.children ? { ...s, children: dup(s.children) } : s);
          }
        }
        return result;
      }
      return dup(prev);
    });
    markDirty();
  }, []);

  // ─── Update props ────────────────────────────────────────────────────────────
  const updateSectionProps = useCallback(
    (id: string, patch: Partial<Record<string, unknown>>) => {
      setSections((prev) => {
        function update(list: PageSection[]): PageSection[] {
          return list.map(s => {
            if (s.id === id) {
              // Special case: styles might be updated if patch contains styles
              if (patch.styles) {
                return { ...s, props: { ...s.props, ...patch }, styles: patch.styles as any };
              }
              return { ...s, props: { ...s.props, ...patch } as PageSection["props"] };
            }
            if (s.children) {
              return { ...s, children: update(s.children) };
            }
            return s;
          });
        }
        return update(prev);
      });
      markDirty();
    },
    []
  );

  // ─── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a page title in Page Settings before saving.");
      setIsSettingsOpen(true);
      return;
    }
    const finalSlug = slug.trim() || slugify(title);
    if (!finalSlug) {
      toast.error("Please enter a page slug in Page Settings before saving.");
      setIsSettingsOpen(true);
      return;
    }

    setSaving(true);
    try {
      await onSave(sections, {
        title: title.trim(),
        status,
        slug: finalSlug,
        layout,
        ogImage,
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),
      });
      setDirty(false);
      toast.success("Page saved successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const selectedSection = (() => {
    let found: PageSection | null = null;
    function findDeep(list: PageSection[]) {
      for (const s of list) {
        if (s.id === selectedId) found = s;
        if (!found && s.children) findDeep(s.children);
      }
    }
    findDeep(sections);
    return found;
  })();

  const previewWidths: Record<PreviewWidth, string> = {
    desktop: "w-full",
    tablet: "w-[768px] mx-auto",
    mobile: "w-[375px] mx-auto",
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* ─── Topbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-zinc-150 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-900">Page Builder</span>
          {dirty && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
              Unsaved
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* View mode toggle */}
          <div className="flex items-center bg-zinc-100 rounded-lg p-0.5 mr-1">
            <button
              onClick={() => setViewMode("builder")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === "builder" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Build
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === "preview" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          </div>

          {/* Preview width toggles */}
          {viewMode === "preview" && (
            <div className="flex items-center gap-0.5 mr-2">
              {(["desktop", "tablet", "mobile"] as PreviewWidth[]).map((w) => {
                const Icon = w === "desktop" ? Monitor : w === "tablet" ? Tablet : Smartphone;
                return (
                  <button
                    key={w}
                    onClick={() => setPreviewWidth(w)}
                    className={`p-1.5 rounded-md transition-colors ${previewWidth === w ? "bg-zinc-200 text-zinc-900" : "text-zinc-400 hover:text-zinc-600"}`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Live preview link */}
          <a
            href={`/page/${pageSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Live
          </a>

          {/* Page Settings */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="h-8 text-xs font-semibold"
          >
            <Settings className="w-3.5 h-3.5 mr-1.5" />
            Page Settings
          </Button>

          {/* Save */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8 text-xs font-semibold"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* ─── Main body ──────────────────────────────────────────────────────── */}
      {viewMode === "builder" ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Section Library */}
          <SectionLibraryPanel onAdd={(type) => addSection(type)} />

          {/* Center: Canvas */}
          <SectionCanvas
            sections={sections}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReorder={setSections}
            onDelete={deleteSection}
            onDuplicate={duplicateSection}
            onAddAfter={(id) => {
              addSection("text", id); // Default to text when clicking + below
            }}
            onAddChild={addChildSection}
          />

          {/* Right: Property Inspector */}
          {selectedSection ? (
            <SectionInspector
              section={selectedSection}
              onChange={updateSectionProps}
            />
          ) : (
            <aside className="w-72 shrink-0 bg-white border-l border-zinc-150 flex flex-col">
              <div className="p-4 border-b border-zinc-100">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Properties</h2>
              </div>
              <div className="flex-1 flex items-center justify-center text-center p-6">
                <div>
                  <p className="text-sm font-semibold text-zinc-500">No section selected</p>
                  <p className="text-xs text-zinc-400 mt-1">Click a section in the canvas to edit its properties</p>
                </div>
              </div>
            </aside>
          )}
        </div>
      ) : (
        /* ─── Preview mode ─────────────────────────────────────────────────── */
        <div className="flex-1 overflow-y-auto bg-zinc-200 p-8">
          <div className={`${previewWidths[previewWidth]} bg-white shadow-xl rounded-xl overflow-hidden transition-all duration-300`}>
            {sections.length === 0 ? (
              <div className="py-32 text-center text-zinc-400">
                <p className="text-sm">No sections added yet</p>
              </div>
            ) : (
              sections.map((s) => <SectionRenderer key={s.id} section={s} />)
            )}
          </div>
        </div>
      )}

      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto h-full flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 border-b bg-zinc-50/50">
            <SheetTitle className="text-lg font-bold text-zinc-900">Page Settings</SheetTitle>
            <SheetDescription className="text-xs text-zinc-500 mt-1">
              Configure page metadata, SEO settings, and visibility.
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title & Status */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="page-title" className="text-xs font-semibold text-zinc-700">
                  Page Title
                </Label>
                <Input
                  id="page-title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    markDirty();
                  }}
                  placeholder="e.g. About Us"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="page-status" className="text-xs font-semibold text-zinc-700">
                  Status
                </Label>
                <Select
                  value={status}
                  onValueChange={(val: "draft" | "published") => {
                    setStatus(val);
                    markDirty();
                  }}
                >
                  <SelectTrigger id="page-status" className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <hr className="border-zinc-100" />

            {/* Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Details</h3>
              
              <div>
                <Label htmlFor="page-slug" className="text-xs font-semibold text-zinc-700">
                  Slug (optional – auto from title)
                </Label>
                <Input
                  id="page-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugEdited(true);
                    markDirty();
                  }}
                  placeholder="about-us"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="page-layout" className="text-xs font-semibold text-zinc-700">
                  Layout
                </Label>
                <Select
                  value={layout}
                  onValueChange={(val: "default" | "full-width" | "narrow") => {
                    setLayout(val);
                    markDirty();
                  }}
                >
                  <SelectTrigger id="page-layout" className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (centered, 800px)</SelectItem>
                    <SelectItem value="narrow">Narrow (600px)</SelectItem>
                    <SelectItem value="full-width">Full width</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <hr className="border-zinc-100" />

            {/* SEO & Media */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">SEO & Media</h3>

              <div>
                <CmsImageUpload
                  label="Featured / OG Image"
                  value={ogImage}
                  onChange={(url) => {
                    setOgImage(url);
                    markDirty();
                  }}
                />
              </div>

              <div>
                <Label htmlFor="meta-title" className="text-xs font-semibold text-zinc-700">
                  Meta Title (optional)
                </Label>
                <Input
                  id="meta-title"
                  value={metaTitle}
                  onChange={(e) => {
                    setMetaTitle(e.target.value);
                    markDirty();
                  }}
                  placeholder={title ? `${title} | Your Company` : "About Us | Your Company"}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="meta-description" className="text-xs font-semibold text-zinc-700">
                  Meta Description
                </Label>
                <Textarea
                  id="meta-description"
                  value={metaDescription}
                  onChange={(e) => {
                    setMetaDescription(e.target.value);
                    markDirty();
                  }}
                  placeholder="Brief description for search engines"
                  rows={4}
                  className="mt-1.5 resize-none"
                />
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t bg-zinc-50/50 flex justify-end gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={() => setIsSettingsOpen(false)}>
              Apply Settings
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
