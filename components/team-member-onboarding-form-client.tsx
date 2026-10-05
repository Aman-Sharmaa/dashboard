"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Briefcase, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = { token: string };

const EMPLOYEE_TYPES = ["Employee", "Intern", "Part-Time", "Contract"] as const;

export function TeamMemberOnboardingFormClient({ token }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
    type: "Employee" as (typeof EMPLOYEE_TYPES)[number],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/team-member-onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          title: form.title.trim() || undefined,
          type: form.type,
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
          <p className="text-sm text-primary-foreground/80 mt-0.5">Team member onboarding</p>
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
      <div className="bg-primary px-8 py-6 text-primary-foreground">
        <h1 className="text-2xl font-bold tracking-tight">Webwrite</h1>
        <p className="text-sm text-primary-foreground/80 mt-0.5">Team member onboarding</p>
      </div>

      <div className="p-8 sm:p-10">
        <p className="text-sm text-muted-foreground mb-8">
          Please fill in your details below. Fields marked with <span className="text-destructive">*</span> are required.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <User className="h-4 w-4 text-primary" />
              <h3 className="text-sm uppercase tracking-wider">Your details</h3>
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
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Briefcase className="h-4 w-4 text-primary" />
              <h3 className="text-sm uppercase tracking-wider">Role</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:max-w-md">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Software Engineer"
                  className="rounded-xl border-input h-11"
                />
              </div>
              <div className="space-y-2 sm:max-w-md">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as (typeof EMPLOYEE_TYPES)[number] }))}
                >
                  <SelectTrigger className="rounded-xl border-input h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
