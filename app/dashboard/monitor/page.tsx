import { MonitorPageClient } from "@/components/monitor-page-client";

export default async function MonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params?.view;
  const viewLabels: Record<string, string> = {
    "total-up": "Total up",
    "total-down": "Total down",
    percentage: "Percentage of all combined",
  };
  const viewLabel = view ? viewLabels[view] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Monitor{viewLabel ? ` · ${viewLabel}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          {viewLabel
            ? `Showing ${viewLabel.toLowerCase()}. Create groups and add URLs to monitor.`
            : "Create groups, add URLs to monitor, and share a public status page so anyone can see if your services are up."}
        </p>
      </div>
      <MonitorPageClient />
    </div>
  );
}
