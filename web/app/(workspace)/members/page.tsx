"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createMember,
  downloadMembersCsv,
  getMembers,
  importMemberCsv,
  previewMemberCsv,
  tenantConfigured,
  type Member,
  type MemberImportPreview,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FileUploader, Form, Modal, Table, type TableColumn } from "@/components/ui";

const previewMembers: Member[] = [
  { id: -1, member_id: "GTH-1042", full_name: "Ama Mensah", email: "ama@example.org", phone: "+233 24 000 0123", department: "Worship", class_name: "North group", is_visitor: false, attendance_status: "Active", created_at: "2026-05-12" },
  { id: -2, member_id: "GTH-1038", full_name: "Kojo Boateng", email: "kojo@example.org", phone: "+233 20 000 0456", department: "Media", class_name: "Central group", is_visitor: false, attendance_status: "Active", created_at: "2026-04-23" },
  { id: -3, member_id: "GTH-1031", full_name: "Efua Owusu", email: "efua@example.org", phone: "+233 50 000 0789", department: "Welcome", class_name: "East group", is_visitor: true, attendance_status: "New visitor", created_at: "2026-03-18" },
];

export default function MembersPage() {
  const { ready, accessToken } = useAuth();
  const [members, setMembers] = useState<Member[]>(previewMembers);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<MemberImportPreview | null>(null);
  const [fileBusy, setFileBusy] = useState(false);

  useEffect(() => {
    if (!ready || !accessToken || !tenantConfigured()) return;
    setLoading(true);
    getMembers()
      .then((data) => {
        setMembers(data);
        setLive(true);
        setError("");
      })
      .catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : "Could not load members."))
      .finally(() => setLoading(false));
  }, [ready, accessToken]);

  const visibleMembers = useMemo(
    () => members.filter((member) => [member.full_name, member.member_id, member.email, member.phone]
      .some((value) => value?.toLowerCase().includes(search.toLowerCase()))),
    [members, search],
  );

  const columns: TableColumn<Member>[] = [
    {
      key: "member",
      header: "Member",
      render: (member) => <><span className="block font-semibold text-slate-900">{member.full_name}</span><span className="mt-1 block text-xs text-slate-500">{member.member_id}</span></>,
    },
    { key: "contact", header: "Contact", render: (member) => <span>{member.email || member.phone || "—"}</span> },
    { key: "group", header: "Group / department", render: (member) => <span>{member.class_name || member.department || "—"}</span> },
    {
      key: "status",
      header: "Status",
      render: (member) => <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${member.is_visitor ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>{member.is_visitor ? "Visitor" : member.attendance_status || "Member"}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-indigo-600">Community</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Members</h1><p className="mt-1 text-slate-500">View your directory and add people to the community.</p></div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!accessToken || !tenantConfigured()}
            onClick={async () => {
              setError("");
              try {
                await downloadMembersCsv();
              } catch (cause) {
                setError(cause instanceof ApiError ? cause.message : "Could not export members.");
              }
            }}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
          <button type="button" onClick={() => setShowForm(true)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Add member</button>
        </div>
      </div>

      {!live && <div role="note" className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">Showing sample members for preview. Sign in and configure the tenant to load live records.</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Live directory could not be loaded: {error} Sample preview remains visible.</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-slate-900">Directory</h2><p className="mt-1 text-sm text-slate-500">{live ? `${members.length} records` : "Sample records"}</p></div>
          <label className="sr-only" htmlFor="member-search">Search members</label>
          <input id="member-search" type="search" placeholder="Search name, ID, or contact" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm sm:max-w-xs" />
        </div>
        {loading && <p role="status" className="mb-3 text-sm text-slate-500">Loading members…</p>}
        <Table caption="Church member directory" columns={columns} rows={visibleMembers} emptyMessage="No matching members." />
      </section>

      <details className="rounded-2xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer font-semibold text-slate-800">Import members from a file</summary>
        <p className="mt-2 text-sm text-slate-500">Preview validates the complete file without writing records. Import is all-or-nothing and limited to 1,000 rows and 5 MB.</p>
        <div className="mt-4 max-w-xl">
          <FileUploader
            accept=".csv,text/csv"
            label="Choose a member CSV"
            onFileSelect={(file) => {
              setImportFile(file ?? null);
              setImportPreview(null);
              setError("");
              setNotice("");
            }}
          />
        </div>
        {importFile && <p className="mt-2 text-sm text-slate-600">Selected: {importFile.name}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!importFile || !accessToken || !tenantConfigured() || fileBusy}
            onClick={async () => {
              if (!importFile) return;
              setFileBusy(true);
              setError("");
              setNotice("");
              try {
                setImportPreview(await previewMemberCsv(importFile));
              } catch (cause) {
                setError(cause instanceof ApiError ? cause.message : "Could not preview the CSV.");
              } finally {
                setFileBusy(false);
              }
            }}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            {fileBusy ? "Validating…" : "Preview CSV"}
          </button>
          {importPreview && importPreview.valid_count > 0 && importPreview.invalid_rows.length === 0 && (
            <button
              type="button"
              disabled={fileBusy}
              onClick={async () => {
                if (!importFile) return;
                setFileBusy(true);
                setError("");
                try {
                  const result = await importMemberCsv(importFile);
                  const latest = await getMembers();
                  setMembers(latest);
                  setLive(true);
                  setImportPreview(null);
                  setImportFile(null);
                  setNotice(`Imported ${result.imported_count} members.`);
                } catch (cause) {
                  setError(cause instanceof ApiError ? cause.message : "Could not import the CSV.");
                } finally {
                  setFileBusy(false);
                }
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {fileBusy ? "Importing…" : `Import ${importPreview.valid_count} members`}
            </button>
          )}
        </div>
        {importPreview && (
          <div role="status" className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p>{importPreview.valid_count} valid of {importPreview.row_count} rows.</p>
            {importPreview.invalid_rows.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-1 text-rose-700">
                {importPreview.invalid_rows.map((row) => (
                  <li key={row.row}>Row {row.row}: {JSON.stringify(row.errors)}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </details>

      {showForm && (
        <Modal title="Add a member" onClose={() => setShowForm(false)}>
          <Form onSubmit={async (event) => {
            const form = event.currentTarget;
            const data = new FormData(form);
            setNotice("");
            try {
              const created = await createMember({
                full_name: String(data.get("full_name") || ""),
                email: String(data.get("email") || ""),
                phone: String(data.get("phone") || ""),
                is_visitor: data.get("is_visitor") === "on",
              });
              setMembers((current) => live ? [created, ...current] : [created]);
              setLive(true);
              setShowForm(false);
              setNotice("Member added.");
            } catch (cause) {
              setNotice(cause instanceof ApiError ? `Could not add member: ${cause.message}` : "Could not add member.");
            }
          }}>
            <p className="text-sm leading-6 text-slate-500">This submits to the existing <code>/members/</code> API. A signed-in account and tenant configuration are required.</p>
            <label className="block text-sm font-medium text-slate-700" htmlFor="member-name">Full name</label>
            <input id="member-name" name="full_name" required className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            <label className="block text-sm font-medium text-slate-700" htmlFor="member-email">Email</label>
            <input id="member-email" name="email" type="email" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            <p className="-mt-3 text-xs text-slate-500">The existing API accepts Gmail addresses for members.</p>
            <label className="block text-sm font-medium text-slate-700" htmlFor="member-phone">Phone</label>
            <input id="member-phone" name="phone" type="tel" inputMode="numeric" minLength={10} maxLength={10} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" placeholder="10 digits" />
            <p className="-mt-3 text-xs text-slate-500">Enter a 10-digit number if providing a phone.</p>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input name="is_visitor" type="checkbox" className="size-4 rounded border-slate-300" /> This person is a visitor</label>
            <button disabled={!accessToken || !tenantConfigured()} type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">Save member</button>
            {!accessToken && <p role="note" className="text-xs text-amber-800">Sign in to enable API submission.</p>}
          </Form>
        </Modal>
      )}
    </div>
  );
}
