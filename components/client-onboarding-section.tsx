"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link2, Copy, Loader2, ThumbsUp, ThumbsDown, CheckCircle, Ban, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type OnboardingLink = {
  id: string;
  token: string;
  label: string | null;
  isActive: boolean;
  publicUrl: string;
  createdAt: string;
};

type Submission = {
  id: string;
  linkToken: string;
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  designation?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyWebsite?: string;
  gstin?: string;
  pan?: string;
  notes?: string;
  status: string;
  createdClientId: string | null;
  createdAt: string;
};

export function ClientOnboardingSection() {
  const router = useRouter();
  const [links, setLinks] = useState<OnboardingLink[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [linkActionId, setLinkActionId] = useState<string | null>(null);
  const [viewSubmission, setViewSubmission] = useState<Submission | null>(null);

  async function loadLinks() {
    setLoadingLinks(true);
    try {
      const res = await fetch("/api/client-onboarding/links");
      const data = await res.json();
      if (res.ok) setLinks(data.links || []);
    } finally {
      setLoadingLinks(false);
    }
  }

  async function loadSubmissions() {
    setLoadingSubmissions(true);
    try {
      const res = await fetch("/api/client-onboarding/submissions");
      const data = await res.json();
      if (res.ok) setSubmissions(data.submissions || []);
    } finally {
      setLoadingSubmissions(false);
    }
  }

  useEffect(() => {
    loadLinks();
    loadSubmissions();
  }, []);

  async function handleGenerateLink(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch("/api/client-onboarding/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: linkLabel || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to generate link");
        return;
      }
      toast.success("Link generated");
      setNewLinkUrl(data.link.publicUrl);
      setLinkLabel("");
      await loadLinks();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  function copyUrl(url: string) {
    const full = url.startsWith("http") ? url : `${typeof window !== "undefined" ? window.location.origin : ""}${url}`;
    navigator.clipboard.writeText(full);
    toast.success("Link copied to clipboard");
  }

  async function toggleLinkActive(link: OnboardingLink) {
    setLinkActionId(link.id);
    try {
      const res = await fetch(`/api/client-onboarding/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !link.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message || "Failed to update link");
        return;
      }
      toast.success(link.isActive ? "Link deactivated" : "Link activated");
      await loadLinks();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLinkActionId(null);
    }
  }

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/client-onboarding/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to approve");
        return;
      }
      toast.success("Client created from submission");
      setViewSubmission(null);
      await loadSubmissions();
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/client-onboarding/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message || "Failed to reject");
        return;
      }
      toast.success("Submission rejected");
      setViewSubmission(null);
      await loadSubmissions();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionId(null);
    }
  }

  async function handleDone(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/client-onboarding/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "done" }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message || "Failed to mark done");
        return;
      }
      toast.success("Marked as done");
      setViewSubmission(null);
      await loadSubmissions();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionId(null);
    }
  }

  const pendingSubmissions = submissions.filter((s) => s.status === "pending");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Client onboarding
          </CardTitle>
          <CardDescription>
            Generate a public form link (no internal IDs in URL). Recipients fill the form; you approve to create a client or mark as done.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setGenerateOpen(true)} className="rounded-xl">
              Generate link
            </Button>
          </div>

          {newLinkUrl && (
            <div className="rounded-lg border bg-muted/50 p-4 flex items-center justify-between gap-4">
              <p className="text-sm font-medium truncate flex-1">{newLinkUrl}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyUrl(newLinkUrl)}
                className="shrink-0 rounded-lg"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
          )}

          {loadingLinks ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading links…
            </p>
          ) : links.length > 0 ? (
            <div>
              <p className="text-sm font-medium mb-2">Generated links</p>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li
                    key={l.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${l.isActive === false ? "opacity-70 bg-muted/30" : ""}`}
                  >
                    <span className="truncate flex-1 min-w-0">
                      {l.label || "Onboarding form"} ~ {l.publicUrl}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {l.isActive ? (
                        <Badge variant="default" className="bg-emerald-600 text-[10px] font-normal">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-normal">Inactive</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground"
                        onClick={() => toggleLinkActive(l)}
                        disabled={linkActionId !== null}
                        title={l.isActive ? "Deactivate link" : "Activate link"}
                      >
                        {linkActionId === l.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : l.isActive ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => copyUrl(l.publicUrl)}
                        title="Copy link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>
            Pending submissions can be approved (creates client) or rejected. Approved ones can be marked done.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSubmissions ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.companyName}</p>
                    </TableCell>
                    <TableCell className="text-sm">{s.email}</TableCell>
                    <TableCell className="capitalize">{s.status}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg"
                          onClick={() => setViewSubmission(s)}
                        >
                          View
                        </Button>
                        {s.status === "pending" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg text-emerald-600"
                              disabled={actionId !== null}
                              onClick={() => handleApprove(s.id)}
                            >
                              {actionId === s.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <ThumbsUp className="h-4 w-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg text-red-600"
                              disabled={actionId !== null}
                              onClick={() => handleReject(s.id)}
                            >
                              <ThumbsDown className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {(s.status === "pending" || s.status === "approved") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg"
                            disabled={actionId !== null}
                            onClick={() => handleDone(s.id)}
                          >
                            {actionId === s.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Done
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate link dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate onboarding link</DialogTitle>
            <DialogDescription>
              Creates a new public form link. The URL will not contain any internal IDs~only a secure token.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGenerateLink} className="space-y-4">
            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="e.g. Q1 campaign"
                className="rounded-lg"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View submission dialog */}
      <Dialog open={!!viewSubmission} onOpenChange={(o) => !o && setViewSubmission(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submission details</DialogTitle>
            <DialogDescription>Review before approving.</DialogDescription>
          </DialogHeader>
          {viewSubmission && (
            <div className="space-y-3 text-sm">
              <p><strong>Name:</strong> {viewSubmission.name}</p>
              <p><strong>Email:</strong> {viewSubmission.email}</p>
              <p><strong>Company:</strong> {viewSubmission.companyName}</p>
              {viewSubmission.phone && <p><strong>Phone:</strong> {viewSubmission.phone}</p>}
              {viewSubmission.designation && <p><strong>Designation:</strong> {viewSubmission.designation}</p>}
              {viewSubmission.companyAddress && <p><strong>Address:</strong> {viewSubmission.companyAddress}</p>}
              {viewSubmission.companyPhone && <p><strong>Company phone:</strong> {viewSubmission.companyPhone}</p>}
              {viewSubmission.companyWebsite && <p><strong>Website:</strong> {viewSubmission.companyWebsite}</p>}
              {viewSubmission.gstin && <p><strong>GSTIN:</strong> {viewSubmission.gstin}</p>}
              {viewSubmission.pan && <p><strong>PAN:</strong> {viewSubmission.pan}</p>}
              {viewSubmission.notes && <p><strong>Notes:</strong> {viewSubmission.notes}</p>}
            </div>
          )}
          {viewSubmission?.status === "pending" && (
            <DialogFooter>
              <Button variant="outline" onClick={() => viewSubmission && handleReject(viewSubmission.id)} disabled={actionId !== null}>
                Reject
              </Button>
              <Button onClick={() => viewSubmission && handleApprove(viewSubmission.id)} disabled={actionId !== null}>
                {actionId === viewSubmission?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve & create client"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
