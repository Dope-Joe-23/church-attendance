"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  getTenantMemberships,
  tenantConfigured,
  updateTenantMember,
} from "@/lib/api";
import type { TenantMember, TenantMemberships } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type MemberChange = { role?: TenantMember["role"]; is_active?: boolean };

const roles: TenantMember["role"][] = ["owner", "admin", "manager", "viewer"];

export default function TeamPage() {
  const { ready, accessToken } = useAuth();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [currentRole, setCurrentRole] = useState<TenantMemberships["current_role"] | null>(null);
  const [currentMembershipId, setCurrentMembershipId] = useState<number | null>(null);
  const [changes, setChanges] = useState<Record<number, MemberChange>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!ready || !accessToken || !tenantConfigured()) return;
    setLoading(true);
    getTenantMemberships()
      .then((result) => {
        setMembers(result.members);
        setCurrentRole(result.current_role);
        setCurrentMembershipId(result.current_membership_id);
        setError("");
      })
      .catch((cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : "Could not load workspace access.");
      })
      .finally(() => setLoading(false));
  }, [ready, accessToken]);

  function changeMember(id: number, update: MemberChange) {
    setChanges((previous) => ({
      ...previous,
      [id]: { ...previous[id], ...update },
    }));
  }

  async function saveMember(member: TenantMember) {
    const update = changes[member.id];
    if (!update) return;
    setSaving(member.id);
    setError("");
    setNotice("");
    try {
      const saved = await updateTenantMember(member.id, update);
      setMembers((previous) => previous.map((item) => item.id === saved.id ? saved : item));
      setChanges((previous) => {
        const next = { ...previous };
        delete next[member.id];
        return next;
      });
      setNotice(`Updated access for ${saved.username}.`);
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : "Could not update workspace access.");
    } finally {
      setSaving(null);
    }
  }

  const activeOwners = members.filter(
    (member) => member.is_active && member.role === "owner",
  ).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-indigo-600">Workspace settings</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Team access</h1>
        <p className="mt-1 text-slate-500">
          Review tenant memberships and manage roles for this workspace.
        </p>
      </header>

      {!accessToken && (
        <p className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
          Sign in to manage workspace access.
        </p>
      )}
      {error && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>}
      {notice && <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{notice}</p>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-900">Workspace members</h2>
          <p className="mt-1 text-sm text-slate-500">
            Only an owner can change owner or administrator access. A workspace must retain at least one active owner.
          </p>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-slate-500" role="status">Loading workspace members…</p>
        ) : members.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No memberships found.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map((member) => {
              const pending = changes[member.id] || {};
              const selectedRole = pending.role || member.role;
              const selectedActive = pending.is_active ?? member.is_active;
              const privilegedTarget = member.role === "owner" || member.role === "admin";
              const isSelf = member.id === currentMembershipId;
              const wouldRemoveLastOwner =
                member.role === "owner" && member.is_active && !selectedActive && activeOwners === 1;

              return (
                <li key={member.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">
                      {[member.first_name, member.last_name].filter(Boolean).join(" ") || member.username}
                    </p>
                    <p className="text-sm text-slate-500">
                      @{member.username}{member.email ? ` · ${member.email}` : ""}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <span>Role</span>
                    <select
                      aria-label={`Role for ${member.username}`}
                      className="rounded-lg border border-slate-300 px-2.5 py-2"
                      disabled={currentRole !== "owner" && privilegedTarget}
                      onChange={(event) => changeMember(member.id, { role: event.target.value as TenantMember["role"] })}
                      value={selectedRole}
                    >
                      {roles.map((role) => (
                        <option
                          key={role}
                          disabled={currentRole !== "owner" && (role === "owner" || role === "admin")}
                          value={role}
                        >
                          {role[0].toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      checked={selectedActive}
                      disabled={isSelf || wouldRemoveLastOwner}
                      onChange={(event) => changeMember(member.id, { is_active: event.target.checked })}
                      type="checkbox"
                    />
                    Active
                  </label>
                  <button
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!changes[member.id] || saving === member.id}
                    onClick={() => void saveMember(member)}
                    type="button"
                  >
                    {saving === member.id ? "Saving…" : "Save"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
