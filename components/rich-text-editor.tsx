"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  contentHeight?: string;
  disabled?: boolean;
  variant?: "default" | "docs";
};

// Dynamically import the heavy rich text editor to prevent bundling @tiptap inside page assets
export const RichTextEditor = dynamic(
  () => import("./rich-text-editor-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[120px] rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground bg-muted/20">
        Loading editor...
      </div>
    ),
  }
);

export function RichTextDisplay({ html, className }: { html: string; className?: string }) {
  if (!html || html === "<p></p>") return null;
  return (
    <div
      className={cn("prose prose-sm max-w-none dark:prose-invert prose-img:rounded-lg prose-img:max-w-full", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
