"use client";

import { CmsEditorForm } from "@/components/cms-editor-form";

interface PostFormProps {
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}

export function PostForm({ initialValues, onSubmit }: PostFormProps) {
  return (
    <CmsEditorForm
      type="post"
      initialValues={initialValues}
      onSubmit={onSubmit}
      cancelHref="/dashboard/content/posts"
    />
  );
}
