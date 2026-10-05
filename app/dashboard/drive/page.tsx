import { requireFeatureAccess } from "@/lib/auth";
import { DriveTabsClient } from "@/components/drive-tabs-client";

export default async function DrivePage() {
  const user = await requireFeatureAccess("drive");
  return <DriveTabsClient isAdmin={user.role === "admin"} />;
}
