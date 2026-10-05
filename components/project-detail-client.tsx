"use client";

import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Calendar,
  Users,
  FolderKanban,
  Plus,
  Wrench,
  ExternalLink,
  Loader2,
  Trash2,
  Server,
  FileText,
  Paperclip,
  Download,
  Eye,
  Pencil,
  Save,
  Check,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichTextEditor } from "@/components/rich-text-editor";
import { RichTextDisplay } from "@/components/rich-text-editor";
import { ChevronDown, IndianRupee, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { TaskBoard } from "@/components/task-board";

type ProjectDomain = {
  url: string;
  label?: string;
  lastChecked?: string;
  isUp?: boolean;
  lastStatusCode?: number;
};

type Project = {
  id: string;
  client: { id: string; name: string; companyName: string; email: string };
  name: string;
  description: string;
  startDate?: string | null;
  endDate?: string | null;
  maintenanceStartDate?: string | null;
  maintenanceEndDate?: string | null;
  assignedMembers: { id: string; name: string; email: string }[];
  manager?: { id: string; name: string; email: string } | null;
  status: string;
  budget?: number | null;
  domains?: ProjectDomain[];
};

type ProjectServiceRow = {
  id: string;
  name: string;
  serviceId: string;
  servicePass: string;
  cost: number;
  costType: string;
  customMonths?: number;
  attachmentUrl?: string;
  createdAt?: string;
};

type ProjectDocumentRow = {
  id: string;
  name: string;
  fileUrl: string;
  fileKey: string;
  uploadedAt?: string;
  createdAt?: string;
};

const COST_TYPES = [
  { value: "monthly", label: "Monthly" },
  { value: "daily", label: "Daily" },
  { value: "custom_months", label: "Custom months" },
];

/** Payload for update project. assignedMemberIds must be only the selected member IDs, never all. */
type UpdateProjectPayload = {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  maintenanceStartDate?: string;
  maintenanceEndDate?: string;
  status: string;
  budget?: string | number | null;
  assignedMemberIds: string[];
  managerId?: string | null;
};

type Task = {
  id: string;
  project?: string | null;
  title: string;
  description: string;
  type: "task" | "bug" | "story";
  status:
  | "backlog"
  | "todo"
  | "in_progress"
  | "hold"
  | "code_review"
  | "qa"
  | "staging"
  | "production"
  | "in_review"
  | "done"
  | "rejected";
  assignee: { id: string; name: string; email: string } | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  order: number;
};

type Props = {
  clientId: string;
  project: Project;
  totalManagingCost?: number;
  isAdmin: boolean;
  canEdit: boolean;
};

function formatDate(d: string | null | undefined) {
  if (!d) return "~";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(n: number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export function ProjectDetailClient({
  clientId,
  project: initialProject,
  totalManagingCost = 0,
  isAdmin,
  canEdit,
}: Props) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    maintenanceStartDate: "",
    maintenanceEndDate: "",
    budget: "",
    status: "active" as string,
    assignedMemberIds: [] as string[],
    managerId: "" as string | null,
  });
  const [employees, setEmployees] = useState<{ id: string; name: string; email: string }[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [projectHasGeneratedBills, setProjectHasGeneratedBills] = useState<boolean | null>(null);

  const [services, setServices] = useState<ProjectServiceRow[]>([]);
  const [documents, setDocuments] = useState<ProjectDocumentRow[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    serviceId: "",
    servicePass: "",
    cost: "",
    costType: "monthly" as string,
    customMonths: "",
    attachment: null as File | null,
  });
  const [savingService, setSavingService] = useState(false);
  const [docUploadName, setDocUploadName] = useState("");
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [revealedServiceId, setRevealedServiceId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<ProjectServiceRow | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [todoEmployees, setTodoEmployees] = useState<{ id: string; name: string; email: string }[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const displayTotalCost = services.length > 0
    ? services.reduce((sum, s) => {
      const cost = Number(s.cost) || 0;
      if (s.costType === "monthly") return sum + cost;
      if (s.costType === "daily") return sum + cost * 30;
      if (s.costType === "custom_months" && (s.customMonths || 0) >= 1)
        return sum + cost / (s.customMonths || 1);
      return sum + cost;
    }, 0)
    : totalManagingCost;

  useEffect(() => {
    fetch(`/api/project-payments?projectId=${project.id}`)
      .then((r) => r.json())
      .then((d) => {
        const payments = d.payments || [];
        const hasBills = payments.some((p: { billGeneratedAt?: string | null }) => p.billGeneratedAt != null);
        setProjectHasGeneratedBills(hasBills);
      })
      .catch(() => setProjectHasGeneratedBills(null));
  }, [project.id]);

  useEffect(() => {
    if (activeTab === "services") {
      setServicesLoading(true);
      fetch(`/api/projects/${project.id}/services`)
        .then((r) => r.json())
        .then((d) => setServices(d.services || []))
        .catch(() => toast.error("Failed to load services"))
        .finally(() => setServicesLoading(false));
    }
  }, [activeTab, project.id]);

  useEffect(() => {
    if (activeTab === "documents") {
      setDocumentsLoading(true);
      fetch(`/api/projects/${project.id}/documents`)
        .then((r) => r.json())
        .then((d) => setDocuments(d.documents || []))
        .catch(() => toast.error("Failed to load documents"))
        .finally(() => setDocumentsLoading(false));
    }
  }, [activeTab, project.id]);

  const refreshTasks = useCallback(() => {
    setTasksLoading(true);
    Promise.all([
      fetch(`/api/tasks?projectId=${project.id}`).then((r) => r.json()),
      fetch("/api/employees").then((r) => r.json()),
    ])
      .then(([tasksRes, employeesRes]) => {
        if (tasksRes.tasks) setTasks(tasksRes.tasks);
        if (employeesRes.employees)
          setTodoEmployees(
            employeesRes.employees.map((e: { id?: string; _id?: string; name: string; email: string }) => ({
              id: String(e.id ?? e._id),
              name: e.name,
              email: e.email,
            }))
          );
      })
      .catch(() => { })
      .finally(() => setTasksLoading(false));
  }, [project.id]);

  useEffect(() => {
    if (activeTab === "todo") refreshTasks();
  }, [activeTab, refreshTasks]);

  function openEditSheet() {
    setEditForm({
      name: project.name,
      description: project.description ?? "",
      startDate: project.startDate ? project.startDate.split("T")[0] : "",
      endDate: project.endDate ? project.endDate.split("T")[0] : "",
      maintenanceStartDate: project.maintenanceStartDate ? project.maintenanceStartDate.split("T")[0] : "",
      maintenanceEndDate: project.maintenanceEndDate ? project.maintenanceEndDate.split("T")[0] : "",
      status: project.status,
      budget: project.budget != null ? String(project.budget) : "",
      assignedMemberIds: project.assignedMembers.map((m) => m.id),
      managerId: project.manager?.id ?? null,
    });
    setEditSheetOpen(true);
    setEmployeesLoading(true);
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.employees || []).map((e: { id?: string; _id?: string; name: string; email: string }) => ({
          id: String(e.id ?? e._id),
          name: e.name,
          email: e.email,
        }));
        setEmployees(list);
      })
      .catch(() => toast.error("Failed to load employees"))
      .finally(() => setEmployeesLoading(false));
  }

  function setEditMemberChecked(id: string, checked: boolean) {
    setEditForm((f) => ({
      ...f,
      assignedMemberIds: checked
        ? [...f.assignedMemberIds, id]
        : f.assignedMemberIds.filter((x) => x !== id),
    }));
  }

  function clearEditAssignees() {
    setEditForm((f) => ({ ...f, assignedMemberIds: [] }));
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const payload: UpdateProjectPayload = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
        maintenanceStartDate: editForm.maintenanceStartDate || undefined,
        maintenanceEndDate: editForm.maintenanceEndDate || undefined,
        status: editForm.status,
        budget: editForm.budget,
        assignedMemberIds: Array.isArray(editForm.assignedMemberIds) ? [...editForm.assignedMemberIds] : [],
        managerId: (editForm.managerId && editForm.managerId !== "none") ? editForm.managerId : null,
      };
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { message?: string }).message || "Failed to update project");
        return;
      }
      setProject((p) => ({
        ...p,
        ...data.project,
        client: data.project.client && typeof data.project.client === "object" ? data.project.client : p.client,
        assignedMembers: data.project.assignedMembers ?? p.assignedMembers,
        manager: data.project.manager ?? p.manager,
      }));
      setEditSheetOpen(false);
      toast.success("Project updated");
      router.refresh();
    } catch {
      toast.error("Failed to update project");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteProject() {
    setDeletingProject(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Project deleted");
      router.push(`/dashboard/projects/clients/${clientId}`);
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setDeletingProject(false);
      setDeleteDialogOpen(false);
    }
  }

  function openAddService() {
    setEditingService(null);
    setServiceForm({
      name: "",
      serviceId: "",
      servicePass: "",
      cost: "",
      costType: "monthly",
      customMonths: "",
      attachment: null,
    });
    setServiceDialogOpen(true);
  }

  function openEditService(s: ProjectServiceRow) {
    setEditingService(s);
    setServiceForm({
      name: s.name,
      serviceId: s.serviceId,
      servicePass: s.servicePass,
      cost: String(s.cost || ""),
      costType: s.costType,
      customMonths: String(s.customMonths || ""),
      attachment: null,
    });
    setServiceDialogOpen(true);
  }

  async function submitService(e: FormEvent) {
    e.preventDefault();
    if (!serviceForm.name.trim() || serviceForm.serviceId === "" || serviceForm.servicePass === "") {
      toast.error("Name, service ID, and service pass are required");
      return;
    }
    setSavingService(true);
    try {
      const formData = new FormData();
      formData.append("name", serviceForm.name.trim());
      formData.append("serviceId", serviceForm.serviceId);
      formData.append("servicePass", serviceForm.servicePass);
      formData.append("cost", serviceForm.cost || "0");
      formData.append("costType", serviceForm.costType);
      if (serviceForm.costType === "custom_months" && serviceForm.customMonths) {
        formData.append("customMonths", serviceForm.customMonths);
      }
      if (serviceForm.attachment) formData.append("attachment", serviceForm.attachment);

      const url = editingService
        ? `/api/projects/${project.id}/services/${editingService.id}`
        : `/api/projects/${project.id}/services`;

      const res = await fetch(url, {
        method: editingService ? "PUT" : "POST",
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || (editingService ? "Failed to update" : "Failed to create"));
      }
      const data = await res.json();

      if (editingService) {
        setServices((prev) => prev.map((s) => (s.id === data.service.id ? data.service : s)));
        toast.success("Service updated");
      } else {
        setServices((prev) => [data.service, ...prev]);
        toast.success("Service added");
      }

      setServiceDialogOpen(false);
      setEditingService(null);
      setServiceForm({
        name: "",
        serviceId: "",
        servicePass: "",
        cost: "",
        costType: "monthly",
        customMonths: "",
        attachment: null,
      });
    } catch (err: any) {
      toast.error(err.message || (editingService ? "Failed to update service" : "Failed to add service"));
    } finally {
      setSavingService(false);
    }
  }

  async function deleteService(serviceId: string) {
    try {
      const res = await fetch(`/api/projects/${project.id}/services/${serviceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      toast.success("Service removed");
    } catch {
      toast.error("Failed to delete service");
    }
  }

  async function uploadDocument(e: FormEvent) {
    e.preventDefault();
    if (!docUploadName.trim() || !docUploadFile) {
      toast.error("Document name and file are required");
      return;
    }
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("name", docUploadName.trim());
      formData.append("file", docUploadFile);
      const res = await fetch(`/api/projects/${project.id}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Upload failed");
      }
      const data = await res.json();
      setDocuments((prev) => [data.document, ...prev]);
      setDocUploadName("");
      setDocUploadFile(null);
      toast.success("Document uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingDoc(false);
    }
  }

  async function deleteDocument(docId: string) {
    try {
      const res = await fetch(`/api/projects/${project.id}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success("Document removed");
    } catch {
      toast.error("Failed to delete document");
    }
  }

  return (
    <>
      {activeTab !== "todo" && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <Link
              href="/dashboard/projects"
              className="hover:text-foreground flex items-center gap-1 rounded px-1.5 py-0.5 -ml-1.5 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Projects
            </Link>
            <span className="text-muted-foreground/60">/</span>
            <Link
              href={`/dashboard/projects/clients/${clientId}`}
              className="hover:text-foreground rounded px-1.5 py-0.5 transition-colors"
            >
              {project.client.companyName || project.client.name}
            </Link>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-foreground font-medium px-1.5 py-0.5">{project.name}</span>
          </nav>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={openEditSheet}>
                <Pencil className="h-4 w-4" />
                Edit project
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={projectHasGeneratedBills === true}
                  title={projectHasGeneratedBills ? "Delete all generated bills for this project first (Client → Payments)" : undefined}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete project
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col min-h-0 rounded-xl border bg-card overflow-hidden" style={{ height: activeTab === "todo" ? "calc(100vh - 6rem)" : "calc(100vh - 12rem)", maxHeight: activeTab === "todo" ? undefined : "720px" }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          {activeTab !== "todo" && (
            <TabsList className="bg-muted/50 flex-wrap h-auto shrink-0">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="services">
                <Server className="h-4 w-4 mr-1.5" />
                Services
                {services.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {services.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-1.5" />
                Documents
                {documents.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {documents.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="collaborator">
                <Users className="h-4 w-4 mr-1.5" />
                Collaborator
              </TabsTrigger>
              <TabsTrigger value="todo">
                <ClipboardList className="h-4 w-4 mr-1.5" />
                Todo
                {tasks.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {tasks.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="overview" className="space-y-6 mt-4 flex-1 overflow-auto min-h-0 data-[state=inactive]:hidden">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl">About project</CardTitle>
                    <CardDescription>
                      {project.client.companyName}
                    </CardDescription>
                  </div>
                  <Badge variant={project.status === "active" ? "default" : "secondary"}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.description && (
                  <div className="text-muted-foreground text-sm">
                    {project.description.includes("<") ? (
                      <RichTextDisplay html={project.description} className="text-sm text-muted-foreground" />
                    ) : (
                      <p className="whitespace-pre-wrap">{project.description}</p>
                    )}
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Start project</p>
                    <p className="font-medium">{formatDate(project.startDate)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">End project</p>
                    <p className="font-medium">{formatDate(project.endDate)}</p>
                  </div>
                  {(project.maintenanceStartDate || project.maintenanceEndDate) && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Maintenance</p>
                      <p className="font-medium text-sm">
                        {formatDate(project.maintenanceStartDate)} – {formatDate(project.maintenanceEndDate)}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Total managing cost (creds)</p>
                    <p className="font-semibold flex items-center gap-1">
                      <IndianRupee className="h-4 w-4" />
                      {formatCurrency(Math.round(displayTotalCost))}/mo
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collaborator" className="mt-4 flex-1 overflow-auto min-h-0 data-[state=inactive]:hidden">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Collaborators
                  </CardTitle>
                  <CardDescription>
                    Assignees and project manager. Click Edit project to update.
                  </CardDescription>
                </div>
                {canEdit && (
                  <Button onClick={openEditSheet}>
                    <Pencil className="h-4 w-4" />
                    Edit project
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Assignees</h4>
                  {project.assignedMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assignees yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {project.assignedMembers.map((m) => (
                        <Badge key={m.id} variant="outline" className="font-normal">
                          {m.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Manager</h4>
                  {project.manager ? (
                    <p className="text-sm">{project.manager.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No manager assigned.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="todo" className="flex-1 overflow-hidden min-h-0 data-[state=inactive]:hidden flex flex-col">
            {/* Compact header for todo board */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/30 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1 text-muted-foreground hover:text-foreground rounded-lg"
                onClick={() => setActiveTab("overview")}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-sm font-medium text-foreground truncate">{project.name}</span>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {tasks.length} tasks
              </Badge>
            </div>
            <div className="flex-1 overflow-auto min-h-0 p-4">
              {tasksLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <TaskBoard
                  projectId={project.id}
                  tasks={tasks}
                  employees={todoEmployees}
                  onTasksChange={setTasks}
                  onRefresh={refreshTasks}
                  canDeleteTask={isAdmin}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-4 flex-1 overflow-auto min-h-0 data-[state=inactive]:hidden">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Services
                  </CardTitle>
                  <CardDescription>
                    Service name, ID, password, cost (monthly/daily/custom), and optional attachment (AWS S3).
                  </CardDescription>
                </div>
                <Button onClick={openAddService}>
                  <Plus className="h-4 w-4" />
                  Add service
                </Button>
              </CardHeader>
              <CardContent>
                {servicesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : services.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-6">
                    No services added. Click Add service to add one.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {services.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="grid gap-1 min-w-0">
                          <p className="font-medium">{s.name}</p>
                          <p className="text-muted-foreground text-sm">
                            ID: {s.serviceId}
                            {revealedServiceId === s.id ? (
                              <> · Pass: <span className="font-mono text-foreground bg-muted/50 px-1 rounded">{s.servicePass}</span></>
                            ) : (
                              <> · Pass: ••••••••</>
                            )}
                          </p>
                          <p className="text-sm">
                            Cost: ₹{Number(s.cost).toLocaleString()} /{" "}
                            {COST_TYPES.find((c) => c.value === s.costType)?.label ?? s.costType}
                            {s.costType === "custom_months" && s.customMonths != null && ` (${s.customMonths} months)`}
                          </p>
                          {s.attachmentUrl && (
                            <a
                              href={s.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-sm inline-flex items-center gap-1 hover:underline"
                            >
                              <Paperclip className="h-3 w-3" />
                              Attachment
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => setRevealedServiceId((prev) => (prev === s.id ? null : s.id))}
                          >
                            {revealedServiceId === s.id ? "Hide details" : "View details"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => openEditService(s)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteService(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={serviceDialogOpen} onOpenChange={(open) => {
              setServiceDialogOpen(open);
              if (!open) setEditingService(null);
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingService ? "Edit service" : "Add service"}</DialogTitle>
                  <DialogDescription>
                    Service name, ID, password, cost type (monthly, daily, or custom months), and optional file attachment (uploaded to AWS S3).
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={submitService} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Service name *</Label>
                    <Input
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. AWS, Hosting"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Service ID *</Label>
                      <Input
                        value={serviceForm.serviceId}
                        onChange={(e) => setServiceForm((f) => ({ ...f, serviceId: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Service pass *</Label>
                      <Input
                        type="password"
                        value={serviceForm.servicePass}
                        onChange={(e) => setServiceForm((f) => ({ ...f, servicePass: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cost</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={serviceForm.cost}
                        onChange={(e) => setServiceForm((f) => ({ ...f, cost: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cost type</Label>
                      <Select
                        value={serviceForm.costType}
                        onValueChange={(v) => setServiceForm((f) => ({ ...f, costType: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COST_TYPES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {serviceForm.costType === "custom_months" && (
                    <div className="space-y-2">
                      <Label>Custom months</Label>
                      <Input
                        type="number"
                        min={1}
                        value={serviceForm.customMonths}
                        onChange={(e) => setServiceForm((f) => ({ ...f, customMonths: e.target.value }))}
                        placeholder="e.g. 3"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Attachment (optional, AWS S3)</Label>
                    <Input
                      type="file"
                      onChange={(e) =>
                        setServiceForm((f) => ({
                          ...f,
                          attachment: e.target.files?.[0] ?? null,
                        }))
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setServiceDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingService}>
                      {savingService && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="documents" className="mt-4 flex-1 overflow-auto min-h-0 data-[state=inactive]:hidden">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Project documents
                </CardTitle>
                <CardDescription>
                  Manage project documents like a drive. Upload files (stored on AWS S3).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={uploadDocument} className="flex flex-wrap items-end gap-4 p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-2">
                    <Label>Document name</Label>
                    <Input
                      value={docUploadName}
                      onChange={(e) => setDocUploadName(e.target.value)}
                      placeholder="e.g. Contract, SRS"
                      className="w-48"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Upload document</Label>
                    <Input
                      type="file"
                      onChange={(e) => setDocUploadFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <Button type="submit" disabled={uploadingDoc || !docUploadName.trim() || !docUploadFile}>
                    {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span className="ml-1">Save</span>
                  </Button>
                </form>

                {documentsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-6">
                    No documents yet. Upload a document above.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {documents.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{d.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : "~"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="ghost" size="icon" asChild>
                            <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" title="Open">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={d.fileUrl} download title="Download">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteDocument(d.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit project sidebar */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit project</SheetTitle>
            <SheetDescription>Update project details, assignees, and manager.</SheetDescription>
          </SheetHeader>
          <form onSubmit={saveEdit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <RichTextEditor
                value={editForm.description}
                onChange={(html) => setEditForm((f) => ({ ...f, description: html }))}
                placeholder="Brief description (formatting, links…)"
                minHeight="100px"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Maintenance start</Label>
                <Input
                  type="date"
                  value={editForm.maintenanceStartDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, maintenanceStartDate: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Maintenance end</Label>
                <Input
                  type="date"
                  value={editForm.maintenanceEndDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, maintenanceEndDate: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Budget (₹)</Label>
                <Input
                  type="number"
                  value={editForm.budget}
                  onChange={(e) => setEditForm((f) => ({ ...f, budget: e.target.value }))}
                  placeholder="e.g. 50000"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Assign team members</Label>
                {editForm.assignedMemberIds.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={clearEditAssignees}
                  >
                    Clear selection
                  </Button>
                )}
              </div>
              {employeesLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : employees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No employees found.</p>
              ) : (
                <ScrollArea className="h-[200px] w-full rounded-xl border border-input p-2">
                  <div className="space-y-2">
                    {employees.map((emp) => {
                      const isChecked = editForm.assignedMemberIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => setEditMemberChecked(emp.id, !!checked)}
                          />
                          <span className="text-sm font-medium">{emp.name}</span>
                          <span className="text-xs text-muted-foreground truncate">{emp.email}</span>
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
              <p className="text-xs text-muted-foreground">Check each team member to assign. Only checked members are sent.</p>
            </div>
            <div className="space-y-2">
              <Label>Manager (single)</Label>
              <Select
                value={editForm.managerId ?? "none"}
                onValueChange={(v) => setEditForm((f) => ({ ...f, managerId: v === "none" ? null : v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Project manager can edit project details.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditSheetOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={savingEdit} className="rounded-xl">
                {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete project confirm */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              {projectHasGeneratedBills ? (
                <>
                  This project has generated bills. Delete all related payments (bills) from the client&apos;s <strong>Payments</strong> tab first, then you can delete the project.
                </>
              ) : (
                <>
                  This action cannot be undone. Are you sure you want to delete &quot;{project.name}&quot;? Services, documents, and related data may be affected.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            {!projectHasGeneratedBills && (
              <Button variant="destructive" onClick={deleteProject} disabled={deletingProject} className="rounded-xl">
                {deletingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
