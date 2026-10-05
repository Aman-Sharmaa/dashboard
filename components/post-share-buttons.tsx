"use client";

import { useState } from "react";
import { Linkedin, Instagram, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export function PostShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getEncodedUrl = () => {
    return typeof window !== "undefined" ? encodeURIComponent(window.location.href) : "";
  };

  const getEncodedTitle = () => {
    return encodeURIComponent(title);
  };

  return (
    <div className="flex items-center gap-5 text-zinc-400 dark:text-zinc-500 mb-8 select-none">
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${getEncodedUrl()}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
        title="Share on LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
      </a>
      
      <a
        href={`https://twitter.com/intent/tweet?url=${getEncodedUrl()}&text=${getEncodedTitle()}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
        title="Share on X"
      >
        <XIcon className="w-3.5 h-3.5" />
      </a>

      <a
        href="https://instagram.com"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
        title="Follow on Instagram"
      >
        <Instagram className="w-4 h-4" />
      </a>

      <button
        onClick={handleCopy}
        className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-200 flex items-center"
        title="Copy Link"
      >
        <LinkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
