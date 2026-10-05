"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Users,
  Star,
  Globe,
  Calendar,
  Briefcase,
  Image as ImageIcon,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────
type TeamMember = {
  name: string;
  role: string;
  image: string;
  linkedin?: string;
  email?: string;
  calendly?: string;
};

type Stat = { value: string; label: string };
type TimelineItem = { year: string; title: string; description: string };
type CultureCard = { icon: string; title: string; description: string };
type HiringRole = { title: string; location: string; type: string; link: string };

type AboutUsData = {
  hero: { title: string; subtitle: string; ratingText: string };
  mission: { title: string; description: string };
  stats: Stat[];
  teamSectionTitle: string;
  teamSectionSubtitle: string;
  founders: TeamMember[];
  teamMembers: TeamMember[];
  timeline: TimelineItem[];
  culture: { title: string; subtitle: string; cards: CultureCard[] };
  hiring: HiringRole[];
  clientLogos: string[];
};

const DEFAULT: AboutUsData = {
  hero: { title: "", subtitle: "", ratingText: "" },
  mission: { title: "", description: "" },
  stats: [],
  teamSectionTitle: "",
  teamSectionSubtitle: "",
  founders: [],
  teamMembers: [],
  timeline: [],
  culture: { title: "", subtitle: "", cards: [] },
  hiring: [],
  clientLogos: [],
};

const ICON_OPTIONS = ["ShieldCheck","TrendingUp","Award","Link","RefreshCw","Layers","Star","Users","Globe","Heart","Zap","Target"];

// ─── Small helpers ─────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Inp({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white ${className}`}
      {...props}
    />
  );
}

function Txa({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white resize-none ${className}`}
      rows={3}
      {...props}
    />
  );
}

function SectionCard({ title, icon: Icon, children, defaultOpen = true }: {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-zinc-800">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-zinc-100">{children}</div>}
    </div>
  );
}

function ImageUpload({ value, onChange, label = "Photo" }: { value: string; onChange: (url: string) => void; label?: string }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/cms/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      onChange(data.url);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt={label}
            className="h-14 w-14 rounded-xl object-cover border border-zinc-200 shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <button type="button" onClick={() => onChange("")} className="text-xs text-red-500 hover:underline">Remove</button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <label className={`flex items-center gap-1.5 cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
          {uploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading…</> : <><ImageIcon className="h-3.5 w-3.5" />Upload {label}</>}
          <input type="file" accept="image/*" className="sr-only" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        </label>
        <span className="text-[10px] text-zinc-400">or paste URL</span>
      </div>
      <Inp value={value} onChange={(e) => onChange(e.currentTarget.value)} placeholder="https://... or /team/photo.png" className="text-xs" />
    </div>
  );
}

function MemberCard({ member, idx, label, showCalendly, showEmail, onChange, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: {
  member: TeamMember; idx: number; label: string; showCalendly?: boolean; showEmail?: boolean;
  onChange: (field: string, val: string) => void; onRemove: () => void;
  onMoveUp?: () => void; onMoveDown?: () => void; canMoveUp?: boolean; canMoveDown?: boolean;
}) {
  return (
    <div className="border border-zinc-100 rounded-xl p-4 space-y-3 bg-zinc-50/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500">{label} {idx + 1}</span>
        <div className="flex items-center gap-1.5">
          {onMoveUp && <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className="text-zinc-400 hover:text-primary transition-colors disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>}
          {onMoveDown && <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className="text-zinc-400 hover:text-primary transition-colors disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>}
          <div className="w-px h-3.5 bg-zinc-200 mx-1"></div>
          <button type="button" onClick={onRemove} className="text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><Inp value={member.name} onChange={(e) => onChange("name", e.currentTarget.value)} /></Field>
        <Field label="Role"><Inp value={member.role} onChange={(e) => onChange("role", e.currentTarget.value)} /></Field>
      </div>
      <Field label="Photo"><ImageUpload value={member.image} onChange={(url) => onChange("image", url)} /></Field>
      <Field label="LinkedIn URL"><Inp value={member.linkedin || ""} onChange={(e) => onChange("linkedin", e.currentTarget.value)} placeholder="https://linkedin.com/in/..." /></Field>
      {showEmail && <Field label="Email"><Inp value={member.email || ""} onChange={(e) => onChange("email", e.currentTarget.value)} placeholder="mailto:name@..." /></Field>}
      {showCalendly && <Field label="Calendly / Booking Link"><Inp value={member.calendly || ""} onChange={(e) => onChange("calendly", e.currentTarget.value)} placeholder="https://cal.com/..." /></Field>}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function AboutUsEditor() {
  const [data, setData] = useState<AboutUsData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/cms/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then(({ settings }) => {
        const db = settings?.aboutUs || {};
        setData({
          hero: { title: db.hero?.title || db.title || "", subtitle: db.hero?.subtitle || db.subtitle || "", ratingText: db.hero?.ratingText || db.ratingText || "" },
          mission: { title: db.mission?.title || "", description: db.mission?.description || "" },
          stats: db.stats?.length ? db.stats : [],
          teamSectionTitle: db.teamSectionTitle || "",
          teamSectionSubtitle: db.teamSectionSubtitle || "",
          founders: db.founders?.length ? db.founders : [],
          teamMembers: db.teamMembers?.length ? db.teamMembers : [],
          timeline: db.timeline?.length ? db.timeline : [],
          culture: db.culture?.cards?.length ? db.culture : { title: "", subtitle: "", cards: [] },
          hiring: db.hiring?.length ? db.hiring : [],
          clientLogos: db.clientLogos?.length ? db.clientLogos : [],
        });
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof AboutUsData>(key: K, val: AboutUsData[K]) {
    setData((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/cms/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aboutUs: data }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("About Us page saved!");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky header bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-zinc-100 px-6 py-3">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/content/pages" className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-zinc-900 leading-none">About Us Editor</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Edit the public /about-us page content</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/about-us" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> View Page
            </a>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        <div className="w-full space-y-4">
      {/* Hero & Mission */}
      <SectionCard title="Hero & Mission" icon={Star}>
        <Field label="Hero Title"><Txa value={data.hero.title} onChange={(e) => set("hero", { ...data.hero, title: e.target.value })} placeholder="We empower startups to scale smarter and faster" rows={2} /></Field>
        <Field label="Hero Subtitle"><Txa value={data.hero.subtitle} onChange={(e) => set("hero", { ...data.hero, subtitle: e.target.value })} placeholder="We are a team of designers and engineers..." /></Field>
        <Field label="Rating Text"><Inp value={data.hero.ratingText} onChange={(e) => set("hero", { ...data.hero, ratingText: e.target.value })} placeholder="Rated 5.0 by founders worldwide" /></Field>
        <div className="border-t border-zinc-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Mission Statement</p>
          <Field label="Mission Title"><Inp value={data.mission.title} onChange={(e) => set("mission", { ...data.mission, title: e.target.value })} placeholder="Our Mission" /></Field>
          <Field label="Mission Description"><Txa value={data.mission.description} onChange={(e) => set("mission", { ...data.mission, description: e.target.value })} placeholder="Empower teams and founders..." /></Field>
        </div>
      </SectionCard>

      {/* Stats */}
      <SectionCard title="Stats" icon={Star} defaultOpen={false}>
        <div className="space-y-3">
          {data.stats.map((stat, idx) => (
            <div key={idx} className="flex items-center gap-2 border border-zinc-100 rounded-xl p-3 bg-zinc-50/50">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Field label="Value"><Inp value={stat.value} onChange={(e) => { const n=[...data.stats]; n[idx]={...n[idx],value:e.target.value}; set("stats",n); }} placeholder="250+" /></Field>
                <Field label="Label"><Inp value={stat.label} onChange={(e) => { const n=[...data.stats]; n[idx]={...n[idx],label:e.target.value}; set("stats",n); }} placeholder="Projects" /></Field>
              </div>
              <button type="button" onClick={() => set("stats",data.stats.filter((_,i)=>i!==idx))} className="text-zinc-400 hover:text-red-500 self-start mt-5"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button type="button" onClick={() => set("stats",[...data.stats,{value:"0+",label:"New Stat"}])} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"><Plus className="h-3.5 w-3.5" />Add Stat</button>
        </div>
      </SectionCard>

      {/* Timeline */}
      <SectionCard title="Timeline / Our Journey" icon={Calendar} defaultOpen={false}>
        <div className="space-y-3">
          {data.timeline.map((item, idx) => (
            <div key={idx} className="border border-zinc-100 rounded-xl p-3 space-y-3 bg-zinc-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Event {idx+1}</span>
                <button type="button" onClick={() => set("timeline",data.timeline.filter((_,i)=>i!==idx))} className="text-zinc-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Year"><Inp value={item.year} onChange={(e)=>{const n=[...data.timeline];n[idx]={...n[idx],year:e.target.value};set("timeline",n);}} placeholder="2026" /></Field>
                <div className="col-span-2"><Field label="Title"><Inp value={item.title} onChange={(e)=>{const n=[...data.timeline];n[idx]={...n[idx],title:e.target.value};set("timeline",n);}} /></Field></div>
              </div>
              <Field label="Description"><Txa value={item.description} onChange={(e)=>{const n=[...data.timeline];n[idx]={...n[idx],description:e.target.value};set("timeline",n);}} /></Field>
            </div>
          ))}
          <button type="button" onClick={()=>set("timeline",[...data.timeline,{year:"2026",title:"Milestone",description:""}])} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"><Plus className="h-3.5 w-3.5" />Add Timeline Event</button>
        </div>
      </SectionCard>

      {/* Team headers */}
      <SectionCard title="Team Section Headers" icon={Users} defaultOpen={false}>
        <Field label="Section Title"><Inp value={data.teamSectionTitle} onChange={(e)=>set("teamSectionTitle",e.target.value)} placeholder="Our Founders & Team" /></Field>
        <Field label="Section Subtitle"><Txa value={data.teamSectionSubtitle} onChange={(e)=>set("teamSectionSubtitle",e.target.value)} placeholder="Our team combines..." /></Field>
      </SectionCard>

      {/* Founders */}
      <SectionCard title="Founders" icon={Users}>
        <div className="space-y-4">
          {data.founders.map((founder, idx) => (
            <MemberCard key={idx} member={founder} idx={idx} label="Founder" showCalendly showEmail
              onChange={(field,val)=>{const n=[...data.founders];n[idx]={...n[idx],[field]:val};set("founders",n);}}
              onRemove={()=>set("founders",data.founders.filter((_,i)=>i!==idx))}
              onMoveUp={()=>{if(idx>0){const n=[...data.founders];[n[idx-1],n[idx]]=[n[idx],n[idx-1]];set("founders",n);}}}
              onMoveDown={()=>{if(idx<data.founders.length-1){const n=[...data.founders];[n[idx+1],n[idx]]=[n[idx],n[idx+1]];set("founders",n);}}}
              canMoveUp={idx > 0}
              canMoveDown={idx < data.founders.length - 1}
            />
          ))}
          <button type="button" onClick={()=>set("founders",[...data.founders,{name:"New Founder",role:"Co-Founder",image:"",linkedin:"",email:"",calendly:""}])} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"><Plus className="h-3.5 w-3.5" />Add Founder</button>
        </div>
      </SectionCard>

      {/* Team Members */}
      <SectionCard title="Team Members" icon={Users}>
        <div className="space-y-4">
          {data.teamMembers.map((member, idx) => (
            <MemberCard key={idx} member={member} idx={idx} label="Member"
              onChange={(field,val)=>{const n=[...data.teamMembers];n[idx]={...n[idx],[field]:val};set("teamMembers",n);}}
              onRemove={()=>set("teamMembers",data.teamMembers.filter((_,i)=>i!==idx))}
              onMoveUp={()=>{if(idx>0){const n=[...data.teamMembers];[n[idx-1],n[idx]]=[n[idx],n[idx-1]];set("teamMembers",n);}}}
              onMoveDown={()=>{if(idx<data.teamMembers.length-1){const n=[...data.teamMembers];[n[idx+1],n[idx]]=[n[idx],n[idx+1]];set("teamMembers",n);}}}
              canMoveUp={idx > 0}
              canMoveDown={idx < data.teamMembers.length - 1}
            />
          ))}
          <button type="button" onClick={()=>set("teamMembers",[...data.teamMembers,{name:"New Member",role:"Developer",image:"",linkedin:""}])} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"><Plus className="h-3.5 w-3.5" />Add Team Member</button>
        </div>
      </SectionCard>

      {/* Culture */}
      <SectionCard title="Culture & Values" icon={Star} defaultOpen={false}>
        <Field label="Culture Section Title"><Inp value={data.culture.title} onChange={(e)=>set("culture",{...data.culture,title:e.target.value})} placeholder="Our Culture at Cycle" /></Field>
        <Field label="Culture Subtitle"><Txa value={data.culture.subtitle} onChange={(e)=>set("culture",{...data.culture,subtitle:e.target.value})} placeholder="A culture shaped by trust..." /></Field>
        <div className="border-t border-zinc-100 pt-3 space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Culture Cards</p>
          {data.culture.cards.map((card, idx) => (
            <div key={idx} className="border border-zinc-100 rounded-xl p-3 space-y-2 bg-zinc-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Card {idx+1}</span>
                <button type="button" onClick={()=>set("culture",{...data.culture,cards:data.culture.cards.filter((_,i)=>i!==idx)})} className="text-zinc-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <Field label="Icon">
                <select className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm bg-white" value={card.icon} onChange={(e)=>{const n=[...data.culture.cards];n[idx]={...n[idx],icon:e.target.value};set("culture",{...data.culture,cards:n});}}>
                  {ICON_OPTIONS.map(ic=><option key={ic} value={ic}>{ic}</option>)}
                </select>
              </Field>
              <Field label="Title"><Inp value={card.title} onChange={(e)=>{const n=[...data.culture.cards];n[idx]={...n[idx],title:e.target.value};set("culture",{...data.culture,cards:n});}} /></Field>
              <Field label="Description"><Txa value={card.description} onChange={(e)=>{const n=[...data.culture.cards];n[idx]={...n[idx],description:e.target.value};set("culture",{...data.culture,cards:n});}} rows={2} /></Field>
            </div>
          ))}
          <button type="button" onClick={()=>set("culture",{...data.culture,cards:[...data.culture.cards,{icon:"Star",title:"New Value",description:""}]})} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"><Plus className="h-3.5 w-3.5" />Add Culture Card</button>
        </div>
      </SectionCard>

      {/* Hiring */}
      <SectionCard title="Hiring / Open Positions" icon={Briefcase} defaultOpen={false}>
        <div className="space-y-3">
          {data.hiring.map((role, idx) => (
            <div key={idx} className="border border-zinc-100 rounded-xl p-3 space-y-3 bg-zinc-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Position {idx+1}</span>
                <button type="button" onClick={()=>set("hiring",data.hiring.filter((_,i)=>i!==idx))} className="text-zinc-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Job Title"><Inp value={role.title} onChange={(e)=>{const n=[...data.hiring];n[idx]={...n[idx],title:e.target.value};set("hiring",n);}} /></Field>
                <Field label="Location"><Inp value={role.location} onChange={(e)=>{const n=[...data.hiring];n[idx]={...n[idx],location:e.target.value};set("hiring",n);}} /></Field>
                <Field label="Type"><Inp value={role.type} onChange={(e)=>{const n=[...data.hiring];n[idx]={...n[idx],type:e.target.value};set("hiring",n);}} placeholder="Full-time" /></Field>
                <Field label="Link / URL"><Inp value={role.link} onChange={(e)=>{const n=[...data.hiring];n[idx]={...n[idx],link:e.target.value};set("hiring",n);}} /></Field>
              </div>
            </div>
          ))}
          <button type="button" onClick={()=>set("hiring",[...data.hiring,{title:"Open Position",location:"Remote",type:"Full-time",link:"#"}])} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"><Plus className="h-3.5 w-3.5" />Add Position</button>
        </div>
      </SectionCard>

      {/* Client Logos */}
      <SectionCard title="Client Logos" icon={Globe} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3">
          {data.clientLogos.map((url, idx) => (
            <div key={idx} className="border border-zinc-100 rounded-xl p-3 space-y-2 bg-zinc-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Logo {idx+1}</span>
                <button type="button" onClick={()=>set("clientLogos",data.clientLogos.filter((_,i)=>i!==idx))} className="text-zinc-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              {url && <img src={url} alt={`Logo ${idx+1}`} className="h-8 object-contain" onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}} />}
              <ImageUpload value={url} onChange={(newUrl)=>{const n=[...data.clientLogos];n[idx]=newUrl;set("clientLogos",n);}} label="Logo" />
            </div>
          ))}
        </div>
        <button type="button" onClick={()=>set("clientLogos",[...data.clientLogos,""])} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-2"><Plus className="h-3.5 w-3.5" />Add Logo</button>
      </SectionCard>
      </div>
      </div>
    </div>
  );
}
