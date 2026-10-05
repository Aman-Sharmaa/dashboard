"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus, Image as ImageIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { COMPENSATION_CONTRACT_LABELS, newCompensationId } from "@/lib/compensation";

export default function NewEmployeePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<"Intern" | "Employee" | "Part-Time" | "Contract">("Employee");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [assignedProduct, setAssignedProduct] = useState("");
  const [assignedService, setAssignedService] = useState("");
  const [isOutsider, setIsOutsider] = useState(false);
  const [workStartTime, setWorkStartTime] = useState("");
  const [workEndTime, setWorkEndTime] = useState("");
  const [compensationContractType, setCompensationContractType] = useState<
    "monthly" | "one_time" | "phases"
  >("monthly");
  const [annualSalary, setAnnualSalary] = useState("");
  const [numberOfBonuses, setNumberOfBonuses] = useState("");
  const [contractOneTimeAmount, setContractOneTimeAmount] = useState("");
  const [compensationPhases, setCompensationPhases] = useState<
    { id: string; label: string; amount: string; dueDate: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (res.ok && Array.isArray(data.products)) {
          const products = data.products.filter(
            (p: any) => p.kind === "product" && p.isActive !== false
          );
          const services = data.products.filter(
            (p: any) => p.kind === "service" && p.isActive !== false
          );
          setProductOptions(products.map((p: any) => p.name));
          setServiceOptions(services.map((s: any) => s.name));
        }
      } catch (err) {
        console.error("Failed to load options", err);
      } finally {
        setOptionsLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate that at least one (product or service) is assigned
    const hasProduct = assignedProduct && assignedProduct !== "" && assignedProduct !== "none";
    const hasService = assignedService && assignedService !== "" && assignedService !== "none";

    if (!hasProduct && !hasService) {
      toast.error("Please assign either a Product or Service");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          title,
          department,
          location,
          type,
          avatarUrl: avatarUrl || undefined,
          assignedProduct: hasProduct ? assignedProduct : undefined,
          assignedService: hasService ? assignedService : undefined,
          isOutsider,
          workStartTime: workStartTime || undefined,
          workEndTime: workEndTime || undefined,
          compensationContractType,
          annualSalary: annualSalary.trim() || undefined,
          numberOfBonuses: numberOfBonuses.trim() || undefined,
          contractOneTimeAmount:
            compensationContractType === "one_time"
              ? contractOneTimeAmount.trim() || undefined
              : undefined,
          compensationPhases:
            compensationContractType === "phases"
              ? compensationPhases.map((p, i) => ({
                id: p.id,
                label: p.label || `Milestone ${i + 1}`,
                amount: p.amount === "" ? undefined : Number(p.amount),
                dueDate: p.dueDate || undefined,
                sortOrder: i,
              }))
              : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create employee");

      const creds = data.loginCredentials;
      if (creds?.email) {
        toast.success(
          `Employee created. ${creds.email} can sign in with email OTP.`,
          { duration: 8000 }
        );
      } else {
        toast.success("Employee created successfully");
      }
      router.push("/dashboard/people");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b pb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Personnel Onboarding</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Register a new team member or contractor into the workspace repository.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Core Information
            </CardTitle>
            <CardDescription>
              Basic profile and contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-center bg-muted/30 p-4 rounded-lg border border-dashed">
              <Avatar className="h-16 w-16 border-2 border-background">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2 w-full">
                <Label htmlFor="avatarUrl" className="flex items-center gap-2">
                  <ImageIcon className="h-3 w-3" /> Profile Photo URL (Optional)
                </Label>
                <Input
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Archana Kumari"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="archana@Webwrite"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Product Designer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Design"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Remote / Bangalore"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Assignment & Type</CardTitle>
            <CardDescription>
              Define their role and project focus.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Employee Type</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Intern">Intern</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
                    <SelectItem value="Part-Time">Part-Time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Product <span className="text-red-500">*</span></Label>
                <Select value={assignedProduct} onValueChange={setAssignedProduct} disabled={optionsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {productOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Service <span className="text-red-500">*</span></Label>
                <Select value={assignedService} onValueChange={setAssignedService} disabled={optionsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {serviceOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  * At least one (Product or Service) is required
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t">
              <input
                type="checkbox"
                id="isOutsider"
                checked={isOutsider}
                onChange={(e) => setIsOutsider(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
              />
              <div>
                <Label htmlFor="isOutsider" className="cursor-pointer">Outsider</Label>
                <p className="text-xs text-muted-foreground">
                  Outsiders can only see their own tasks and access Task Board, Documents, Drive & assigned Projects.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="workStartTime">Work Start Time</Label>
                <Input
                  id="workStartTime"
                  type="time"
                  value={workStartTime}
                  onChange={(e) => setWorkStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workEndTime">Work End Time</Label>
                <Input
                  id="workEndTime"
                  type="time"
                  value={workEndTime}
                  onChange={(e) => setWorkEndTime(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Compensation (optional)</CardTitle>
            <CardDescription>
              Align with the hiring contract: monthly CTC, a one-time lump sum, or phased milestones. You can refine phases and add payment history on the person&apos;s profile after they are created.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Contract type</Label>
              <Select
                value={compensationContractType}
                onValueChange={(v: "monthly" | "one_time" | "phases") => setCompensationContractType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(COMPENSATION_CONTRACT_LABELS) as Array<keyof typeof COMPENSATION_CONTRACT_LABELS>).map(
                    (k) => (
                      <SelectItem key={k} value={k}>
                        {COMPENSATION_CONTRACT_LABELS[k]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            {compensationContractType === "one_time" && (
              <div className="space-y-2">
                <Label>Total contract amount (₹)</Label>
                <Input
                  value={contractOneTimeAmount}
                  onChange={(e) => setContractOneTimeAmount(e.target.value)}
                  placeholder="e.g. 500000"
                />
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Annual salary / CTC (₹)</Label>
                <Input
                  value={annualSalary}
                  onChange={(e) => setAnnualSalary(e.target.value)}
                  placeholder="For payslips & monthly hires"
                />
              </div>
              <div className="space-y-2">
                <Label>Number of bonuses (optional)</Label>
                <Input
                  value={numberOfBonuses}
                  onChange={(e) => setNumberOfBonuses(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            {compensationContractType === "phases" && (
              <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Milestones</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCompensationPhases((prev) => [
                        ...prev,
                        {
                          id: newCompensationId(),
                          label: `Milestone ${prev.length + 1}`,
                          amount: "",
                          dueDate: "",
                        },
                      ])
                    }
                  >
                    Add milestone
                  </Button>
                </div>
                {compensationPhases.length === 0 && (
                  <p className="text-xs text-muted-foreground">Add at least one phase from the contract.</p>
                )}
                {compensationPhases.map((ph, idx) => (
                  <div key={ph.id} className="grid gap-2 sm:grid-cols-3 border rounded-md bg-background p-3">
                    <div className="space-y-1 sm:col-span-3">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={ph.label}
                        onChange={(e) => {
                          const next = [...compensationPhases];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setCompensationPhases(next);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Amount (₹)</Label>
                      <Input
                        value={ph.amount}
                        onChange={(e) => {
                          const next = [...compensationPhases];
                          next[idx] = { ...next[idx], amount: e.target.value };
                          setCompensationPhases(next);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Target date</Label>
                      <Input
                        type="date"
                        value={ph.dueDate}
                        onChange={(e) => {
                          const next = [...compensationPhases];
                          next[idx] = { ...next[idx], dueDate: e.target.value };
                          setCompensationPhases(next);
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() =>
                          setCompensationPhases((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Employee
          </Button>
        </div>
      </form>
    </div>
  );
}

