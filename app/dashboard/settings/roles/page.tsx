"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Shield,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Pencil,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ALL_FEATURES, getGroupedFeatures, DEFAULT_EMPLOYEE_FEATURES, FEATURE_FAMILIES, effectiveFeatureEnabled } from "@/lib/features";

type QuickAction = {
  type: "grant-all" | "reset-default";
  employee: EmployeeAccess;
} | null;

type EmployeeAccess = {
  _id: string;
  email: string;
  name: string;
  title: string;
  department: string;
  avatarUrl: string;
  isDismissed: boolean;
  isLoginDisabled: boolean;
  featureAccess: string[];
  featureAdminFor: string[];
  featureReadOnlyFor: string[];
  canManageContent: boolean;
  accessGroupId?: string | null;
};

type AccessGroup = {
  _id: string;
  name: string;
  type: "all" | "specific";
  featureAccess: string[];
};

export default function RolesAccessPage() {
  const [employees, setEmployees] = useState<EmployeeAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [groups, setGroups] = useState<AccessGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupType, setNewGroupType] = useState<"all" | "specific">("specific");
  const [newGroupFeatures, setNewGroupFeatures] = useState<string[]>(["dashboard"]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [grantAllAdminPick, setGrantAllAdminPick] = useState<string[]>([]);

  const groupedFeatures = getGroupedFeatures();

  useEffect(() => {
    fetchEmployees();
    fetchGroups();
  }, []);

  async function fetchEmployees() {
    try {
      const res = await fetch("/api/users/access");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }

  async function fetchGroups() {
    setLoadingGroups(true);
    try {
      const res = await fetch("/api/users/access-groups");
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {
      toast.error("Failed to load access groups");
    } finally {
      setLoadingGroups(false);
    }
  }

  async function updateAccess(
    userId: string,
    featureAccess: string[],
    accessGroupId: string | null = null,
    opts?: { featureAdminFor?: string[]; featureReadOnlyFor?: string[] }
  ) {
    const newAccess = [...new Set([...featureAccess, "dashboard"])];

    const emp = employees.find((e) => e._id === userId);
    const nextAdmin =
      opts?.featureAdminFor !== undefined ? opts.featureAdminFor : emp?.featureAdminFor ?? [];
    const nextRo =
      opts?.featureReadOnlyFor !== undefined ? opts.featureReadOnlyFor : emp?.featureReadOnlyFor ?? [];

    // Optimistic update: immediately update local state
    setEmployees((prev) =>
      prev.map((e) =>
        e._id === userId
          ? {
            ...e,
            featureAccess: newAccess,
            accessGroupId,
            featureAdminFor: nextAdmin,
            featureReadOnlyFor: nextRo,
          }
          : e
      )
    );

    setSaving(userId);
    try {
      const res = await fetch("/api/users/access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          featureAccess: newAccess,
          accessGroupId,
          featureAdminFor: nextAdmin,
          featureReadOnlyFor: nextRo,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to save");
      }
      toast.success("Access updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update access");
      // Revert on failure by re-fetching
      fetchEmployees();
    } finally {
      setSaving(null);
    }
  }

  function toggleFeature(employee: EmployeeAccess, featureKey: string) {
    const feature = ALL_FEATURES.find((f) => f.key === featureKey);
    if (feature?.alwaysOn) return;

    // Use the latest state from the employees array to avoid stale data on rapid toggles
    const latestEmployee = employees.find((e) => e._id === employee._id);
    if (!latestEmployee) return;

    const current = new Set(latestEmployee.featureAccess);
    const family = Object.values(FEATURE_FAMILIES).find((candidate) => candidate.children.includes(featureKey));
    if (family && !family.children.some((key) => current.has(key)) && current.has(family.parent)) {
      family.children.forEach((key) => current.add(key));
    }
    if (current.has(featureKey)) {
      current.delete(featureKey);
    } else {
      current.add(featureKey);
    }
    const nextAccess = Array.from(current);
    const nextAdmin = (latestEmployee.featureAdminFor || []).filter((k) => nextAccess.includes(k));
    const nextRo = (latestEmployee.featureReadOnlyFor || []).filter((k) => nextAccess.includes(k));
    updateAccess(latestEmployee._id, nextAccess, null, {
      featureAdminFor: nextAdmin,
      featureReadOnlyFor: nextRo,
    });
  }

  function grantAll(employee: EmployeeAccess, featureAdminFor: string[]) {
    const allKeys = ALL_FEATURES.map((f) => f.key);
    updateAccess(employee._id, allKeys, null, {
      featureAdminFor,
      featureReadOnlyFor: [],
    });
  }

  function resetToDefault(employee: EmployeeAccess) {
    updateAccess(employee._id, [...DEFAULT_EMPLOYEE_FEATURES], null, {
      featureAdminFor: [],
      featureReadOnlyFor: [],
    });
  }

  function toggleFeatureAdmin(employee: EmployeeAccess, featureKey: string) {
    const latest = employees.find((e) => e._id === employee._id);
    if (!latest || !latest.featureAccess.includes(featureKey)) return;
    const admin = new Set(latest.featureAdminFor || []);
    const ro = new Set(latest.featureReadOnlyFor || []);
    if (admin.has(featureKey)) {
      admin.delete(featureKey);
    } else {
      admin.add(featureKey);
      ro.delete(featureKey);
    }
    updateAccess(latest._id, latest.featureAccess, latest.accessGroupId ?? null, {
      featureAdminFor: Array.from(admin),
      featureReadOnlyFor: Array.from(ro),
    });
  }

  function toggleFeatureReadOnly(employee: EmployeeAccess, featureKey: string) {
    const latest = employees.find((e) => e._id === employee._id);
    if (!latest || !latest.featureAccess.includes(featureKey)) return;
    const admin = new Set(latest.featureAdminFor || []);
    const ro = new Set(latest.featureReadOnlyFor || []);
    if (admin.has(featureKey)) return;
    if (ro.has(featureKey)) {
      ro.delete(featureKey);
    } else {
      ro.add(featureKey);
    }
    updateAccess(latest._id, latest.featureAccess, latest.accessGroupId ?? null, {
      featureAdminFor: Array.from(admin),
      featureReadOnlyFor: Array.from(ro),
    });
  }

  function toggleGroupFeature(featureKey: string) {
    setNewGroupFeatures((prev) => {
      const current = new Set(prev);
      if (featureKey === "dashboard") return Array.from(current);
      if (current.has(featureKey)) current.delete(featureKey);
      else current.add(featureKey);
      current.add("dashboard");
      return Array.from(current);
    });
  }

  async function createGroup() {
    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (newGroupType === "specific" && newGroupFeatures.length === 0) {
      toast.error("Select at least one feature");
      return;
    }

    setCreatingGroup(true);
    try {
      const isEditing = !!editingGroupId;
      const res = await fetch("/api/users/access-groups", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditing ? { id: editingGroupId } : {}),
          name: newGroupName.trim(),
          type: newGroupType,
          featureAccess: newGroupType === "all" ? ALL_FEATURES.map((f) => f.key) : newGroupFeatures,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || (isEditing ? "Failed to update group" : "Failed to create group"));
      setNewGroupName("");
      setNewGroupType("specific");
      setNewGroupFeatures(["dashboard"]);
      setEditingGroupId(null);
      toast.success(isEditing ? "Access group updated" : "Access group created");
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || (editingGroupId ? "Failed to update group" : "Failed to create group"));
    } finally {
      setCreatingGroup(false);
    }
  }

  function startEditGroup(group: AccessGroup) {
    setEditingGroupId(group._id);
    setNewGroupName(group.name);
    setNewGroupType(group.type);
    setNewGroupFeatures(group.type === "all" ? ALL_FEATURES.map((f) => f.key) : [...new Set(["dashboard", ...group.featureAccess])]);
  }

  function cancelEditGroup() {
    setEditingGroupId(null);
    setNewGroupName("");
    setNewGroupType("specific");
    setNewGroupFeatures(["dashboard"]);
  }

  async function deleteGroup(groupId: string) {
    try {
      const res = await fetch(`/api/users/access-groups?id=${groupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setGroups((prev) => prev.filter((g) => g._id !== groupId));
      toast.success("Group removed");
    } catch {
      toast.error("Failed to remove group");
    }
  }

  function assignGroup(employee: EmployeeAccess, groupId: string) {
    if (groupId === "none") {
      updateAccess(employee._id, employee.featureAccess, null);
      return;
    }
    const group = groups.find((g) => g._id === groupId);
    if (!group) return;
    updateAccess(employee._id, group.featureAccess, group._id, {
      featureAdminFor: [],
      featureReadOnlyFor: [],
    });
  }

  const filteredEmployees = employees.filter(
    (emp) =>
      !emp.isDismissed &&
      (emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Roles & Access</h2>
        </div>
        <p className="text-muted-foreground">
          Control which dashboard areas each employee can open. Under <strong>User &amp; access</strong> you can also mark{" "}
          <strong>feature admin</strong> (full manage for that module only) or <strong>read only</strong> (view without creating or editing, where enforced). Admins always have full access.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access Groups</CardTitle>
          <CardDescription>
            Create named templates like all-access or specific-feature groups, then assign them to employees.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <Input
              placeholder="Group name (e.g. Sales, Operations)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <Select
              value={newGroupType}
              onValueChange={(v) => setNewGroupType(v as "all" | "specific")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All features</SelectItem>
                <SelectItem value="specific">Specific features</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={createGroup} disabled={creatingGroup || !newGroupName.trim()}>
              {creatingGroup ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editingGroupId ? "Save changes" : "Create group"}
            </Button>
          </div>
          {editingGroupId && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={cancelEditGroup}>
                Cancel edit
              </Button>
            </div>
          )}

          {newGroupType === "specific" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 border rounded-lg p-3">
              {ALL_FEATURES.map((feature) => {
                const checked = newGroupFeatures.includes(feature.key);
                return (
                  <label key={feature.key} className="flex items-start gap-2 text-sm">
                    <Switch
                      checked={checked}
                      disabled={feature.alwaysOn}
                      onCheckedChange={() => toggleGroupFeature(feature.key)}
                    />
                    <span>{feature.label}</span>
                  </label>
                );
              })}
            </div>
          )}

          {loadingGroups ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading groups...
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No access groups yet.</p>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div key={group._id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.type === "all" ? "All features" : `${group.featureAccess.length} specific features`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEditGroup(group)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteGroup(group._id)}>
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      {filteredEmployees.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No employees found</p>
            <p className="text-sm mt-1">
              {searchQuery
                ? "Try a different search term"
                : "Add employees from the Team page first"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Employee Cards */}
      {filteredEmployees.map((emp) => {
        const isExpanded = expandedEmployee === emp._id;
        const activeCount = emp.featureAccess.filter(
          (k) => !ALL_FEATURES.find((f) => f.key === k)?.alwaysOn
        ).length;
        const totalToggleable = ALL_FEATURES.filter((f) => !f.alwaysOn).length;

        return (
          <Card key={emp._id} className="overflow-hidden">
            {/* Employee Header - Click to Expand */}
            <div
              className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() =>
                setExpandedEmployee(isExpanded ? null : emp._id)
              }
            >
              <Avatar className="h-10 w-10 border">
                {emp.avatarUrl ? (
                  <AvatarImage src={emp.avatarUrl} alt={emp.name} />
                ) : (
                  <AvatarFallback className="text-sm font-medium">
                    {emp.name
                      ? emp.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                      : emp.email[0].toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">
                    {emp.name || emp.email}
                  </h3>
                  {emp.isLoginDisabled && (
                    <Badge variant="destructive" className="text-[10px] px-1.5">
                      Disabled
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {[emp.title, emp.department].filter(Boolean).join(" · ") ||
                    emp.email}
                </p>
                {emp.accessGroupId && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Group: {groups.find((g) => g._id === emp.accessGroupId)?.name || "Assigned"}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Select
                  value={emp.accessGroupId || "none"}
                  onValueChange={(value) => assignGroup(emp, value)}
                >
                  <SelectTrigger
                    className="h-8 w-[190px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue placeholder="Assign group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No group</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group._id} value={group._id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="text-xs">
                  {activeCount}/{totalToggleable} features
                </Badge>
                {saving === emp._id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Feature Toggles - Expanded */}
            {isExpanded && (
              <div className="border-t">
                {/* Quick Actions */}
                <div className="flex items-center gap-2 px-6 py-3 bg-muted/20 border-b">
                  <span className="text-xs text-muted-foreground font-medium mr-auto">
                    Quick actions:
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGrantAllAdminPick([]);
                      setQuickAction({ type: "grant-all", employee: emp });
                    }}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Grant All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickAction({ type: "reset-default", employee: emp });
                    }}
                  >
                    Reset to Default
                  </Button>
                </div>

                {/* Feature Groups ~ all assignable features under User & access */}
                <div className="px-6 py-4 space-y-6">
                  <div className="rounded-lg border bg-muted/15 p-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold">User &amp; access ~ all features</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Access opens the area in the app. Feature admin grants manage actions like a global admin for that module only (for example creating clients when Clients is on). Read only blocks create/edit where the API supports it.
                      </p>
                    </div>
                    {Object.entries(groupedFeatures).map(
                      ([groupName, features]) => (
                        <div key={groupName}>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            {groupName}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {features.map((feature) => {
                              const isActive = effectiveFeatureEnabled(emp.featureAccess, feature.key);
                              const isAlwaysOn = feature.alwaysOn;
                              const isAdmin = (emp.featureAdminFor || []).includes(feature.key);
                              const isRo = (emp.featureReadOnlyFor || []).includes(feature.key);

                              return (
                                <div
                                  key={feature.key}
                                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isActive
                                      ? "bg-primary/5 border-primary/20"
                                      : "bg-muted/20 border-transparent"
                                    } ${isAlwaysOn ? "opacity-60" : ""}`}
                                >
                                  <Switch
                                    checked={isActive}
                                    disabled={
                                      isAlwaysOn || saving === emp._id
                                    }
                                    onCheckedChange={() =>
                                      toggleFeature(emp, feature.key)
                                    }
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <Label className="text-sm font-medium cursor-pointer">
                                        {feature.label}
                                      </Label>
                                      {isAlwaysOn && (
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] px-1"
                                        >
                                          Always on
                                        </Badge>
                                      )}
                                      {isActive && isAdmin && (
                                        <Badge variant="outline" className="text-[10px] px-1">Admin</Badge>
                                      )}
                                      {isActive && isRo && (
                                        <Badge variant="secondary" className="text-[10px] px-1">Read only</Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                      {feature.description}
                                    </p>
                                    {isActive && !isAlwaysOn && (
                                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/60 pt-2">
                                        <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
                                          <Switch
                                            checked={isAdmin}
                                            disabled={saving === emp._id || isRo}
                                            onCheckedChange={() => toggleFeatureAdmin(emp, feature.key)}
                                          />
                                          Feature admin
                                        </label>
                                        <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
                                          <Switch
                                            checked={isRo}
                                            disabled={saving === emp._id || isAdmin}
                                            onCheckedChange={() => toggleFeatureReadOnly(emp, feature.key)}
                                          />
                                          Read only
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* Confirmation Dialog for Quick Actions */}
      <ConfirmDialog
        open={!!quickAction}
        onOpenChange={(open) => {
          if (!open) {
            setQuickAction(null);
            setGrantAllAdminPick([]);
          }
        }}
        title={
          quickAction?.type === "grant-all"
            ? "Grant All Access"
            : "Reset to Default"
        }
        description={
          quickAction?.type === "grant-all"
            ? `This will give ${quickAction.employee.name || quickAction.employee.email} access to every dashboard feature (${ALL_FEATURES.length} keys). Use the list below to optionally grant feature-level admin (full manage for that module only).`
            : `This will reset ${quickAction?.employee.name || quickAction?.employee.email || "this employee"}'s access back to the default set of features. Any custom permissions will be lost.`
        }
        confirmLabel={
          quickAction?.type === "grant-all" ? "Grant All" : "Reset"
        }
        variant={quickAction?.type === "reset-default" ? "destructive" : "default"}
        isLoading={!!saving}
        onConfirm={() => {
          if (!quickAction) return;
          if (quickAction.type === "grant-all") {
            grantAll(quickAction.employee, grantAllAdminPick);
          } else {
            resetToDefault(quickAction.employee);
          }
          setGrantAllAdminPick([]);
          setQuickAction(null);
        }}
        children={
          quickAction?.type === "grant-all" ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Optional: feature-level admin</p>
              <div className="max-h-[44vh] overflow-y-auto rounded-lg border p-2 space-y-1">
                {ALL_FEATURES.filter((f) => !f.alwaysOn).map((f) => (
                  <label
                    key={f.key}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50 cursor-pointer"
                  >
                    <Switch
                      checked={grantAllAdminPick.includes(f.key)}
                      onCheckedChange={(on) =>
                        setGrantAllAdminPick((prev) => {
                          const s = new Set(prev);
                          if (on) s.add(f.key);
                          else s.delete(f.key);
                          return Array.from(s);
                        })
                      }
                    />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
