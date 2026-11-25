"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, signUpTenant } from "@/lib/api";
import { Form } from "@/components/ui";

export default function SignupPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <Link href="/login" className="text-sm font-semibold text-indigo-700">Already have an account? Sign in</Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-indigo-600">Start your workspace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Create your church account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Create a workspace with an owner account and an immediately available configurable trial.</p>
        {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        <Form
          className="mt-6"
          onSubmit={async (event) => {
            const formData = new FormData(event.currentTarget);
            setBusy(true);
            setError("");
            try {
              await signUpTenant({
                church_name: String(formData.get("church_name") || ""),
                slug: String(formData.get("slug") || ""),
                first_name: String(formData.get("first_name") || ""),
                last_name: String(formData.get("last_name") || ""),
                username: String(formData.get("username") || ""),
                email: String(formData.get("email") || ""),
                password: String(formData.get("password") || ""),
                password_confirm: String(formData.get("password_confirm") || ""),
              });
              window.location.assign("/");
            } catch (cause) {
              setError(cause instanceof ApiError ? cause.message : "Could not create the workspace.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="church-name" className="block text-sm font-medium text-slate-700">Church or organization name</label>
              <input id="church-name" name="church_name" required maxLength={255} className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3" autoComplete="organization" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="workspace-slug" className="block text-sm font-medium text-slate-700">Workspace slug <span className="font-normal text-slate-500">(optional)</span></label>
              <input id="workspace-slug" name="slug" maxLength={100} pattern="[A-Za-z0-9-]*" className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3" placeholder="generated-from-name" />
            </div>
            <div>
              <label htmlFor="first-name" className="block text-sm font-medium text-slate-700">First name</label>
              <input id="first-name" name="first_name" autoComplete="given-name" className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3" />
            </div>
            <div>
              <label htmlFor="last-name" className="block text-sm font-medium text-slate-700">Last name</label>
              <input id="last-name" name="last_name" autoComplete="family-name" className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="username" className="block text-sm font-medium text-slate-700">Username</label>
              <input id="username" name="username" required autoComplete="username" className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
              <input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3" />
            </div>
            <div>
              <label htmlFor="password-confirm" className="block text-sm font-medium text-slate-700">Confirm password</label>
              <input id="password-confirm" name="password_confirm" type="password" required autoComplete="new-password" minLength={8} className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3" />
            </div>
          </div>
          <button type="submit" disabled={busy} className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
            {busy ? "Creating workspace…" : "Create workspace"}
          </button>
        </Form>
        <p className="mt-4 text-xs leading-5 text-slate-500">Plan pricing and trial duration are controlled by the service configuration. No payment method is collected on this page.</p>
      </section>
    </main>
  );
}
