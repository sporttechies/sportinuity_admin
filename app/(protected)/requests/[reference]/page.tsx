"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  requestsApi,
  type LogisticsRequest,
  type RequestStatus,
} from "@/lib/api";
import {
  NEXT_STATUSES,
  STATUS_LABELS,
  formatDate,
  formatDateRange,
  formatDateTime,
} from "@/lib/constants";
import { ConfirmDialog, ErrorNote, RejectDialog } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { TeamAvatar } from "@/components/team-avatar";

type Row = {
  firstName: string;
  lastName: string;
  type: string;
  documentNumber: string;
  dietary: string;
  category: "adult" | "child" | "infant";
};
type Form = {
  event: string;
  from: string;
  location: string;
  departure: string;
  returnDate: string;
  contact: { name: string; email: string; phone: string };
  travellers: Row[];
};

const input =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15";
const label = "block text-xs font-semibold text-slate-600";

const toForm = (r: LogisticsRequest): Form => ({
  event: r.event,
  from: r.from || "",
  location: r.location,
  departure: (r.departure || "").slice(0, 10),
  returnDate: (r.returnDate || "").slice(0, 10),
  contact: {
    name: r.contact.name || "",
    email: r.contact.email || "",
    phone: r.contact.phone || "",
  },
  travellers: (r.travellers || []).map((t) => ({
    firstName: t.firstName,
    lastName: t.lastName,
    type: t.type || "regular",
    documentNumber: t.documentNumber || "",
    dietary: t.dietary || "",
    category: t.category,
  })),
});

function eventText(e: { action: string; fromStatus: string | null; toStatus: string | null }) {
  if (e.action === "created") return "Request submitted";
  if (e.action === "edited") return "Details edited";
  if (e.action === "deleted") return "Request deleted";
  if (e.action === "status_changed" && e.toStatus)
    return `${e.fromStatus ? `${STATUS_LABELS[e.fromStatus as RequestStatus] ?? e.fromStatus} → ` : ""}${
      STATUS_LABELS[e.toStatus as RequestStatus] ?? e.toStatus
    }`;
  return e.action;
}

export default function RequestDetailPage() {
  const params = useParams<{ reference: string }>();
  const reference = decodeURIComponent(String(params.reference || ""));
  const router = useRouter();
  const [data, setData] = useState<LogisticsRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [working, setWorking] = useState(false);

  const apply = useCallback((r: LogisticsRequest) => {
    setData(r);
    setNotes(r.managerNotes || "");
  }, []);

  useEffect(() => {
    let cancelled = false;
    requestsApi
      .get(reference)
      .then((r) => !cancelled && apply(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load the request."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reference, apply]);

  async function act(run: () => Promise<LogisticsRequest>, message: string) {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      apply(await run());
      setNotice(message);
      // The response may omit travellers/history; reload the full record.
      apply(await requestsApi.get(reference));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setWorking(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form || !data) return;
    setSaving(true);
    setError("");
    try {
      await requestsApi.update(reference, {
        event: form.event.trim(),
        from: form.from.trim() || null,
        location: form.location.trim(),
        departure: form.departure || null,
        returnDate: form.returnDate || null,
        contact: form.contact,
        // Legacy requests without a team keep their travellers untouched.
        ...(data.teamId ? { travellers: form.travellers } : {}),
      });
      apply(await requestsApi.get(reference));
      setEditing(false);
      setNotice("Changes saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    setError("");
    try {
      await requestsApi.update(reference, { managerNotes: notes.trim() || null });
      apply(await requestsApi.get(reference));
      setNotice("Notes saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save notes.");
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) return <p className="text-slate-500" aria-busy="true">Loading…</p>;
  if (!data)
    return (
      <div className="space-y-4">
        <ErrorNote message={error || "Request not found."} />
        <Link href="/requests" className="text-sm font-semibold text-[#007cc2] hover:underline">← Back to requests</Link>
      </div>
    );

  const allowed = NEXT_STATUSES[data.status];
  const simpleMoves = allowed.filter(
    (s) => s !== data.status && s !== "confirmed" && s !== "rejected" && s !== "cancelled",
  );
  const setRow = (i: number, patch: Partial<Row>) =>
    setForm((f) => f && { ...f, travellers: f.travellers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) });

  return (
    <div className="space-y-6">
      <Link href="/requests" className="text-sm font-semibold text-[#007cc2] hover:underline">← All requests</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <TeamAvatar name={data.team} logoPath={data.teamLogoPath} className="size-12" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{data.reference}</h2>
            <p className="text-sm text-slate-600">
              {data.teamId ? (
                <Link href={`/teams/${data.teamId}`} className="font-semibold text-[#007cc2] hover:underline">{data.team}</Link>
              ) : (
                data.team
              )}{" "}
              · {data.event}
            </p>
          </div>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <ErrorNote message={error} />
      {notice && (
        <p role="status" className="rounded-xl bg-[#eaf5ee] px-4 py-3 text-sm font-semibold text-[#1c673e]">{notice}</p>
      )}

      {data.status === "rejected" && data.rejectionReason && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-bold">Rejection reason (sent to the team)</p>
          <p className="mt-1">{data.rejectionReason}</p>
        </div>
      )}

      {/* Actions */}
      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        {allowed.includes("confirmed") && (
          <button
            disabled={working}
            onClick={() => act(() => requestsApi.approve(reference), "Approved. The team has been notified.")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1c673e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15522f] disabled:opacity-60"
          >
            <Check className="size-4" /> Approve
          </button>
        )}
        {allowed.includes("rejected") && (
          <button disabled={working} onClick={() => setRejecting(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
            <X className="size-4" /> Reject
          </button>
        )}
        {simpleMoves.map((s) => (
          <button
            key={s}
            disabled={working}
            onClick={() => act(() => requestsApi.setStatus(reference, s), `Status changed to ${STATUS_LABELS[s]}.`)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            Mark as {STATUS_LABELS[s].toLowerCase()}
          </button>
        ))}
        {allowed.includes("cancelled") && (
          <button disabled={working} onClick={() => setCancelling(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
            Cancel request
          </button>
        )}
        {allowed.length === 0 && <p className="text-sm text-slate-500">This request is closed, so its status can't change.</p>}
        <button onClick={() => setDeleting(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 className="size-4" /> Delete
        </button>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* Details / edit */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Trip and contact</h3>
              {!editing && (
                <button onClick={() => { setForm(toForm(data)); setEditing(true); setNotice(""); }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#007cc2] hover:underline">
                  <Pencil className="size-4" /> Edit
                </button>
              )}
            </div>

            {!editing ? (
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                {[
                  ["Event", data.event],
                  ["Team", data.team],
                  ["From", data.from || "—"],
                  ["Destination", data.location],
                  ["Dates", formatDateRange(data.departure, data.returnDate)],
                  ["Travellers", String(data.people)],
                  ["Contact", data.contact.name || "—"],
                  ["Email", data.contact.email || "—"],
                  ["Phone", data.contact.phone || "—"],
                  ["Submitted", formatDateTime(data.createdAt)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-semibold text-slate-500">{k}</dt>
                    <dd className="mt-0.5 break-words font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              form && (
                <form onSubmit={save} className="mt-4 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={`${label} sm:col-span-2`}>Event<input required value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} className={`${input} mt-1.5`} /></label>
                    <label className={label}>From<input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className={`${input} mt-1.5`} /></label>
                    <label className={label}>Destination<input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={`${input} mt-1.5`} /></label>
                    <label className={label}>Departure<input type="date" value={form.departure} onChange={(e) => setForm({ ...form, departure: e.target.value })} className={`${input} mt-1.5`} /></label>
                    <label className={label}>Return<input type="date" min={form.departure || undefined} value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} className={`${input} mt-1.5`} /></label>
                    <label className={label}>Contact name<input value={form.contact.name} onChange={(e) => setForm({ ...form, contact: { ...form.contact, name: e.target.value } })} className={`${input} mt-1.5`} /></label>
                    <label className={label}>Contact email<input type="email" value={form.contact.email} onChange={(e) => setForm({ ...form, contact: { ...form.contact, email: e.target.value } })} className={`${input} mt-1.5`} /></label>
                    <label className={label}>Contact phone<input value={form.contact.phone} onChange={(e) => setForm({ ...form, contact: { ...form.contact, phone: e.target.value } })} className={`${input} mt-1.5`} /></label>
                  </div>

                  {data.teamId ? (
                    <fieldset>
                      <legend className="text-sm font-bold">Travellers ({form.travellers.length})</legend>
                      <div className="mt-2 space-y-3">
                        {form.travellers.map((t, i) => (
                          <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                            <input required aria-label="First name" placeholder="First name" value={t.firstName} onChange={(e) => setRow(i, { firstName: e.target.value })} className={input} />
                            <input required aria-label="Last name" placeholder="Last name" value={t.lastName} onChange={(e) => setRow(i, { lastName: e.target.value })} className={input} />
                            <input aria-label="Passport or ID" placeholder="Passport / ID" value={t.documentNumber} onChange={(e) => setRow(i, { documentNumber: e.target.value })} className={input} />
                            <button type="button" aria-label={`Remove traveller ${i + 1}`} disabled={form.travellers.length === 1} onClick={() => setForm({ ...form, travellers: form.travellers.filter((_, idx) => idx !== i) })} className="flex h-10 items-center justify-center rounded-xl px-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30">
                              <Trash2 className="size-4" />
                            </button>
                            <select aria-label="Category" value={t.category} onChange={(e) => setRow(i, { category: e.target.value as Row["category"] })} className={input}>
                              <option value="adult">Adult</option><option value="child">Child</option><option value="infant">Infant</option>
                            </select>
                            <select aria-label="Class" value={t.type} onChange={(e) => setRow(i, { type: e.target.value })} className={input}>
                              <option value="regular">Regular</option><option value="vip">VIP</option><option value="vvip">VVIP</option><option value="staff">Staff</option>
                            </select>
                            <input aria-label="Dietary or access needs" placeholder="Dietary / access needs" value={t.dietary} onChange={(e) => setRow(i, { dietary: e.target.value })} className={`${input} sm:col-span-2`} />
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => setForm({ ...form, travellers: [...form.travellers, { firstName: "", lastName: "", type: "regular", documentNumber: "", dietary: "", category: "adult" }] })} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#007cc2] hover:underline">
                        <Plus className="size-4" /> Add traveller
                      </button>
                    </fieldset>
                  ) : (
                    <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                      This is an older request with no team attached, so its travellers can't be edited.
                    </p>
                  )}

                  <div className="flex justify-end gap-3">
                    <button type="button" disabled={saving} onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                    <button type="submit" disabled={saving} className="rounded-xl bg-[#007cc2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
                  </div>
                </form>
              )
            )}
          </section>

          {!editing && (data.travellers?.length ?? 0) > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold">Travellers</h3>
              <div className="app-scroll mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr><th className="py-2 pr-3">#</th><th className="py-2 pr-3">Name</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Passport / ID</th><th className="py-2">Needs</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.travellers!.map((t, i) => (
                      <tr key={t.id || i}>
                        <td className="py-2.5 pr-3 text-slate-400">{(t.index ?? i) + 1}</td>
                        <td className="py-2.5 pr-3 font-medium">{t.firstName} {t.lastName}</td>
                        <td className="py-2.5 pr-3 capitalize text-slate-600">{t.category} · {t.type}</td>
                        <td className="py-2.5 pr-3 text-slate-600">{t.documentNumber || "—"}</td>
                        <td className="py-2.5 text-slate-600">{t.dietary || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold">Internal notes</h3>
            <p className="text-xs text-slate-500">Only managers can see these.</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} maxLength={4000} className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15" />
            <button onClick={saveNotes} disabled={savingNotes || notes.trim() === (data.managerNotes || "").trim()} className="mt-2 rounded-xl bg-[#007cc2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-50">
              {savingNotes ? "Saving…" : "Save notes"}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold">History</h3>
            {(data.events?.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No history yet.</p>
            ) : (
              <ol className="mt-4 space-y-4 border-l-2 border-slate-100 pl-5">
                {data.events!.map((e) => (
                  <li key={e.id} className="relative text-sm">
                    <span aria-hidden="true" className="absolute -left-[27px] top-1.5 size-2.5 rounded-full bg-[#007cc2]" />
                    <p className="font-semibold">{eventText(e)}</p>
                    {e.note && <p className="text-slate-600">{e.note}</p>}
                    <p className="text-xs text-slate-400">
                      {formatDateTime(e.createdAt)}
                      {e.actorName ? ` · ${e.actorName}` : e.actorRole === "team_admin" ? " · Team" : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-4 text-xs text-slate-400">Last updated {formatDate(data.updatedAt)}</p>
          </section>
        </div>
      </div>

      {rejecting && (
        <RejectDialog
          reference={reference}
          onClose={() => setRejecting(false)}
          onReject={async (reason) => {
            await requestsApi.reject(reference, reason);
            setRejecting(false);
            apply(await requestsApi.get(reference));
            setNotice("Rejected. The team has been notified.");
          }}
        />
      )}
      {cancelling && (
        <ConfirmDialog
          title={`Cancel ${reference}?`}
          danger
          confirmLabel="Cancel request"
          message="The team will be told this request was cancelled. A cancelled request can't be reopened."
          onClose={() => setCancelling(false)}
          onConfirm={async () => {
            await requestsApi.setStatus(reference, "cancelled");
            setCancelling(false);
            apply(await requestsApi.get(reference));
            setNotice("Request cancelled.");
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${reference}?`}
          danger
          confirmLabel="Delete request"
          message="The request is removed from the list and the team will no longer see it."
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await requestsApi.remove(reference);
            router.replace("/requests");
          }}
        />
      )}
    </div>
  );
}
