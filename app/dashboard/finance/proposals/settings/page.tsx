"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ProposalSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultTerms, setDefaultTerms] = useState("");

  useEffect(() => {
    fetch("/api/proposals/settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDefaultTerms(data?.defaultTerms || ""))
      .catch(() => toast.error("Failed to load proposal settings"))
      .finally(() => setLoading(false));
  }, []);

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch("/api/proposals/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultTerms }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to save settings");
        return;
      }
      toast.success("Proposal terms saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proposal Settings</h1>
          <p className="text-muted-foreground">Manage default Terms & Conditions for new proposals.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/finance/proposals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Proposals
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default Terms & Conditions</CardTitle>
          <CardDescription>
            These terms are auto-filled whenever you create a new proposal. You can still edit terms per proposal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="proposal-default-terms">Terms & Conditions</Label>
                <Textarea
                  id="proposal-default-terms"
                  value={defaultTerms}
                  onChange={(e) => setDefaultTerms(e.target.value)}
                  className="min-h-[280px]"
                  placeholder="Enter default terms for proposals..."
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Terms
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
