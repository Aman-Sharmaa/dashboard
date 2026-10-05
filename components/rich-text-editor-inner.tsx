"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table as TableExtension } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { useEffect, useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Undo, Redo, ImageIcon, Heading1, Type, Table as TableIcon } from "lucide-react";
import { toast } from "sonner";
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

export default function RichTextEditorInner({
  value,
  onChange,
  placeholder = "Write something…",
  className,
  minHeight = "120px",
  contentHeight,
  disabled = false,
  variant = "default",
}: RichTextEditorProps) {
  const isInternalUpdate = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const addImage = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/cms/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Upload failed");
    }
    const { url } = await res.json();
    return url;
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto" },
      }),
      Placeholder.configure({ placeholder }),
      TableExtension.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[80px] px-3 py-2 focus:outline-none",
      },
      handleDOMEvents: {
        blur: () => {
          if (editor && !isInternalUpdate.current) {
            const html = editor.getHTML();
            if (html !== value) onChange(html);
          }
        },
      },
    },
    onUpdate: ({ editor }) => {
      if (isInternalUpdate.current) return;
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      isInternalUpdate.current = true;
      editor.commands.setContent(value || "", { emitUpdate: false });
      isInternalUpdate.current = false;
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  const setLink = () => {
    const previousUrl = editor?.getAttributes("link").href;
    setLinkUrl(previousUrl || "");
    setLinkOpen(true);
  };

  const confirmLink = () => {
    if (linkUrl === "") {
      editor?.chain().focus().unsetLink().run();
    } else {
      editor?.chain().focus().setLink({ href: linkUrl }).run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  };

  const handleImageClick = () => {
    inputRef.current?.click();
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const url = await addImage(file);
      editor?.chain().focus().setImage({ src: url }).run();
      toast.success("Image added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
    }
    e.target.value = "";
  };

  if (!editor) return null;

  if (variant === "docs") {
    return (
      <div className={cn("flex flex-col h-full bg-[#f8f9fa] dark:bg-zinc-900/50 overflow-hidden", className)}>
        {/* Google Docs Toolbar */}
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 dark:border-zinc-800 bg-[#f0f4f9] dark:bg-zinc-950 px-3 py-1.5 shrink-0 select-none">
          {/* Undo/Redo */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded hover:bg-gray-200 dark:hover:bg-zinc-800"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={disabled || !editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded hover:bg-gray-200 dark:hover:bg-zinc-800"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={disabled || !editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
          <span className="w-px h-5 bg-gray-300 dark:bg-zinc-700 mx-1" />
          
          {/* Style / Heading selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs font-medium rounded hover:bg-gray-200 dark:hover:bg-zinc-800" disabled={disabled}>
                {editor.isActive("heading", { level: 1 }) ? "Heading 1" :
                 editor.isActive("heading", { level: 2 }) ? "Heading 2" :
                 editor.isActive("heading", { level: 3 }) ? "Heading 3" : "Normal text"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                Normal text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                Heading 2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                Heading 3
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="w-px h-5 bg-gray-300 dark:bg-zinc-700 mx-1" />

          {/* Formatting */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded hover:bg-gray-200 dark:hover:bg-zinc-800", editor.isActive("bold") && "bg-gray-200 dark:bg-zinc-800 text-primary")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={disabled}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded hover:bg-gray-200 dark:hover:bg-zinc-800", editor.isActive("italic") && "bg-gray-200 dark:bg-zinc-800 text-primary")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={disabled}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>

          <span className="w-px h-5 bg-gray-300 dark:bg-zinc-700 mx-1" />

          {/* Link, image, table */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded hover:bg-gray-200 dark:hover:bg-zinc-800", editor.isActive("link") && "bg-gray-200 dark:bg-zinc-800 text-primary")}
            onClick={setLink}
            disabled={disabled}
            title="Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded hover:bg-gray-200 dark:hover:bg-zinc-800"
            onClick={handleImageClick}
            disabled={disabled}
            title="Image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFile}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded hover:bg-gray-200 dark:hover:bg-zinc-800" disabled={disabled} title="Table">
                <TableIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                Insert 3×3 table
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run()}>
                Insert 4×4 table
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={!editor.can().addColumnAfter()}>
                Add Column After
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()} disabled={!editor.can().addRowAfter()}>
                Add Row After
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} disabled={!editor.can().deleteTable()} className="text-destructive focus:text-destructive">
                Delete Table
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="w-px h-5 bg-gray-300 dark:bg-zinc-700 mx-1" />

          {/* Lists */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded hover:bg-gray-200 dark:hover:bg-zinc-800", editor.isActive("bulletList") && "bg-gray-200 dark:bg-zinc-800 text-primary")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={disabled}
            title="Bullet list"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded hover:bg-gray-200 dark:hover:bg-zinc-800", editor.isActive("orderedList") && "bg-gray-200 dark:bg-zinc-800 text-primary")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={disabled}
            title="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        {/* Ruler */}
        <div className="h-6 bg-[#f8f9fa] dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 flex items-center select-none relative px-20 shrink-0">
          <div className="w-full relative h-full flex items-center justify-between text-[9px] text-gray-400">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 rounded-full cursor-col-resize shadow-sm" />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 rounded-full cursor-col-resize shadow-sm" />
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <span>{i + 1}</span>
                <div className="h-1 w-[1px] bg-gray-300 dark:bg-zinc-700" />
              </div>
            ))}
          </div>
        </div>

        {/* Paper Editing Workspace */}
        <div className="flex-1 overflow-y-auto bg-[#f8f9fa] dark:bg-zinc-900/50 p-6 sm:p-10 flex justify-center">
          <div className="w-full max-w-[800px] min-h-[1000px] bg-white dark:bg-zinc-950 shadow-md border border-gray-200/80 dark:border-zinc-800 px-12 py-16 focus-within:ring-1 focus-within:ring-primary/20 transition-all rounded-sm">
            <EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[900px]" />
          </div>
        </div>

        {/* Dialogs for link inserts */}
        <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Insert Link</DialogTitle>
              <DialogDescription>Enter the URL for the selected text.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmLink();
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
              <Button onClick={confirmLink}>Insert</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border border-input bg-background overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/40 px-1 py-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={disabled}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" disabled={disabled}>
              H2–H6
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {([2, 3, 4, 5, 6] as const).map((level) => (
              <DropdownMenuItem
                key={level}
                onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              >
                H{level}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setParagraph().run()}
          disabled={disabled}
          title="Auto / Paragraph"
        >
          <Type className="h-4 w-4" />
        </Button>
        <span className="w-px h-6 bg-border mx-0.5" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled || !editor.can().chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled || !editor.can().chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={setLink}
          disabled={disabled}
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <span className="w-px h-6 bg-border mx-0.5" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled || !editor.can().chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled || !editor.can().chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleImageClick}
          disabled={disabled}
          title="Insert image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFile}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={disabled} title="Insert table">
              <TableIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
            >
              Insert 3×3 table
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run()
              }
            >
              Insert 4×4 table
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              disabled={!editor.can().addColumnAfter()}
            >
              Add column after
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addRowAfter().run()}
              disabled={!editor.can().addRowAfter()}
            >
              Add row after
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().deleteColumn().run()}
              disabled={!editor.can().deleteColumn()}
            >
              Delete column
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().deleteRow().run()}
              disabled={!editor.can().deleteRow()}
            >
              Delete row
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().deleteTable().run()}
              disabled={!editor.can().deleteTable()}
            >
              Delete table
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="w-px h-6 bg-border mx-0.5" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent
        editor={editor}
        style={{
          minHeight,
          height: contentHeight,
          overflowY: contentHeight ? "auto" : undefined,
        }}
        className="rounded-b-md [&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:p-3 [&_.ProseMirror]:outline-none [&_.tiptap p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap p.is-editor-empty:first-child::before]:float-left [&_.tiptap p.is-editor-empty:first-child::before]:h-0 [&_.tiptap p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto"
      />

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Enter the URL for the selected text.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmLink();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmLink}>
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
