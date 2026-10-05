import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { EmployeeActions } from "@/components/employee-actions";
import { EmployeeSectionEdit } from "@/components/employee-section-edit";
import { LeaveResetButton } from "@/components/leave-reset-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  Calendar,
  Clock3,
  CreditCard,
  History,
  Info,
  Landmark,
  MapPin,
  Shield,
  User,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COMPENSATION_CONTRACT_LABELS,
  COMPENSATION_PAYMENT_CATEGORY_LABELS,
} from "@/lib/compensation";
import { EmployeeViewTabs } from "./employee-view-tabs";
import { EmployeePayslipsSection } from "@/components/employee-payslips-section";
import { EmployeeAttendanceSection } from "@/components/employee-attendance-section";
import { EmployeeReimbursementSection } from "@/components/employee-reimbursement-section";
import { EmployeeAssetsSection } from "@/components/employee-assets-section";
import { EmployeeLeaveBalance } from "@/components/employee-leave-balance";
import { EmployeePerformanceDashboard } from "@/components/employee-performance-dashboard";

const COOKIE_NAME = "kalp_auth_token";

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login");
  try {
    return verifyToken(token);
  } catch {
    redirect("/login");
  }
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  await connectDB();

  const { id } = await params;
  const employee = await Employee.findById(id).lean();
  if (!employee) {
    redirect("/dashboard/people");
  }

  let isViewingSelf = false;
  if (user.role === "employee") {
    const currentUserEmployee = await Employee.findOne({ email: user.email }).lean();
    isViewingSelf = Boolean(currentUserEmployee && String(currentUserEmployee._id) === String(employee._id));
    if (!isViewingSelf) redirect("/dashboard/people");
  }

  function formatDate(value?: Date | string | null) {
    if (!value) return "~";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "~";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const initials = employee.name
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-w-0 overflow-x-hidden space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6 min-w-0 flex-1">
          <div className="relative group shrink-0">
            <Avatar className="h-24 w-24 border-4 border-background shadow-xl rounded-2xl group-hover:scale-105 transition-transform duration-300">
              <AvatarImage src={employee.avatarUrl} className="object-cover" />
              <AvatarFallback className="text-2xl font-black bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-background shadow-sm flex items-center justify-center",
              !employee.isDismissed ? "bg-emerald-500" : "bg-muted-foreground"
            )}>
              {!employee.isDismissed && <Shield className="h-3 w-3 text-white" />}
            </div>
          </div>
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 gap-y-1">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground break-words sm:text-2xl md:text-3xl">{employee.name}</h2>
              <Badge
                variant={employee.isDismissed ? "destructive" : "secondary"}
                className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest border border-primary/10 shrink-0"
              >
                {employee.type}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5 bg-muted/30 px-2 py-0.5 rounded-lg shrink-0">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-none">{employee.title || "Team member"}</span>
              </span>
              <span className="flex items-center gap-1.5 bg-muted/30 px-2 py-0.5 rounded-lg shrink-0">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-none">{employee.location || "On-site"}</span>
              </span>
              <span className="text-primary/60 font-bold uppercase text-[10px] tracking-widest shrink-0">
                {employee.department || "Organization"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <EmployeeViewTabs>
        <div data-tab="details" className="grid gap-6 md:grid-cols-2 min-w-0">
          {/* Basic information */}
          <Card className="shadow-sm min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2 min-w-0">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" /> Basic Information
                </CardTitle>
                <CardDescription>Core profile details</CardDescription>
              </div>
              {user.role === "admin" && (
                <EmployeeSectionEdit
                  employeeId={String(employee._id)}
                  section="basic"
                  initial={{
                    name: employee.name || "",
                    email: employee.email || "",
                    title: employee.title || "",
                    department: employee.department || "",
                    location: employee.location || "",
                    manager: employee.manager || "",
                    employeeId: employee.employeeId?.toString() ?? "",
                    avatarUrl: employee.avatarUrl || "",
                    dateOfHiring: employee.dateOfHiring
                      ? new Date(employee.dateOfHiring).toISOString().slice(0, 10)
                      : "",
                    assignedProduct: employee.assignedProduct || "",
                    assignedService: employee.assignedService || "",
                    profileSlug: (employee as any).profileSlug || "",
                    isOutsider: !!employee.isOutsider,
                    workStartTime: employee.workStartTime || "",
                    workEndTime: employee.workEndTime || "",
                    wfhAllowedPerMonth: (employee as any).wfhAllowedPerMonth?.toString() ?? "2",
                  }}
                />
              )}
            </CardHeader>
            <CardContent className="grid gap-4 mt-2 min-w-0">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm min-w-0">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email</p>
                  <p className="font-medium break-all">{employee.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hiring Date</p>
                  <p>{formatDate(employee.dateOfHiring)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Employee ID</p>
                  <p>{employee.employeeId || "~"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Location</p>
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {employee.location || "~"}
                  </p>
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Manager</p>
                  <p className="truncate" title={employee.manager || undefined}>{employee.manager || "~"}</p>
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Role</p>
                  <Badge variant="outline" className="capitalize">{employee.role || "member"}</Badge>
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Assigned Product</p>
                  <p className="font-medium truncate" title={employee.assignedProduct || undefined}>{employee.assignedProduct || "~"}</p>
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Assigned Service</p>
                  <p className="font-medium truncate" title={employee.assignedService || undefined}>{employee.assignedService || "~"}</p>
                </div>
                <div className="space-y-1">
                  <p>{employee.lastLogin ? (typeof employee.lastLogin === "string" ? employee.lastLogin : formatDate(employee.lastLogin)) : "~"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Outsider Status</p>
                  <Badge variant={employee.isOutsider ? "destructive" : "outline"}>
                    {employee.isOutsider ? "Restricted Outsider" : "Internal Member"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Work Schedule</p>
                  <p className="flex items-center gap-1 font-medium">
                    <Clock3 className="h-3 w-3 text-primary" />
                    {employee.workStartTime || "~"} to {employee.workEndTime || "~"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compensation */}
          <Card className="shadow-sm min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2 min-w-0">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                  <Wallet className="h-4 w-4 text-primary shrink-0" /> Compensation
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {COMPENSATION_CONTRACT_LABELS[
                      ((employee as { compensationContractType?: string }).compensationContractType ||
                        "monthly") as keyof typeof COMPENSATION_CONTRACT_LABELS
                    ]}
                  </Badge>
                </CardTitle>
                <CardDescription>Contract type, CTC, advances & phased milestones</CardDescription>
              </div>
              {user.role === "admin" && (
                <EmployeeSectionEdit
                  employeeId={String(employee._id)}
                  section="compensation"
                  initial={{
                    compensationContractType:
                      (employee as { compensationContractType?: string }).compensationContractType ||
                      "monthly",
                    contractOneTimeAmount: (employee as { contractOneTimeAmount?: number }).contractOneTimeAmount?.toString() ?? "",
                    compensationPhases: Array.isArray(
                      (employee as { compensationPhases?: unknown[] }).compensationPhases
                    )
                      ? (employee as { compensationPhases: unknown[] }).compensationPhases
                      : [],
                    annualSalary: employee.annualSalary?.toString() ?? "",
                    numberOfBonuses: employee.numberOfBonuses?.toString() ?? "",
                    currentAdvanceSalary: employee.currentAdvanceSalary?.toString() ?? "",
                    advanceSalaryEmi: employee.advanceSalaryEmi?.toString() ?? "",
                  }}
                />
              )}
            </CardHeader>
            <CardContent className="grid gap-4 mt-2">
              {(employee as { compensationContractType?: string }).compensationContractType ===
                "one_time" && (
                  <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Contract lump sum</p>
                    <p className="text-lg font-semibold">
                      ₹
                      {(employee as { contractOneTimeAmount?: number }).contractOneTimeAmount?.toLocaleString(
                        "en-IN"
                      ) ?? "~"}
                    </p>
                  </div>
                )}
              {(employee as { compensationContractType?: string }).compensationContractType ===
                "phases" &&
                Array.isArray((employee as { compensationPhases?: { label: string; amount?: number; dueDate?: string }[] }).compensationPhases) &&
                (employee as { compensationPhases: { label: string; amount?: number; dueDate?: string }[] })
                  .compensationPhases.length > 0 && (
                  <div className="rounded-lg border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                          <th className="p-2">Milestone</th>
                          <th className="p-2">Amount</th>
                          <th className="p-2">Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(employee as { compensationPhases: { id?: string; label: string; amount?: number; dueDate?: string }[] }).compensationPhases.map((ph) => (
                          <tr key={ph.id || ph.label} className="border-b last:border-0">
                            <td className="p-2 font-medium">{ph.label}</td>
                            <td className="p-2">
                              {ph.amount != null ? `₹${ph.amount.toLocaleString("en-IN")}` : "~"}
                            </td>
                            <td className="p-2 text-muted-foreground">{ph.dueDate || "~"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Annual salary / CTC</p>
                  <p className="text-lg font-bold">₹{employee.annualSalary?.toLocaleString("en-IN") || "0"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bonuses</p>
                  <p>{employee.numberOfBonuses ?? 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Advance Balance</p>
                  <p>₹{employee.currentAdvanceSalary?.toLocaleString("en-IN") ?? 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Advance EMI</p>
                  <p>₹{employee.advanceSalaryEmi?.toLocaleString("en-IN") ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compensation payment log */}
          <Card className="shadow-sm min-w-0 overflow-hidden md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2 min-w-0">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-4 w-4 text-primary shrink-0" /> Compensation payments
                </CardTitle>
                <CardDescription>Salary runs, bonuses, and milestone payouts you record for this person</CardDescription>
              </div>
              {user.role === "admin" && (
                <EmployeeSectionEdit
                  employeeId={String(employee._id)}
                  section="compensationPayments"
                  label="Edit log"
                  initial={{
                    payments: Array.isArray(
                      (employee as { compensationPaymentHistory?: unknown[] }).compensationPaymentHistory
                    )
                      ? (employee as { compensationPaymentHistory: unknown[] }).compensationPaymentHistory
                      : [],
                    phaseOptions: (
                      Array.isArray(
                        (employee as { compensationPhases?: { id: string; label: string }[] }).compensationPhases
                      )
                        ? (employee as { compensationPhases: { id: string; label: string }[] }).compensationPhases
                        : []
                    ).map((p) => ({ id: p.id, label: p.label })),
                  }}
                />
              )}
            </CardHeader>
            <CardContent className="mt-2 overflow-x-auto">
              {(() => {
                const rows = [
                  ...(((employee as { compensationPaymentHistory?: { paidOn: string }[] })
                    .compensationPaymentHistory || []) as { id?: string; paidOn: string; amount: number; category?: string; notes?: string; phaseId?: string }[]),
                ].sort((a, b) => (b.paidOn || "").localeCompare(a.paidOn || ""));
                if (rows.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No payment entries yet. Admins can add them with &quot;Edit log&quot;.
                    </p>
                  );
                }
                return (
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Amount</th>
                        <th className="py-2 pr-3">Category</th>
                        <th className="py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id || `${r.paidOn}-${r.amount}`} className="border-b last:border-0">
                          <td className="py-2 pr-3 whitespace-nowrap">{r.paidOn}</td>
                          <td className="py-2 pr-3 font-medium">₹{Number(r.amount).toLocaleString("en-IN")}</td>
                          <td className="py-2 pr-3">
                            {COMPENSATION_PAYMENT_CATEGORY_LABELS[
                              (r.category || "other") as keyof typeof COMPENSATION_PAYMENT_CATEGORY_LABELS
                            ] || r.category}
                          </td>
                          <td className="py-2 text-muted-foreground max-w-[240px] truncate" title={r.notes}>
                            {r.notes || "~"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </CardContent>
          </Card>

          {/* Statutory & Payment */}
          <Card className="shadow-sm md:col-span-2 min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2 min-w-0">
              <div className="space-y-1 min-w-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary shrink-0" /> Statutory & Payment
                </CardTitle>
                <CardDescription>Tax IDs and Bank details</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {user.role === "admin" && (
                  <>
                    <EmployeeSectionEdit
                      employeeId={String(employee._id)}
                      section="payment"
                      initial={{
                        ifscCode: employee.bankInfo?.ifscCode || "",
                        accountNumber: employee.bankInfo?.accountNumber || "",
                        accountHolderName: employee.bankInfo?.accountHolderName || "",
                      }}
                    />
                    <EmployeeSectionEdit
                      employeeId={String(employee._id)}
                      section="statutory"
                      initial={{
                        pfOptIn: (employee as { pfOptIn?: boolean }).pfOptIn !== false,
                        pan: employee.statutoryInfo?.pan || "",
                        pfStatus: employee.statutoryInfo?.pfStatus || "",
                        pfUan: employee.statutoryInfo?.pfUan || "",
                        professionalTax: employee.statutoryInfo?.professionalTax || "",
                        lwfStatus: employee.statutoryInfo?.lwfStatus || "",
                        esicStatus: employee.statutoryInfo?.esicStatus || "",
                        esicIpNumber: employee.statutoryInfo?.esicIpNumber || "",
                      }}
                    />
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="mt-4 min-w-0">
              <div className="grid gap-6 md:grid-cols-2 min-w-0">
                <div className="space-y-4 min-w-0">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" /> Bank Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm min-w-0">
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Account Holder</p>
                      <p className="break-words font-medium">{employee.bankInfo?.accountHolderName || "~"}</p>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Account Number</p>
                      <p className="font-mono break-all">{employee.bankInfo?.accountNumber || "~"}</p>
                    </div>
                    <div className="space-y-1 min-w-0 col-span-2 md:col-span-1">
                      <p className="text-xs text-muted-foreground">IFSC Code</p>
                      <p className="font-mono break-all">{employee.bankInfo?.ifscCode || "~"}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 min-w-0 md:border-l md:pl-6 md:border-muted">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-muted-foreground shrink-0" /> Statutory IDs
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm min-w-0">
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-muted-foreground">EPF / PF opted in</p>
                      <p>{(employee as { pfOptIn?: boolean }).pfOptIn !== false ? "Yes" : "No"}</p>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-muted-foreground">PAN</p>
                      <p className="font-mono uppercase break-all">{employee.statutoryInfo?.pan || "~"}</p>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-muted-foreground">PF Status</p>
                      <p className="break-words">{employee.statutoryInfo?.pfStatus || "~"}</p>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-muted-foreground">PF UAN</p>
                      <p className="font-mono break-all">{employee.statutoryInfo?.pfUan || "~"}</p>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Professional Tax</p>
                      <p className="break-words">{employee.statutoryInfo?.professionalTax || "~"}</p>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-muted-foreground">LWF Status</p>
                      <p className="break-words">{employee.statutoryInfo?.lwfStatus || "~"}</p>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-muted-foreground">ESIC Status</p>
                      <p className="break-words">{employee.statutoryInfo?.esicStatus || "~"}</p>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-muted-foreground">ESIC IP</p>
                      <p className="font-mono break-all">{employee.statutoryInfo?.esicIpNumber || "~"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leaves & Attendance */}
          <Card className="shadow-sm min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2 min-w-0">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Leaves & Attendance
                  {(employee as any).leaveManualOverride && (
                    <Badge variant="outline" className="text-[10px] font-normal">Manual</Badge>
                  )}
                </CardTitle>
                <CardDescription>Current FY balance</CardDescription>
              </div>
              {user.role === "admin" && (
                <div className="flex items-center gap-2">
                  {(employee as any).leaveManualOverride && (
                    <LeaveResetButton employeeId={String(employee._id)} />
                  )}
                  <EmployeeSectionEdit
                    employeeId={String(employee._id)}
                    section="leaves"
                    initial={{
                      casualLeaveBalance: employee.casualLeaveBalance?.toString() ?? "",
                      casualLeaveTotal: employee.casualLeaveTotal?.toString() ?? "",
                      sickLeaveBalance: employee.sickLeaveBalance?.toString() ?? "",
                      sickLeaveTotal: employee.sickLeaveTotal?.toString() ?? "",
                    }}
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="mt-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 border rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Casual Leaves</p>
                  <p className="text-xl font-bold">
                    {employee.casualLeaveBalance ?? 0} <span className="text-sm font-normal text-muted-foreground">/ {employee.casualLeaveTotal ?? 0}</span>
                  </p>
                </div>
                <div className="p-3 border rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Sick Leaves</p>
                  <p className="text-xl font-bold">
                    {employee.sickLeaveBalance ?? 0} <span className="text-sm font-normal text-muted-foreground">/ {employee.sickLeaveTotal ?? 0}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax & Payroll Details */}
          <Card className="shadow-sm min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2 min-w-0">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" /> Tax & Payroll
                </CardTitle>
                <CardDescription>Tax calculations and previous employer details</CardDescription>
              </div>
              {user.role === "admin" && (
                <EmployeeSectionEdit
                  employeeId={String(employee._id)}
                  section="pastPayroll"
                  initial={{
                    taxableSalary: employee.taxableSalary?.toString() ?? "",
                    exemption: employee.exemption?.toString() ?? "",
                    tdsDeducted: employee.tdsDeducted?.toString() ?? "",
                    prevEmployerTaxableSalary: employee.prevEmployerTaxableSalary?.toString() ?? "",
                    prevEmployerTdsDeducted: employee.prevEmployerTdsDeducted?.toString() ?? "",
                  }}
                />
              )}
            </CardHeader>
            <CardContent className="grid gap-4 mt-2 min-w-0">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm min-w-0">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Taxable Salary</p>
                  <p>₹{employee.taxableSalary?.toLocaleString("en-IN") ?? "~"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Exemption</p>
                  <p>₹{employee.exemption?.toLocaleString("en-IN") ?? "~"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">TDS Deducted</p>
                  <p>₹{employee.tdsDeducted?.toLocaleString("en-IN") ?? "~"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Prev Employer Taxable</p>
                  <p>₹{employee.prevEmployerTaxableSalary?.toLocaleString("en-IN") ?? "~"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Prev Employer TDS</p>
                  <p>₹{employee.prevEmployerTdsDeducted?.toLocaleString("en-IN") ?? "~"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="shadow-sm min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2 min-w-0">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Personal Information
                </CardTitle>
                <CardDescription>Additional personal details</CardDescription>
              </div>
              {user.role === "admin" && (
                <EmployeeSectionEdit
                  employeeId={String(employee._id)}
                  section="other"
                  initial={{
                    phoneNumber: employee.otherInfo?.phoneNumber || "",
                    gender: employee.otherInfo?.gender || "",
                    dateOfBirth: employee.otherInfo?.dateOfBirth || "",
                  }}
                />
              )}
            </CardHeader>
            <CardContent className="grid gap-4 mt-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Phone Number</p>
                  <p>{employee.otherInfo?.phoneNumber || "~"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gender</p>
                  <p className="capitalize">{employee.otherInfo?.gender || "~"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Date of Birth</p>
                  <p>{employee.otherInfo?.dateOfBirth || "~"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card className="shadow-sm border-dashed min-w-0 overflow-hidden">
            <CardHeader className="min-w-0">
              <CardTitle className="text-lg">Administrative Actions</CardTitle>
              <CardDescription>Manage status and access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={employee.isLoginDisabled ? "destructive" : "outline"} className="px-3 py-1">
                  Login: {employee.isLoginDisabled ? "Disabled" : "Enabled"}
                </Badge>
                <Badge variant={employee.isSalaryStopped ? "destructive" : "outline"} className="px-3 py-1">
                  Salary: {employee.isSalaryStopped ? "Stopped" : "Running"}
                </Badge>
              </div>
              <Separator />
              <EmployeeActions
                id={String(employee._id)}
                isDismissed={Boolean(employee.isDismissed)}
              />
            </CardContent>
          </Card>
        </div>

        <div data-tab="performance" className="min-w-0">
          <EmployeePerformanceDashboard
            employeeId={String(employee._id)}
          />
        </div>

        <div data-tab="leaves" className="min-w-0">
          <EmployeeLeaveBalance
            employeeId={String(employee._id)}
            isAdmin={user.role === "admin"}
          />
        </div>

        <div data-tab="payslips" className="min-w-0">
          <EmployeePayslipsSection
            employeeId={String(employee._id)}
            isAdmin={user.role === "admin"}
            dateOfHiring={
              employee.dateOfHiring
                ? new Date(employee.dateOfHiring).toISOString().slice(0, 10)
                : null
            }
          />
        </div>

        <div data-tab="reimbursement" className="min-w-0">
          <EmployeeReimbursementSection
            employeeId={String(employee._id)}
            isAdmin={user.role === "admin"}
            dateOfHiring={
              employee.dateOfHiring
                ? new Date(employee.dateOfHiring).toISOString().slice(0, 10)
                : null
            }
          />
        </div>

        <div data-tab="assets" className="min-w-0">
          <EmployeeAssetsSection
            employeeId={String(employee._id)}
            isAdmin={user.role === "admin"}
          />
        </div>

        <div data-tab="attendance" className="min-w-0">
          <EmployeeAttendanceSection
            employeeId={String(employee._id)}
            userRole={user.role}
            userEmail={user.email}
            isViewingSelf={isViewingSelf}
          />
        </div>
      </EmployeeViewTabs>
    </div>
  );
}

