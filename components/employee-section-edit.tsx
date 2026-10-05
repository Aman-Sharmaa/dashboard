"use client";

import { useEffect, useState } from "react";
import {
  COMPENSATION_CONTRACT_LABELS,
  COMPENSATION_PAYMENT_CATEGORY_LABELS,
  newCompensationId,
  normalizeCompensationPaymentHistory,
  normalizeCompensationPhases,
  normalizeContractType,
} from "@/lib/compensation";

type Section =
  | "basic"
  | "compensation"
  | "compensationPayments"
  | "leaves"
  | "pastPayroll"
  | "payment"
  | "statutory"
  | "other"
  | "role";

interface EmployeeSectionEditProps {
  employeeId: string;
  section: Section;
  label?: string;
  initial: any;
}

function safeNumber(value: string): number | undefined {
  if (value === "") return undefined;
  const num = Number(value.replace(/,/g, ""));
  return Number.isFinite(num) ? num : undefined;
}

export function EmployeeSectionEdit({
  employeeId,
  section,
  label = "Edit",
  initial,
}: EmployeeSectionEditProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<any>(initial);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; name: string }[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (section !== "basic") {
      setOptionsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [productsRes, employeesRes, deptsRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/employees"),
          fetch("/api/departments"),
        ]);
        const productsData = await productsRes.json();
        const employeesData = await employeesRes.json();
        const deptsData = await deptsRes.json();
        if (!cancelled && productsRes.ok && Array.isArray(productsData.products)) {
          const products = productsData.products.filter(
            (p: any) => p.kind === "product" && p.isActive !== false
          );
          const services = productsData.products.filter(
            (p: any) => p.kind === "service" && p.isActive !== false
          );
          setProductOptions(products.map((p: any) => p.name));
          setServiceOptions(services.map((s: any) => s.name));
        }
        if (!cancelled && employeesRes.ok && Array.isArray(employeesData.employees)) {
          setEmployeeOptions(
            employeesData.employees
              .filter((e: any) => e.id !== employeeId && !e.isDismissed)
              .map((e: any) => ({ id: e.id, name: e.name || e.email || "Unknown" }))
          );
        }
        if (!cancelled && deptsRes.ok && Array.isArray(deptsData.departments)) {
          setDepartmentOptions(deptsData.departments.map((d: any) => d.name));
        }
      } catch {
        // ignore and fall back to manual values
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [section, employeeId]);

  function update(key: string, value: any) {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Validate that at least one (product or service) is assigned for basic section
    if (section === "basic") {
      const hasProduct = form.assignedProduct && form.assignedProduct !== null && form.assignedProduct.trim() !== "";
      const hasService = form.assignedService && form.assignedService !== null && form.assignedService.trim() !== "";

      if (!hasProduct && !hasService) {
        setError("Please assign either a Product or Service");
        return;
      }
    }

    setSaving(true);
    setError(null);

    let payload: any = {};

    switch (section) {
      case "basic":
        payload = {
          name: form.name,
          email: form.email,
          title: form.title || undefined,
          department: form.department || undefined,
          location: form.location || undefined,
          manager: form.manager || undefined,
          employeeId: form.employeeId ? Number(form.employeeId) : undefined,
          avatarUrl: form.avatarUrl || undefined,
          dateOfHiring: form.dateOfHiring
            ? new Date(form.dateOfHiring)
            : undefined,
          assignedProduct:
            form.assignedProduct === null
              ? null
              : form.assignedProduct || undefined,
          assignedService:
            form.assignedService === null
              ? null
              : form.assignedService || undefined,
          profileSlug: form.profileSlug || undefined,
          isOutsider: !!form.isOutsider,
          workStartTime: form.workStartTime || undefined,
          workEndTime: form.workEndTime || undefined,
          wfhAllowedPerMonth: form.wfhAllowedPerMonth !== "" && form.wfhAllowedPerMonth !== undefined ? Number(form.wfhAllowedPerMonth) : undefined,
        };
        break;
      case "compensation": {
        const contractType = normalizeContractType(form.compensationContractType);
        payload = {
          compensationContractType: contractType,
          contractOneTimeAmount:
            contractType === "one_time" ? safeNumber(form.contractOneTimeAmount) : null,
          compensationPhases:
            contractType === "phases"
              ? normalizeCompensationPhases(form.compensationPhases)
              : [],
          annualSalary: safeNumber(form.annualSalary),
          numberOfBonuses: safeNumber(form.numberOfBonuses),
          currentAdvanceSalary: safeNumber(form.currentAdvanceSalary),
          advanceSalaryEmi: safeNumber(form.advanceSalaryEmi),
        };
        break;
      }
      case "compensationPayments":
        payload = {
          compensationPaymentHistory: normalizeCompensationPaymentHistory(form.payments),
        };
        break;
      case "leaves":
        payload = {
          casualLeaveBalance: safeNumber(form.casualLeaveBalance),
          casualLeaveTotal: safeNumber(form.casualLeaveTotal),
          sickLeaveBalance: safeNumber(form.sickLeaveBalance),
          sickLeaveTotal: safeNumber(form.sickLeaveTotal),
          leaveManualOverride: true,
        };
        break;
      case "pastPayroll":
        payload = {
          taxableSalary: safeNumber(form.taxableSalary),
          exemption: safeNumber(form.exemption),
          tdsDeducted: safeNumber(form.tdsDeducted),
          prevEmployerTaxableSalary: safeNumber(form.prevEmployerTaxableSalary),
          prevEmployerTdsDeducted: safeNumber(form.prevEmployerTdsDeducted),
        };
        break;
      case "payment":
        payload = {
          bankInfo: {
            ifscCode: form.ifscCode || undefined,
            accountNumber: form.accountNumber || undefined,
            accountHolderName: form.accountHolderName || undefined,
          },
        };
        break;
      case "statutory":
        payload = {
          pfOptIn: form.pfOptIn,
          statutoryInfo: {
            pan: form.pan || undefined,
            pfStatus: form.pfStatus || undefined,
            pfUan: form.pfUan || undefined,
            professionalTax: form.professionalTax || undefined,
            lwfStatus: form.lwfStatus || undefined,
            esicStatus: form.esicStatus || undefined,
            esicIpNumber: form.esicIpNumber || undefined,
          },
        };
        break;
      case "other":
        payload = {
          otherInfo: {
            phoneNumber: form.phoneNumber || undefined,
            gender: form.gender || undefined,
            dateOfBirth: form.dateOfBirth || undefined,
          },
        };
        break;
      case "role":
        payload = {
          role: form.role || undefined,
        };
        break;
    }

    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to update");
        return;
      }

      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-[11px] font-medium text-neutral-800 hover:bg-neutral-50"
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
          <div
            className={`w-full rounded-2xl bg-white p-5 shadow-xl my-auto max-h-[90vh] overflow-y-auto ${section === "compensation" || section === "compensationPayments"
                ? "max-w-2xl"
                : "max-w-md"
              }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">
                Edit{" "}
                {{
                  basic: "basic information",
                  compensation: "compensation & contract",
                  compensationPayments: "compensation payment history",
                  leaves: "leaves & attendance",
                  pastPayroll: "past payroll",
                  payment: "payment information",
                  statutory: "statutory information",
                  other: "other information",
                  role: "user roles & permissions",
                }[section]}
              </h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-neutral-500 hover:text-neutral-800"
              >
                ✕
              </button>
            </div>

            {error && (
              <p className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              {section === "basic" && (
                <>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Profile Photo</label>
                    {/* Preview */}
                    {form.avatarUrl && (
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={form.avatarUrl}
                          alt="Profile preview"
                          className="h-14 w-14 rounded-xl object-cover border border-neutral-200 shadow-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <button
                          type="button"
                          onClick={() => update("avatarUrl", "")}
                          className="text-[10px] text-red-500 hover:underline"
                        >
                          Remove photo
                        </button>
                      </div>
                    )}
                    {/* File upload */}
                    <div className="flex items-center gap-2">
                      <label className={`flex items-center gap-1.5 cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 transition-colors ${
                        avatarUploading ? "opacity-60 pointer-events-none" : ""
                      }`}>
                        {avatarUploading ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-neutral-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Uploading…
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0L8 8m4-4l4 4" /></svg>
                            Upload Photo
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={avatarUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setAvatarUploading(true);
                            try {
                              const fd = new FormData();
                              fd.append("file", file);
                              const res = await fetch("/api/cms/upload", { method: "POST", body: fd });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.message || "Upload failed");
                              update("avatarUrl", data.url);
                            } catch (err: any) {
                              setError(err.message || "Failed to upload photo");
                            } finally {
                              setAvatarUploading(false);
                              // reset file input
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                      <span className="text-[10px] text-neutral-400">or paste URL below</span>
                    </div>
                    {/* Manual URL fallback */}
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 mt-1"
                      value={form.avatarUrl || ""}
                      onChange={(e) => update("avatarUrl", e.target.value)}
                      placeholder="Or paste a public image URL (optional)"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">
                      Associated with <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={
                        form.assignedProduct
                          ? `product:${form.assignedProduct}`
                          : form.assignedService
                            ? `service:${form.assignedService}`
                            : ""
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((prev: any) => {
                          if (!value) {
                            // Explicitly clear both so DB gets null
                            return {
                              ...prev,
                              assignedProduct: null,
                              assignedService: null,
                            };
                          }
                          if (value.startsWith("product:")) {
                            return {
                              ...prev,
                              assignedProduct: value.replace("product:", ""),
                              assignedService: null,
                            };
                          }
                          if (value.startsWith("service:")) {
                            return {
                              ...prev,
                              assignedProduct: null,
                              assignedService: value.replace("service:", ""),
                            };
                          }
                          return prev;
                        });
                      }}
                      disabled={optionsLoading}
                      required
                    >
                      <option value="">Select product or service</option>
                      {productOptions.length > 0 && (
                        <optgroup label="Products">
                          {productOptions.map((name) => (
                            <option key={name} value={`product:${name}`}>
                              {name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {serviceOptions.length > 0 && (
                        <optgroup label="Services">
                          {serviceOptions.map((name) => (
                            <option key={name} value={`service:${name}`}>
                              {name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      * At least one (Product or Service) is required
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Name</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Email</label>
                    <input
                      type="email"
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Title</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Department</label>
                    {departmentOptions.length > 0 ? (
                      <select
                        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        value={form.department || ""}
                        onChange={(e) => update("department", e.target.value)}
                        disabled={optionsLoading}
                      >
                        <option value="">Select department</option>
                        {departmentOptions.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        value={form.department}
                        onChange={(e) => update("department", e.target.value)}
                        placeholder="Add departments in Settings → Workspace policy"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Profile Slug</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">/@</span>
                      <input
                        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        value={form.profileSlug || ""}
                        onChange={(e) => update("profileSlug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                        placeholder="e.g. aman-sharma"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Public profile URL: /@slug</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Location</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.location}
                      onChange={(e) => update("location", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Manager</label>
                    <select
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={
                        employeeOptions.some((e) => e.id === form.manager)
                          ? form.manager
                          : employeeOptions.find((e) => e.name === form.manager)?.id ?? ""
                      }
                      onChange={(e) => update("manager", e.target.value)}
                      disabled={optionsLoading}
                    >
                      <option value="">None</option>
                      {employeeOptions.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Employee ID</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.employeeId}
                      onChange={(e) => update("employeeId", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Date of joining</label>
                    <input
                      type="date"
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.dateOfHiring || ""}
                      onChange={(e) => update("dateOfHiring", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="edit-isOutsider"
                      checked={!!form.isOutsider}
                      onChange={(e) => update("isOutsider", e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor="edit-isOutsider" className="text-neutral-700 font-medium">
                      Outsider (Restricted Access)
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-neutral-700">Work Start Time</label>
                      <input
                        type="time"
                        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        value={form.workStartTime || ""}
                        onChange={(e) => update("workStartTime", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-neutral-700">Work End Time</label>
                      <input
                        type="time"
                        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        value={form.workEndTime || ""}
                        onChange={(e) => update("workEndTime", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">WFH Days Allowed / Month</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.wfhAllowedPerMonth ?? ""}
                      onChange={(e) => update("wfhAllowedPerMonth", e.target.value)}
                      placeholder="e.g. 2"
                    />
                    <p className="text-[10px] text-neutral-500">Max WFH days this person can take per month (used in Performance tab)</p>
                  </div>
                </>
              )}

              {section === "compensation" && (
                <>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Compensation (contract) type</label>
                    <select
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.compensationContractType || "monthly"}
                      onChange={(e) => update("compensationContractType", e.target.value)}
                    >
                      {(Object.keys(COMPENSATION_CONTRACT_LABELS) as Array<keyof typeof COMPENSATION_CONTRACT_LABELS>).map(
                        (k) => (
                          <option key={k} value={k}>
                            {COMPENSATION_CONTRACT_LABELS[k]}
                          </option>
                        )
                      )}
                    </select>
                    <p className="text-[10px] text-neutral-500">
                      Matches typical hiring contracts: recurring monthly CTC, a single lump sum, or milestone-based payouts.
                    </p>
                  </div>

                  {(form.compensationContractType || "monthly") === "one_time" && (
                    <div className="space-y-1">
                      <label className="text-neutral-700">Total contract amount (₹)</label>
                      <input
                        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        value={form.contractOneTimeAmount ?? ""}
                        onChange={(e) => update("contractOneTimeAmount", e.target.value)}
                        placeholder="e.g. signing + completion lump sum"
                      />
                    </div>
                  )}

                  {(form.compensationContractType || "monthly") === "phases" && (
                    <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-neutral-800">Contract phases / milestones</span>
                        <button
                          type="button"
                          className="text-[11px] font-medium text-red-600 hover:underline"
                          onClick={() => {
                            const list = [...(form.compensationPhases || [])];
                            list.push({
                              id: newCompensationId(),
                              label: `Milestone ${list.length + 1}`,
                              amount: undefined,
                              dueDate: "",
                              sortOrder: list.length,
                              notes: "",
                            });
                            update("compensationPhases", list);
                          }}
                        >
                          + Add phase
                        </button>
                      </div>
                      {(form.compensationPhases || []).length === 0 && (
                        <p className="text-[10px] text-neutral-500">No phases yet ~ add milestones from the contract.</p>
                      )}
                      {(form.compensationPhases || []).map((ph: any, idx: number) => (
                        <div
                          key={ph.id || idx}
                          className="grid gap-2 rounded-md border border-neutral-200 bg-white p-2 sm:grid-cols-2"
                        >
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] text-neutral-600">Label</label>
                            <input
                              className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                              value={ph.label}
                              onChange={(e) => {
                                const list = [...(form.compensationPhases || [])];
                                list[idx] = { ...list[idx], label: e.target.value };
                                update("compensationPhases", list);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-neutral-600">Amount (₹)</label>
                            <input
                              className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                              value={ph.amount != null ? String(ph.amount) : ""}
                              onChange={(e) => {
                                const list = [...(form.compensationPhases || [])];
                                list[idx] = { ...list[idx], amount: e.target.value };
                                update("compensationPhases", list);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-neutral-600">Target date</label>
                            <input
                              type="date"
                              className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                              value={ph.dueDate || ""}
                              onChange={(e) => {
                                const list = [...(form.compensationPhases || [])];
                                list[idx] = { ...list[idx], dueDate: e.target.value };
                                update("compensationPhases", list);
                              }}
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2 flex justify-end">
                            <button
                              type="button"
                              className="text-[10px] text-red-600 hover:underline"
                              onClick={() => {
                                const list = (form.compensationPhases || []).filter((_: any, i: number) => i !== idx);
                                update(
                                  "compensationPhases",
                                  list.map((p: any, i: number) => ({ ...p, sortOrder: i }))
                                );
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-neutral-100 pt-2 space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                      Payroll figures (used for payslips & advances)
                    </p>
                    <div className="space-y-1">
                      <label className="text-neutral-700">Annual salary / CTC (₹)</label>
                      <input
                        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        value={form.annualSalary}
                        onChange={(e) => update("annualSalary", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-neutral-700">Number of bonuses</label>
                      <input
                        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        value={form.numberOfBonuses}
                        onChange={(e) => update("numberOfBonuses", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-neutral-700">Current advance salary (₹)</label>
                      <input
                        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        value={form.currentAdvanceSalary}
                        onChange={(e) => update("currentAdvanceSalary", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-neutral-700">Advance salary EMI (₹)</label>
                      <input
                        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        value={form.advanceSalaryEmi}
                        onChange={(e) => update("advanceSalaryEmi", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {section === "compensationPayments" && (
                <>
                  <p className="text-[10px] text-neutral-500 mb-2">
                    Record each payout (salary run, bonus, phase payment). Rows with no date or invalid amount are ignored on save.
                  </p>
                  <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                    {(form.payments || []).map((row: any, idx: number) => (
                      <div
                        key={row.id || idx}
                        className="grid gap-2 rounded-lg border border-neutral-200 bg-neutral-50/50 p-2 sm:grid-cols-6"
                      >
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[10px] text-neutral-600">Date paid</label>
                          <input
                            type="date"
                            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                            value={row.paidOn || ""}
                            onChange={(e) => {
                              const list = [...(form.payments || [])];
                              list[idx] = { ...list[idx], paidOn: e.target.value };
                              update("payments", list);
                            }}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[10px] text-neutral-600">Amount (₹)</label>
                          <input
                            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                            value={row.amount != null ? String(row.amount) : ""}
                            onChange={(e) => {
                              const list = [...(form.payments || [])];
                              list[idx] = { ...list[idx], amount: e.target.value };
                              update("payments", list);
                            }}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[10px] text-neutral-600">Category</label>
                          <select
                            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                            value={row.category || "other"}
                            onChange={(e) => {
                              const list = [...(form.payments || [])];
                              list[idx] = { ...list[idx], category: e.target.value };
                              update("payments", list);
                            }}
                          >
                            {(
                              Object.keys(COMPENSATION_PAYMENT_CATEGORY_LABELS) as Array<
                                keyof typeof COMPENSATION_PAYMENT_CATEGORY_LABELS
                              >
                            ).map((k) => (
                              <option key={k} value={k}>
                                {COMPENSATION_PAYMENT_CATEGORY_LABELS[k]}
                              </option>
                            ))}
                          </select>
                        </div>
                        {(form.phaseOptions || []).length > 0 && (
                          <div className="space-y-1 sm:col-span-3">
                            <label className="text-[10px] text-neutral-600">Link to phase (optional)</label>
                            <select
                              className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                              value={row.phaseId || ""}
                              onChange={(e) => {
                                const list = [...(form.payments || [])];
                                list[idx] = { ...list[idx], phaseId: e.target.value || undefined };
                                update("payments", list);
                              }}
                            >
                              <option value="">~</option>
                              {(form.phaseOptions || []).map((opt: { id: string; label: string }) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="space-y-1 sm:col-span-6">
                          <label className="text-[10px] text-neutral-600">Notes</label>
                          <input
                            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                            value={row.notes || ""}
                            onChange={(e) => {
                              const list = [...(form.payments || [])];
                              list[idx] = { ...list[idx], notes: e.target.value };
                              update("payments", list);
                            }}
                            placeholder="Invoice ref, month, etc."
                          />
                        </div>
                        <div className="sm:col-span-6 flex justify-end">
                          <button
                            type="button"
                            className="text-[10px] text-red-600 hover:underline"
                            onClick={() => {
                              update(
                                "payments",
                                (form.payments || []).filter((_: any, i: number) => i !== idx)
                              );
                            }}
                          >
                            Remove row
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-md border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    onClick={() => {
                      const list = [...(form.payments || [])];
                      list.push({
                        id: newCompensationId(),
                        paidOn: new Date().toISOString().slice(0, 10),
                        amount: 0,
                        category: "other",
                        notes: "",
                      });
                      update("payments", list);
                    }}
                  >
                    + Add payment entry
                  </button>
                </>
              )}

              {section === "leaves" && (
                <>
                  <div className="space-y-1">
                    <label className="text-neutral-700">
                      Casual leave balance
                    </label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.casualLeaveBalance}
                      onChange={(e) =>
                        update("casualLeaveBalance", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">
                      Casual leave total
                    </label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.casualLeaveTotal}
                      onChange={(e) =>
                        update("casualLeaveTotal", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">
                      Sick leave balance
                    </label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.sickLeaveBalance}
                      onChange={(e) =>
                        update("sickLeaveBalance", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Sick leave total</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.sickLeaveTotal}
                      onChange={(e) =>
                        update("sickLeaveTotal", e.target.value)
                      }
                    />
                  </div>
                </>
              )}

              {section === "pastPayroll" && (
                <>
                  <div className="space-y-1">
                    <label className="text-neutral-700">
                      Taxable salary (₹)
                    </label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.taxableSalary}
                      onChange={(e) =>
                        update("taxableSalary", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Exemption (₹)</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.exemption}
                      onChange={(e) => update("exemption", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">
                      TDS deducted (₹)
                    </label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.tdsDeducted}
                      onChange={(e) => update("tdsDeducted", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">
                      Previous employer taxable salary (₹)
                    </label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.prevEmployerTaxableSalary}
                      onChange={(e) =>
                        update("prevEmployerTaxableSalary", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">
                      Previous employer TDS deducted (₹)
                    </label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.prevEmployerTdsDeducted}
                      onChange={(e) =>
                        update("prevEmployerTdsDeducted", e.target.value)
                      }
                    />
                  </div>
                </>
              )}

              {section === "payment" && (
                <>
                  <div className="space-y-1">
                    <label className="text-neutral-700">IFSC code</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.ifscCode}
                      onChange={(e) => update("ifscCode", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Account number</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.accountNumber}
                      onChange={(e) =>
                        update("accountNumber", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">
                      Account holder name
                    </label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.accountHolderName}
                      onChange={(e) =>
                        update("accountHolderName", e.target.value)
                      }
                    />
                  </div>
                </>
              )}

              {section === "statutory" && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="section-pfOptIn"
                      checked={form.pfOptIn !== false}
                      onChange={(e) => update("pfOptIn", e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor="section-pfOptIn" className="text-neutral-700">
                      Opted into EPF/PF (PF deduction in payslip)
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">PAN</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.pan}
                      onChange={(e) => update("pan", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">PF status</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.pfStatus}
                      onChange={(e) => update("pfStatus", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">PF UAN</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.pfUan}
                      onChange={(e) => update("pfUan", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Professional tax</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.professionalTax}
                      onChange={(e) =>
                        update("professionalTax", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">LWF status</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.lwfStatus}
                      onChange={(e) => update("lwfStatus", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">ESIC status</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.esicStatus}
                      onChange={(e) => update("esicStatus", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">ESIC IP number</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.esicIpNumber}
                      onChange={(e) => update("esicIpNumber", e.target.value)}
                    />
                  </div>
                </>
              )}

              {section === "other" && (
                <>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Phone number</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.phoneNumber}
                      onChange={(e) => update("phoneNumber", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Gender</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.gender}
                      onChange={(e) => update("gender", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-700">Date of birth</label>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      value={form.dateOfBirth}
                      onChange={(e) => update("dateOfBirth", e.target.value)}
                    />
                  </div>
                </>
              )}

              {section === "role" && (
                <div className="space-y-1">
                  <label className="text-neutral-700">Role</label>
                  <input
                    className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    value={form.role}
                    onChange={(e) => update("role", e.target.value)}
                    placeholder="e.g. Admin, Intern, Part-Time"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

