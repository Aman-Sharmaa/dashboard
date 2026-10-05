"use client";

import { useEffect, useState } from "react";

type BankInfo = {
  ifscCode?: string;
  accountNumber?: string;
  accountHolderName?: string;
};

type StatutoryInfo = {
  pan?: string;
  pfStatus?: string;
  pfUan?: string;
  professionalTax?: string;
  lwfStatus?: string;
  esicStatus?: string;
  esicIpNumber?: string;
};

type OtherInfo = {
  phoneNumber?: string;
  gender?: string;
  dateOfBirth?: string;
};

type EmployeeForEdit = {
  _id: string;
  type: "Intern" | "Employee" | "Part-Time" | "Contract";
  name: string;
  email: string;
  dateOfHiring?: string | Date;
  title?: string;
  employeeId?: number;
  department?: string;
  manager?: string;
  location?: string;
  lastLogin?: string | Date;
  avatarUrl?: string;
  annualSalary?: number;
  numberOfBonuses?: number;
  currentAdvanceSalary?: number;
  advanceSalaryEmi?: number;
  casualLeaveBalance?: number;
  casualLeaveTotal?: number;
  sickLeaveBalance?: number;
  sickLeaveTotal?: number;
  taxableSalary?: number;
  exemption?: number;
  tdsDeducted?: number;
  prevEmployerTaxableSalary?: number;
  prevEmployerTdsDeducted?: number;
  bankInfo?: BankInfo;
  pfOptIn?: boolean;
  statutoryInfo?: StatutoryInfo;
  otherInfo?: OtherInfo;
  role?: string;
  assignedProduct?: string;
  assignedService?: string;
  isOutsider?: boolean;
  workStartTime?: string;
  workEndTime?: string;
};

function parseDateInput(value?: string | Date) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function safeNumber(value: string): number | undefined {
  if (value === "") return undefined;
  const num = Number(value.replace(/,/g, ""));
  return Number.isFinite(num) ? num : undefined;
}

export function EmployeeEditForm({ employee }: { employee: EmployeeForEdit }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState(() => ({
    type: employee.type,
    name: employee.name,
    email: employee.email,
    title: employee.title || "",
    department: employee.department || "",
    location: employee.location || "",
    manager: employee.manager || "",
    employeeId: employee.employeeId?.toString() ?? "",
    dateOfHiring: parseDateInput(employee.dateOfHiring),
    avatarUrl: employee.avatarUrl || "",
    annualSalary: employee.annualSalary?.toString() ?? "",
    numberOfBonuses: employee.numberOfBonuses?.toString() ?? "",
    currentAdvanceSalary: employee.currentAdvanceSalary?.toString() ?? "",
    advanceSalaryEmi: employee.advanceSalaryEmi?.toString() ?? "",
    casualLeaveBalance: employee.casualLeaveBalance?.toString() ?? "",
    casualLeaveTotal: employee.casualLeaveTotal?.toString() ?? "",
    sickLeaveBalance: employee.sickLeaveBalance?.toString() ?? "",
    sickLeaveTotal: employee.sickLeaveTotal?.toString() ?? "",
    taxableSalary: employee.taxableSalary?.toString() ?? "",
    exemption: employee.exemption?.toString() ?? "",
    tdsDeducted: employee.tdsDeducted?.toString() ?? "",
    prevEmployerTaxableSalary:
      employee.prevEmployerTaxableSalary?.toString() ?? "",
    prevEmployerTdsDeducted:
      employee.prevEmployerTdsDeducted?.toString() ?? "",
    bank_ifscCode: employee.bankInfo?.ifscCode || "",
    bank_accountNumber: employee.bankInfo?.accountNumber || "",
    bank_accountHolderName: employee.bankInfo?.accountHolderName || "",
    pfOptIn: employee.pfOptIn !== false,
    statutory_pan: employee.statutoryInfo?.pan || "",
    statutory_pfStatus: employee.statutoryInfo?.pfStatus || "",
    statutory_pfUan: employee.statutoryInfo?.pfUan || "",
    statutory_professionalTax: employee.statutoryInfo?.professionalTax || "",
    statutory_lwfStatus: employee.statutoryInfo?.lwfStatus || "",
    statutory_esicStatus: employee.statutoryInfo?.esicStatus || "",
    statutory_esicIpNumber: employee.statutoryInfo?.esicIpNumber || "",
    other_phoneNumber: employee.otherInfo?.phoneNumber || "",
    other_gender: employee.otherInfo?.gender || "",
    other_dateOfBirth: employee.otherInfo?.dateOfBirth || "",
    role: employee.role || "",
    assignedProduct: employee.assignedProduct || "",
    assignedService: employee.assignedService || "",
    isOutsider: employee.isOutsider || false,
    workStartTime: employee.workStartTime || "",
    workEndTime: employee.workEndTime || "",
  }));

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    async function load() {
      try {
        const [productsRes, employeesRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/employees"),
        ]);
        const productsData = await productsRes.json();
        const employeesData = await employeesRes.json();
        if (productsRes.ok && Array.isArray(productsData.products)) {
          const products = productsData.products.filter(
            (p: any) => p.kind === "product" && p.isActive !== false
          );
          const services = productsData.products.filter(
            (p: any) => p.kind === "service" && p.isActive !== false
          );
          setProductOptions(products.map((p: any) => p.name));
          setServiceOptions(services.map((s: any) => s.name));
        }
        if (employeesRes.ok && Array.isArray(employeesData.employees)) {
          setEmployeeOptions(
            employeesData.employees
              .filter((e: any) => e.id !== employee._id && !e.isDismissed)
              .map((e: any) => ({ id: e.id, name: e.name || e.email || "Unknown" }))
          );
        }
      } catch {
        // ignore
      } finally {
        setOptionsLoading(false);
      }
    }
    load();
  }, [employee._id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate that at least one (product or service) is assigned
    const hasProduct = form.assignedProduct && form.assignedProduct.trim() !== "";
    const hasService = form.assignedService && form.assignedService.trim() !== "";
    
    if (!hasProduct && !hasService) {
      setError("Please assign either a Product or Service");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: any = {
      type: form.type,
      name: form.name,
      email: form.email,
      title: form.title || undefined,
      department: form.department || undefined,
      location: form.location || undefined,
      manager: form.manager || undefined,
      employeeId: form.employeeId ? Number(form.employeeId) : undefined,
      dateOfHiring: form.dateOfHiring ? new Date(form.dateOfHiring) : undefined,
      avatarUrl: form.avatarUrl || undefined,
      annualSalary: safeNumber(form.annualSalary),
      numberOfBonuses: safeNumber(form.numberOfBonuses),
      currentAdvanceSalary: safeNumber(form.currentAdvanceSalary),
      advanceSalaryEmi: safeNumber(form.advanceSalaryEmi),
      casualLeaveBalance: safeNumber(form.casualLeaveBalance),
      casualLeaveTotal: safeNumber(form.casualLeaveTotal),
      sickLeaveBalance: safeNumber(form.sickLeaveBalance),
      sickLeaveTotal: safeNumber(form.sickLeaveTotal),
      taxableSalary: safeNumber(form.taxableSalary),
      exemption: safeNumber(form.exemption),
      tdsDeducted: safeNumber(form.tdsDeducted),
      prevEmployerTaxableSalary: safeNumber(form.prevEmployerTaxableSalary),
      prevEmployerTdsDeducted: safeNumber(form.prevEmployerTdsDeducted),
      bankInfo: {
        ifscCode: form.bank_ifscCode || undefined,
        accountNumber: form.bank_accountNumber || undefined,
        accountHolderName: form.bank_accountHolderName || undefined,
      },
      statutoryInfo: {
        pan: form.statutory_pan || undefined,
        pfStatus: form.statutory_pfStatus || undefined,
        pfUan: form.statutory_pfUan || undefined,
        professionalTax: form.statutory_professionalTax || undefined,
        lwfStatus: form.statutory_lwfStatus || undefined,
        esicStatus: form.statutory_esicStatus || undefined,
        esicIpNumber: form.statutory_esicIpNumber || undefined,
      },
      otherInfo: {
        phoneNumber: form.other_phoneNumber || undefined,
        gender: form.other_gender || undefined,
        dateOfBirth: form.other_dateOfBirth || undefined,
      },
      pfOptIn: form.pfOptIn,
      role: form.role || undefined,
      assignedProduct: form.assignedProduct || undefined,
      assignedService: form.assignedService || undefined,
      isOutsider: form.isOutsider,
      workStartTime: form.workStartTime || undefined,
      workEndTime: form.workEndTime || undefined,
    };

    try {
      const res = await fetch(`/api/employees/${employee._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Failed to update employee");
        return;
      }

      setSuccess("Employee details updated");
      // Refresh current page data
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
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Edit employee details</h3>
        <p className="text-xs text-neutral-500">
          Update core profile, payroll, bank, and statutory information.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          {success}
        </p>
      )}

      {/* Basic info */}
      <div className="grid gap-4 md:grid-cols-[auto,minmax(0,1fr)] items-start">
        <div className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
            {form.avatarUrl ? (
              <img
                src={form.avatarUrl}
                alt="Profile preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{form.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "EP"}</span>
            )}
          </div>
          <p className="text-[11px] text-neutral-500 text-center max-w-[8rem]">
            This photo is shown on team member cards and profile.
          </p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-neutral-700">Profile photo URL</label>
            <input
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              value={form.avatarUrl}
              onChange={(e) => update("avatarUrl", e.target.value)}
              placeholder="Paste a public image URL (optional)"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-neutral-700">Name</label>
              <input
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Archana Kumari"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-neutral-700">Email</label>
              <input
                type="email"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="name@company.com"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Title</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Department</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.department}
            onChange={(e) => update("department", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Location</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Manager</label>
          <select
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
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
          <label className="text-xs text-neutral-700">Employee ID</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.employeeId}
            onChange={(e) => update("employeeId", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Date of hiring</label>
          <input
            type="date"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.dateOfHiring}
            onChange={(e) => update("dateOfHiring", e.target.value)}
          />
        </div>
      </div>

      {/* Compensation */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Annual salary (₹)</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.annualSalary}
            onChange={(e) => update("annualSalary", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Number of bonuses</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.numberOfBonuses}
            onChange={(e) => update("numberOfBonuses", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">
            Current advance salary (₹)
          </label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.currentAdvanceSalary}
            onChange={(e) => update("currentAdvanceSalary", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Advance salary EMI (₹)</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.advanceSalaryEmi}
            onChange={(e) => update("advanceSalaryEmi", e.target.value)}
          />
        </div>
      </div>

      {/* Leaves */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">
            Casual leave (balance / total)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="Balance"
              value={form.casualLeaveBalance}
              onChange={(e) => update("casualLeaveBalance", e.target.value)}
            />
            <input
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="Total"
              value={form.casualLeaveTotal}
              onChange={(e) => update("casualLeaveTotal", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">
            Sick leave (balance / total)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="Balance"
              value={form.sickLeaveBalance}
              onChange={(e) => update("sickLeaveBalance", e.target.value)}
            />
            <input
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="Total"
              value={form.sickLeaveTotal}
              onChange={(e) => update("sickLeaveTotal", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Past payroll */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Taxable salary (₹)</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.taxableSalary}
            onChange={(e) => update("taxableSalary", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Exemption (₹)</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.exemption}
            onChange={(e) => update("exemption", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">TDS deducted (₹)</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.tdsDeducted}
            onChange={(e) => update("tdsDeducted", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">
            Previous employer taxable salary (₹)
          </label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.prevEmployerTaxableSalary}
            onChange={(e) =>
              update("prevEmployerTaxableSalary", e.target.value)
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">
            Previous employer TDS deducted (₹)
          </label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.prevEmployerTdsDeducted}
            onChange={(e) =>
              update("prevEmployerTdsDeducted", e.target.value)
            }
          />
        </div>
      </div>

      {/* Bank info */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">IFSC code</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.bank_ifscCode}
            onChange={(e) => update("bank_ifscCode", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Account number</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.bank_accountNumber}
            onChange={(e) => update("bank_accountNumber", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">
            Account holder name
          </label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.bank_accountHolderName}
            onChange={(e) => update("bank_accountHolderName", e.target.value)}
          />
        </div>
      </div>

      {/* Statutory info */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex items-center gap-2 md:col-span-3">
          <input
            type="checkbox"
            id="pfOptIn"
            checked={form.pfOptIn}
            onChange={(e) => update("pfOptIn", e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500"
          />
          <label htmlFor="pfOptIn" className="text-sm text-neutral-700">
            Opted into EPF/PF (PF deduction applied in payslip)
          </label>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">PAN</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.statutory_pan}
            onChange={(e) => update("statutory_pan", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">PF status</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.statutory_pfStatus}
            onChange={(e) => update("statutory_pfStatus", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">PF UAN</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.statutory_pfUan}
            onChange={(e) => update("statutory_pfUan", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Professional tax</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.statutory_professionalTax}
            onChange={(e) =>
              update("statutory_professionalTax", e.target.value)
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">LWF status</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.statutory_lwfStatus}
            onChange={(e) => update("statutory_lwfStatus", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">ESIC status</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.statutory_esicStatus}
            onChange={(e) => update("statutory_esicStatus", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">ESIC IP number</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.statutory_esicIpNumber}
            onChange={(e) =>
              update("statutory_esicIpNumber", e.target.value)
            }
          />
        </div>
      </div>

      {/* Other info & role / assignment */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Phone number</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.other_phoneNumber}
            onChange={(e) => update("other_phoneNumber", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Gender</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.other_gender}
            onChange={(e) => update("other_gender", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Date of birth</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            placeholder="DD/MM/YYYY or text"
            value={form.other_dateOfBirth}
            onChange={(e) => update("other_dateOfBirth", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">Role</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
            placeholder="e.g. Admin, Intern, Part-Time"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">
            Assigned product <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.assignedProduct}
            onChange={(e) => update("assignedProduct", e.target.value)}
            disabled={optionsLoading}
          >
            <option value="">Not linked</option>
            {productOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-700">
            Assigned service <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={form.assignedService}
            onChange={(e) => update("assignedService", e.target.value)}
            disabled={optionsLoading}
          >
            <option value="">Not linked</option>
            {serviceOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            * At least one (Product or Service) is required
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end pt-2">
        <div className="flex items-center gap-3 mr-auto">
          <input
            type="checkbox"
            id="isOutsider"
            checked={form.isOutsider}
            onChange={(e) => update("isOutsider", e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500"
          />
          <div>
            <label htmlFor="isOutsider" className="text-sm font-medium text-neutral-700 cursor-pointer">
              Outsider
            </label>
            <p className="text-xs text-neutral-500">
              Can only see own tasks &amp; limited sidebar access.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="space-y-2">
          <label htmlFor="workStartTime" className="text-sm font-medium text-neutral-700">
            Work Start Time
          </label>
          <input
            id="workStartTime"
            type="time"
            value={form.workStartTime}
            onChange={(e) => update("workStartTime", e.target.value)}
            className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="workEndTime" className="text-sm font-medium text-neutral-700">
            Work End Time
          </label>
          <input
            id="workEndTime"
            type="time"
            value={form.workEndTime}
            onChange={(e) => update("workEndTime", e.target.value)}
            className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}

