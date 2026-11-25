"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { assignmentsApi, authApi, type Assignment, type StaffMember, type StaffRole } from "@/lib/api";
import { ErrorNote } from "@/components/modal";

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  lead: "Lead",
  support: "Support",
  finance: "Finance",
  on_site: "On site",
};
const ROLES = Object.keys(STAFF_ROLE_LABELS) as StaffRole[];

const field =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#007cc2] focus:ring-2 focus:ring-[#007cc2]/20";

/** Which Sportinuity staff handle this request. */
export function StaffPanel({ reference }: { reference: string }) {
  const [people, setPeople] = useState<Assignment[] | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [managerId, setManagerId] = useState("");
  const [role, setRole] = useState<StaffRole>("support");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, all] = await Promise.all([assignmentsApi.list(reference), assignmentsApi.staff()]);
      setPeople(list);
      setStaff(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load staff.");
    }
  }, [reference]);

  useEffect(() => {
    load();
    authApi.me().then(({ user }) => setMeId(user.id)).catch(() => {});
  }, [load]);

  async function run(fn: () => Promise<Assignment[]>) {
    setBusy(true);
    setError("");
    try {
      setPeople(await fn());
      assignmentsApi.staff().then(setStaff).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  function add(e: FormEvent) {
    e.preventDefault();
    if (!managerId) return;
    run(async () => {
      const result = await assignmentsApi.assign(reference, { managerId, role, note: note.trim() || null });
      setManagerId("");
      setNote("");
      return result;
    });
  }

  const available = staff.filter((s) => !people?.some((p) => p.managerId === s.id));
  const mine = meId && people?.some((p) => p.managerId === meId);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold">Staff</h3>
          <p className="text-xs text-slate-500">Who is handling this request. Teams don&apos;t see this.</p>
        </div>
        {meId && !mine && people && (
          <button
            disabled={busy}
            onClick={() => run(() => assignmentsApi.assign(reference, { managerId: meId, role: people.some((p) => p.role === "lead") ? "support" : "lead" }))}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <UserPlus className="size-4" /> Assign to me
          </button>
        )}
      </div>

      <div className="mt-3"><ErrorNote message={error} /></div>

      {!people && !error ? (
        <p className="mt-3 text-sm text-slate-500" aria-busy="true">Loading…</p>
      ) : people && (
        <>
          {people.length === 0 ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Nobody is assigned yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {people.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold">{p.name}</span>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${p.role === "lead" ? "bg-[#e8f4fb] text-[#007cc2]" : "bg-slate-100 text-slate-600"}`}>
                      {STAFF_ROLE_LABELS[p.role]}
                    </span>
                    {p.note && <span className="ml-2 text-xs text-slate-500">{p.note}</span>}
                  </span>
                  <button
                    disabled={busy}
                    onClick={() => run(() => assignmentsApi.remove(p.id))}
                    aria-label={`Remove ${p.name}`}
                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {available.length > 0 && (
            <form onSubmit={add} className="mt-3 flex flex-wrap items-center gap-2">
              <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={field} aria-label="Staff member">
                <option value="">Add staff…</option>
                {available.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.openRequests} open)</option>
                ))}
              </select>
              <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={field} aria-label="Role">
                {ROLES.map((r) => <option key={r} value={r}>{STAFF_ROLE_LABELS[r]}</option>)}
              </select>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Note (optional)" className={`${field} min-w-[160px] flex-1`} />
              <button disabled={busy || !managerId} className="rounded-xl bg-[#007cc2] px-3 py-2 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60">
                Assign
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
