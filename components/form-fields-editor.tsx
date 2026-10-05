"use client";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import {
  CUSTOM_FORM_FIELD_TYPES,
  type CustomFormField,
  type CustomFormFieldType,
  newFieldId,
  optionsToText,
  parseOptionsFromText,
  slugifyKey,
} from "@/lib/custom-form-fields";

type Props = {
  fields: CustomFormField[];
  onChange: (fields: CustomFormField[]) => void;
  title?: string;
  description?: string;
};

export function FormFieldsEditor({
  fields,
  onChange,
  title = "Questions",
  description = "Add fields like Google Forms: short answer, paragraph, dropdown (one option per line), checkboxes, dates, etc. Toggle required and reorder.",
}: Props) {
  const updateAt = (index: number, patch: Partial<CustomFormField>) => {
    const next = fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(next.map((f, i) => ({ ...f, order: i })));
  };

  const removeAt = (index: number) => {
    onChange(fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i })));
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    const t = next[index];
    next[index] = next[j];
    next[j] = t;
    onChange(next.map((f, i) => ({ ...f, order: i })));
  };

  const addField = () => {
    const used = new Set(fields.map((f) => f.key));
    const label = "New question";
    const key = slugifyKey(label, used);
    onChange([
      ...fields,
      {
        id: newFieldId(),
        key,
        label,
        type: "short_text",
        required: false,
        placeholder: "",
        options: [],
        order: fields.length,
      },
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((f, index) => (
          <div
            key={f.id}
            className="rounded-lg border bg-card p-4 space-y-3 relative"
          >
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-0.5 pt-1 text-muted-foreground">
                <GripVertical className="h-4 w-4 opacity-40" />
              </div>
              <div className="flex-1 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Question title</Label>
                  <Input
                    value={f.label}
                    onChange={(e) => updateAt(index, { label: e.target.value })}
                    placeholder="e.g. Company name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Field key (for exports)</Label>
                  <Input
                    value={f.key}
                    onChange={(e) =>
                      updateAt(index, {
                        key: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]/g, "")
                          .slice(0, 64),
                      })
                    }
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={f.type}
                    onValueChange={(v) =>
                      updateAt(index, {
                        type: v as CustomFormFieldType,
                        options: v === "dropdown" || v === "checkboxes" ? f.options : [],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOM_FORM_FIELD_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Placeholder (optional)</Label>
                  <Input
                    value={f.placeholder || ""}
                    onChange={(e) => updateAt(index, { placeholder: e.target.value })}
                  />
                </div>
                {(f.type === "dropdown" || f.type === "checkboxes") && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Options (one per line)</Label>
                    <Textarea
                      value={optionsToText(f.options)}
                      onChange={(e) =>
                        updateAt(index, { options: parseOptionsFromText(e.target.value) })
                      }
                      className="min-h-[88px] font-mono text-sm"
                      placeholder={"Option A\nOption B"}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm sm:col-span-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    checked={f.required}
                    onChange={(e) => updateAt(index, { required: e.target.checked })}
                  />
                  Required
                </label>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={index === fields.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeAt(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" className="w-full gap-2" onClick={addField}>
          <Plus className="h-4 w-4" />
          Add question
        </Button>
      </CardContent>
    </Card>
  );
}
