import { DeploymentPageClient } from "@/components/deployment-page-client";

export const metadata = { title: "Deployments | Webwrite" };

export default function DeploymentPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 border-b pb-6">
        <h2 className="text-3xl font-bold tracking-tight">Deployment Manager</h2>
        <p className="text-sm text-muted-foreground">
          Deploy, manage, and monitor your applications across servers.
        </p>
      </div>
      <DeploymentPageClient />
    </div>
  );
}
