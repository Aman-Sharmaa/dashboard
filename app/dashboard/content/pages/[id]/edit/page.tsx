"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import type { PageSection } from "@/components/page-builder/section-types";
import AboutUsEditor from "./about-us-editor";

// Dynamically import the heavy builder so it only loads on this route
const PageBuilder = dynamic(
  () => import("@/components/page-builder/page-builder").then((m) => m.PageBuilder),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

export default function EditPagePage() {
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/cms/pages/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load page data");
        return res.json();
      })
      .then(({ page }) => {
        setPage(page);
      })
      .catch(() => toast.error("Failed to load page"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (sections: PageSection[], metadata: any) => {
    const res = await fetch(`/api/cms/pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections, ...metadata }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to update");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <p className="text-zinc-500">Page not found</p>
      </div>
    );
  }

  if (page.slug === "about-us") {
    return (
      <div className="-m-6">
        <AboutUsEditor />
      </div>
    );
  }

  return (
    // Full-height builder ~ extends to fill the dashboard content area
    <div className="h-[calc(100vh-4rem)] -m-6 overflow-hidden">
      <PageBuilder
        pageId={id}
        pageSlug={page.slug}
        initialTitle={page.title}
        initialStatus={page.status}
        initialLayout={page.layout}
        initialOgImage={page.ogImage}
        initialMetaTitle={page.metaTitle}
        initialMetaDescription={page.metaDescription}
        initialSections={Array.isArray(page.sections) ? page.sections : []}
        onSave={handleSave}
      />
    </div>
  );
}
