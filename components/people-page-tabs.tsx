"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PeopleTableClient } from "@/components/people-table-client";
import { PeopleTreeClient } from "@/components/people-tree-client";
import { TeamMemberOnboardingSection } from "@/components/team-member-onboarding-section";
import { TeamSettingsClient } from "@/components/team-settings-client";
import {
  Users, Link2, List as ListIcon, Network,
  UserCheck, UserX, History, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EmployeeRow = {
  _id: string;
  name: string;
  email: string;
  title?: string;
  department?: string;
  manager?: string;
  location?: string;
  type?: string;
  employeeId?: number;
  phone?: string;
  dateOfHiring?: string | null;
  isDismissed?: boolean;
  avatarUrl?: string;
  assignedProduct?: string;
  assignedService?: string;
};

type Props = {
  employees: EmployeeRow[];
  isAdmin: boolean;
  activeCount: number;
  pastCount: number;
};

export function PeoplePageTabs({ employees, isAdmin, activeCount, pastCount }: Props) {
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");
  const [memberTab, setMemberTab] = useState<"current" | "past">("current");

  const currentEmployees = employees.filter((e) => !e.isDismissed);
  const pastEmployees = employees.filter((e) => e.isDismissed);

  return (
    <Tabs defaultValue="team" className="w-full">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-1">
        <TabsList className="rounded-xl h-11 px-1">
          <TabsTrigger value="team" className="rounded-lg px-4 gap-2">
            <Users className="h-4 w-4" />
            Team members
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="onboarding" className="rounded-lg px-4 gap-2">
                <Link2 className="h-4 w-4" />
                Onboarding
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg px-4 gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* View toggle ~ only visible in team tab */}
        <TabsContent value="team" className="m-0 mt-0">
          <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-muted-foreground/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-8 px-3 rounded-lg gap-2 text-xs font-medium transition-all",
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-900 shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent"
              )}
            >
              <ListIcon className="h-3.5 w-3.5" />
              List
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("tree")}
              className={cn(
                "h-8 px-3 rounded-lg gap-2 text-xs font-medium transition-all",
                viewMode === "tree"
                  ? "bg-white dark:bg-zinc-900 shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent"
              )}
            >
              <Network className="h-3.5 w-3.5" />
              Tree
            </Button>
          </div>
        </TabsContent>
      </div>

      {/* ── Team members content ── */}
      <TabsContent value="team" className="mt-4 space-y-4">

        {/* Current / Past sub-tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-muted-foreground/10 w-fit">
          <button
            onClick={() => setMemberTab("current")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              memberTab === "current"
                ? "bg-white dark:bg-zinc-900 shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserCheck className="h-4 w-4 text-emerald-500" />
            Current
            <Badge
              className={cn(
                "ml-1 px-1.5 py-0 text-[10px] font-bold rounded-full h-5 min-w-5",
                memberTab === "current"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {activeCount}
            </Badge>
          </button>
          <button
            onClick={() => setMemberTab("past")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              memberTab === "past"
                ? "bg-white dark:bg-zinc-900 shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-4 w-4 text-muted-foreground" />
            Past
            <Badge
              className={cn(
                "ml-1 px-1.5 py-0 text-[10px] font-bold rounded-full h-5 min-w-5",
                memberTab === "past"
                  ? "bg-red-100 text-red-700 border-red-200"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {pastCount}
            </Badge>
          </button>
        </div>

        {/* Context hint */}
        {memberTab === "past" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border bg-muted/30 px-3 py-2">
            <UserX className="h-3.5 w-3.5 text-red-400 shrink-0" />
            Showing dismissed / archived profiles. Restore or permanently delete from each person&apos;s profile page.
          </div>
        )}

        {/* Table / Tree */}
        {viewMode === "list" ? (
          <PeopleTableClient
            employees={memberTab === "current" ? currentEmployees : pastEmployees}
            isAdmin={isAdmin}
          />
        ) : (
          <PeopleTreeClient employees={memberTab === "current" ? currentEmployees : pastEmployees} />
        )}
      </TabsContent>

      {isAdmin && (
        <>
          <TabsContent value="onboarding" className="mt-[10px]">
            <TeamMemberOnboardingSection />
          </TabsContent>
          <TabsContent value="settings" className="mt-[10px]">
            <TeamSettingsClient employees={employees} />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}
