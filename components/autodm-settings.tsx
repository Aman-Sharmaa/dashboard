"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Save, RefreshCw, CheckCircle, AlertCircle, Clock, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SettingsData {
  metaAppId: string;
  hasAppSecret: boolean;
  hasSystemToken: boolean;
  hasWebhookToken: boolean;
  lastConnectionStatus?: string;
  lastCheckedAt?: string;
}

function MaskedInput({
  label, placeholder, value, onChange, hasExistingValue, id,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hasExistingValue?: boolean;
  id: string;
}) {
  const [show, setShow] = useState(false);
  // When there is an existing saved value AND parent value is empty, show a locked placeholder state
  const isLocked = hasExistingValue && value === "";

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <div className="relative">
        {isLocked ? (
          // Locked state — show masked placeholder with a "Change" button
          <div className="flex items-center gap-2">
            <div className="flex-1 h-9 px-3 rounded-md border bg-muted font-mono text-sm flex items-center text-muted-foreground">
              ••••••••••••••••••••••••
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs flex-shrink-0"
              onClick={() => onChange(" ")} // Set to a space to unlock, user will clear and retype
            >
              Change
            </Button>
          </div>
        ) : (
          <Input
            id={id}
            type={show ? "text" : "password"}
            value={value.trim() === "" ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="pr-10 font-mono text-sm"
            autoComplete="off"
          />
        )}
        {!isLocked && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hasExistingValue && (
        <p className="text-xs text-muted-foreground">
          {isLocked ? "Saved securely" : <span className="text-amber-600">Editing — enter new value to update</span>}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, { label: string; color: string; icon: any }> = {
    connected: { label: "Connected", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle },
    invalid: { label: "Invalid Credentials", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: AlertCircle },
    expired: { label: "Token Expired", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
    missing_permissions: { label: "Missing Permissions", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: AlertCircle },
    webhook_unconfigured: { label: "Webhook Not Configured", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Info },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <Badge variant="outline" className={`gap-1.5 text-xs px-2.5 py-1 ${s.color}`}>
      <s.icon className="h-3 w-3" />
      {s.label}
    </Badge>
  );
}

export function AutoDMSettingsPanel() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [metaAppId, setMetaAppId] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [metaSystemToken, setMetaSystemToken] = useState("");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/autodm/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
          setMetaAppId(data.settings.metaAppId || "");
        }
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: any = { metaAppId: metaAppId.trim() };
      
      // Only send if user actually typed something (not empty or just the unlock space)
      const secret = metaAppSecret.trim();
      const systemToken = metaSystemToken.trim();
      const webhookToken = webhookVerifyToken.trim();
      
      if (secret) payload.metaAppSecret = secret;
      if (systemToken) payload.metaSystemUserToken = systemToken;
      if (webhookToken) payload.metaWebhookVerifyToken = webhookToken;

      const res = await fetch("/api/autodm/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      toast.success("Settings saved securely");
      // Reset secret fields, reload to show "Saved" state
      setMetaAppSecret("");
      setMetaSystemToken("");
      setWebhookVerifyToken("");
      loadSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/autodm/settings", { method: "POST" });
      const data = await res.json();
      if (data.status === "connected") {
        toast.success(`✅ Connected! Instagram: @${data.info?.username}`);
      } else if (data.status === "webhook_unconfigured") {
        toast.error("❌ No credentials saved yet. Enter your System User Token and click Save first.");
      } else {
        toast.error(`❌ ${data.message}`);
      }
      loadSettings();
    } catch {
      toast.error("Test connection failed");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Meta App Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Meta / Instagram Configuration</CardTitle>
              <CardDescription>Configure your Meta App credentials. Secrets are encrypted at rest and never sent to the browser.</CardDescription>
            </div>
            {settings?.lastConnectionStatus && <StatusBadge status={settings.lastConnectionStatus} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="meta-app-id" className="text-sm font-medium">Meta App ID</Label>
            <Input
              id="meta-app-id"
              value={metaAppId}
              onChange={(e) => setMetaAppId(e.target.value)}
              placeholder="e.g. 1825659598150158"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Found in Meta Developer Portal → App Settings → Basic.</p>
          </div>

          <MaskedInput
            id="meta-app-secret"
            label="Meta App Secret"
            placeholder="Paste new secret to update"
            value={metaAppSecret}
            onChange={setMetaAppSecret}
            hasExistingValue={settings?.hasAppSecret}
          />

          <MaskedInput
            id="meta-system-token"
            label="Meta System User Access Token"
            placeholder="Paste new token to update"
            value={metaSystemToken}
            onChange={setMetaSystemToken}
            hasExistingValue={settings?.hasSystemToken}
          />

          <MaskedInput
            id="webhook-verify-token"
            label="Webhook Verify Token"
            placeholder="Any custom secret string"
            value={webhookVerifyToken}
            onChange={setWebhookVerifyToken}
            hasExistingValue={settings?.hasWebhookToken}
          />

          {settings?.lastCheckedAt && (
            <p className="text-xs text-muted-foreground">
              Last checked: {new Date(settings.lastCheckedAt).toLocaleString("en-IN")}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testing} className="gap-2">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {testing ? "Testing..." : "Test Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook Configuration</CardTitle>
          <CardDescription>Configure this URL in your Meta App to receive comment events in real time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs font-medium mb-2 block">Webhook Callback URL</Label>
            <div className="flex gap-2">
              <Input value={`${siteUrl}/api/autodm/webhook`} readOnly className="font-mono text-xs bg-muted" />
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${siteUrl}/api/autodm/webhook`); toast.success("Copied!"); }}>
                Copy
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium mb-2 block">Required Subscriptions</Label>
            <div className="flex flex-wrap gap-1.5">
              {["comments", "messages", "messaging_postbacks", "live_comments", "feed"].map((s) => (
                <Badge key={s} variant="secondary" className="font-mono text-xs">{s}</Badge>
              ))}
            </div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
            <p className="font-semibold mb-1">⚠ Local Development Note</p>
            <p>Meta webhooks require a public HTTPS URL. Use ngrok or deploy to Vercel for testing. Run: <code className="font-mono bg-black/10 px-1 rounded">ngrok http 3000</code></p>
          </div>
        </CardContent>
      </Card>

      {/* Required Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required Permissions</CardTitle>
          <CardDescription>Your Meta App must have these permissions approved.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              "instagram_basic",
              "instagram_manage_comments",
              "instagram_manage_messages",
              "pages_read_engagement",
              "pages_manage_metadata",
            ].map((p) => (
              <div key={p} className="flex items-center gap-2 text-xs">
                <CheckCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <code className="font-mono text-muted-foreground">{p}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
