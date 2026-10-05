import { requireFeatureAccess } from "@/lib/auth";
import { LeadsPageClient } from "@/components/leads-page";

export default async function LeadsPage() {
  await requireFeatureAccess("leads");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b pb-6 sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 pt-4 lg:-mx-6 lg:px-6 lg:pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leads</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage incoming leads from Rapydlaunch and other sources. Track, filter, and convert to clients.
          </p>
        </div>
      </div>

      <LeadsPageClient />
    </div>
  );
}
