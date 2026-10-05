"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type ContentUser = {
  userId: string;
  email: string;
  name: string;
  canManageContent: boolean;
};

export function ContentAccessTab() {
  const [users, setUsers] = useState<ContentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/cms/access");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleAccess(userId: string, canManageContent: boolean) {
    setUpdating(userId);
    try {
      const res = await fetch("/api/cms/access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, canManageContent }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, canManageContent } : u))
      );
      toast.success(canManageContent ? "Content access granted" : "Content access revoked");
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          Content Management Access
        </CardTitle>
        <CardDescription>
          Grant employees permission to manage CMS content (pages, posts, categories).
          Users with access will see the Content section in the sidebar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No employees found. Add team members first.</p>
        ) : (
          <div className="space-y-4">
            {users.map((u) => (
              <div
                key={u.userId}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{u.name || u.email}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {updating === u.userId ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`cms-${u.userId}`} className="text-sm cursor-pointer">
                        Can manage content
                      </Label>
                      <Checkbox
                        id={`cms-${u.userId}`}
                        checked={u.canManageContent}
                        onCheckedChange={(checked) =>
                          toggleAccess(u.userId, !!checked)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
