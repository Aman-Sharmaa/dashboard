"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, Building2, User, Landmark, Brush, LayoutGrid, MessageCircle, Github, Cloud, Mail, Code, LogIn, Plus, Trash2, Pencil, X, Check, PanelLeft, Bell } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";

const RolesAccessInline = dynamic(() => import("@/app/dashboard/settings/roles/page"), { ssr: false });
const SidebarOrderSettings = dynamic(() => import("@/components/sidebar-order-settings").then((m) => m.SidebarOrderSettings), { ssr: false });
const AdminSidebarFeaturesSettings = dynamic(
  () => import("@/components/admin-sidebar-features-settings").then((m) => m.AdminSidebarFeaturesSettings),
  { ssr: false }
);

interface CompanyProfile {
  companyName: string;
  legalName?: string;
  logoUrl?: string;
  leaveSettings?: {
    monthlyPaidLimit?: number;
    monthlyUnpaidLimit?: number;
    leaveTypes?: string[];
    weeklyOffDays?: string[];
    carryForward?: boolean;
  };
  personalDetails?: {
    contactName?: string;
    email?: string;
    phone?: string;
  };
  companyDetails?: {
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  taxDetails?: {
    gstNumber?: string;
    panNumber?: string;
    otherTaxId?: string;
  };
  bankDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
  /** Webhook URL for service-down notifications */
  webhookUrl?: string;
  /** Emails to notify when monitors go down (comma-separated) */
  monitorAlertEmails?: string[];
  taskEmailNotifications?: {
    enabled?: boolean;
    sendTime?: string;
    timezone?: string;
  };
  /** Default Terms & Conditions for proposals */
  defaultTerms?: string;
}

export function SettingsOrgClient() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Drive Quota
  const [employees, setEmployees] = useState<{ id: string; name: string; email: string }[]>([]);
  const [quotaUserId, setQuotaUserId] = useState("");
  const [quotaGb, setQuotaGb] = useState("5");
  const [savingQuota, setSavingQuota] = useState(false);

  // User profile name
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [savingName, setSavingName] = useState(false);



  const weekdayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  const weekdayLabels: Record<(typeof weekdayKeys)[number], string> = {
    sunday: "Sunday",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
  };

  useEffect(() => {
    async function loadProfile() {
      try {
        const [companyRes, meRes, empsRes] = await Promise.all([
          fetch("/api/company"),
          fetch("/api/auth/me"),
          fetch("/api/employees"),
        ]);
        const companyData = await companyRes.json();
        const meData = await meRes.json();
        const empsData = await empsRes.ok ? await empsRes.json() : { employees: [] };

        if (companyRes.ok && companyData.profile) {
          // Ensure leaveSettings is properly initialized
          const profile = {
            ...companyData.profile,
            leaveSettings: {
              ...(companyData.profile.leaveSettings || {}),
              weeklyOffDays: companyData.profile.leaveSettings?.weeklyOffDays || [],
              leaveTypes: companyData.profile.leaveSettings?.leaveTypes || [],
            },
          };
          setProfile(profile);
          setLogoPreview(profile.logoUrl || null);
        } else {
          setProfile({ companyName: "" });
        }

        if (meData.user) {
          setUserName(meData.user.name || "");
          setUserEmail(meData.user.email || "");
        }

        if (empsData.employees) {
          setEmployees(empsData.employees);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);



  function updateProfile(path: string[], value: string | boolean | number) {
    setProfile((prev) => {
      const next: any = prev ? { ...prev } : { companyName: "" };
      let curr: any = next;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        curr[key] = curr[key] || {};
        curr = curr[key];
      }
      curr[path[path.length - 1]] = value;
      return next;
    });
  }

  function toggleWeeklyOff(dayKey: (typeof weekdayKeys)[number]) {
    setProfile((prev) => {
      if (!prev) return prev;
      const current = prev.leaveSettings?.weeklyOffDays || [];
      const exists = current.includes(dayKey);
      const nextDays = exists
        ? current.filter((d) => d !== dayKey)
        : [...current, dayKey];
      return {
        ...prev,
        leaveSettings: {
          ...(prev.leaveSettings || {}),
          weeklyOffDays: nextDays,
        },
      };
    });
  }

  // Department management
  type DeptItem = { _id: string; name: string; description?: string };
  const [departments, setDepartments] = useState<DeptItem[]>([]);
  const [deptsLoading, setDeptsLoading] = useState(true);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [addingDept, setAddingDept] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [editDeptDesc, setEditDeptDesc] = useState("");

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => (r.ok ? r.json() : { departments: [] }))
      .then((d) => setDepartments(d.departments || []))
      .catch(() => { })
      .finally(() => setDeptsLoading(false));
  }, []);

  async function addDepartment() {
    if (!newDeptName.trim()) return;
    setAddingDept(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeptName.trim(), description: newDeptDesc.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Failed to add");
      }
      const data = await res.json();
      setDepartments((prev) => [...prev, data.department].sort((a, b) => a.name.localeCompare(b.name)));
      setNewDeptName("");
      setNewDeptDesc("");
      toast.success("Department added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add department");
    } finally {
      setAddingDept(false);
    }
  }

  async function updateDepartment(id: string) {
    if (!editDeptName.trim()) return;
    try {
      const res = await fetch("/api/departments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editDeptName.trim(), description: editDeptDesc.trim() }),
      });
      if (!res.ok) throw new Error();
      setDepartments((prev) =>
        prev.map((d) => (d._id === id ? { ...d, name: editDeptName.trim(), description: editDeptDesc.trim() } : d))
      );
      setEditingDeptId(null);
      toast.success("Department updated");
    } catch {
      toast.error("Failed to update");
    }
  }

  async function deleteDepartment(id: string) {
    try {
      const res = await fetch(`/api/departments?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDepartments((prev) => prev.filter((d) => d._id !== id));
      toast.success("Department removed");
    } catch {
      toast.error("Failed to delete");
    }
  }

  const leaveTypeOptions = ["Casual", "Sick leave", "Unpaid leave"] as const;

  function toggleLeaveType(type: (typeof leaveTypeOptions)[number]) {
    setProfile((prev) => {
      if (!prev) return prev;
      const current = prev.leaveSettings?.leaveTypes || [];
      const exists = current.includes(type);
      const next = exists
        ? current.filter((t) => t !== type)
        : [...current, type];
      return {
        ...prev,
        leaveSettings: {
          ...(prev.leaveSettings || {}),
          leaveTypes: next,
        },
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("companyName", profile.companyName || "");
      formData.append("legalName", profile.legalName || "");

      formData.append("contactName", profile.personalDetails?.contactName || "");
      formData.append("personalEmail", profile.personalDetails?.email || "");
      formData.append("phone", profile.personalDetails?.phone || "");

      formData.append("website", profile.companyDetails?.website || "");
      formData.append("address", profile.companyDetails?.address || "");
      formData.append("city", profile.companyDetails?.city || "");
      formData.append("state", profile.companyDetails?.state || "");
      formData.append("country", profile.companyDetails?.country || "");
      formData.append("zip", profile.companyDetails?.zip || "");

      formData.append("gstNumber", profile.taxDetails?.gstNumber || "");
      formData.append("panNumber", profile.taxDetails?.panNumber || "");
      formData.append("otherTaxId", profile.taxDetails?.otherTaxId || "");

      formData.append(
        "bankAccountHolderName",
        profile.bankDetails?.accountHolderName || ""
      );
      formData.append(
        "bankAccountNumber",
        profile.bankDetails?.accountNumber || ""
      );
      formData.append("bankIfscCode", profile.bankDetails?.ifscCode || "");

      // Workspace policy / leave settings
      formData.append(
        "monthlyPaidLimit",
        profile.leaveSettings?.monthlyPaidLimit?.toString() || ""
      );
      formData.append(
        "monthlyUnpaidLimit",
        profile.leaveSettings?.monthlyUnpaidLimit?.toString() || ""
      );
      formData.append(
        "leaveTypes",
        (profile.leaveSettings?.leaveTypes || []).join(",")
      );
      formData.append(
        "weeklyOffDays",
        (profile.leaveSettings?.weeklyOffDays || []).join(",")
      );
      formData.append(
        "carryForward",
        profile.leaveSettings?.carryForward ? "true" : "false"
      );
      formData.append("webhookUrl", profile.webhookUrl || "");
      formData.append(
        "monitorAlertEmails",
        (profile.monitorAlertEmails || []).join(", ")
      );
      formData.append("defaultTerms", profile.defaultTerms || "");
      formData.append("taskEmailEnabled", profile.taskEmailNotifications?.enabled === false ? "false" : "true");
      formData.append("taskEmailTime", profile.taskEmailNotifications?.sendTime || "14:30");

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const res = await fetch("/api/company", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Server error ~ please try again or check your S3/upload configuration");
      }
      if (!res.ok) throw new Error(data.message || "Failed to save");

      setProfile(data.profile);
      setLogoPreview(data.profile.logoUrl);
      toast.success("Settings saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function saveQuota() {
    if (!quotaUserId) {
      toast.error("Select a user");
      return;
    }
    const gb = Number(quotaGb);
    if (!Number.isFinite(gb) || gb <= 0) {
      toast.error("Enter valid quota in GB");
      return;
    }
    setSavingQuota(true);
    try {
      const res = await fetch("/api/drive/quota", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: quotaUserId,
          maxBytes: Math.floor(gb * 1024 * 1024 * 1024),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update quota");
      toast.success("Drive quota updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update quota");
    } finally {
      setSavingQuota(false);
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b pb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Organization Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your workspace identity, compliance details, and visual branding.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="company" className="space-y-8">
          <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-muted/30 p-1 text-muted-foreground w-full lg:w-auto">
            <TabsTrigger value="company" className="rounded-lg px-6 py-2 text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
              Company
            </TabsTrigger>
            <TabsTrigger value="personal" className="rounded-lg px-6 py-2 text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
              Personal
            </TabsTrigger>
            <TabsTrigger value="tax" className="rounded-lg px-6 py-2 text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
              Tax ID
            </TabsTrigger>
            <TabsTrigger value="bank" className="rounded-lg px-6 py-2 text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
              Bank
            </TabsTrigger>
            <TabsTrigger value="branding" className="rounded-lg px-6 py-2 text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
              Branding
            </TabsTrigger>
            <TabsTrigger value="workspace" className="rounded-lg px-6 py-2 text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
              Workspace policy
            </TabsTrigger>
            <TabsTrigger value="navigation" className="rounded-lg px-6 py-2 text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
              Navigation
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-lg px-6 py-2 text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
              Notifications
            </TabsTrigger>
            <TabsTrigger value="roles" className="rounded-lg px-6 py-2 text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
              Roles &amp; Access
            </TabsTrigger>
            <TabsTrigger value="drive" className="rounded-lg px-6 py-2 text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
              Drive Quota
            </TabsTrigger>

          </TabsList>

          <TabsContent value="company" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" /> Company Details
                </CardTitle>
                <CardDescription>
                  Invoicing and public profile information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={profile.companyName}
                      onChange={(e) => updateProfile(["companyName"], e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legalName">Legal Name</Label>
                    <Input
                      id="legalName"
                      value={profile.legalName || ""}
                      onChange={(e) => updateProfile(["legalName"], e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={profile.companyDetails?.website || ""}
                      onChange={(e) => updateProfile(["companyDetails", "website"], e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={profile.companyDetails?.address || ""}
                      onChange={(e) => updateProfile(["companyDetails", "address"], e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profile.companyDetails?.city || ""}
                      onChange={(e) => updateProfile(["companyDetails", "city"], e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={profile.companyDetails?.state || ""}
                      onChange={(e) => updateProfile(["companyDetails", "state"], e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={profile.companyDetails?.country || ""}
                      onChange={(e) => updateProfile(["companyDetails", "country"], e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP</Label>
                    <Input
                      id="zip"
                      value={profile.companyDetails?.zip || ""}
                      onChange={(e) => updateProfile(["companyDetails", "zip"], e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personal" className="space-y-4">
            {/* Your Profile ~ display name */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" /> Your Profile
                </CardTitle>
                <CardDescription>
                  Your display name shown across the app ~ proposals, tasks, comments, sidebar, etc.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      placeholder="Your full name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      This name appears everywhere ~ proposals, comments, sidebar.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loginEmail">Login Email</Label>
                    <Input
                      id="loginEmail"
                      value={userEmail}
                      disabled
                      className="bg-muted/50"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Email cannot be changed.
                    </p>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={async () => {
                        if (!userName.trim()) { toast.error("Name is required"); return; }
                        setSavingName(true);
                        try {
                          const res = await fetch("/api/auth/me", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: userName.trim() }),
                          });
                          if (!res.ok) {
                            const d = await res.json().catch(() => ({}));
                            toast.error(d.message || "Failed to save");
                            return;
                          }
                          toast.success("Display name updated! Reload the page to see it everywhere.");
                        } catch {
                          toast.error("Failed to save");
                        } finally {
                          setSavingName(false);
                        }
                      }}
                      disabled={savingName}
                      className="rounded-lg"
                    >
                      {savingName ? "Saving…" : "Save Name"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business contact details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" /> Business Contact
                </CardTitle>
                <CardDescription>
                  Contact person information for business communication.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input
                      id="contactName"
                      value={profile.personalDetails?.contactName || ""}
                      onChange={(e) => updateProfile(["personalDetails", "contactName"], e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personalEmail">Email</Label>
                    <Input
                      id="personalEmail"
                      type="email"
                      value={profile.personalDetails?.email || ""}
                      onChange={(e) => updateProfile(["personalDetails", "email"], e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profile.personalDetails?.phone || ""}
                      onChange={(e) => updateProfile(["personalDetails", "phone"], e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-muted-foreground" /> Tax Details
                </CardTitle>
                <CardDescription>
                  Government ID numbers for tax compliance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      value={profile.taxDetails?.gstNumber || ""}
                      onChange={(e) => updateProfile(["taxDetails", "gstNumber"], e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="panNumber">PAN Number</Label>
                    <Input
                      id="panNumber"
                      value={profile.taxDetails?.panNumber || ""}
                      onChange={(e) => updateProfile(["taxDetails", "panNumber"], e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otherTaxId">Other tax ID</Label>
                    <Input
                      id="otherTaxId"
                      value={profile.taxDetails?.otherTaxId || ""}
                      onChange={(e) => updateProfile(["taxDetails", "otherTaxId"], e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-muted-foreground" /> Bank Details
                </CardTitle>
                <CardDescription>
                  Company bank account for payouts and billing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountHolderName">Account Holder Name</Label>
                    <Input
                      id="bankAccountHolderName"
                      value={profile.bankDetails?.accountHolderName || ""}
                      onChange={(e) =>
                        updateProfile(["bankDetails", "accountHolderName"], e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      value={profile.bankDetails?.accountNumber || ""}
                      onChange={(e) =>
                        updateProfile(["bankDetails", "accountNumber"], e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankIfscCode">IFSC Code</Label>
                    <Input
                      id="bankIfscCode"
                      value={profile.bankDetails?.ifscCode || ""}
                      onChange={(e) =>
                        updateProfile(["bankDetails", "ifscCode"], e.target.value)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brush className="h-5 w-5 text-muted-foreground" /> Branding
                </CardTitle>
                <CardDescription>
                  Visual identity for the workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <Avatar className="h-24 w-24 rounded-lg border">
                    <AvatarImage src={logoPreview || ""} className="object-cover" />
                    <AvatarFallback className="rounded-lg text-lg">
                      {profile.companyName?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-4 flex-1">
                    <div className="space-y-1">
                      <Label htmlFor="logo">Company Logo</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="max-w-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Upload a PNG or JPG logo. Recommended size: 512x512px.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workspace" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Workspace policy
                </CardTitle>
                <CardDescription>
                  Configure weekly offs and leave types for your attendance system.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Weekly off days</Label>
                  <p className="text-xs text-muted-foreground">
                    Select the days that are considered weekly offs (e.g. Saturday, Sunday).
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {weekdayKeys.map((day) => {
                      const active =
                        profile.leaveSettings?.weeklyOffDays?.includes(day) ||
                        false;
                      return (
                        <Button
                          key={day}
                          type="button"
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className={
                            active
                              ? "bg-black text-white border border-red-500 hover:bg-black hover:text-white"
                              : "bg-background border border-neutral-200 hover:border-black hover:text-black"
                          }
                          onClick={() => toggleWeeklyOff(day)}
                        >
                          {weekdayLabels[day]}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyPaidLimit">
                      Monthly paid leave limit
                    </Label>
                    <Input
                      id="monthlyPaidLimit"
                      type="number"
                      min={0}
                      value={
                        profile.leaveSettings?.monthlyPaidLimit?.toString() || ""
                      }
                      onChange={(e) =>
                        updateProfile(
                          ["leaveSettings", "monthlyPaidLimit"],
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyUnpaidLimit">
                      Monthly unpaid leave limit
                    </Label>
                    <Input
                      id="monthlyUnpaidLimit"
                      type="number"
                      min={0}
                      value={
                        profile.leaveSettings?.monthlyUnpaidLimit?.toString() ||
                        ""
                      }
                      onChange={(e) =>
                        updateProfile(
                          ["leaveSettings", "monthlyUnpaidLimit"],
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Leave types (multi-select, 3 types only)</Label>
                  <p className="text-xs text-muted-foreground">
                    Select which leave types are available in the attendance module. Maximum 3 types.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {leaveTypeOptions.map((leaveType) => {
                      const active =
                        profile.leaveSettings?.leaveTypes?.includes(leaveType) ?? false;
                      return (
                        <Button
                          key={leaveType}
                          type="button"
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className={
                            active
                              ? "bg-black text-white border border-black hover:bg-black hover:text-white"
                              : "bg-background border border-neutral-200 hover:border-black hover:text-black"
                          }
                          onClick={() => toggleLeaveType(leaveType)}
                        >
                          {leaveType}
                        </Button>
                      );
                    })}
                  </div>
                  {profile.leaveSettings?.leaveTypes && profile.leaveSettings.leaveTypes.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selected: {profile.leaveSettings.leaveTypes.join(", ")}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="carryForward"
                    checked={profile.leaveSettings?.carryForward || false}
                    onChange={(e) =>
                      updateProfile(["leaveSettings", "carryForward"], e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <Label htmlFor="carryForward" className="text-sm font-normal cursor-pointer">
                    Enable leave carry forward
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow employees to carry forward unused leave balance to the next month
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Leave Management</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setRefreshConfirmOpen(true)}
                    >
                      Refresh Leave Balances
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Recalculate leave balances for all employees based on joining dates and applied leaves
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  Departments
                </CardTitle>
                <CardDescription>
                  Manage departments dynamically. These will appear as dropdown options across the app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Department name"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="max-w-xs"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDepartment())}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newDeptDesc}
                    onChange={(e) => setNewDeptDesc(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDepartment}
                    disabled={addingDept || !newDeptName.trim()}
                    className="gap-1 shrink-0"
                  >
                    {addingDept ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add
                  </Button>
                </div>

                {/* List */}
                {deptsLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : departments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No departments yet. Add one above.</p>
                ) : (
                  <div className="space-y-2">
                    {departments.map((dept) => (
                      <div
                        key={dept._id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10 group"
                      >
                        {editingDeptId === dept._id ? (
                          <>
                            <Input
                              value={editDeptName}
                              onChange={(e) => setEditDeptName(e.target.value)}
                              className="h-8 max-w-[200px]"
                              autoFocus
                            />
                            <Input
                              value={editDeptDesc}
                              onChange={(e) => setEditDeptDesc(e.target.value)}
                              className="h-8 max-w-[200px]"
                              placeholder="Description"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateDepartment(dept._id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingDeptId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{dept.name}</p>
                              {dept.description && (
                                <p className="text-xs text-muted-foreground truncate">{dept.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingDeptId(dept._id);
                                  setEditDeptName(dept.name);
                                  setEditDeptDesc(dept.description || "");
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => deleteDepartment(dept._id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="navigation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PanelLeft className="h-5 w-5 text-muted-foreground" />
                  Sidebar order
                </CardTitle>
                <CardDescription>
                  Same order controls available to every user under Settings; DevOps, Work, and Finance are the default first groups.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <SidebarOrderSettings />
                <AdminSidebarFeaturesSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-muted-foreground" /> Task email notifications
                </CardTitle>
                <CardDescription>
                  Control the daily overdue-task reminder sent to team members.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between gap-6 rounded-xl border p-4">
                  <div>
                    <Label htmlFor="taskEmailEnabled" className="font-semibold">Daily overdue-task email</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Turn off to stop all scheduled overdue-task reminder emails.
                    </p>
                  </div>
                  <button
                    id="taskEmailEnabled"
                    type="button"
                    role="switch"
                    aria-checked={profile.taskEmailNotifications?.enabled !== false}
                    onClick={() => updateProfile(
                      ["taskEmailNotifications", "enabled"],
                      profile.taskEmailNotifications?.enabled === false
                    )}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${profile.taskEmailNotifications?.enabled !== false ? "bg-primary" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${profile.taskEmailNotifications?.enabled !== false ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>

                <div className="max-w-sm space-y-2">
                  <Label htmlFor="taskEmailTime">Daily send time</Label>
                  <Input
                    id="taskEmailTime"
                    type="time"
                    value={profile.taskEmailNotifications?.sendTime || "14:30"}
                    disabled={profile.taskEmailNotifications?.enabled === false}
                    onChange={(e) => updateProfile(["taskEmailNotifications", "sendTime"], e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Uses India Standard Time (Asia/Kolkata). Delivery can begin within five minutes of the selected time.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <RolesAccessInline />
          </TabsContent>

          <TabsContent value="drive" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-muted-foreground" />
                  Drive Quota
                </CardTitle>
                <CardDescription>
                  Allocate drive storage size for individual users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
                  <div className="space-y-2">
                    <Label>User</Label>
                    <Select value={quotaUserId} onValueChange={setQuotaUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose user" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quota (GB)</Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={quotaGb}
                      onChange={(e) => setQuotaGb(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={saveQuota} disabled={savingQuota}>
                  {savingQuota ? "Saving..." : "Update quota"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>



        </Tabs>

        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
          <Button variant="outline" type="button" disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={refreshConfirmOpen}
        onOpenChange={setRefreshConfirmOpen}
        title="Refresh Leave Balances"
        description="This will refresh leave balances for all employees based on their joining dates and applied leaves. Continue?"
        onConfirm={async () => {
          setIsRefreshing(true);
          try {
            const res = await fetch("/api/employees/refresh-leaves", {
              method: "POST",
            });
            const data = await res.json();
            if (res.ok) {
              toast.success(
                `Leaves refreshed: ${data.updated} updated, ${data.skipped} skipped`
              );
            } else {
              toast.error(data.message || "Failed to refresh leaves");
            }
          } catch {
            toast.error("Failed to refresh leaves");
          } finally {
            setIsRefreshing(false);
            setRefreshConfirmOpen(false);
          }
        }}
        isLoading={isRefreshing}
        confirmLabel="Refresh"
      />
    </div>
  );
}
