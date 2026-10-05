"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DrivePageClient } from "@/components/drive-page-client";
import { DocumentsTabClient } from "@/components/documents-tab-client";
import { Cloud, FileText } from "lucide-react";

export function DriveTabsClient({ isAdmin, defaultTab = "drive" }: { isAdmin: boolean; defaultTab?: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Cloud className="h-6 w-6 text-primary" />
            Drive & Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Store media, organize folders, and manage documents.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="drive" className="flex items-center gap-1.5">
            <Cloud className="h-4 w-4" />
            Drive
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>
        <TabsContent value="drive" className="mt-4">
          <DrivePageClient isAdmin={isAdmin} hideHeader />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <DocumentsTabClient isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
