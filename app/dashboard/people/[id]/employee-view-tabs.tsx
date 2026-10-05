"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Calendar, FileText, Receipt, Package, CalendarDays, TrendingUp } from "lucide-react";

const TAB_VALUES = ["details", "performance", "leaves", "attendance", "payslips", "reimbursement", "assets"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isValidTab(tab: string | null): tab is TabValue {
  return tab !== null && TAB_VALUES.includes(tab as TabValue);
}

export function EmployeeViewTabs({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get("tab") ?? null;
  const activeTab = isValidTab(tabFromUrl) ? tabFromUrl : "details";

  const setTab = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString());
      params.set("tab", value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const childArray = React.Children.toArray(children);
  const detailsChild = childArray.find(
    (c): c is React.ReactElement => React.isValidElement(c) && (c.props as { "data-tab"?: string })["data-tab"] === "details"
  );
  const performanceChild = childArray.find(
    (c): c is React.ReactElement => React.isValidElement(c) && (c.props as { "data-tab"?: string })["data-tab"] === "performance"
  );
  const attendanceChild = childArray.find(
    (c): c is React.ReactElement => React.isValidElement(c) && (c.props as { "data-tab"?: string })["data-tab"] === "attendance"
  );
  const payslipsChild = childArray.find(
    (c): c is React.ReactElement => React.isValidElement(c) && (c.props as { "data-tab"?: string })["data-tab"] === "payslips"
  );
  const reimbursementChild = childArray.find(
    (c): c is React.ReactElement => React.isValidElement(c) && (c.props as { "data-tab"?: string })["data-tab"] === "reimbursement"
  );
  const leavesChild = childArray.find(
    (c): c is React.ReactElement => React.isValidElement(c) && (c.props as { "data-tab"?: string })["data-tab"] === "leaves"
  );
  const assetsChild = childArray.find(
    (c): c is React.ReactElement => React.isValidElement(c) && (c.props as { "data-tab"?: string })["data-tab"] === "assets"
  );

  return (
    <Tabs value={activeTab} onValueChange={setTab} className="w-full min-w-0">
      <TabsList className="mb-4 w-full sm:w-auto">
        <TabsTrigger value="details" className="gap-2">
          <User className="h-4 w-4" />
          Details
        </TabsTrigger>
        <TabsTrigger value="performance" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Performance
        </TabsTrigger>
        <TabsTrigger value="leaves" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          Leave Balance
        </TabsTrigger>
        <TabsTrigger value="attendance" className="gap-2">
          <Calendar className="h-4 w-4" />
          Attendance
        </TabsTrigger>
        <TabsTrigger value="payslips" className="gap-2">
          <FileText className="h-4 w-4" />
          Payslips
        </TabsTrigger>
        <TabsTrigger value="reimbursement" className="gap-2">
          <Receipt className="h-4 w-4" />
          Reimbursement
        </TabsTrigger>
        <TabsTrigger value="assets" className="gap-2">
          <Package className="h-4 w-4" />
          Assets
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="mt-0 min-w-0">
        {detailsChild}
      </TabsContent>
      <TabsContent value="performance" className="mt-0 min-w-0">
        {performanceChild}
      </TabsContent>
      <TabsContent value="leaves" className="mt-0 min-w-0">
        {leavesChild}
      </TabsContent>
      <TabsContent value="attendance" className="mt-0 min-w-0">
        {attendanceChild}
      </TabsContent>
      <TabsContent value="payslips" className="mt-0 min-w-0">
        {payslipsChild}
      </TabsContent>
      <TabsContent value="reimbursement" className="mt-0 min-w-0">
        {reimbursementChild}
      </TabsContent>
      <TabsContent value="assets" className="mt-0 min-w-0">
        {assetsChild}
      </TabsContent>
    </Tabs>
  );
}
