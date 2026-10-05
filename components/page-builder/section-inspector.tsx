"use client";

import { useState, useEffect } from "react";
import { PageSection, HeroProps, TextProps, ImageProps, CtaProps, FeaturesProps, FaqProps, SpacerProps, ColumnsProps, GenericProps, SectionStyles, BlogsProps, TeamCardProps, DEFAULT_PROPS } from "./section-types";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CmsImageUpload } from "@/components/cms-image-upload";

// Sentinel value used in place of empty string for Radix Select (empty string crashes it)
const SELECT_NONE = "__none__";

interface InspectorProps {
  section: PageSection;
  onChange: (id: string, props: Partial<Record<string, unknown>>) => void;
}


function DynamicInspector({ type, props, update }: { type: string, props: GenericProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  // Use DEFAULT_PROPS to know what keys to show
  const defaultProps = DEFAULT_PROPS[type as keyof typeof DEFAULT_PROPS] || {};
  const keys = Object.keys(defaultProps);

  if (keys.length === 0) {
    return (
      <KalpSectionNote
        name={type}
        description="This section has no editable properties."
      />
    );
  }

  return (
    <>
      <KalpSectionNote
        name={type}
        description="Edit the properties below to customize this section."
      />
      {keys.map(key => {
        const val = (props as any)[key] ?? (defaultProps as any)[key];
        const isArray = Array.isArray(val);
        const isBoolean = typeof val === 'boolean';

        if (isArray) {
          return (
            <Field key={key} label={key}>
              <Textarea
                className="text-xs min-h-[60px]"
                value={JSON.stringify(val, null, 2)}
                onChange={(e) => {
                  try {
                    update({ [key]: JSON.parse(e.target.value) });
                  } catch (err) { }
                }}
                placeholder="Must be valid JSON array"
              />
            </Field>
          );
        }

        if (isBoolean) {
          return (
            <div key={key} className="flex items-center space-x-2 py-2">
              <Checkbox
                id={key}
                checked={val}
                onCheckedChange={(v) => update({ [key]: !!v })}
              />
              <label htmlFor={key} className="text-xs font-medium leading-none cursor-pointer">
                {key}
              </label>
            </div>
          );
        }

        return (
          <Field key={key} label={key}>
            <Textarea
              className="text-xs min-h-[40px]"
              value={val || ""}
              onChange={(e) => update({ [key]: e.target.value })}
            />
          </Field>
        );
      })}
    </>
  );
}

export function SectionInspector({ section, onChange }: InspectorProps) {
  const update = (patch: Partial<Record<string, unknown>>) => onChange(section.id, patch);

  return (
    <aside className="w-80 shrink-0 bg-white border-l border-zinc-150 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-zinc-100">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Properties</h2>
        <p className="text-sm font-semibold text-zinc-900 mt-0.5 capitalize">{section.type.replace("-", " ")} Section</p>
      </div>

      <Tabs defaultValue="props" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="props" className="text-xs">Props</TabsTrigger>
            <TabsTrigger value="styles" className="text-xs">Styles</TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value="props" className="space-y-5 m-0">
            {section.type === "hero" ? <HeroInspector props={section.props as HeroProps} update={update} /> :
              section.type === "text" ? <TextInspector props={section.props as TextProps} update={update} /> :
                section.type === "image" ? <ImageInspector props={section.props as ImageProps} update={update} /> :
                  section.type === "cta" ? <CtaInspector props={section.props as CtaProps} update={update} /> :
                    section.type === "features" ? <FeaturesInspector props={section.props as FeaturesProps} update={update} /> :
                      section.type === "faq" ? <FaqInspector props={section.props as FaqProps} update={update} /> :
                        section.type === "spacer" ? <SpacerInspector props={section.props as SpacerProps} update={update} /> :
                          section.type === "columns" ? <ColumnsInspector props={section.props as ColumnsProps} update={update} /> :
                            section.type === "blogs" ? <BlogsInspector props={section.props as BlogsProps} update={update} /> :
                              section.type === "team-card" ? <TeamCardInspector props={section.props as TeamCardProps} update={update} /> :

                                section.type === "kalp-hero" ? <KalpHeroInspector props={section.props as GenericProps} update={update} /> :
                                  section.type === "kalp-products" ? <KalpProductsInspector props={section.props as GenericProps} update={update} /> :
                                    section.type === "kalp-faq" ? <KalpFaqInspector props={section.props as GenericProps} update={update} /> :
                                      section.type === "kalp-about" ? <KalpAboutInspector props={section.props as GenericProps} update={update} /> :
                                        section.type.startsWith("kalp-") ? <DynamicInspector type={section.type} props={section.props as GenericProps} update={update} /> :

                                          <DynamicInspector type={section.type} props={section.props as GenericProps} update={update} />
            }
          </TabsContent>
          <TabsContent value="styles" className="m-0">
            <StylesInspector styles={section.styles} update={update} />
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}

// ─── Shared field helpers ─────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{label}</Label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value || "#ffffff"} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded-md border border-zinc-200 cursor-pointer p-0.5" />
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="#ffffff" className="flex-1 text-xs h-8" />
      </div>
    </Field>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  // Radix UI Select crashes with empty string value ~ use sentinel instead
  const safeValue = value || SELECT_NONE;
  const safeOptions = options.map((o) => ({ ...o, value: o.value === "" ? SELECT_NONE : o.value }));
  return (
    <Field label={label}>
      <Select
        value={safeValue}
        onValueChange={(v) => onChange(v === SELECT_NONE ? "" : v)}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Default" />
        </SelectTrigger>
        <SelectContent>
          {safeOptions.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

// ─── Styles Inspector ────────────────────────────────────────────────────────

function StylesInspector({ styles, update }: { styles?: SectionStyles; update: (patch: Partial<Record<string, unknown>>) => void }) {
  const s = styles || {};
  const updateStyle = (key: keyof SectionStyles, value: string) => {
    update({ styles: { ...s, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <Field label="Width"><Input className="text-xs h-8" value={s.width || ""} onChange={(e) => updateStyle("width", e.target.value)} placeholder="e.g. 100%, 500px" /></Field>
      <Field label="Height"><Input className="text-xs h-8" value={s.height || ""} onChange={(e) => updateStyle("height", e.target.value)} placeholder="e.g. auto, 100vh" /></Field>
      <Field label="Padding"><Input className="text-xs h-8" value={s.padding || ""} onChange={(e) => updateStyle("padding", e.target.value)} placeholder="e.g. 1rem 2rem" /></Field>
      <Field label="Margin"><Input className="text-xs h-8" value={s.margin || ""} onChange={(e) => updateStyle("margin", e.target.value)} placeholder="e.g. 0 auto" /></Field>
      <SelectField label="Display" value={s.display || ""} options={[{ value: "", label: "Default" }, { value: "block", label: "Block" }, { value: "flex", label: "Flex" }, { value: "grid", label: "Grid" }, { value: "none", label: "None" }]} onChange={(v) => updateStyle("display", v)} />
      {s.display === "flex" && (
        <>
          <SelectField label="Flex Direction" value={s.flexDirection || ""} options={[{ value: "", label: "Default" }, { value: "row", label: "Row" }, { value: "column", label: "Column" }]} onChange={(v) => updateStyle("flexDirection", v)} />
          <Field label="Gap"><Input className="text-xs h-8" value={s.gap || ""} onChange={(e) => updateStyle("gap", e.target.value)} placeholder="e.g. 1rem" /></Field>
        </>
      )}
      <Field label="Border Radius"><Input className="text-xs h-8" value={s.borderRadius || ""} onChange={(e) => updateStyle("borderRadius", e.target.value)} placeholder="e.g. 8px" /></Field>
      <ColorField label="Background Color" value={s.backgroundColor || ""} onChange={(v) => updateStyle("backgroundColor", v)} />
      <SelectField
        label="Background Gradient"
        value={s.backgroundImage || ""}
        options={[
          { value: "", label: "None" },
          { value: "linear-gradient(to right, #ff7e5f, #feb47b)", label: "Sunset" },
          { value: "linear-gradient(to right, #00c6ff, #0072ff)", label: "Ocean" },
          { value: "linear-gradient(to right, #8e2de2, #4a00e0)", label: "Purple Dream" },
          { value: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)", label: "Warm Flame" },
          { value: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)", label: "Fresh Grass" },
          { value: "radial-gradient(circle, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)", label: "Pink Glow (Radial)" },
          { value: "conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)", label: "Aurora (Conic)" }
        ]}
        onChange={(v) => updateStyle("backgroundImage", v)}
      />
      <ColorField label="Text Color" value={s.color || ""} onChange={(v) => updateStyle("color", v)} />
      <Field label="Font Size"><Input className="text-xs h-8" value={s.fontSize || ""} onChange={(e) => updateStyle("fontSize", e.target.value)} placeholder="e.g. 1.25rem" /></Field>
      <SelectField label="Text Align" value={s.textAlign || ""} options={[{ value: "", label: "Default" }, { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} onChange={(v) => updateStyle("textAlign", v)} />
    </div>
  );
}

// ─── Per-type inspectors ─────────────────────────────────────────────────────

function GenericInspector({ props, update }: { props: GenericProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  return (
    <>
      <Field label="Title"><Input className="text-xs h-8" value={props.title || ""} onChange={(e) => update({ title: e.target.value })} /></Field>
      <Field label="Subtitle"><Input className="text-xs h-8" value={props.subtitle || ""} onChange={(e) => update({ subtitle: e.target.value })} /></Field>
      <Field label="Content"><Textarea className="text-xs" value={props.content || ""} onChange={(e) => update({ content: e.target.value })} /></Field>
      <Field label="Label"><Input className="text-xs h-8" value={props.label || ""} onChange={(e) => update({ label: e.target.value })} /></Field>
      <Field label="URL (href)"><Input className="text-xs h-8" value={props.href || ""} onChange={(e) => update({ href: e.target.value })} /></Field>
      <Field label="Image/Video">
        <CmsImageUpload
          label=""
          value={props.src || ""}
          onChange={(url) => update({ src: url })}
        />
      </Field>
      <Field label="Alt Text"><Input className="text-xs h-8" value={props.alt || ""} onChange={(e) => update({ alt: e.target.value })} /></Field>
      <Field label="Placeholder"><Input className="text-xs h-8" value={props.placeholder || ""} onChange={(e) => update({ placeholder: e.target.value })} /></Field>
    </>
  );
}

function HeroInspector({ props, update }: { props: HeroProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  return (
    <>
      <Field label="Badge text"><Input className="text-xs h-8" value={props.badge || ""} onChange={(e) => update({ badge: e.target.value })} placeholder="Optional badge..." /></Field>
      <Field label="Title"><Textarea className="text-xs min-h-[60px]" value={props.title} onChange={(e) => update({ title: e.target.value })} /></Field>
      <Field label="Subtitle"><Textarea className="text-xs min-h-[60px]" value={props.subtitle} onChange={(e) => update({ subtitle: e.target.value })} /></Field>
      <Field label="Primary CTA Label"><Input className="text-xs h-8" value={props.ctaLabel} onChange={(e) => update({ ctaLabel: e.target.value })} /></Field>
      <Field label="Primary CTA URL"><Input className="text-xs h-8" value={props.ctaHref} onChange={(e) => update({ ctaHref: e.target.value })} /></Field>
      <Field label="Secondary CTA Label"><Input className="text-xs h-8" value={props.secondaryCtaLabel} onChange={(e) => update({ secondaryCtaLabel: e.target.value })} /></Field>
      <Field label="Secondary CTA URL"><Input className="text-xs h-8" value={props.secondaryCtaHref} onChange={(e) => update({ secondaryCtaHref: e.target.value })} /></Field>
      <SelectField label="Alignment" value={props.align} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} onChange={(v) => update({ align: v })} />
      <ColorField label="Background Color" value={props.bgColor} onChange={(v) => update({ bgColor: v })} />
      <ColorField label="Text Color" value={props.textColor} onChange={(v) => update({ textColor: v })} />
      <Field label="Background Image">
        <CmsImageUpload
          label=""
          value={props.bgImage || ""}
          onChange={(url) => update({ bgImage: url })}
        />
      </Field>
    </>
  );
}

function TextInspector({ props, update }: { props: TextProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  return (
    <>
      <Field label="Content">
        <RichTextEditor value={props.content || ""} onChange={(v) => update({ content: v })} />
      </Field>
      <SelectField label="Alignment" value={props.align} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} onChange={(v) => update({ align: v })} />
      <SelectField label="Max Width" value={props.maxWidth} options={[{ value: "sm", label: "Small (480px)" }, { value: "md", label: "Medium (672px)" }, { value: "lg", label: "Large (896px)" }, { value: "full", label: "Full Width" }]} onChange={(v) => update({ maxWidth: v })} />
      <ColorField label="Background Color" value={props.bgColor} onChange={(v) => update({ bgColor: v })} />
      <ColorField label="Text Color" value={props.textColor} onChange={(v) => update({ textColor: v })} />
    </>
  );
}

function ImageInspector({ props, update }: { props: ImageProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  return (
    <>
      <Field label="Image">
        <CmsImageUpload
          label=""
          value={props.src || ""}
          onChange={(url) => update({ src: url })}
        />
      </Field>
      <Field label="Alt Text"><Input className="text-xs h-8" value={props.alt || ""} onChange={(e) => update({ alt: e.target.value })} /></Field>
      <Field label="Caption"><Input className="text-xs h-8" value={props.caption || ""} onChange={(e) => update({ caption: e.target.value })} /></Field>
      <SelectField label="Layout" value={props.layout} options={[{ value: "contained", label: "Contained" }, { value: "full", label: "Full Width" }, { value: "split-left", label: "Split ~ Image Left" }, { value: "split-right", label: "Split ~ Image Right" }]} onChange={(v) => update({ layout: v })} />
      {(props.layout === "split-left" || props.layout === "split-right") && (
        <Field label="Split Text"><Textarea className="text-xs" value={props.splitText || ""} onChange={(e) => update({ splitText: e.target.value })} /></Field>
      )}
    </>
  );
}

function CtaInspector({ props, update }: { props: CtaProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  return (
    <>
      <Field label="Headline"><Input className="text-xs h-8" value={props.headline} onChange={(e) => update({ headline: e.target.value })} /></Field>
      <Field label="Subtext"><Textarea className="text-xs" value={props.subtext} onChange={(e) => update({ subtext: e.target.value })} /></Field>
      <Field label="Button Label"><Input className="text-xs h-8" value={props.buttonLabel} onChange={(e) => update({ buttonLabel: e.target.value })} /></Field>
      <Field label="Button URL"><Input className="text-xs h-8" value={props.buttonHref} onChange={(e) => update({ buttonHref: e.target.value })} /></Field>
      <SelectField label="Button Style" value={props.buttonStyle} options={[{ value: "filled", label: "Filled" }, { value: "outline", label: "Outline" }, { value: "ghost", label: "Ghost / Link" }]} onChange={(v) => update({ buttonStyle: v })} />
      <SelectField label="Alignment" value={props.align} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} onChange={(v) => update({ align: v })} />
      <ColorField label="Background Color" value={props.bgColor} onChange={(v) => update({ bgColor: v })} />
      <ColorField label="Text Color" value={props.textColor} onChange={(v) => update({ textColor: v })} />
      <Field label="Background Image">
        <CmsImageUpload
          label=""
          value={props.bgImage || ""}
          onChange={(url) => update({ bgImage: url })}
        />
      </Field>
    </>
  );
}

function FeaturesInspector({ props, update }: { props: FeaturesProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...props.items];
    items[idx] = { ...items[idx], [field]: value };
    update({ items });
  };
  const addItem = () => update({ items: [...props.items, { icon: "Star", title: "New feature", description: "Description here." }] });
  const removeItem = (idx: number) => update({ items: props.items.filter((_, i) => i !== idx) });

  return (
    <>
      <Field label="Title"><Input className="text-xs h-8" value={props.title} onChange={(e) => update({ title: e.target.value })} /></Field>
      <Field label="Subtitle"><Textarea className="text-xs" value={props.subtitle} onChange={(e) => update({ subtitle: e.target.value })} /></Field>
      <SelectField label="Columns" value={String(props.columns)} options={[{ value: "2", label: "2 Columns" }, { value: "3", label: "3 Columns" }, { value: "4", label: "4 Columns" }]} onChange={(v) => update({ columns: Number(v) })} />
      <ColorField label="Background Color" value={props.bgColor} onChange={(v) => update({ bgColor: v })} />

      <div className="space-y-3">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Feature Items</Label>
        {props.items.map((item, i) => (
          <div key={i} className="border border-zinc-150 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600">Item {i + 1}</span>
              <button onClick={() => removeItem(i)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <Input className="text-xs h-7" placeholder="Icon name (e.g. Zap)" value={item.icon} onChange={(e) => updateItem(i, "icon", e.target.value)} />
            <Input className="text-xs h-7" placeholder="Title" value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)} />
            <Textarea className="text-xs min-h-[50px]" placeholder="Description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full text-xs"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Item</Button>
      </div>
    </>
  );
}

function FaqInspector({ props, update }: { props: FaqProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...props.items];
    items[idx] = { ...items[idx], [field]: value };
    update({ items });
  };
  const addItem = () => update({ items: [...props.items, { question: "New question?", answer: "Answer here." }] });
  const removeItem = (idx: number) => update({ items: props.items.filter((_, i) => i !== idx) });

  return (
    <>
      <Field label="Title"><Input className="text-xs h-8" value={props.title} onChange={(e) => update({ title: e.target.value })} /></Field>
      <Field label="Subtitle"><Textarea className="text-xs" value={props.subtitle} onChange={(e) => update({ subtitle: e.target.value })} /></Field>
      <ColorField label="Background Color" value={props.bgColor} onChange={(v) => update({ bgColor: v })} />
      <div className="space-y-3">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Questions</Label>
        {props.items.map((item, i) => (
          <div key={i} className="border border-zinc-150 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600">Q{i + 1}</span>
              <button onClick={() => removeItem(i)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <Input className="text-xs h-7" placeholder="Question" value={item.question} onChange={(e) => updateItem(i, "question", e.target.value)} />
            <Textarea className="text-xs min-h-[60px]" placeholder="Answer" value={item.answer} onChange={(e) => updateItem(i, "answer", e.target.value)} />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full text-xs"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Question</Button>
      </div>
    </>
  );
}

function SpacerInspector({ props, update }: { props: SpacerProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  return (
    <SelectField label="Spacer Height" value={props.size} options={[{ value: "xs", label: "Extra Small (32px)" }, { value: "sm", label: "Small (64px)" }, { value: "md", label: "Medium (96px)" }, { value: "lg", label: "Large (128px)" }, { value: "xl", label: "Extra Large (192px)" }]} onChange={(v) => update({ size: v })} />
  );
}

function ColumnsInspector({ props, update }: { props: ColumnsProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  const updateCol = (idx: number, content: string) => {
    const columns = [...props.columns];
    columns[idx] = { ...columns[idx], content };
    update({ columns });
  };
  return (
    <>
      <SelectField label="Columns" value={String(props.count)} options={[{ value: "2", label: "2 Columns" }, { value: "3", label: "3 Columns" }]} onChange={(v) => update({ count: Number(v) })} />
      <SelectField label="Gap" value={props.gap} options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} onChange={(v) => update({ gap: v })} />
      <ColorField label="Background Color" value={props.bgColor} onChange={(v) => update({ bgColor: v })} />
      {props.columns.map((col, i) => (
        <Field key={i} label={`Column ${i + 1}`}>
          <RichTextEditor value={col.content || ""} onChange={(v) => updateCol(i, v)} />
        </Field>
      ))}
    </>
  );
}

function BlogsInspector({ props, update }: { props: BlogsProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/cms/categories")
      .then(res => res.json())
      .then(data => setCategories(data.categories || []))
      .catch(console.error);
  }, []);

  const toggleCategory = (id: string) => {
    const current = props.categories || [];
    if (current.includes(id)) {
      update({ categories: current.filter(c => c !== id) });
    } else {
      update({ categories: [...current, id] });
    }
  };

  return (
    <>
      <Field label="Title"><Input className="text-xs h-8" value={props.title || ""} onChange={(e) => update({ title: e.target.value })} /></Field>
      <Field label="Subtitle"><Textarea className="text-xs" value={props.subtitle || ""} onChange={(e) => update({ subtitle: e.target.value })} /></Field>
      <Field label="Limit (Number of posts)"><Input type="number" className="text-xs h-8" value={props.limit || 3} onChange={(e) => update({ limit: parseInt(e.target.value) || 3 })} /></Field>
      <Field label="Filter by Categories">
        <div className="space-y-2 mt-2 max-h-40 overflow-y-auto border border-zinc-200 rounded-md p-2">
          {categories.map(c => (
            <div key={c._id || c.id} className="flex items-center space-x-2">
              <Checkbox id={`cat-${c._id || c.id}`} checked={(props.categories || []).includes(c._id || c.id)} onCheckedChange={() => toggleCategory(c._id || c.id)} />
              <label htmlFor={`cat-${c._id || c.id}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {c.name}
              </label>
            </div>
          ))}
          {categories.length === 0 && <p className="text-xs text-zinc-500">No categories found.</p>}
        </div>
      </Field>
      <ColorField label="Background Color" value={props.bgColor} onChange={(v) => update({ bgColor: v })} />
    </>
  );
}

function TeamCardInspector({ props, update }: { props: TeamCardProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/employees")
      .then(res => res.json())
      .then(data => setMembers(data.employees || data || []))
      .catch(console.error);
  }, []);

  const toggleMember = (id: string) => {
    const current = props.members || [];
    if (current.includes(id)) {
      update({ members: current.filter(m => m !== id) });
    } else {
      update({ members: [...current, id] });
    }
  };

  return (
    <>
      <Field label="Title"><Input className="text-xs h-8" value={props.title || ""} onChange={(e) => update({ title: e.target.value })} /></Field>
      <Field label="Subtitle"><Textarea className="text-xs" value={props.subtitle || ""} onChange={(e) => update({ subtitle: e.target.value })} /></Field>
      <Field label="Select Team Members">
        <div className="space-y-2 mt-2 max-h-60 overflow-y-auto border border-zinc-200 rounded-md p-2">
          {Array.isArray(members) && members.map(m => (
            <div key={m.id || m._id} className="flex items-center space-x-2">
              <Checkbox id={`member-${m.id || m._id}`} checked={(props.members || []).includes(m.id || m._id)} onCheckedChange={() => toggleMember(m.id || m._id)} />
              <label htmlFor={`member-${m.id || m._id}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {m.name} {m.lastName ? m.lastName : ""}
              </label>
            </div>
          ))}
          {(!Array.isArray(members) || members.length === 0) && <p className="text-xs text-zinc-500">No members found.</p>}
        </div>
      </Field>
      <ColorField label="Background Color" value={props.bgColor} onChange={(v) => update({ bgColor: v })} />
    </>
  );
}

// ─── Kalp Brand Section Inspectors ──────────────────────────────────────────

function KalpSectionNote({ name, description }: { name: string; description: string }) {
  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50 p-3 flex gap-2">
      <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-bold text-violet-700">{name}</p>
        <p className="text-[11px] text-violet-600 mt-0.5 leading-snug">{description}</p>
      </div>
    </div>
  );
}

function KalpHeroInspector({ props, update }: { props: GenericProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  const logos: string[] = props.clientLogos || [];

  const updateLogo = (idx: number, url: string) => {
    const next = [...logos];
    next[idx] = url;
    update({ clientLogos: next });
  };

  const addLogo = () => update({ clientLogos: [...logos, ""] });
  const removeLogo = (idx: number) => update({ clientLogos: logos.filter((_, i) => i !== idx) });

  return (
    <>
      <KalpSectionNote
        name="Kalp Hero"
        description="Uses the homepage hero with typing animation. Heading, paragraph, button text, and logos are fully editable."
      />
      <Field label="Static Heading (Title Static)">
        <Input className="text-xs h-8" value={props.titleStatic || ""} onChange={(e) => update({ titleStatic: e.target.value })} placeholder="e.g. Built in India." />
      </Field>
      <Field label="Typing Heading (Title Typing)">
        <Input className="text-xs h-8" value={props.titleTyping || ""} onChange={(e) => update({ titleTyping: e.target.value })} placeholder="e.g. Designed for the Future." />
      </Field>
      <Field label="Paragraph (Description)">
        <Textarea className="text-xs min-h-[60px]" value={props.description || ""} onChange={(e) => update({ description: e.target.value })} placeholder="Main description paragraph text..." />
      </Field>
      <Field label="Button Text (Primary CTA Label)">
        <Input className="text-xs h-8" value={props.primaryCtaLabel || ""} onChange={(e) => update({ primaryCtaLabel: e.target.value })} placeholder="e.g. Explore Products" />
      </Field>
      <Field label="Button Target Anchor ID">
        <Input className="text-xs h-8" value={props.primaryCtaTargetId || ""} onChange={(e) => update({ primaryCtaTargetId: e.target.value })} placeholder="e.g. product (scroll target)" />
      </Field>
      <Field label="Secondary Button Text">
        <Input className="text-xs h-8" value={props.secondaryCtaLabel || ""} onChange={(e) => update({ secondaryCtaLabel: e.target.value })} placeholder="e.g. Book a Call" />
      </Field>
      <Field label="Secondary Button Link">
        <Input className="text-xs h-8" value={props.secondaryCtaHref || ""} onChange={(e) => update({ secondaryCtaHref: e.target.value })} placeholder="e.g. https://cal.com/..." />
      </Field>
      <Field label="Logos Heading (Trusted Text)">
        <Input className="text-xs h-8" value={props.trustedText || ""} onChange={(e) => update({ trustedText: e.target.value })} placeholder="e.g. Trusted by 100+ clients" />
      </Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-sans">Client Logos</Label>
          <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-md px-2" onClick={addLogo}>
            Add Logo
          </Button>
        </div>
        <div className="space-y-2">
          {logos.map((logo, idx) => (
            <div key={idx} className="flex gap-2 items-center bg-zinc-50 border p-2 rounded-lg">
              <div className="flex-1">
                <CmsImageUpload
                  label=""
                  value={logo}
                  onChange={(url) => updateLogo(idx, url)}
                />
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 shrink-0" onClick={() => removeLogo(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {logos.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2 bg-muted/20 rounded-md border border-dashed">No custom logos. Defaults will show.</p>
          )}
        </div>
      </div>

      <Field label="Announcement Badge Text">
        <Input className="text-xs h-8" value={props.announcementText || ""} onChange={(e) => update({ announcementText: e.target.value })} placeholder="e.g. Gram App is Live" />
      </Field>
      <Field label="Announcement Badge URL">
        <Input className="text-xs h-8" value={props.announcementHref || ""} onChange={(e) => update({ announcementHref: e.target.value })} placeholder="e.g. /gram" />
      </Field>
    </>
  );
}

function KalpProductsInspector({ props, update }: { props: GenericProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  const items: any[] = props.items || [];

  const updateItem = (idx: number, field: string, value: any) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    update({ items: next });
  };
  const addItem = () => update({ items: [...items, { name: "New Product", description: "Product description...", image: "/gram_logo.svg", learnMore: "#", beta: false, learnMoreText: "Learn more", category: "Product" }] });
  const removeItem = (idx: number) => update({ items: items.filter((_, i) => i !== idx) });

  return (
    <>
      <KalpSectionNote
        name="Kalp Products"
        description="Renders the custom product showcase cards. You can edit each product's details below."
      />
      <Field label="Section Title">
        <Input className="text-xs h-8" value={props.title ?? ""} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. Our Products" />
      </Field>
      <Field label="Section Subtitle">
        <Textarea className="text-xs min-h-[50px]" value={props.subtitle ?? ""} onChange={(e) => update({ subtitle: e.target.value })} placeholder="e.g. Tools that help teams move faster." />
      </Field>

      <div className="space-y-3">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-sans">Product Items</Label>
        {items.map((item, i) => (
          <div key={i} className="border border-zinc-150 rounded-lg p-3 space-y-2 bg-zinc-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600">Product {i + 1}</span>
              <button onClick={() => removeItem(i)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <Field label="Product Name">
              <Input className="text-xs h-7" value={item.name || ""} onChange={(e) => updateItem(i, "name", e.target.value)} />
            </Field>
            <Field label="Description">
              <Textarea className="text-xs min-h-[50px]" value={item.description || ""} onChange={(e) => updateItem(i, "description", e.target.value)} />
            </Field>
            <Field label="Image Path">
              <Input className="text-xs h-7" value={item.image || ""} onChange={(e) => updateItem(i, "image", e.target.value)} />
            </Field>
            <Field label="Learn More Link">
              <Input className="text-xs h-7" value={item.learnMore || ""} onChange={(e) => updateItem(i, "learnMore", e.target.value)} />
            </Field>
            <Field label="Learn More Label">
              <Input className="text-xs h-7" value={item.learnMoreText || ""} onChange={(e) => updateItem(i, "learnMoreText", e.target.value)} placeholder="e.g. Learn more" />
            </Field>
            <Field label="Product Subtext/Label">
              <Input className="text-xs h-7" value={item.category || ""} onChange={(e) => updateItem(i, "category", e.target.value)} placeholder="e.g. Product" />
            </Field>
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox id={`beta-${i}`} checked={!!item.beta} onCheckedChange={(val) => updateItem(i, "beta", !!val)} />
              <label htmlFor={`beta-${i}`} className="text-xs font-medium leading-none cursor-pointer">
                Beta Testing Mode
              </label>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full text-xs"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Product</Button>
      </div>
    </>
  );
}

function KalpServicesInspector({ props, update }: { props: GenericProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  return (
    <>
      <KalpSectionNote
        name="Kalp Services"
        description="Renders the Rapydlaunch service section from the homepage."
      />
      <Field label="Override Section Title">
        <Input className="text-xs h-8" value={(props as any).title || ""} onChange={(e) => update({ title: e.target.value })} placeholder="Leave blank to use default" />
      </Field>
      <Field label="Override Section Subtitle">
        <Textarea className="text-xs min-h-[50px]" value={(props as any).subtitle || ""} onChange={(e) => update({ subtitle: e.target.value })} placeholder="Leave blank to use default" />
      </Field>
    </>
  );
}

function KalpTestimonialsInspector({ props, update }: { props: GenericProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  return (
    <>
      <KalpSectionNote
        name="Kalp Testimonials"
        description="Renders the scrolling testimonials marquee from the homepage."
      />
      <Field label="Override Section Title">
        <Input className="text-xs h-8" value={(props as any).title || ""} onChange={(e) => update({ title: e.target.value })} placeholder="Leave blank to use default" />
      </Field>
      <Field label="Override Section Subtitle">
        <Textarea className="text-xs min-h-[50px]" value={(props as any).subtitle || ""} onChange={(e) => update({ subtitle: e.target.value })} placeholder="Leave blank to use default" />
      </Field>
    </>
  );
}

function KalpFaqInspector({ props, update }: { props: GenericProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  const items: { question: string; answer: string }[] = (props as any).items || [];

  const updateItem = (idx: number, field: string, value: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    update({ items: next });
  };
  const addItem = () => update({ items: [...items, { question: "New question?", answer: "Answer here." }] });
  const removeItem = (idx: number) => update({ items: items.filter((_, i) => i !== idx) });

  return (
    <>
      <KalpSectionNote
        name="Kalp FAQ"
        description="Animated FAQ accordion. Add/remove custom Q&A items or leave empty to use the homepage defaults."
      />
      <Field label="Override Section Title">
        <Input className="text-xs h-8" value={(props as any).title || ""} onChange={(e) => update({ title: e.target.value })} placeholder="Leave blank to use default" />
      </Field>
      <Field label="Override Subtitle">
        <Textarea className="text-xs min-h-[50px]" value={(props as any).subtitle || ""} onChange={(e) => update({ subtitle: e.target.value })} placeholder="Leave blank to use default" />
      </Field>
      <div className="space-y-3">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Custom FAQ Items</Label>
        {items.map((item, i) => (
          <div key={i} className="border border-zinc-150 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600">Q{i + 1}</span>
              <button onClick={() => removeItem(i)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <Input className="text-xs h-7" placeholder="Question" value={item.question} onChange={(e) => updateItem(i, "question", e.target.value)} />
            <Textarea className="text-xs min-h-[60px]" placeholder="Answer" value={item.answer} onChange={(e) => updateItem(i, "answer", e.target.value)} />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full text-xs"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Question</Button>
      </div>
    </>
  );
}

function KalpAboutInspector({ props, update }: { props: GenericProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  const [activeTab, setActiveTab] = useState<string>("hero");

  const heroTitle = props.title !== undefined ? props.title : "";
  const heroSubtitle = props.subtitle !== undefined ? props.subtitle : "";
  const ratingText = props.ratingText !== undefined ? props.ratingText : "";

  const mission = props.mission || { title: "", description: "" };
  const stats: any[] = props.stats || [];
  const founders: any[] = props.founders || [];
  const teamMembers: any[] = props.teamMembers || [];
  const timeline: any[] = props.timeline || [];
  const culture = props.culture || { title: "", subtitle: "", cards: [] };
  const cultureCards: any[] = culture.cards || [];
  const hiring: any[] = props.hiring || [];
  const clientLogos: string[] = props.clientLogos || [];

  const updateMission = (field: string, val: any) => {
    update({ mission: { ...mission, [field]: val } });
  };

  const updateStat = (idx: number, field: string, val: any) => {
    const next = [...stats];
    next[idx] = { ...next[idx], [field]: val };
    update({ stats: next });
  };
  const addStat = () => update({ stats: [...stats, { value: "0+", label: "New Stat" }] });
  const removeStat = (idx: number) => update({ stats: stats.filter((_, i) => i !== idx) });

  const updateFounder = (idx: number, field: string, val: any) => {
    const next = [...founders];
    next[idx] = { ...next[idx], [field]: val };
    update({ founders: next });
  };
  const addFounder = () => update({ founders: [...founders, { name: "New Founder", role: "Co-Founder", image: "", linkedin: "", email: "", calendly: "" }] });
  const removeFounder = (idx: number) => update({ founders: founders.filter((_, i) => i !== idx) });

  const updateTeamMember = (idx: number, field: string, val: any) => {
    const next = [...teamMembers];
    next[idx] = { ...next[idx], [field]: val };
    update({ teamMembers: next });
  };
  const addTeamMember = () => update({ teamMembers: [...teamMembers, { name: "New Team Member", role: "Developer", image: "", linkedin: "" }] });
  const removeTeamMember = (idx: number) => update({ teamMembers: teamMembers.filter((_, i) => i !== idx) });

  const updateTimelineItem = (idx: number, field: string, val: any) => {
    const next = [...timeline];
    next[idx] = { ...next[idx], [field]: val };
    update({ timeline: next });
  };
  const addTimelineItem = () => update({ timeline: [...timeline, { year: "2026", title: "Milestone", description: "Milestone details..." }] });
  const removeTimelineItem = (idx: number) => update({ timeline: timeline.filter((_, i) => i !== idx) });

  const updateCulture = (field: string, val: any) => {
    update({ culture: { ...culture, [field]: val } });
  };

  const updateCultureCard = (idx: number, field: string, val: any) => {
    const nextCards = [...cultureCards];
    nextCards[idx] = { ...nextCards[idx], [field]: val };
    update({ culture: { ...culture, cards: nextCards } });
  };
  const addCultureCard = () => {
    const nextCards = [...cultureCards, { icon: "Star", title: "New Value", description: "Description..." }];
    update({ culture: { ...culture, cards: nextCards } });
  };
  const removeCultureCard = (idx: number) => {
    const nextCards = cultureCards.filter((_, i) => i !== idx);
    update({ culture: { ...culture, cards: nextCards } });
  };

  const updateHiringRole = (idx: number, field: string, val: any) => {
    const next = [...hiring];
    next[idx] = { ...next[idx], [field]: val };
    update({ hiring: next });
  };
  const addHiringRole = () => update({ hiring: [...hiring, { title: "Open Position", location: "Remote", type: "Full-time", link: "#" }] });
  const removeHiringRole = (idx: number) => update({ hiring: hiring.filter((_, i) => i !== idx) });

  const updateClientLogo = (idx: number, url: string) => {
    const next = [...clientLogos];
    next[idx] = url;
    update({ clientLogos: next });
  };
  const addClientLogo = () => update({ clientLogos: [...clientLogos, ""] });
  const removeClientLogo = (idx: number) => update({ clientLogos: clientLogos.filter((_, i) => i !== idx) });

  return (
    <>
      <KalpSectionNote
        name="Kalp About"
        description="Renders the About Us section with team, mission, and stats. You can edit each small detail below."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-zinc-100 p-1">
          <TabsTrigger value="hero" className="flex-auto text-[10px] py-1">Hero/Mission</TabsTrigger>
          <TabsTrigger value="stats" className="flex-auto text-[10px] py-1">Stats/Timeline</TabsTrigger>
          <TabsTrigger value="team" className="flex-auto text-[10px] py-1">Team</TabsTrigger>
          <TabsTrigger value="culture" className="flex-auto text-[10px] py-1">Culture</TabsTrigger>
          <TabsTrigger value="logos" className="flex-auto text-[10px] py-1">Logos</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="space-y-4 mt-2">
          <Field label="Hero Title">
            <Textarea className="text-xs min-h-[50px]" value={heroTitle} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. We empower startups to scale smarter" />
          </Field>
          <Field label="Hero Subtitle">
            <Textarea className="text-xs min-h-[60px]" value={heroSubtitle} onChange={(e) => update({ subtitle: e.target.value })} placeholder="e.g. We are a team of designers..." />
          </Field>
          <Field label="Hero Rating Text">
            <Input className="text-xs h-8" value={ratingText} onChange={(e) => update({ ratingText: e.target.value })} placeholder="e.g. Rated 5.0 by founders" />
          </Field>

          <div className="border-t pt-3 mt-3 space-y-3">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-sans">Mission Statement</Label>
            <Field label="Mission Title">
              <Input className="text-xs h-8" value={mission.title || ""} onChange={(e) => updateMission("title", e.target.value)} placeholder="e.g. Our Mission" />
            </Field>
            <Field label="Mission Description">
              <Textarea className="text-xs min-h-[60px]" value={mission.description || ""} onChange={(e) => updateMission("description", e.target.value)} placeholder="Empower teams and founders..." />
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4 mt-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-sans">Stats (Value + Label)</Label>
              <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-md px-2" onClick={addStat}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {stats.map((stat, idx) => (
                <div key={idx} className="border border-zinc-150 rounded-lg p-2.5 space-y-2 bg-zinc-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-500">Stat {idx + 1}</span>
                    <button onClick={() => removeStat(idx)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Value">
                      <Input className="text-xs h-7" value={stat.value || ""} onChange={(e) => updateStat(idx, "value", e.target.value)} placeholder="e.g. 250+" />
                    </Field>
                    <Field label="Label">
                      <Input className="text-xs h-7" value={stat.label || ""} onChange={(e) => updateStat(idx, "label", e.target.value)} placeholder="e.g. Projects" />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3 mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-sans">Timeline / Our Journey</Label>
              <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-md px-2" onClick={addTimelineItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {timeline.map((item, idx) => (
                <div key={idx} className="border border-zinc-150 rounded-lg p-2.5 space-y-2 bg-zinc-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-500">Event {idx + 1}</span>
                    <button onClick={() => removeTimelineItem(idx)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <Field label="Year">
                        <Input className="text-xs h-7" value={item.year || ""} onChange={(e) => updateTimelineItem(idx, "year", e.target.value)} placeholder="e.g. 2026" />
                      </Field>
                    </div>
                    <div className="col-span-2">
                      <Field label="Title">
                        <Input className="text-xs h-7" value={item.title || ""} onChange={(e) => updateTimelineItem(idx, "title", e.target.value)} placeholder="Milestone" />
                      </Field>
                    </div>
                  </div>
                  <Field label="Description">
                    <Textarea className="text-xs min-h-[40px]" value={item.description || ""} onChange={(e) => updateTimelineItem(idx, "description", e.target.value)} placeholder="Details..." />
                  </Field>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4 mt-2">
          <Field label="Team Section Title">
            <Input className="text-xs h-8" value={props.teamSectionTitle || ""} onChange={(e) => update({ teamSectionTitle: e.target.value })} placeholder="e.g. Our Founders & Team" />
          </Field>
          <Field label="Team Section Subtitle">
            <Textarea className="text-xs min-h-[50px]" value={props.teamSectionSubtitle || ""} onChange={(e) => update({ teamSectionSubtitle: e.target.value })} placeholder="e.g. Our team combines deep industry knowledge..." />
          </Field>

          <div className="border-t pt-3 mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-sans">Founders</Label>
              <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-md px-2" onClick={addFounder}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {founders.map((founder, idx) => (
                <div key={idx} className="border border-zinc-150 rounded-lg p-2.5 space-y-2 bg-zinc-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-500">Founder {idx + 1}</span>
                    <button onClick={() => removeFounder(idx)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <Field label="Name">
                    <Input className="text-xs h-7" value={founder.name || ""} onChange={(e) => updateFounder(idx, "name", e.target.value)} />
                  </Field>
                  <Field label="Role">
                    <Input className="text-xs h-7" value={founder.role || ""} onChange={(e) => updateFounder(idx, "role", e.target.value)} />
                  </Field>
                  <Field label="Image">
                    <CmsImageUpload label="" value={founder.image || ""} onChange={(url) => updateFounder(idx, "image", url)} />
                  </Field>
                  <Field label="LinkedIn URL">
                    <Input className="text-xs h-7" value={founder.linkedin || ""} onChange={(e) => updateFounder(idx, "linkedin", e.target.value)} placeholder="https://linkedin.com/in/..." />
                  </Field>
                  <Field label="Email">
                    <Input className="text-xs h-7" value={founder.email || ""} onChange={(e) => updateFounder(idx, "email", e.target.value)} placeholder="mailto:example@..." />
                  </Field>
                  <Field label="Calendly Link">
                    <Input className="text-xs h-7" value={founder.calendly || ""} onChange={(e) => updateFounder(idx, "calendly", e.target.value)} placeholder="https://cal.com/..." />
                  </Field>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3 mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-sans">Team Members</Label>
              <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-md px-2" onClick={addTeamMember}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {teamMembers.map((member, idx) => (
                <div key={idx} className="border border-zinc-150 rounded-lg p-2.5 space-y-2 bg-zinc-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-500">Member {idx + 1}</span>
                    <button onClick={() => removeTeamMember(idx)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <Field label="Name">
                    <Input className="text-xs h-7" value={member.name || ""} onChange={(e) => updateTeamMember(idx, "name", e.target.value)} />
                  </Field>
                  <Field label="Role">
                    <Input className="text-xs h-7" value={member.role || ""} onChange={(e) => updateTeamMember(idx, "role", e.target.value)} />
                  </Field>
                  <Field label="Image">
                    <CmsImageUpload label="" value={member.image || ""} onChange={(url) => updateTeamMember(idx, "image", url)} />
                  </Field>
                  <Field label="LinkedIn URL">
                    <Input className="text-xs h-7" value={member.linkedin || ""} onChange={(e) => updateTeamMember(idx, "linkedin", e.target.value)} placeholder="https://linkedin.com/in/..." />
                  </Field>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="culture" className="space-y-4 mt-2">
          <Field label="Culture Title">
            <Input className="text-xs h-8" value={culture.title || ""} onChange={(e) => updateCulture("title", e.target.value)} placeholder="Our Culture at Cycle" />
          </Field>
          <Field label="Culture Subtitle">
            <Textarea className="text-xs min-h-[50px]" value={culture.subtitle || ""} onChange={(e) => updateCulture("subtitle", e.target.value)} placeholder="A culture shaped by trust..." />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-sans">Culture Cards</Label>
              <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-md px-2" onClick={addCultureCard}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {cultureCards.map((card, idx) => (
                <div key={idx} className="border border-zinc-150 rounded-lg p-2.5 space-y-2 bg-zinc-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-500">Card {idx + 1}</span>
                    <button onClick={() => removeCultureCard(idx)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <SelectField
                    label="Icon"
                    value={card.icon || "Star"}
                    options={[
                      { value: "ShieldCheck", label: "ShieldCheck" },
                      { value: "TrendingUp", label: "TrendingUp" },
                      { value: "Award", label: "Award" },
                      { value: "Link", label: "Link" },
                      { value: "RefreshCw", label: "RefreshCw" },
                      { value: "Layers", label: "Layers" },
                      { value: "Star", label: "Star" }
                    ]}
                    onChange={(val) => updateCultureCard(idx, "icon", val)}
                  />
                  <Field label="Title">
                    <Input className="text-xs h-7" value={card.title || ""} onChange={(e) => updateCultureCard(idx, "title", e.target.value)} />
                  </Field>
                  <Field label="Description">
                    <Textarea className="text-xs min-h-[40px]" value={card.description || ""} onChange={(e) => updateCultureCard(idx, "description", e.target.value)} />
                  </Field>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3 mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-sans">Hiring Roles / Positions</Label>
              <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-md px-2" onClick={addHiringRole}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {hiring.map((role, idx) => (
                <div key={idx} className="border border-zinc-150 rounded-lg p-2.5 space-y-2 bg-zinc-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-500">Position {idx + 1}</span>
                    <button onClick={() => removeHiringRole(idx)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <Field label="Job Title">
                    <Input className="text-xs h-7" value={role.title || ""} onChange={(e) => updateHiringRole(idx, "title", e.target.value)} />
                  </Field>
                  <Field label="Location">
                    <Input className="text-xs h-7" value={role.location || ""} onChange={(e) => updateHiringRole(idx, "location", e.target.value)} />
                  </Field>
                  <Field label="Type">
                    <Input className="text-xs h-7" value={role.type || ""} onChange={(e) => updateHiringRole(idx, "type", e.target.value)} placeholder="e.g. Full-time" />
                  </Field>
                  <Field label="Link / URL">
                    <Input className="text-xs h-7" value={role.link || ""} onChange={(e) => updateHiringRole(idx, "link", e.target.value)} />
                  </Field>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logos" className="space-y-4 mt-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-sans">Client Logos</Label>
              <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-md px-2" onClick={addClientLogo}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {clientLogos.map((url, idx) => (
                <div key={idx} className="border border-zinc-150 rounded-lg p-2.5 space-y-2 bg-zinc-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-500">Logo {idx + 1}</span>
                    <button onClick={() => removeClientLogo(idx)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <Field label="Image URL">
                    <CmsImageUpload label="" value={url} onChange={(newUrl) => updateClientLogo(idx, newUrl)} />
                  </Field>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function KalpRapydlaunchInspector({ props, update }: { props: GenericProps; update: (p: Partial<Record<string, unknown>>) => void }) {
  return (
    <KalpSectionNote
      name="Kalp RapydLaunch"
      description="Renders the full Rapydlaunch digital agency service page. Includes the custom header, footer, and lead forms."
    />
  );
}

