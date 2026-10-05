import { redirect } from "next/navigation";
import { requireFeatureAccess } from "@/lib/auth";
import { AutoDMClient } from "@/components/autodm-client";

export const metadata = {
  title: "AutoDM | Webwrite Dashboard",
  description: "Automate Instagram DMs from your posts and reels",
};

export default async function AutoDMPage() {
  try {
    await requireFeatureAccess("autodm");
  } catch {
    redirect("/dashboard");
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AutoDMClient />
    </div>
  );
}
