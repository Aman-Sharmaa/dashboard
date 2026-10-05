"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ChevronDown,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCmsSettings, type CmsSettings } from "@/components/cms-settings-context";


/* ---------------- TYPES ---------------- */

type HeaderSettings = {
  header: {
    logo: string;
    logoDark: string;
    cta: { label: string; href: string; show: boolean };
    navItems: {
      label: string;
      href: string;
      type: "link" | "dropdown";
      children?: { label: string; href: string; description?: string }[];
    }[];
  };
  products: any[];
  services: any[];
};


const DEFAULT_PRODUCTS: any[] = [];

const DEFAULT_HEADER: CmsSettings["header"] = {
  logo: "/header_logo.svg",
  logoDark: "/header_logo.svg",
  cta: { show: true, label: "Get started", href: "", dropdownTitle: "Create an account" },
  navItems: [] as CmsSettings["header"]["navItems"],
};

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [getStartedOpen, setGetStartedOpen] = useState(false);
  const getStartedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cmsSettings = useCmsSettings();
  const pathname = usePathname();
  const isRapydlaunchPage = pathname === "/rapydlaunch";
  const isProductPage = pathname?.startsWith("/products") ?? false;
  const isDark = isRapydlaunchPage;

  const header = cmsSettings?.header ?? DEFAULT_HEADER;
  const products = cmsSettings?.products ?? DEFAULT_PRODUCTS;
  const logoSrc = isRapydlaunchPage ? (header.logoDark || "/header_logo.svg") : (header.logo || "/header_logo.svg");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  // Delayed close for "Get started" to allow hover into dropdown
  const handleGetStartedEnter = () => {
    if (getStartedTimerRef.current) clearTimeout(getStartedTimerRef.current);
    setGetStartedOpen(true);
  };
  const handleGetStartedLeave = () => {
    getStartedTimerRef.current = setTimeout(() => setGetStartedOpen(false), 120);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* ---------------- NAVBAR ---------------- */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`backdrop-blur-xl ${isDark
          ? "bg-black/80 border-b border-gray-800"
          : "bg-white/70 border-b border-zinc-100/80"
          }`}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-16 gap-3">

            {/* LOGO */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {isRapydlaunchPage ? (
                <>
                  <Link href="/rapydlaunch" aria-label="Go to Rapydlaunch homepage" className="shrink-0">
                    <Image
                      src={logoSrc}
                      alt="Rapydlaunch"
                      width={80}
                      height={24}
                      className="h-5 w-auto brightness-0 invert sm:h-[22px]"
                    />
                  </Link>
                  <Link
                    href="/"
                    className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-gray-300 transition-colors hover:text-white sm:gap-2 sm:text-sm"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    <span className="hidden min-[380px]:inline truncate">Back to kalp</span>
                  </Link>
                </>
              ) : (
                <Link href="/" aria-label="Go to homepage" className="shrink-0">
                  <Image
                    src={logoSrc}
                    alt="Webwrite"
                    width={60}
                    height={24}
                    className="h-5 w-auto lg:h-4"
                  />
                </Link>
              )}
            </div>

            {/* DESKTOP NAV + CTA */}
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-6 mr-2">
                {(header.navItems?.length ? header.navItems : [{ label: "About us", href: "/about-us", type: "link" as const }]).map((item) => {
                  if (item.type === "dropdown" && item.children && item.children.length > 0) {
                    return (
                      <NavDropdown
                        key={item.label}
                        label={item.label}
                        href={item.href}
                        children={item.children}
                        isDark={isDark}
                      />
                    );
                  }
                  return (
                    <NavLink
                      key={item.label}
                      href={item.href || "#"}
                      isDark={isDark}
                    >
                      {item.label}
                    </NavLink>
                  );
                })}

                {!isRapydlaunchPage && !isProductPage && products.length > 0 && (
                  <Dropdown label="Our Products" open={productsOpen} setOpen={setProductsOpen} isDark={isDark}>
                    {products.map((p) => {
                      const isExternal = p.href?.startsWith("http");
                      return isExternal ? (
                        <a
                          key={p.name}
                          href={p.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-zinc-50 transition-colors group"
                        >
                          <div className="relative w-12 h-12 bg-zinc-100 rounded-xl overflow-hidden shrink-0">
                            {p.image ? <Image src={p.image} alt={p.name} fill className="object-cover" /> : <div className="w-full h-full bg-zinc-200" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-zinc-900">{p.name}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{p.tagline}</p>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                        </a>
                      ) : (
                        <Link
                          key={p.name}
                          href={p.href || "#"}
                          className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-zinc-50 transition-colors group"
                        >
                          <div className="relative w-12 h-12 bg-zinc-100 rounded-xl overflow-hidden shrink-0">
                            {p.image ? <Image src={p.image} alt={p.name} fill className="object-cover" /> : <div className="w-full h-full bg-zinc-200" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-zinc-900">{p.name}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{p.tagline}</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                        </Link>
                      );
                    })}
                  </Dropdown>
                )}
              </div>

              {/* Desktop: Log in + Get started CTA */}
              <div className="hidden lg:flex items-center gap-1.5">
                {/* Log in */}
                <Link
                  href="/dashboard"
                  className={`relative px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 group ${isDark
                    ? "text-gray-300 hover:text-white hover:bg-white/10"
                    : "text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
                    }`}
                >
                  Log in
                </Link>

                {/* Get started ~ with product dropdown on hover */}
                {header.cta?.show && (
                  <div
                    className="relative"
                    onMouseEnter={handleGetStartedEnter}
                    onMouseLeave={handleGetStartedLeave}
                  >
                    <Link
                      href={header.cta.href}
                      target={header.cta.href?.startsWith("http") ? "_blank" : undefined}
                      rel={header.cta.href?.startsWith("http") ? "noopener noreferrer" : undefined}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 ${isDark
                        ? "bg-white text-black hover:bg-zinc-100"
                        : "bg-zinc-900 text-white hover:bg-zinc-700"
                        }`}
                    >
                      {header.cta.label}
                    </Link>

                    {/* Dropdown ~ dynamic options from CMS products */}
                    <AnimatePresence>
                      {getStartedOpen && products.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.97 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          onMouseEnter={handleGetStartedEnter}
                          onMouseLeave={handleGetStartedLeave}
                          className="absolute top-full right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-100 p-4 z-50"
                        >
                          <p className="text-sm font-bold text-zinc-900 mb-4 px-1">
                            {header.cta.dropdownTitle || "Create an account"}
                          </p>
                          <div className="space-y-1">
                            {products.map((p) => {
                              const isExternal = p.href?.startsWith("http");
                              const inner = (
                                <>
                                  <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0">
                                    {p.image ? (
                                      <Image src={p.image} alt={p.name} fill className="object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-zinc-200 rounded-2xl" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-zinc-900">{p.name}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{p.tagline}</p>
                                  </div>
                                </>
                              );
                              return isExternal ? (
                                <a
                                  key={p.name}
                                  href={p.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer"
                                >
                                  {inner}
                                </a>
                              ) : (
                                <Link
                                  key={p.name}
                                  href={p.href || "#"}
                                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer"
                                >
                                  {inner}
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* MOBILE BUTTON */}
              <button
                type="button"
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                className={`lg:hidden shrink-0 flex items-center justify-center w-11 h-11 rounded-xl transition-colors ${isDark ? "text-white hover:bg-white/10" : "text-zinc-800 hover:bg-zinc-100"}`}
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ---------------- MOBILE MENU ---------------- */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-[60] flex h-[100dvh] flex-col bg-white"
          >
            {/* Mobile Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-100 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
              <span className="text-sm font-semibold text-zinc-900">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-700" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 sm:py-8">
              {/* Nav Items */}
              <div className="space-y-2">
                {(header.navItems?.length ? header.navItems : [{ label: "About us", href: "/about-us", type: "link" as const }]).map((item) => (
                  <div key={`mobile-${item.label}`} className="rounded-2xl border border-zinc-100 bg-zinc-50/70">
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex min-h-[52px] items-center px-4 py-3 text-base font-semibold text-zinc-900"
                      >
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ) : (
                      <div className="flex min-h-[52px] items-center px-4 py-3">
                        <p className="text-base font-semibold text-zinc-900 truncate">{item.label}</p>
                      </div>
                    )}
                    {item.type === "dropdown" && (item.children?.length || 0) > 0 && (
                      <div className="px-4 pb-3 space-y-1 border-t border-zinc-100 pt-2">
                        {(item.children || []).map((child) =>
                          child.href?.startsWith("http") ? (
                            <a
                              key={`mobile-${item.label}-${child.label}`}
                              href={child.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-start gap-2 min-h-[44px] py-2"
                            >
                              <div>
                                <span className="block text-sm font-medium text-zinc-800">{child.label}</span>
                                {child.description && <span className="block text-xs text-zinc-500 leading-relaxed">{child.description}</span>}
                              </div>
                            </a>
                          ) : (
                            <Link
                              key={`mobile-${item.label}-${child.label}`}
                              href={child.href || "#"}
                              onClick={() => setMobileOpen(false)}
                              className="flex items-start gap-2 min-h-[44px] py-2"
                            >
                              <div>
                                <span className="block text-sm font-medium text-zinc-800">{child.label}</span>
                                {child.description && <span className="block text-xs text-zinc-500 leading-relaxed">{child.description}</span>}
                              </div>
                            </Link>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* PRODUCTS */}
              {products.length > 0 && (
                <div className="mt-8">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-4">Products</p>
                  <div className="space-y-3">
                    {products.map((p) => {
                      const isExternal = p.href?.startsWith("http");
                      return isExternal ? (
                        <a
                          key={p.name}
                          href={p.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setMobileOpen(false)}
                          className="flex min-h-16 items-center gap-4 rounded-2xl border border-zinc-100 p-3"
                        >
                          <div className="relative w-12 h-12 bg-zinc-100 rounded-xl overflow-hidden shrink-0">
                            {p.image ? <Image src={p.image} alt={p.name} fill className="object-cover" /> : null}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-sm text-zinc-900 block">{p.name}</span>
                            <span className="line-clamp-2 text-xs text-zinc-500">{p.tagline}</span>
                          </div>
                          <ExternalLink className="ml-auto h-4 w-4 shrink-0 text-zinc-400" />
                        </a>
                      ) : (
                        <Link
                          key={p.name}
                          href={p.href || "#"}
                          onClick={() => setMobileOpen(false)}
                          className="flex min-h-16 items-center gap-4 rounded-2xl border border-zinc-100 p-3"
                        >
                          <div className="relative w-12 h-12 bg-transparent rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                            {p.image ? <Image src={p.image} alt={p.name} fill className="object-contain" /> : null}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-sm text-zinc-900 block">{p.name}</span>
                            <span className="line-clamp-2 text-xs text-zinc-500">{p.tagline}</span>
                          </div>
                          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-zinc-400" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile CTAs */}
            <div className="shrink-0 space-y-3 border-t border-zinc-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-full min-h-[48px] text-zinc-900 font-semibold rounded-full border border-zinc-200 hover:bg-zinc-50 transition-colors text-sm"
              >
                Log in
              </Link>
              {header.cta?.show && (
                <Link
                  href={header.cta.href}
                  target={header.cta.href?.startsWith("http") ? "_blank" : undefined}
                  rel={header.cta.href?.startsWith("http") ? "noopener noreferrer" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-full min-h-[48px] bg-zinc-900 text-white rounded-full text-sm font-semibold hover:bg-zinc-700 transition-colors"
                >
                  {header.cta.label}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ---------------- HELPERS ---------------- */

function NavLink({ href, children, isDark = false }: any) {
  return (
    <Link
      href={href}
      className={`relative text-sm font-semibold py-1 transition-colors duration-200 group ${isDark
        ? "text-gray-300 hover:text-white"
        : "text-zinc-600 hover:text-zinc-900"
        }`}
    >
      {children}
      <span
        className={`absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-all duration-300 ease-out ${isDark ? "bg-white" : "bg-zinc-900"
          }`}
      />
    </Link>
  );
}

// NavDropdown: renders a nav item that has CMS-defined children as a hover dropdown
function NavDropdown({ label, href, children, isDark = false }: { label: string; href?: string; children: { label: string; href: string; description?: string; icon?: string }[]; isDark?: boolean }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };
  const handleLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {href ? (
        <Link
          href={href}
          className={`flex items-center gap-1 text-sm font-semibold py-1 transition-colors duration-200 group ${isDark ? "text-gray-300 hover:text-white" : "text-zinc-600 hover:text-zinc-900"
            }`}
        >
          {label}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </Link>
      ) : (
        <button
          className={`flex items-center gap-1 text-sm font-semibold py-1 transition-colors duration-200 ${isDark ? "text-gray-300 hover:text-white" : "text-zinc-600 hover:text-zinc-900"
            }`}
        >
          {label}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            className="absolute top-full left-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-zinc-100 p-3 z-50"
          >
            {children.map((child) => {
              const isExternal = child.href?.startsWith("http");
              return isExternal ? (
                <a
                  key={child.label}
                  href={child.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors group"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-900">{child.label}</p>
                    {child.description && <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{child.description}</p>}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500 mt-0.5 shrink-0" />
                </a>
              ) : (
                <Link
                  key={child.label}
                  href={child.href || "#"}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors group"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-900">{child.label}</p>
                    {child.description && <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{child.description}</p>}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500 mt-0.5 shrink-0" />
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Dropdown({ label, open, setOpen, children, isDark = false }: any) {
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={`flex items-center gap-1 text-sm font-semibold py-1 transition-colors duration-200 ${isDark
          ? "text-gray-300 hover:text-white"
          : "text-zinc-600 hover:text-zinc-900"
          }`}
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-100 p-3 z-50"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
