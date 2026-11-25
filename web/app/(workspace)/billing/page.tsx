"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  createBillingPortalSession,
  createCheckoutSession,
  getBillingOverview,
  tenantConfigured,
  type BillingOverview,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString();
}

export default function BillingPage() {
  const { ready, accessToken } = useAuth();
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!ready || !accessToken || !tenantConfigured()) return;
    getBillingOverview()
      .then(setBilling)
      .catch((cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : "Could not load billing information.");
      });
  }, [ready, accessToken]);

  async function openCheckout(plan: string) {
    setBusy(plan);
    setError("");
    try {
      const { url } = await createCheckoutSession(plan);
      window.location.assign(url);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not start checkout.");
      setBusy("");
    }
  }

  async function openPortal() {
    setBusy("portal");
    setError("");
    try {
      const { url } = await createBillingPortalSession();
      window.location.assign(url);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not open billing settings.");
      setBusy("");
    }
  }

  const tenant = billing?.tenant;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600">Workspace settings</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Billing</h1>
        <p className="mt-1 text-slate-500">Manage your plan and payment details.</p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

      {tenant ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900">{tenant.name}</h2>
              <p className="mt-1 text-sm text-slate-500">Current plan: <span className="font-semibold capitalize text-slate-800">{tenant.plan}</span></p>
              <p className="mt-1 text-sm text-slate-500">Subscription: <span className="font-semibold capitalize text-slate-800">{tenant.subscription_status.replace(/_/g, " ")}</span></p>
              {tenant.status === "trial" && <p className="mt-1 text-sm text-slate-500">Trial ends: {formatDate(tenant.trial_ends_at)}</p>}
              {tenant.subscription_period_ends_at && <p className="mt-1 text-sm text-slate-500">Current period ends: {formatDate(tenant.subscription_period_ends_at)}</p>}
              {tenant.cancel_at_period_end && <p className="mt-2 text-sm font-medium text-amber-800">Cancellation is scheduled at the end of this period.</p>}
            </div>
            {billing?.portal_available && (
              <button type="button" disabled={Boolean(busy)} onClick={openPortal} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                {busy === "portal" ? "Opening…" : "Manage billing"}
              </button>
            )}
          </div>
        </section>
      ) : (
        <section role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          {!ready ? "Loading account…" : !accessToken ? "Sign in as a workspace owner or administrator to view billing." : !tenantConfigured() ? "Set a workspace slug before loading billing." : "Loading billing details…"}
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Available plans</h2>
          <p className="mt-1 text-sm text-slate-500">Prices and Stripe price IDs are configured by the service operator.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(billing?.plans ?? [
            { id: "starter", name: "Starter", checkout_available: false },
            { id: "growth", name: "Growth", checkout_available: false },
            { id: "pro", name: "Pro", checkout_available: false },
          ]).map((plan) => (
            <article key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Plan limits and pricing are set by your organization.</p>
              <button
                type="button"
                disabled={!plan.checkout_available || Boolean(busy)}
                onClick={() => openCheckout(plan.id)}
                className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {busy === plan.id ? "Opening checkout…" : plan.checkout_available ? `Choose ${plan.name}` : "Checkout unavailable"}
              </button>
            </article>
          ))}
        </div>
      </section>
      <p className="text-xs leading-5 text-slate-500">Payment details and invoices are handled by Stripe’s hosted billing portal. Card information is never entered into this application.</p>
    </div>
  );
}
