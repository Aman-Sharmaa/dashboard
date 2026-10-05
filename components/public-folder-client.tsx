"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Folder, FileText, Image as ImageIcon, Video, Music, ChevronRight, Download, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DriveItem = {
  id: string;
  name: string;
  type: "file" | "folder";
  parentId: string | null;
  mimeType: string | null;
  sizeInBytes: number;
  updatedAt: string | null;
  fileUrl: string | null;
};

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function iconForItem(item: DriveItem) {
  if (item.type === "folder") return Folder;
  const mime = item.mimeType || "";
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Video;
  if (mime.startsWith("audio/")) return Music;
  return FileText;
}

export function PublicFolderClient({ rootId, folderName }: { rootId: string; folderName: string }) {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([
    { id: rootId, name: folderName },
  ]);

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/drive/public/${rootId}?parentId=${currentFolderId}`);
      if (!res.ok) throw new Error("Unable to load folder content");
      const data = await res.json();
      setItems(data.items || []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load folder");
    } finally {
      setLoading(false);
    }
  }, [rootId, currentFolderId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openFolder(item: DriveItem) {
    if (item.type !== "folder") return;
    setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Shared Folder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Viewing contents of <span className="font-medium text-foreground">{folderName}</span>
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-none shadow-sm bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-2 text-sm mb-6 bg-muted/40 p-2 rounded-xl">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.id} className="flex items-center">
                {idx > 0 && <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg px-2 hover:bg-background/50"
                  onClick={() => setBreadcrumbs((prev) => prev.slice(0, idx + 1))}
                >
                  {crumb.name}
                </Button>
              </div>
            ))}
          </div>

          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Size</TableHead>
                  <TableHead className="font-semibold">Modified</TableHead>
                  <TableHead className="w-[100px] text-right font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Loading contents...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      This folder is empty.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => {
                    const Icon = iconForItem(item);
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${item.type === "folder" ? "text-blue-500" : "text-muted-foreground"}`} />
                            {item.type === "folder" ? (
                              <button
                                type="button"
                                onClick={() => openFolder(item)}
                                className="font-medium hover:underline text-left"
                              >
                                {item.name}
                              </button>
                            ) : (
                              <span className="font-medium">{item.name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">
                          {item.type}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.type === "file" ? formatBytes(item.sizeInBytes) : "~"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "~"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.type === "file" && item.fileUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                              asChild
                            >
                              <a href={item.fileUrl} download={item.name} title="Download">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pb-8">
        Powered by <span className="font-semibold">Webwrite Drive</span>
      </div>
    </div>
  );
}
