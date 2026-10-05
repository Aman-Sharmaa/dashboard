"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  X, ArrowLeft, Plus, Trash2, CheckCircle, PlayCircle, Hash,
  Search, RefreshCw, Loader2, MessageSquare, Send, Radio, Mail,
  Clock, CornerDownRight, Instagram, User, ExternalLink, Sparkles,
  Clapperboard, Heart, MessageCircle, Check
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  username: string;
  profilePicture?: string;
  status: string;
}

interface InstagramMedia {
  id: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  caption?: string;
  timestamp: string;
  comments_count?: number;
  like_count?: number;
}

export type TriggerType = "post" | "dm" | "story" | "live" | "share_post";

interface AutomationForm {
  instagramAccountId: string;
  name: string;
  triggerType: TriggerType;
  mediaType: "specific" | "any" | "next";
  mediaId?: string;
  mediaUrl?: string;
  commentMode: "any" | "keyword";
  includedKeywords: string[];
  excludedKeywords: string[];
  delayMinutes: number;
  publicReplyEnabled: boolean;
  publicReplies: string[];
  followGateEnabled: boolean;
  followOpeningMessage: string;
  mainMessage: string;
  buttons: { text: string; url: string }[];
  status: "active";
}

const VARS = ["{{name}}", "{{username}}", "{{media_name}}", "{{account_username}}", "{{comment_text}}"];

const TRIGGER_TYPES: Array<{
  id: TriggerType;
  title: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  hasMedia: boolean;
  hasPublicReply: boolean;
}> = [
  {
    id: "post",
    title: "Comments on your Post or Reel",
    icon: Clapperboard,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40",
    hasMedia: true,
    hasPublicReply: true,
  },
  {
    id: "dm",
    title: "Sends you a DM",
    icon: Send,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40",
    hasMedia: false,
    hasPublicReply: false,
  },
  {
    id: "story",
    title: "Replies to your Story",
    icon: Sparkles,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/40",
    hasMedia: true,
    hasPublicReply: false,
  },
  {
    id: "live",
    title: "Comments on your Live",
    icon: Radio,
    iconColor: "text-rose-500",
    iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40",
    hasMedia: false,
    hasPublicReply: true,
  },
  {
    id: "share_post",
    title: "DMs your Post or Reel",
    icon: Mail,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40",
    hasMedia: true,
    hasPublicReply: false,
  },
];

const EMPTY_FORM: AutomationForm = {
  instagramAccountId: "",
  name: "",
  triggerType: "post",
  mediaType: "specific",
  mediaId: undefined,
  mediaUrl: undefined,
  commentMode: "any",
  includedKeywords: [],
  excludedKeywords: [],
  delayMinutes: 1,
  publicReplyEnabled: true,
  publicReplies: ["Sent you a message! Check it out! 🙌"],
  followGateEnabled: false,
  followOpeningMessage: "Almost there !\nPlease visit my profile and tap follow to continue 😄",
  mainMessage: "Hi!\n\nGlad you commented 🙌 Here's the promised link\nhttps://example.com",
  buttons: [],
  status: "active",
};

// ─── Step Management ─────────────────────────────────────────────────────────

function getSteps(triggerType: TriggerType) {
  const t = TRIGGER_TYPES.find((x) => x.id === triggerType);
  const list = ["Account", "Trigger"];
  if (t?.hasMedia) list.push("Content");
  list.push("Rules");
  if (t?.hasPublicReply) list.push("Reply");
  list.push("Follow Gate", "DM", "Review");
  return list;
}

function StepIndicator({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-2 px-6 py-3.5 border-b overflow-x-auto no-scrollbar bg-card/60 backdrop-blur-sm">
      {steps.map((label, i) => {
        const isDone = i + 1 < currentStep;
        const isCurrent = i + 1 === currentStep;
        return (
          <div key={i} className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-all",
                  isDone
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-foreground text-background shadow-xs font-extrabold"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:inline-block",
                  isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-4 h-px bg-border/80 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AutoDMCreateDialog({
  open,
  onOpenChange,
  accounts,
  editingAutomation,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accounts: Account[];
  editingAutomation: any | null;
  onSuccess: (automation: any) => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AutomationForm>({ ...EMPTY_FORM });
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newExcluded, setNewExcluded] = useState("");
  const [saving, setSaving] = useState(false);

  const connectedAccounts = accounts.filter((a) => a.status === "connected");
  const activeTrigger = TRIGGER_TYPES.find((t) => t.id === form.triggerType) || TRIGGER_TYPES[0];
  const steps = getSteps(form.triggerType);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingAutomation) {
      setForm({
        ...EMPTY_FORM,
        ...editingAutomation,
        triggerType: editingAutomation.triggerType || "post",
        delayMinutes: editingAutomation.delayMinutes ?? 1,
        includedKeywords: editingAutomation.includedKeywords || [],
        excludedKeywords: editingAutomation.excludedKeywords || [],
        publicReplies: editingAutomation.publicReplies || ["Sent you a message! Check it out! 🙌"],
        buttons: editingAutomation.buttons || [],
      });
      setStep(1);
    } else {
      setForm({
        ...EMPTY_FORM,
        instagramAccountId: connectedAccounts[0]?.id || "",
      });
      setStep(1);
    }
  }, [editingAutomation, open]);

  // Load media whenever dialog opens or account changes
  useEffect(() => {
    if (open && form.instagramAccountId) {
      loadMedia();
    }
  }, [open, form.instagramAccountId]);

  async function loadMedia() {
    if (!form.instagramAccountId) return;
    setLoadingMedia(true);
    try {
      const res = await fetch(`/api/autodm/media?accountId=${form.instagramAccountId}`);
      if (res.ok) {
        const data = await res.json();
        const items: InstagramMedia[] = data.media || [];
        setMedia(items);
        // Pre-select first post if none selected
        if (!form.mediaId && items.length > 0) {
          setForm((f) => ({
            ...f,
            mediaId: items[0].id,
            mediaUrl: items[0].permalink || items[0].media_url,
            name: f.name || items[0].caption?.slice(0, 40) || "AutoDM",
          }));
        }
      }
    } catch {
      toast.error("Failed to load Instagram media");
    } finally {
      setLoadingMedia(false);
    }
  }

  const setField = (key: keyof AutomationForm, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const insertVar = (field: "mainMessage" | "followOpeningMessage", varText: string) => {
    setField(field, (form[field] || "") + varText);
  };

  async function handleSave() {
    if (!form.instagramAccountId || !form.mainMessage.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const url = editingAutomation
        ? `/api/autodm/automations/${editingAutomation.id}`
        : "/api/autodm/automations";
      const method = editingAutomation ? "PUT" : "POST";
      const payload = {
        ...form,
        name:
          form.name.trim() ||
          `AutoDM: ${activeTrigger.title} (${form.mediaType === "any" ? "Any" : "Specific"})`,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save");
      toast.success(editingAutomation ? "Automation updated!" : "Automation activated!");
      onSuccess(data.automation);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save automation");
    } finally {
      setSaving(false);
    }
  }

  const filteredMedia = media.filter(
    (m) => !mediaSearch || (m.caption || "").toLowerCase().includes(mediaSearch.toLowerCase())
  );

  const selectedMedia = media.find((m) => m.id === form.mediaId) || media[0];
  const selectedAccount = accounts.find((a) => a.id === form.instagramAccountId) || connectedAccounts[0];

  const currentStepName = steps[step - 1];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-3xl max-h-[92vh] flex flex-col bg-background border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b flex-shrink-0 bg-card/40">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-muted"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-base font-bold text-foreground tracking-tight">
              {editingAutomation ? "Edit Automation" : "Create AutoDM"}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <StepIndicator currentStep={step} steps={steps} />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── STEP: Select Instagram Account ── */}
          {currentStepName === "Account" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Select Instagram Account</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Which Instagram account should this automation run on?
                </p>
              </div>

              {connectedAccounts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
                  <Instagram className="h-10 w-10 mx-auto mb-2.5 text-muted-foreground/50" />
                  <p className="text-sm font-semibold text-foreground">No Instagram accounts connected.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect your account in Dashboard &gt; AutoDM &gt; Settings.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {connectedAccounts.map((account) => {
                    const isSelected = form.instagramAccountId === account.id;
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => setField("instagramAccountId", account.id)}
                        className={cn(
                          "w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all text-left group",
                          isSelected
                            ? "border-foreground bg-muted/30 shadow-xs"
                            : "border-muted/70 hover:border-muted-foreground/30 bg-card"
                        )}
                      >
                        <Avatar className="h-11 w-11 ring-2 ring-border shadow-xs">
                          <AvatarImage src={account.profilePicture} />
                          <AvatarFallback className="bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 text-white font-bold text-sm">
                            {account.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-sm text-foreground">@{account.username}</p>
                          <p className="text-xs text-muted-foreground">Connected Instagram Account</p>
                        </div>
                        {isSelected && (
                          <div className="ml-auto flex items-center justify-center h-6 w-6 rounded-full bg-foreground text-background">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <Button
                className="w-full h-12 text-sm font-bold rounded-2xl bg-foreground text-background hover:opacity-90 transition-opacity mt-4"
                disabled={!form.instagramAccountId}
                onClick={() => setStep(step + 1)}
              >
                Continue →
              </Button>
            </div>
          )}

          {/* ── STEP: Select Trigger Type (Screenshot 3 style) ── */}
          {currentStepName === "Trigger" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Select Trigger Event</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  What event should trigger the automated message?
                </p>
              </div>

              <div className="space-y-2.5">
                {TRIGGER_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = form.triggerType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setField("triggerType", t.id)}
                      className={cn(
                        "w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all text-left group",
                        isSelected
                          ? "border-foreground bg-muted/30 shadow-xs"
                          : "border-muted/70 hover:border-muted-foreground/30 bg-card"
                      )}
                    >
                      <div
                        className={cn(
                          "h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-xs",
                          t.iconBg
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground">{t.title}</p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-foreground text-background flex-shrink-0">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <Button
                className="w-full h-12 text-sm font-bold rounded-2xl bg-foreground text-background hover:opacity-90 transition-opacity mt-4"
                onClick={() => setStep(step + 1)}
              >
                Continue →
              </Button>
            </div>
          )}

          {/* ── STEP: Select Content (Posts, Reels, Stories) ── */}
          {currentStepName === "Content" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">What do you want to automate?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick which posts or reels should trigger this automation.
                </p>
              </div>

              <div className="space-y-2.5">
                {(["any", "specific", "next"] as const).map((type) => {
                  const isSelected = form.mediaType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setField("mediaType", type)}
                      className={cn(
                        "w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all text-left",
                        isSelected
                          ? "border-foreground bg-muted/30 shadow-xs"
                          : "border-muted/70 hover:border-muted-foreground/30 bg-card"
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0",
                          isSelected
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <PlayCircle className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm capitalize text-foreground">
                          {type === "any"
                            ? "Any Post / Reel"
                            : type === "specific"
                            ? "Specific Post / Reel"
                            : "Next Post / Reel"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {type === "any"
                            ? "Runs on all eligible posts and reels"
                            : type === "specific"
                            ? "Pick a specific post or reel"
                            : "Attach to your next posted content"}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-foreground text-background flex-shrink-0">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {form.mediaType === "specific" && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search posts and reels..."
                        value={mediaSearch}
                        onChange={(e) => setMediaSearch(e.target.value)}
                        className="pl-9 h-10 text-xs rounded-xl bg-muted/20 border-muted"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-10 rounded-xl px-3"
                      onClick={loadMedia}
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", loadingMedia && "animate-spin")} />
                      Refresh
                    </Button>
                  </div>

                  {loadingMedia ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1">
                      {filteredMedia.map((m) => {
                        const isChosen = form.mediaId === m.id;
                        const thumb = m.thumbnail_url || m.media_url;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setField("mediaId", m.id);
                              setField("mediaUrl", m.permalink || m.media_url);
                              setField("name", m.caption?.slice(0, 40) || "AutoDM");
                            }}
                            className={cn(
                              "group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all text-left bg-muted shadow-xs",
                              isChosen
                                ? "border-foreground ring-2 ring-foreground/20"
                                : "border-transparent hover:border-muted-foreground/40"
                            )}
                          >
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
                                No preview
                              </div>
                            )}
                            {isChosen && (
                              <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
                                <div className="h-7 w-7 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                  <Check className="h-4 w-4 stroke-[3]" />
                                </div>
                              </div>
                            )}
                            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
                              <span className="text-[9px] bg-black/75 backdrop-blur-sm text-white font-bold rounded-md px-1.5 py-0.5">
                                {m.media_type === "VIDEO" ? "REEL" : "POST"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      {filteredMedia.length === 0 && !loadingMedia && (
                        <div className="col-span-3 py-10 text-center text-sm text-muted-foreground bg-muted/20 rounded-2xl">
                          No posts or reels found.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full h-12 text-sm font-bold rounded-2xl bg-foreground text-background hover:opacity-90 transition-opacity mt-4"
                onClick={() => setStep(step + 1)}
                disabled={form.mediaType === "specific" && !form.mediaId}
              >
                Continue →
              </Button>
            </div>
          )}

          {/* ── STEP: Rules & Timing ── */}
          {currentStepName === "Rules" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-foreground">Trigger Rules & Timing</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure keyword matching and delivery delay.
                </p>
              </div>

              <div className="space-y-2.5">
                {(["any", "keyword"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setField("commentMode", mode)}
                    className={cn(
                      "w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all text-left",
                      form.commentMode === mode
                        ? "border-foreground bg-muted/30 shadow-xs"
                        : "border-muted/70 hover:border-muted-foreground/30 bg-card"
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-2xl flex items-center justify-center",
                        form.commentMode === mode
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Hash className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">
                        {mode === "any" ? "Any Comment / Message" : "Specific Keywords"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mode === "any"
                          ? "Every comment or message triggers the automation"
                          : "Only triggers when comment contains matched keywords"}
                      </p>
                    </div>
                    {form.commentMode === mode && (
                      <div className="ml-auto flex items-center justify-center h-6 w-6 rounded-full bg-foreground text-background flex-shrink-0">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {form.commentMode === "keyword" && (
                <div className="space-y-4 pt-1 bg-muted/20 p-4 rounded-2xl border">
                  <div>
                    <Label className="text-xs font-bold mb-1.5 block">Included Keywords (Match Any)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. LINK, GUIDE, INFO"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newKeyword.trim()) {
                            e.preventDefault();
                            setField("includedKeywords", [...form.includedKeywords, newKeyword.trim()]);
                            setNewKeyword("");
                          }
                        }}
                        className="h-9 text-xs rounded-xl bg-card"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-xl px-3"
                        onClick={() => {
                          if (newKeyword.trim()) {
                            setField("includedKeywords", [...form.includedKeywords, newKeyword.trim()]);
                            setNewKeyword("");
                          }
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.includedKeywords.map((kw, i) => (
                        <Badge key={i} variant="secondary" className="gap-1 text-xs py-1 px-2.5 rounded-lg">
                          {kw}
                          <button
                            onClick={() =>
                              setField(
                                "includedKeywords",
                                form.includedKeywords.filter((_, j) => j !== i)
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold mb-1.5 block">Excluded Keywords (Optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. spam, scam, hate"
                        value={newExcluded}
                        onChange={(e) => setNewExcluded(e.target.value)}
                        className="h-9 text-xs rounded-xl bg-card"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-xl px-3"
                        onClick={() => {
                          if (newExcluded.trim()) {
                            setField("excludedKeywords", [...form.excludedKeywords, newExcluded.trim()]);
                            setNewExcluded("");
                          }
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.excludedKeywords.map((kw, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="gap-1 text-xs text-red-600 border-red-300 py-1 px-2.5 rounded-lg"
                        >
                          {kw}
                          <button
                            onClick={() =>
                              setField(
                                "excludedKeywords",
                                form.excludedKeywords.filter((_, j) => j !== i)
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Delay Timing */}
              <div className="pt-2 border-t space-y-2.5">
                <Label className="text-xs font-bold block flex items-center gap-1.5 text-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Response Delay
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Immediate", val: 0 },
                    { label: "1 min", val: 1 },
                    { label: "5 min", val: 5 },
                    { label: "15 min", val: 15 },
                  ].map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setField("delayMinutes", d.val)}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center",
                        form.delayMinutes === d.val
                          ? "border-foreground bg-foreground text-background shadow-xs"
                          : "border-muted hover:border-muted-foreground/30 bg-card text-muted-foreground"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  {form.delayMinutes === 0
                    ? "Replies are dispatched instantly upon trigger."
                    : `Waits ${form.delayMinutes} minute${form.delayMinutes > 1 ? "s" : ""} after trigger to simulate human pacing.`}
                </p>
              </div>

              <Button
                className="w-full h-12 text-sm font-bold rounded-2xl bg-foreground text-background hover:opacity-90 transition-opacity mt-4"
                onClick={() => setStep(step + 1)}
                disabled={form.commentMode === "keyword" && form.includedKeywords.length === 0}
              >
                Continue →
              </Button>
            </div>
          )}

          {/* ── STEP: Public Reply ── */}
          {currentStepName === "Reply" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4.5 rounded-2xl border-2 bg-card">
                <div>
                  <p className="text-sm font-bold text-foreground">Public Comment Reply</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reply publicly on the post to guide users to their inbox
                  </p>
                </div>
                <Switch
                  checked={form.publicReplyEnabled}
                  onCheckedChange={(v) => setField("publicReplyEnabled", v)}
                />
              </div>

              {form.publicReplyEnabled && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Add reply variations — one will be chosen randomly on each trigger.
                  </p>
                  {form.publicReplies.map((reply, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        value={reply}
                        onChange={(e) => {
                          const r = [...form.publicReplies];
                          r[i] = e.target.value;
                          setField("publicReplies", r);
                        }}
                        placeholder={`Reply variant ${i + 1}`}
                        className="text-xs h-10 rounded-xl"
                      />
                      {form.publicReplies.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 flex-shrink-0"
                          onClick={() =>
                            setField(
                              "publicReplies",
                              form.publicReplies.filter((_, j) => j !== i)
                            )
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {form.publicReplies.length < 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs w-full h-9 rounded-xl"
                      onClick={() => setField("publicReplies", [...form.publicReplies, ""])}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Reply Variant
                    </Button>
                  )}
                </div>
              )}

              <Button
                className="w-full h-12 text-sm font-bold rounded-2xl bg-foreground text-background hover:opacity-90 transition-opacity mt-4"
                onClick={() => setStep(step + 1)}
              >
                Continue →
              </Button>
            </div>
          )}

          {/* ── STEP: Follow Gate ── */}
          {currentStepName === "Follow Gate" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4.5 rounded-2xl border-2 bg-card">
                <div>
                  <p className="text-sm font-bold text-foreground">Ask to Follow (Follow Gate)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ask users to follow your account before they receive the main link
                  </p>
                </div>
                <Switch
                  checked={form.followGateEnabled}
                  onCheckedChange={(v) => setField("followGateEnabled", v)}
                />
              </div>

              {form.followGateEnabled && (
                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-bold">Follow Gate Opening Message</Label>
                  <Textarea
                    value={form.followOpeningMessage}
                    onChange={(e) => setField("followOpeningMessage", e.target.value)}
                    rows={3}
                    placeholder="Almost there !\nPlease visit my profile and tap follow to continue 😄"
                    className="text-xs resize-none rounded-2xl bg-card leading-relaxed"
                  />
                  <div className="flex flex-wrap gap-1">
                    {VARS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVar("followOpeningMessage", v)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:text-foreground font-mono"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 bg-muted/40 rounded-2xl text-xs space-y-2 border">
                    <p className="font-bold text-foreground">Preview interactive buttons sent:</p>
                    <div className="space-y-1.5">
                      <div className="w-full py-2.5 bg-card rounded-xl text-center font-bold text-foreground border shadow-xs">
                        Visit Profile
                      </div>
                      <div className="w-full py-2.5 bg-card rounded-xl text-center font-bold text-foreground border shadow-xs">
                        I'm following ✅
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                className="w-full h-12 text-sm font-bold rounded-2xl bg-foreground text-background hover:opacity-90 transition-opacity mt-4"
                onClick={() => setStep(step + 1)}
              >
                Continue →
              </Button>
            </div>
          )}

          {/* ── STEP: Main DM ── */}
          {currentStepName === "DM" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-bold">Main DM Message</Label>
                <p className="text-xs text-muted-foreground mb-2 mt-0.5">
                  This message delivers your promised link or resources
                </p>
                <Textarea
                  value={form.mainMessage}
                  onChange={(e) => setField("mainMessage", e.target.value)}
                  rows={4}
                  placeholder="Hi!\n\nGlad you reached out 🙌 Here's the link:"
                  className="text-xs resize-none rounded-2xl bg-card leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {VARS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVar("mainMessage", v)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:text-foreground font-mono"
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="pt-2 border-t space-y-2">
                <Label className="text-xs font-bold block">Call to Action Buttons (Optional)</Label>
                {form.buttons.map((btn, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={btn.text}
                      onChange={(e) => {
                        const b = [...form.buttons];
                        b[i] = { ...b[i], text: e.target.value };
                        setField("buttons", b);
                      }}
                      placeholder="Button title (e.g. Open Link)"
                      className="h-9 text-xs rounded-xl"
                    />
                    <Input
                      value={btn.url}
                      onChange={(e) => {
                        const b = [...form.buttons];
                        b[i] = { ...b[i], url: e.target.value };
                        setField("buttons", b);
                      }}
                      placeholder="https://..."
                      className="h-9 text-xs rounded-xl"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-500 flex-shrink-0"
                      onClick={() => setField("buttons", form.buttons.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {form.buttons.length < 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs w-full h-9 rounded-xl"
                    onClick={() => setField("buttons", [...form.buttons, { text: "", url: "" }])}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add CTA Button
                  </Button>
                )}
              </div>

              <Button
                className="w-full h-12 text-sm font-bold rounded-2xl bg-foreground text-background hover:opacity-90 transition-opacity mt-4"
                onClick={() => setStep(step + 1)}
                disabled={!form.mainMessage.trim()}
              >
                Review →
              </Button>
            </div>
          )}

          {/* ── STEP: REVIEW FLOW PREVIEW (Exact match to Screenshots 1 & 2) ── */}
          {currentStepName === "Review" && (
            <div className="space-y-6 pb-2">
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-foreground tracking-tight">
                  Awesome! Let's review once before we launch!
                </h3>
              </div>

              <div className="space-y-5 text-sm">
                {/* 1. When someone... */}
                <div className="space-y-2">
                  <p className="font-bold text-foreground">When someone...</p>
                  <p className="text-xs text-muted-foreground font-normal">
                    {form.triggerType === "post" &&
                      (form.mediaType === "specific"
                        ? "comments on this specific post"
                        : "comments on any post or reel")}
                    {form.triggerType === "dm" && "sends you a DM"}
                    {form.triggerType === "story" && "replies to your Story"}
                    {form.triggerType === "live" && "comments on your Live broadcast"}
                    {form.triggerType === "share_post" && "shares a post or reel to your DMs"}
                  </p>

                  <div className="flex items-start gap-2.5 pl-1.5">
                    <CornerDownRight className="h-4 w-4 text-muted-foreground/60 mt-1 flex-shrink-0" />
                    {form.mediaType === "specific" && selectedMedia ? (
                      <div className="w-32 aspect-square rounded-2xl overflow-hidden border bg-muted shadow-sm">
                        <img
                          src={selectedMedia.thumbnail_url || selectedMedia.media_url || "/placeholder.png"}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="px-4 py-2.5 rounded-2xl border bg-card font-medium text-xs text-foreground flex items-center gap-2 shadow-xs">
                        <activeTrigger.icon className="h-4 w-4 text-muted-foreground" />
                        {form.mediaType === "any"
                          ? "Any Post or Reel"
                          : form.mediaType === "next"
                          ? "Next Post or Reel"
                          : activeTrigger.title}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. and comments... */}
                <div className="space-y-2">
                  <p className="font-bold text-foreground">and comments...</p>
                  <div className="flex items-center gap-2.5 pl-1.5">
                    <CornerDownRight className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
                    <div className="px-4 py-2 rounded-xl border bg-card text-xs font-semibold shadow-xs text-foreground">
                      {form.commentMode === "any"
                        ? "Any comment"
                        : `Contains: ${form.includedKeywords.join(", ")}`}
                    </div>
                  </div>
                </div>

                {/* 3. then wait timing */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground italic pl-1">
                  <Clock className="h-4 w-4 text-muted-foreground/70" />
                  <span>
                    {form.delayMinutes === 0
                      ? "then trigger immediately"
                      : `then wait ${form.delayMinutes} minute${form.delayMinutes > 1 ? "s" : ""} after the trigger`}
                  </span>
                </div>

                {/* 4. then ask them to follow you (if enabled) */}
                {form.followGateEnabled && (
                  <div className="space-y-2.5">
                    <p className="font-bold text-foreground">then ask them to follow you</p>
                    <div className="flex items-start gap-2.5 pl-1.5">
                      <CornerDownRight className="h-4 w-4 text-muted-foreground/60 mt-1 flex-shrink-0" />
                      <div className="space-y-2 max-w-sm flex-1">
                        <div className="p-4 rounded-2xl bg-muted/60 text-xs leading-relaxed text-foreground whitespace-pre-line shadow-xs font-medium">
                          {form.followOpeningMessage}
                        </div>
                        <div className="w-full py-2.5 bg-muted/90 hover:bg-muted rounded-xl text-center font-bold text-xs text-foreground border shadow-xs transition-colors">
                          Visit Profile
                        </div>
                        <div className="w-full py-2.5 bg-muted/90 hover:bg-muted rounded-xl text-center font-bold text-xs text-foreground border shadow-xs transition-colors">
                          I'm following ✅
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. leave a reply to their comment on the post (if enabled) */}
                {form.publicReplyEnabled && (
                  <div className="space-y-2.5">
                    <p className="font-bold text-foreground">leave a reply to their comment on the post</p>
                    <div className="flex items-start gap-2.5 pl-1.5">
                      <CornerDownRight className="h-4 w-4 text-muted-foreground/60 mt-1 flex-shrink-0" />
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-muted">
                              <User className="h-3 w-3" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-foreground">User</span>
                          <span className="text-muted-foreground">This is a comment</span>
                        </div>
                        <div className="flex items-center gap-2 pl-6">
                          <Avatar className="h-6 w-6 ring-1 ring-border">
                            <AvatarImage src={selectedAccount?.profilePicture} />
                            <AvatarFallback className="text-[10px] bg-gradient-to-tr from-pink-500 to-amber-500 text-white font-bold">
                              {selectedAccount?.username?.[0]?.toUpperCase() || "Y"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-foreground">You</span>
                          <span className="text-blue-500 font-semibold">@user</span>
                          <span className="text-foreground">
                            {form.publicReplies[0] || "Sent you a message! Check it out!"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Once they follow / Send them DM */}
                <div className="space-y-2.5">
                  <p className="font-bold text-foreground">
                    {form.followGateEnabled
                      ? "Once they follow, send them the following DM"
                      : "Send them the following DM"}
                  </p>
                  <div className="flex items-start gap-2.5 pl-1.5">
                    <CornerDownRight className="h-4 w-4 text-muted-foreground/60 mt-1 flex-shrink-0" />
                    <div className="space-y-2 max-w-sm flex-1">
                      <div className="p-4 rounded-2xl bg-muted/60 text-xs leading-relaxed text-foreground whitespace-pre-line shadow-xs font-medium">
                        {form.mainMessage}
                      </div>
                      {form.buttons.map(
                        (b, i) =>
                          b.text && (
                            <div
                              key={i}
                              className="w-full py-2.5 bg-card border rounded-xl text-center font-bold text-xs text-foreground shadow-xs flex items-center justify-center gap-1.5"
                            >
                              {b.text}
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button (Screenshot 1 & 2 style) */}
              <div className="pt-3">
                <Button
                  className="w-full h-12 text-sm font-bold rounded-2xl bg-foreground/80 hover:bg-foreground text-background transition-all shadow-md"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {saving
                    ? "Saving..."
                    : editingAutomation
                    ? "Save Changes"
                    : "Enable Automation"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
