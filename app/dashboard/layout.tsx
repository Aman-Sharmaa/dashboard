import { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { CompanyProfile } from "@/models/CompanyProfile";
import { User } from "@/models/User";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { SearchProvider } from "@/components/search-context";
import { PrivacyProvider } from "@/components/privacy-context";
import { SocketProvider } from "@/components/socket-provider";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "kalp_auth_token";

// Paths outsiders are permitted to visit (prefix match)
const OUTSIDER_ALLOWED_PATHS = [
  "/dashboard/todo",
  "/dashboard/projects/plans",
  "/dashboard/projects",
  "/dashboard/drive",
  "/dashboard/roadmap",
  "/dashboard/settings",
];

async function getUserAndCompany() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    redirect("/login");
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    redirect("/login");
  }

  await connectDB();
  const { Employee } = await import("@/models/Employee");
  const [profile, userDoc, employeeDoc] = await Promise.all([
    CompanyProfile.findOne({ owner: payload.userId }).lean(),
    User.findById(payload.userId)
      .select("canManageContent name featureAccess sidebarSectionOrder adminSidebarHiddenFeatures")
      .lean(),
    Employee.findOne({ email: payload.email }).select("isOutsider").lean(),
  ]);

  const canManageContent = payload.role === "admin" || !!(userDoc as any)?.canManageContent;

  const displayName = (userDoc as any)?.name || "";
  const featureAccess: string[] = (userDoc as any)?.featureAccess || [];
  const sidebarSectionOrder: string[] = Array.isArray((userDoc as any)?.sidebarSectionOrder)
    ? (userDoc as any).sidebarSectionOrder
    : [];
  const adminSidebarHiddenFeatures: string[] =
    payload.role === "admin" && Array.isArray((userDoc as any)?.adminSidebarHiddenFeatures)
      ? (userDoc as any).adminSidebarHiddenFeatures
      : [];
  const isOutsider = !!(employeeDoc as any)?.isOutsider;

  return {
    user: {
      ...payload,
      canManageContent,
      name: displayName,
      featureAccess,
      sidebarSectionOrder,
      adminSidebarHiddenFeatures,
      isOutsider,
    },
    profile: profile
      ? {
        companyName: profile.companyName,
        logoUrl: profile.logoUrl as string | undefined,
      }
      : null,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, profile } = await getUserAndCompany();

  // ── Outsider access guard ──────────────────────────────────────────────────
  // Outsiders (isOutsider=true employees) may only access a specific set of
  // dashboard paths. The middleware forwards the current pathname via the
  // `x-pathname` header so we can check it server-side before rendering.
  if (user.isOutsider && user.role === "employee") {
    const headersList = await headers();
    const currentPath = headersList.get("x-pathname") || "";
    const isAllowed =
      currentPath === "/dashboard" ||
      OUTSIDER_ALLOWED_PATHS.some(
        (p) =>
          currentPath === p ||
          currentPath.startsWith(p + "/") ||
          currentPath.startsWith(p + "?")
      );
    if (!isAllowed && currentPath.startsWith("/dashboard")) {
      redirect("/dashboard/todo");
    }
  }

  return (
    <SocketProvider userId={user.userId}>
      <SearchProvider>
        <PrivacyProvider>
          <SidebarProvider>
            <AppSidebar user={{ ...user, userId: user.userId }} profile={profile} />
            <SidebarInset className="bg-[#F7F5F1] flex h-svh min-h-0 min-w-0 flex-1 flex-col overflow-hidden text-sm text-foreground [&_.text-3xl]:!text-2xl [&_.text-2xl]:!text-xl [&_.text-xl]:!text-lg [&_.text-lg]:!text-base">
              <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b bg-background px-3 md:px-4">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-semibold text-foreground/80">Workspace Console</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
                <div className="flex items-center gap-2">
                  <DashboardTopbar />
                </div>
              </header>
              <main className="min-h-0 min-w-0 flex-1 overflow-auto scrollbar-none px-1 py-1 md:px-2 md:py-2">
                <div className="min-w-0 w-full max-w-full">
                  <div className="min-h-0 min-w-0 w-full overflow-x-auto rounded-xl border bg-background p-2 shadow-sm md:rounded-2xl md:p-3">
                    {children}
                  </div>
                </div>
              </main>
            </SidebarInset>
            <Toaster />
          </SidebarProvider>
        </PrivacyProvider>
      </SearchProvider>
    </SocketProvider>
  );
}
