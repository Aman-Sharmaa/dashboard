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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/rich-text-editor";
import { CmsImageUpload } from "@/components/cms-image-upload";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { slugify } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

const pageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional(),
  content: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  layout: z.enum(["default", "full-width", "narrow"]),
  status: z.enum(["draft", "published"]),
});

const postSchema = pageSchema.extend({
  excerpt: z.string().optional(),
  featuredImage: z.string().optional(),
  categoryId: z.string().optional(),
  password: z.string().optional(),
});

type PageFormValues = z.infer<typeof pageSchema>;
type PostFormValues = z.infer<typeof postSchema>;

type Category = { _id: string; name: string; slug: string };

interface CmsEditorFormProps {
  type: "page" | "post";
  initialValues?: Partial<PageFormValues> | Partial<PostFormValues>;
  onSubmit: (values: PageFormValues | PostFormValues) => Promise<void>;
  cancelHref: string;
}

export function CmsEditorForm({ type, initialValues, onSubmit, cancelHref }: CmsEditorFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const { setOpen } = useSidebar();
  const schema = type === "post" ? postSchema : pageSchema;

  useEffect(() => {
    // Collapse sidebar on mount
    setOpen(false);
  }, [setOpen]);

  useEffect(() => {
    if (type === "post") {
      fetch("/api/cms/categories")
        .then((res) => (res.ok ? res.json() : { categories: [] }))
        .then((data) => setCategories(data.categories || []))
        .catch(() => setCategories([]));
    }
  }, [type]);

  const form = useForm<PageFormValues | PostFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      metaTitle: "",
      metaDescription: "",
      ogImage: "",
      layout: "full-width",
      status: type === "page" ? "published" : "draft",
      ...(type === "post" && { excerpt: "", featuredImage: "", categoryId: "", password: "" }),
      ...initialValues,
    },
  });


  const title = form.watch("title");
  useEffect(() => {
    const slugFromTitle = slugify(title || "");
    const isSlugDirty = form.formState.dirtyFields.slug;
    const hasInitialSlug = !!initialValues?.slug;

    // Only auto-update if the user hasn't manually edited the slug
    // AND it's either a new post (no initial slug) or the current slug is empty
    if (slugFromTitle && !isSlugDirty && !hasInitialSlug) {
      form.setValue("slug", slugFromTitle, { shouldDirty: false });
    }
  }, [title, form, initialValues, form.formState.dirtyFields.slug]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = { ...values, slug: values.slug?.trim() || slugify(values.title || "untitled") };
    if (type === "post") {
      (payload as PostFormValues).categoryId = (payload as PostFormValues).categoryId || undefined;
      // Use featured image and excerpt from page – don't store duplicate ogImage/metaDescription
      (payload as PostFormValues).ogImage = "";
      (payload as PostFormValues).metaDescription = "";
    }
    await onSubmit(payload);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sticky header bar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b -mx-4 px-4 py-3 lg:-mx-6 lg:px-6">
          <div className="flex items-center justify-between gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex-1 space-y-0">
                  <FormControl>
                    <Input
                      placeholder={type === "page" ? "About Us" : "Your Post Title"}
                      className="text-lg font-semibold h-10 border-none shadow-none focus-visible:ring-0 px-0 bg-transparent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-2 shrink-0">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-[110px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={cancelHref}>Cancel</a>
              </Button>
              <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-none shadow-none lg:border lg:shadow-sm">
              <CardHeader>
                <CardTitle>Content</CardTitle>
                <CardDescription>
                  Write your {type === "page" ? "page" : "post"} content below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RichTextEditor
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder={
                            type === "page"
                              ? "Write your page content... (use image button to add images)"
                              : "Write your post content... (use image button to add images)"
                          }
                          minHeight="calc(100vh - 300px)"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
                <CardDescription>Slug, layout, and other settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug (optional – auto from title)</FormLabel>
                      <FormControl>
                        <Input placeholder="about-us" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {type === "post" && (
                  <FormField
                    control={form.control}
                    name="excerpt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Excerpt</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Brief summary for listing pages" {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="layout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Layout</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="default">Default (centered, 800px)</SelectItem>
                          <SelectItem value="narrow">Narrow (600px)</SelectItem>
                          <SelectItem value="full-width">Full width</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {type === "post" && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Post Password (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Set a password to lock this post" 
                            {...field} 
                            value={(field.value as string) || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {type === "post" && (
              <Card>
                <CardHeader>
                  <CardTitle>Featured</CardTitle>
                  <CardDescription>Featured image and category</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="featuredImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <CmsImageUpload label="Featured Image" value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {categories.map((c) => (
                              <SelectItem key={c._id} value={c._id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>SEO & Media</CardTitle>
                <CardDescription>
                  {type === "post"
                    ? "Uses Featured Image for OG and Excerpt for meta description"
                    : "Meta tags and OG image"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {type === "page" && (
                  <FormField
                    control={form.control}
                    name="ogImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <CmsImageUpload label="Featured / OG Image" value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Title (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder={`${type === "page" ? "About Us" : "Post Title"} | Your Company`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {type === "page" && (
                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Brief description for search engines" {...field} rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
