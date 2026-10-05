"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, Building2 } from "lucide-react";
import { ProjectsFolderClient } from "@/components/projects-folder-client";
import type { ProjectFolderRow } from "@/components/projects-folder-client";
import { ProjectsClientsClient } from "@/components/projects-clients-client";

type ClientRow = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  isActive?: boolean;
};

type Props = {
  folderProjects: ProjectFolderRow[];
  clients: ClientRow[];
  isAdmin: boolean;
};

export function ProjectsPageClient({ folderProjects, clients, isAdmin }: Props) {
  const [tab, setTab] = useState("projects");

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList className="bg-muted/50 rounded-xl p-1 h-auto flex-wrap">
        <TabsTrigger
          value="projects"
          className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          <FolderOpen className="h-4 w-4" />
          Projects
        </TabsTrigger>
        <TabsTrigger
          value="clients"
          className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          <Building2 className="h-4 w-4" />
          Clients
        </TabsTrigger>
      </TabsList>
      <TabsContent value="projects" className="mt-0">
        <ProjectsFolderClient projects={folderProjects} />
      </TabsContent>
      <TabsContent value="clients" className="mt-0">
        <ProjectsClientsClient clients={clients} isAdmin={isAdmin} />
      </TabsContent>
    </Tabs>
  );
}
