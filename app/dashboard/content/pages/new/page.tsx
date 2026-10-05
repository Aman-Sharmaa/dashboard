"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import type { PageSection } from "@/components/page-builder/section-types";

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

export default function NewPagePage() {
  const router = useRouter();

  const handleSave = async (sections: PageSection[], metadata: any) => {
    const res = await fetch("/api/cms/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections, ...metadata }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to create");
    }
    const data = await res.json();
    toast.success("Page created successfully");
    router.push(`/dashboard/content/pages/${data.page._id}/edit`);
  };

  return (
    // Full-height builder ~ extends to fill the dashboard content area
    <div className="h-[calc(100vh-4rem)] -m-6 overflow-hidden">
      <PageBuilder
        pageSlug=""
        initialSections={[]}
        onSave={handleSave}
      />
    </div>
  );
}
