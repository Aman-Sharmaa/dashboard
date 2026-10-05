"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, User, FileText, Receipt, CheckCircle2 } from "lucide-react";

type Props = { token: string };

export function OnboardingFormClient({ token }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    companyName: "",
    phone: "",
    designation: "",
    companyAddress: "",
    companyPhone: "",
    companyWebsite: "",
    gstin: "",
    pan: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.companyName.trim()) {
      setError("Name, email and company name are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/client-onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          companyName: form.companyName.trim(),
          phone: form.phone.trim() || undefined,
          designation: form.designation.trim() || undefined,
          companyAddress: form.companyAddress.trim() || undefined,
          companyPhone: form.companyPhone.trim() || undefined,
          companyWebsite: form.companyWebsite.trim() || undefined,
          gstin: form.gstin.trim() || undefined,
          pan: form.pan.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-3xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden">
        <div className="bg-primary px-8 py-6 text-primary-foreground">
          <h1 className="text-2xl font-bold tracking-tight">Webwrite</h1>
          <p className="text-sm text-primary-foreground/80 mt-0.5">Client onboarding</p>
        </div>
        <div className="p-8 sm:p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Thank you</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Your details have been submitted successfully. We will review and get back to you shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden">
      {/* Header */}
      <div className="bg-primary px-8 py-6 text-primary-foreground">
        <h1 className="text-2xl font-bold tracking-tight">Webwrite</h1>
        <p className="text-sm text-primary-foreground/80 mt-0.5">Client onboarding</p>
      </div>

      <div className="p-8 sm:p-10">
        <p className="text-sm text-muted-foreground mb-8">
          Please fill in your details below. Fields marked with <span className="text-destructive">*</span> are required.
        </p>

        <form onSubmit={handleSubmit} className="space-y-10">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Contact */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <User className="h-4 w-4 text-primary" />
              <h3 className="text-sm uppercase tracking-wider">Contact person</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2 sm:max-w-md">
                <Label htmlFor="name">Full name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="John Doe"
                  required
                  className="rounded-xl border-input h-11"
                />
              </div>
              <div className="space-y-2 sm:max-w-md">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="john@company.com"
                  required
                  className="rounded-xl border-input h-11"
                />
              </div>
              <div className="space-y-2 sm:max-w-md">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="rounded-xl border-input h-11"
                />
              </div>
              <div className="space-y-2 sm:col-span-2 sm:max-w-md">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={form.designation}
                  onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                  placeholder="e.g. CEO, Manager"
                  className="rounded-xl border-input h-11"
                />
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* Company */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm uppercase tracking-wider">Company details</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2 sm:max-w-md">
                <Label htmlFor="companyName">Company name <span className="text-destructive">*</span></Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  placeholder="Acme Inc"
                  required
                  className="rounded-xl border-input h-11"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="companyAddress">Company address</Label>
                <Textarea
                  id="companyAddress"
                  value={form.companyAddress}
                  onChange={(e) => setForm((f) => ({ ...f, companyAddress: e.target.value }))}
                  placeholder="Full address"
                  rows={2}
                  className="rounded-xl border-input resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Company phone</Label>
                <Input
                  id="companyPhone"
                  value={form.companyPhone}
                  onChange={(e) => setForm((f) => ({ ...f, companyPhone: e.target.value }))}
                  placeholder="+91..."
                  className="rounded-xl border-input h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Website</Label>
                <Input
                  id="companyWebsite"
                  type="url"
                  value={form.companyWebsite}
                  onChange={(e) => setForm((f) => ({ ...f, companyWebsite: e.target.value }))}
                  placeholder="https://..."
                  className="rounded-xl border-input h-11"
                />
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* Tax */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Receipt className="h-4 w-4 text-primary" />
              <h3 className="text-sm uppercase tracking-wider">Tax & compliance</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={form.gstin}
                  onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
                  placeholder="GST number"
                  className="rounded-xl border-input h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  value={form.pan}
                  onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))}
                  placeholder="PAN number"
                  className="rounded-xl border-input h-11"
                />
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* Notes */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm uppercase tracking-wider">Additional information</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional information you’d like to share..."
                rows={3}
                className="rounded-xl border-input resize-none"
              />
            </div>
          </section>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto sm:min-w-[200px] h-12 rounded-xl text-base font-medium shadow-lg"
            >
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
