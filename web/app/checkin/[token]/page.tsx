"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "next/navigation";
import {
  ApiError,
  getPublicCheckinInfo,
  submitPublicCheckin,
} from "@/lib/api";
import type { PublicCheckinInfo } from "@/lib/api";

function displayDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function PublicCheckinPage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [tenantContextReady, setTenantContextReady] = useState(false);
  const [info, setInfo] = useState<PublicCheckinInfo | null>(null);
  const [memberId, setMemberId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setTenantSlug(new URLSearchParams(window.location.search).get("tenant"));
    setTenantContextReady(true);
  }, []);

  useEffect(() => {
    if (!tenantContextReady) return;

    let cancelled = false;
    setLoading(true);
    getPublicCheckinInfo(token, tenantSlug)
      .then((result) => {
        if (!cancelled) setInfo(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setInfo(null);
          setMessage(error instanceof ApiError ? error.message : "Unable to load this check-in page.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantContextReady, tenantSlug, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!info?.checkin_open || info.attendance_taken || submitting) return;

    setSubmitting(true);
    setMessage("");
    setSuccess(false);
    try {
      const result = await submitPublicCheckin(token, memberId.trim(), tenantSlug);
      setSuccess(Boolean(result.success));
      setMessage(
        result.message ||
          (result.success ? "Attendance recorded successfully." : "Unable to check in."),
      );
      if (result.success) setMemberId("");
    } catch (error: unknown) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to check in. No check-in was recorded.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const canCheckIn = Boolean(info?.valid && info.checkin_open && !info.attendance_taken);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">
          {info?.church_name || "Church"}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Self check-in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter your member ID to record your attendance. No account is needed.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-slate-600" role="status">
            Loading service details…
          </p>
        ) : info?.service ? (
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">{info.service.name}</p>
            <p className="mt-1">{displayDate(info.service.date)}</p>
            {info.service.start_time && <p>{info.service.start_time}</p>}
            {info.service.location && <p>{info.service.location}</p>}
          </div>
        ) : null}

        {!loading && info && !canCheckIn && (
          <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900" role="status">
            {info.attendance_taken
              ? "Attendance has already been taken for this service."
              : info.checkin_message || "Check-in is not currently available."}
          </p>
        )}

        {message && (
          <p
            className={`mt-5 rounded-lg p-4 text-sm ${
              success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
            role="status"
          >
            {message}
          </p>
        )}

        {!loading && canCheckIn && (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-800" htmlFor="member-id">
              Member ID (full ID or last four digits)
            </label>
            <input
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              id="member-id"
              inputMode="text"
              maxLength={100}
              onChange={(event) => setMemberId(event.target.value)}
              required
              value={memberId}
            />
            <button
              className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting || !memberId.trim()}
              type="submit"
            >
              {submitting ? "Checking in…" : "Check in"}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-slate-500">
          Check-in requires a connection to the church attendance service. If you are offline,
          no attendance will be recorded; please try again when connected.
        </p>
      </section>
    </main>
  );
}
