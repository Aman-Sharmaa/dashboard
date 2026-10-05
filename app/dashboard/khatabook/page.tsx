import { requireFeatureAccess } from "@/lib/auth";
import { KhatabookClient } from "@/components/khatabook-client";

export default async function KhatabookPage() {
  await requireFeatureAccess("khatabook");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 border-b pb-8">
        <h2 className="text-3xl font-bold tracking-tight">Gram Books</h2>
        <p className="text-sm text-muted-foreground">
          Manage daily revenue and expense entries with auto profit calculation.
        </p>
      </div>
      <KhatabookClient />
    </div>
  );
}
