"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectsClientsClient } from "@/components/projects-clients-client";
import { ClientOnboardingSection } from "@/components/client-onboarding-section";
import { Building2, Link2 } from "lucide-react";

type ClientRow = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  isActive?: boolean;
};

type Props = {
  clients: ClientRow[];
  isAdmin: boolean;
};

export function ClientsPageTabs({ clients, isAdmin }: Props) {
  return (
    <Tabs defaultValue="clients" className="w-full">
      <TabsList className="rounded-xl h-11 px-1">
        <TabsTrigger value="clients" className="rounded-lg px-4 gap-2">
          <Building2 className="h-4 w-4" />
          Clients
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="onboarding" className="rounded-lg px-4 gap-2">
            <Link2 className="h-4 w-4" />
            Onboarding
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="clients" className="mt-6">
        <ProjectsClientsClient clients={clients} isAdmin={isAdmin} />
      </TabsContent>
      {isAdmin && (
        <TabsContent value="onboarding" className="mt-6">
          <ClientOnboardingSection />
        </TabsContent>
      )}
    </Tabs>
  );
}
