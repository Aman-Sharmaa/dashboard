"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PostForm } from "@/components/cms-post-form";

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/cms/posts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(({ post }) => {
        setInitial({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt || "",
          content: post.content || "",
          featuredImage: post.featuredImage || "",
          categoryId: post.categoryId?._id || "",
          metaTitle: post.metaTitle || "",
          metaDescription: post.metaDescription || "",
          ogImage: post.ogImage || "",
          layout: post.layout || "default",
          status: post.status || "draft",
        });
      })
      .catch(() => toast.error("Failed to load post"))
      .finally(() => setLoading(false));
  }, [id]);

  async function onSubmit(values: Record<string, unknown>) {
    const payload = {
      ...values,
      categoryId: values.categoryId || null,
    };
    const res = await fetch(`/api/cms/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to update");
    }
    toast.success("Post updated");
    router.push("/dashboard/content/posts");
  }

  if (loading || !initial) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/content/posts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Edit Post</h2>
          <p className="text-sm text-muted-foreground">{String(initial.title)}</p>
        </div>
      </div>
      <PostForm initialValues={initial} onSubmit={onSubmit} />
    </div>
  );
}
