"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function ExpandableDescription({ html }: { html: string }) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > contentRef.current.clientHeight);
    }
  }, [html]);

  return (
    <div className="mt-1 max-w-xl">
      <div 
        ref={contentRef}
        className={cn(
          "text-xs text-zinc-500 leading-relaxed prose prose-zinc prose-sm prose-ol:list-decimal prose-ul:list-disc prose-ol:pl-4 prose-ul:pl-4 prose-li:my-0.5 prose-p:my-0.5 prose-ol:my-0.5 prose-ul:my-0.5 max-w-none",
          !expanded && "line-clamp-2"
        )}
        dangerouslySetInnerHTML={{ __html: html }} 
      />
      {isOverflowing && !expanded && (
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(true); }} 
          className="text-zinc-900 hover:underline font-medium mt-1.5 text-[11px]"
        >
          Read more
        </button>
      )}
      {expanded && (
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(false); }} 
          className="text-zinc-900 hover:underline font-medium mt-1.5 text-[11px]"
        >
          Show less
        </button>
      )}
    </div>
  );
}
