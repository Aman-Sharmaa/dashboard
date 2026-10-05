"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, Loader2, User, Briefcase, Link, MapPin, Mail, Image as ImageIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  title: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(["Intern", "Employee", "Part-Time", "Contract"]),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  assignedProduct: z.string().optional(),
  assignedService: z.string().optional(),
}).refine(
  (data) => {
    const hasProduct = data.assignedProduct && 
      data.assignedProduct !== "not_linked" && 
      data.assignedProduct !== "" && 
      data.assignedProduct.trim() !== "";
    const hasService = data.assignedService && 
      data.assignedService !== "not_linked" && 
      data.assignedService !== "" && 
      data.assignedService.trim() !== "";
    return hasProduct || hasService;
  },
  {
    message: "Please assign either a Product or Service",
    path: ["assignedService"],
  }
);

export function AddEmployeeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      title: "",
      department: "",
      location: "",
      type: "Employee",
      avatarUrl: "",
      assignedProduct: "not_linked",
      assignedService: "not_linked",
    },
  });

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
      } catch {
        // ignore
      } finally {
        setOptionsLoading(false);
      }
    }
    load();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Ensure at least one is set
      const hasProduct = values.assignedProduct && values.assignedProduct !== "" && values.assignedProduct !== "not_linked";
      const hasService = values.assignedService && values.assignedService !== "" && values.assignedService !== "not_linked";
      
      if (!hasProduct && !hasService) {
        toast.error("Please assign either a Product or Service");
        return;
      }

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          avatarUrl: values.avatarUrl || undefined,
          assignedProduct: hasProduct ? values.assignedProduct : undefined,
          assignedService: hasService ? values.assignedService : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to create employee");
        return;
      }

      const creds = data.loginCredentials;
      if (creds?.email) {
        toast.success(
          <div className="space-y-1">
            <p className="font-semibold">Employee added.</p>
            <p className="text-xs font-mono bg-muted/50 p-2 rounded break-all">
              Email: {creds.email}
            </p>
            <p className="text-xs text-muted-foreground">They can sign in with email OTP.</p>
          </div>,
          { duration: 9000 }
        );
      } else {
        toast.success("Employee added successfully");
      }
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Add employee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[80vw] p-0 border border-neutral-200/70 bg-white shadow-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 bg-muted/30 border-b">
          <DialogTitle className="text-xl">Add New Employee</DialogTitle>
          <DialogDescription>
            Onboard a new member to your team. All fields are editable later.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <User className="h-4 w-4" /> Identity & Profile
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Avatar URL <span className="text-[10px] font-normal text-muted-foreground uppercase">(Optional)</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="https://example.com/photo.jpg" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="opacity-50" />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Briefcase className="h-4 w-4" /> Role & Placement
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Software Engineer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="Engineering" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="San Francisco" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employment Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Intern">Intern</SelectItem>
                          <SelectItem value="Employee">Employee</SelectItem>
                          <SelectItem value="Part-Time">Part-Time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator className="opacity-50" />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Link className="h-4 w-4" /> Workspace Links
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assignedProduct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project/Product <span className="text-red-500">*</span></FormLabel>
                      <Select
                        value={field.value === "" ? "not_linked" : field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="not_linked">Not Linked</SelectItem>
                          {productOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assignedService"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Focus <span className="text-red-500">*</span></FormLabel>
                      <Select
                        value={field.value === "" ? "not_linked" : field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="not_linked">Not Linked</SelectItem>
                          {serviceOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        * At least one (Product or Service) is required
                      </p>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6 mt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="min-w-[100px]">
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Profile"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
