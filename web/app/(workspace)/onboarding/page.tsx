"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FileUploader, Form } from "@/components/ui";

type SetupDraft = {
  churchName: string;
  contactEmail: string;
  serviceDay: string;
};

const emptyDraft: SetupDraft = { churchName: "", contactEmail: "", serviceDay: "Sunday" };

export default function OnboardingPage() {
  const [draft, setDraft] = useState<SetupDraft>(emptyDraft);
  const [fileName, setFileName] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("church-onboarding-draft");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<SetupDraft> & { fileName?: string };
      setDraft({
        churchName: parsed.churchName ?? "",
        contactEmail: parsed.contactEmail ?? "",
        serviceDay: parsed.serviceDay ?? "Sunday",
      });
      setFileName(parsed.fileName ?? "");
    } catch {
      window.localStorage.removeItem("church-onboarding-draft");
    }
  }, []);

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem("church-onboarding-draft", JSON.stringify({ ...draft, fileName }));
    setNotice("Setup draft saved in this browser only. It has not been submitted to the server.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><p className="text-sm font-semibold text-indigo-600">Getting started</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Set up your workspace</h1><p className="mt-1 text-slate-500">A local checklist for organizing your first workspace setup steps.</p></div>
      <div role="note" className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">Create a tenant using the signup form at <a href="/signup" className="font-semibold underline">/signup</a>. This checklist saves a draft in this browser; the CSV importer is available from Members.</div>
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      <ol aria-label="Workspace setup checklist" className="grid gap-3 sm:grid-cols-3">
        {["Church details", "Member directory", "Review & save"].map((step, index) => <li key={step} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">{index + 1}</span><span className="text-sm font-semibold text-slate-800">{step}</span></li>)}
      </ol>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <Form onSubmit={saveDraft}>
          <div><label htmlFor="church-name" className="block text-sm font-medium text-slate-700">Church or community name</label><input id="church-name" required value={draft.churchName} onChange={(event) => setDraft({ ...draft, churchName: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3" placeholder="Your church name" /></div>
          <div><label htmlFor="contact-email" className="block text-sm font-medium text-slate-700">Administrator contact email</label><input id="contact-email" type="email" value={draft.contactEmail} onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3" placeholder="admin@example.org" /></div>
          <div><label htmlFor="service-day" className="block text-sm font-medium text-slate-700">Main gathering day</label><select id="service-day" value={draft.serviceDay} onChange={(event) => setDraft({ ...draft, serviceDay: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3"><option>Sunday</option><option>Saturday</option><option>Friday</option><option>Other</option></select></div>
          <div><p className="mb-2 text-sm font-medium text-slate-700">Optional member list</p><FileUploader accept=".csv,text/csv" label="Choose a CSV (not uploaded)" onFileSelect={(file) => setFileName(file?.name ?? "")} /><p className="mt-2 text-xs text-slate-500">{fileName ? `Selected locally: ${fileName}` : "CSV import is not available in the backend yet."}</p></div>
          <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Save local draft</button>
        </Form>
      </section>
    </div>
  );
}
