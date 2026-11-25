"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ApiError, getTenantSlug, setTenantSlug, tenantConfigured } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Form } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlugInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (accessToken) router.replace("/");
  }, [accessToken, router]);

  useEffect(() => {
    setTenantSlugInput(getTenantSlug() || "");
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <Link href="/" className="text-sm font-semibold text-indigo-700">← Back to dashboard</Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-indigo-600">Gather workspace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Sign in with your existing church account to load live member and attendance records.</p>

        {!tenantConfigured() && (
          <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Enter your workspace slug below, or set <code>NEXT_PUBLIC_TENANT_SLUG</code> in <code>web/.env.local</code>.
          </div>
        )}
        {searchParams.get("expired") && (
          <div role="status" className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Your session expired. Sign in again to continue.
          </div>
        )}
        {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        <Form
          className="mt-6"
          onSubmit={async () => {
            setBusy(true);
            setError("");
            try {
              setTenantSlug(tenantSlug);
              await login(username.trim(), password);
              router.replace("/");
            } catch (cause) {
              setError(cause instanceof ApiError ? cause.message : "Could not sign in. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm font-medium text-slate-700" htmlFor="tenant-slug">Workspace slug</label>
          <input
            id="tenant-slug"
            autoComplete="organization"
            required
            value={tenantSlug}
            onChange={(event) => setTenantSlugInput(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-slate-900"
            placeholder="your-church"
          />
          <label className="block text-sm font-medium text-slate-700" htmlFor="username">Username</label>
          <input
            id="username"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-slate-900"
          />
          <label className="block text-sm font-medium text-slate-700" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-slate-900"
          />
          <button
            type="submit"
            disabled={busy || !tenantSlug.trim()}
            className="mt-2 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </Form>
        <p className="mt-5 text-sm text-slate-600">New to Gather? <Link href="/signup" className="font-semibold text-indigo-700 hover:text-indigo-900">Create a workspace</Link>.</p>
        <p className="mt-5 text-xs leading-5 text-slate-500">Authentication uses the existing Django JWT token endpoints. Passwords are sent directly to the configured API.</p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="p-8 text-center text-slate-600">Loading sign in…</main>}><LoginForm /></Suspense>;
}
