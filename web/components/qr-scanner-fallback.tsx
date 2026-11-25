"use client";

import { useState } from "react";
import { ApiError, submitManualCheckIn, tenantConfigured } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Form } from "@/components/ui";

export function QrScannerFallback() {
  const { accessToken } = useAuth();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-lg text-indigo-700">⌗</span>
        <div><h2 className="font-bold text-slate-900">Manual check-in fallback</h2><p className="mt-1 text-sm leading-6 text-slate-500">Camera scanning is not bundled in this preview. Enter the member ID and service ID to use the existing check-in endpoint.</p></div>
      </div>
      {status && <p role="status" className={`mt-4 rounded-xl p-3 text-sm ${status.startsWith("Checked in") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{status}</p>}
      <Form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={async (event) => {
        const form = event.currentTarget;
        const data = new FormData(form);
        setBusy(true);
        setStatus("");
        try {
          const result = await submitManualCheckIn(String(data.get("member_id")), Number(data.get("service_id")));
          setStatus(result.message || "Checked in successfully.");
          form.reset();
        } catch (cause) {
          setStatus(cause instanceof ApiError ? cause.message : "Check-in failed. Please try again.");
        } finally {
          setBusy(false);
        }
      }}>
        <div><label htmlFor="checkin-member" className="block text-sm font-medium text-slate-700">Member ID</label><input id="checkin-member" name="member_id" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" placeholder="e.g. GTH-1042" /></div>
        <div><label htmlFor="checkin-service" className="block text-sm font-medium text-slate-700">Service ID</label><input id="checkin-service" name="service_id" type="number" min="1" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" placeholder="Existing service ID" /></div>
        <button disabled={busy || !accessToken || !tenantConfigured()} type="submit" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2">{busy ? "Checking in…" : "Record check-in"}</button>
        {!accessToken && <p role="note" className="text-xs text-amber-800 sm:col-span-2">Sign in to record attendance.</p>}
      </Form>
    </section>
  );
}
