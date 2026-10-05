"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PostForm } from "@/components/cms-post-form";

export default function NewPostPage() {
  const router = useRouter();

  async function onSubmit(values: Record<string, unknown>) {
    const payload = {
      ...values,
      categoryId: values.categoryId || null,
    };
    const res = await fetch("/api/cms/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to create");
    }
    toast.success("Post created");
    router.push("/dashboard/content/posts");
  }

  return (
    <div className="h-full">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/content/posts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold leading-none">Add Post</h2>
        </div>
      </div>
      <PostForm onSubmit={onSubmit} />
    </div>
  );
}
