"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getTenantSlug } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const navigation = [
  { href: "/", label: "Overview", icon: "◫" },
  { href: "/members", label: "Members", icon: "♙" },
  { href: "/team", label: "Team access", icon: "♧" },
  { href: "/attendance", label: "Attendance", icon: "✓" },
  { href: "/billing", label: "Billing", icon: "¤" },
  { href: "/onboarding", label: "Onboarding", icon: "✳" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { accessToken, logout } = useAuth();
  const [tenantSlug, setTenantSlug] = useState(
    process.env.NEXT_PUBLIC_TENANT_SLUG || "not configured",
  );

  useEffect(() => {
    setTenantSlug(getTenantSlug() || "not configured");
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f8fc] md:flex">
      <aside className="border-b border-slate-200 bg-white md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-5 py-5 md:px-6 md:py-7">
          <span className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-lg font-bold text-white" aria-hidden="true">
            G
          </span>
          <div>
            <p className="font-bold tracking-tight text-slate-900">Gather</p>
            <p className="text-xs text-slate-500">Church workspace</p>
          </div>
        </div>
        <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:flex-1 md:space-y-1 md:overflow-visible md:px-4">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="w-5 text-center text-base" aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-slate-100 p-4 md:block">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-800">{tenantSlug}</p>
            <p className="mt-1 text-xs text-slate-500">
              {accessToken ? "Connected account" : "Preview mode"}
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 md:ml-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:px-8">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500">Tenant workspace</p>
            <p className="truncate text-sm font-semibold text-slate-800">{tenantSlug}</p>
          </div>
          {accessToken ? (
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Sign in
            </Link>
          )}
        </header>
        <main id="main-content" className="mx-auto max-w-[1440px] p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
