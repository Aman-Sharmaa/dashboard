"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  MoreHorizontal,
  User,
  Users,
  Boxes,
  LayoutGrid,
} from "lucide-react";

type Props = {
  companyName?: string | null;
  logoUrl?: string | null;
  userEmail: string;
  userRole: string;
};

export function DashboardSidebar({
  companyName,
  logoUrl,
  userEmail,
  userRole,
}: Props) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isOverview = pathname === "/dashboard";
  const isPeople =
    pathname === "/dashboard/people" ||
    pathname.startsWith("/dashboard/people/");
  const isProducts =
    pathname === "/dashboard/products" ||
    pathname.startsWith("/dashboard/products/");
  const isBoard =
    pathname === "/dashboard/board" ||
    pathname.startsWith("/dashboard/board");
  const isSettings =
    pathname === "/dashboard/settings" ||
    pathname.startsWith("/dashboard/settings/");

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      router.push("/login");
    }
  }

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-neutral-200 bg-white h-full transition-[width] ${
        collapsed ? "w-20" : "w-56"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-neutral-200">
        <div className="flex items-center gap-3 min-w-0">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Company logo"
              className="h-8 w-8 rounded-full object-cover border border-neutral-200 bg-white flex-shrink-0"
          />
        ) : (
          <div className="h-8 w-8 rounded-full border border-neutral-300 flex items-center justify-center text-xs font-semibold text-neutral-800 flex-shrink-0">
            {companyName?.[0] || "K"}
          </div>
        )}
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {companyName || "Your company"}
              </div>
              <div className="text-xs text-neutral-500 capitalize truncate">
                {userRole}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="text-xs">{collapsed ? "›" : "‹"}</span>
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 text-sm">
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
              Home
            </div>
          )}
          <a
            href="/dashboard"
            className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm transition ${
              isOverview
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            {!collapsed && <span>Overview</span>}
          </a>
          <a
            href="/dashboard/people"
            className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm transition ${
              isPeople
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <Users className="h-4 w-4" />
            {!collapsed && <span>Team members</span>}
          </a>
          <a
            href="/dashboard/products"
            className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm transition ${
              isProducts
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <Boxes className="h-4 w-4" />
            {!collapsed && <span>Businesses</span>}
          </a>
          <a
            href="/dashboard/board"
            className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm transition ${
              isBoard
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            {!collapsed && <span>TODO Board</span>}
          </a>
        </div>
      </nav>

      <div className="relative px-3 pb-4 pt-2 border-t border-neutral-200 text-xs text-neutral-500">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition ${
            isSettings ? "bg-neutral-100" : "hover:bg-neutral-50"
          }`}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="User avatar"
              className="h-8 w-8 rounded-full object-cover border border-neutral-200 bg-white flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs flex-shrink-0">
              <User className="h-4 w-4" />
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-medium text-neutral-900 truncate">
                {companyName || "Account"}
              </div>
              <div className="text-[11px] text-neutral-500 truncate">
                {userEmail}
              </div>
            </div>
          )}
          <MoreHorizontal className="h-4 w-4 text-neutral-500 flex-shrink-0" />
        </button>

        {menuOpen && !collapsed && (
          <div className="absolute bottom-16 left-3 right-3 rounded-xl border border-neutral-200 bg-white shadow-lg text-xs text-neutral-800">
            <div className="flex items-center gap-3 px-3 py-3 border-b border-neutral-100">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="User avatar"
                  className="h-8 w-8 rounded-full object-cover border border-neutral-200 bg-white flex-shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">
                  {companyName || "Account"}
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {userEmail}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                router.push("/dashboard/settings");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-neutral-50"
            >
              <Settings className="h-4 w-4" />
              <span>Account settings</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 border-t border-neutral-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

