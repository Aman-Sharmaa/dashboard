"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import type { CustomFormField } from "@/lib/custom-form-fields";
import { emptyResponsesForFields, normalizeCustomFormFields } from "@/lib/custom-form-fields";

type Props = {
  fields: CustomFormField[];
  submitLabel?: string;
  onSubmit: (responses: Record<string, string | string[]>) => Promise<void>;
};

export function DynamicCustomFieldsForm({
  fields: rawFields,
  submitLabel = "Submit",
  onSubmit,
}: Props) {
  const fields = useMemo(() => normalizeCustomFormFields(rawFields), [rawFields]);
  const fieldsKey = useMemo(() => JSON.stringify(fields.map((f) => ({ ...f, options: f.options }))), [fields]);
  const [values, setValues] = useState<Record<string, string | string[]>>(() =>
    emptyResponsesForFields(normalizeCustomFormFields(rawFields))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(emptyResponsesForFields(normalizeCustomFormFields(rawFields)));
  }, [fieldsKey, rawFields]);

  const setVal = (key: string, v: string | string[]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const validate = (): string | null => {
    for (const f of fields) {
      if (!f.required) continue;
      const v = values[f.key];
      if (f.type === "checkboxes") {
        if (!Array.isArray(v) || v.length === 0) return `Please complete: ${f.label}`;
      } else if (f.type === "yes_no") {
        if (v !== "yes" && v !== "no") return `Please complete: ${f.label}`;
      } else if (String(v ?? "").trim() === "") {
        return `Please complete: ${f.label}`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setLoading(true);
    try {
      await onSubmit(values);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No questions have been configured for this form yet.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {fields.map((f) => (
        <div key={f.id} className="space-y-2">
          <Label className="text-base">
            {f.label}
            {f.required ? <span className="text-destructive"> *</span> : null}
          </Label>
          {f.type === "paragraph" && (
            <Textarea
              value={String(values[f.key] ?? "")}
              onChange={(e) => setVal(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="min-h-[100px]"
            />
          )}
          {(f.type === "short_text" || f.type === "email" || f.type === "phone" || f.type === "url") && (
            <Input
              type={f.type === "email" ? "email" : f.type === "url" ? "url" : "text"}
              value={String(values[f.key] ?? "")}
              onChange={(e) => setVal(f.key, e.target.value)}
              placeholder={f.placeholder}
            />
          )}
          {f.type === "number" && (
            <Input
              type="number"
              value={String(values[f.key] ?? "")}
              onChange={(e) => setVal(f.key, e.target.value)}
              placeholder={f.placeholder}
            />
          )}
          {f.type === "date" && (
            <Input
              type="date"
              value={String(values[f.key] ?? "")}
              onChange={(e) => setVal(f.key, e.target.value)}
            />
          )}
          {f.type === "dropdown" && (
            <Select
              value={String(values[f.key] ?? "")}
              onValueChange={(v) => setVal(f.key, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={f.placeholder || "Choose…"} />
              </SelectTrigger>
              <SelectContent>
                {(f.options.length ? f.options : ["Option 1"]).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {f.type === "yes_no" && (
            <Select
              value={String(values[f.key] ?? "")}
              onValueChange={(v) => setVal(f.key, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          )}
          {f.type === "checkboxes" && (
            <div className="space-y-2 rounded-md border p-3 bg-muted/20">
              {(f.options.length ? f.options : ["Option 1"]).map((opt) => {
                const arr = Array.isArray(values[f.key]) ? (values[f.key] as string[]) : [];
                const checked = arr.includes(opt);
                return (
                  <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(on) => {
                        const next = new Set(arr);
                        if (on) next.add(opt);
                        else next.delete(opt);
                        setVal(f.key, Array.from(next));
                      }}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full h-11">
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {loading ? "Submitting…" : submitLabel}
      </Button>
    </form>
  );
}
