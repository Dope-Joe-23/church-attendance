"use client";

import { useEffect, useState } from "react";
import { ApiError, getAttendance, tenantConfigured, type AttendanceRecord } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { QrScannerFallback } from "@/components/qr-scanner-fallback";
import { Table, type TableColumn } from "@/components/ui";

const formatUtcTime = (value: string) =>
  `${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;

const previewAttendance: AttendanceRecord[] = [
  { id: -1, member: 1, member_details: { full_name: "Ama Mensah", member_id: "GTH-1042" }, service: 1, service_details: { name: "Sunday service" }, check_in_time: "2026-10-11T10:02:00Z", status: "present", is_auto_marked: false, notes: null },
  { id: -2, member: 2, member_details: { full_name: "Kojo Boateng", member_id: "GTH-1038" }, service: 1, service_details: { name: "Sunday service" }, check_in_time: "2026-10-11T10:06:00Z", status: "present", is_auto_marked: false, notes: null },
  { id: -3, member: 3, member_details: { full_name: "Efua Owusu", member_id: "GTH-1031" }, service: 2, service_details: { name: "Midweek gathering" }, check_in_time: "2026-10-08T18:31:00Z", status: "late", is_auto_marked: false, notes: null },
];

export default function AttendancePage() {
  const { ready, accessToken } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>(previewAttendance);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready || !accessToken || !tenantConfigured()) return;
    setLoading(true);
    getAttendance()
      .then((data) => { setRecords(data); setLive(true); setError(""); })
      .catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : "Could not load attendance."))
      .finally(() => setLoading(false));
  }, [ready, accessToken]);

  const columns: TableColumn<AttendanceRecord>[] = [
    { key: "member", header: "Member", render: (record) => <><span className="block font-semibold text-slate-900">{record.member_details?.full_name || `Member #${record.member}`}</span><span className="mt-1 block text-xs text-slate-500">{record.member_details?.member_id || "—"}</span></> },
    { key: "service", header: "Service", render: (record) => <span>{record.service_details?.name || `Service #${record.service}`}</span> },
    { key: "time", header: "Check-in time", render: (record) => <time dateTime={record.check_in_time}>{formatUtcTime(record.check_in_time)}</time> },
    { key: "status", header: "Status", render: (record) => <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${record.status.toLowerCase() === "present" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{record.status}</span> },
  ];

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-indigo-600">Gatherings</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Attendance</h1><p className="mt-1 text-slate-500">Review recent check-ins and record attendance.</p></div>
      {!live && <div role="note" className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">Showing sample attendance for preview. Sign in and configure the tenant to load live records.</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Live attendance could not be loaded: {error} Sample preview remains visible.</div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Recent check-ins</h2><p className="mt-1 text-sm text-slate-500">{live ? `${records.length} records` : "Sample records"}</p></div>{loading && <span role="status" className="text-sm text-slate-500">Loading…</span>}</div>
        <Table caption="Recent attendance records" columns={columns} rows={records} emptyMessage="No attendance records found." />
      </section>
      <QrScannerFallback />
    </div>
  );
}
