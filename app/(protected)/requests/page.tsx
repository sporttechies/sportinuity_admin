"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Plus, Search, Trash2, X } from "lucide-react";
import { requestsApi, type LogisticsRequest } from "@/lib/api";
import {
  ALL_STATUSES,
  NEXT_STATUSES,
  STATUS_LABELS,
  formatDate,
  formatDateRange,
} from "@/lib/constants";
import { ConfirmDialog, ErrorNote, RejectDialog } from "@/components/modal";
import { NewRequestModal } from "@/components/new-request-modal";
import { StatusBadge } from "@/components/status-badge";
import { TeamAvatar } from "@/components/team-avatar";

const PAGE_SIZE = 15;
const ACTIVE_GROUP = "new,in_review,quoted,confirmed";

function RequestsList() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get("status") || "";
  const q = params.get("q") || "";
  const teamId = params.get("teamId") || "";
  const dateFrom = params.get("dateFrom") || "";
  const dateTo = params.get("dateTo") || "";

  const [search, setSearch] = useState(q);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<LogisticsRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reject, setReject] = useState<LogisticsRequest | null>(null);
  const [remove, setRemove] = useState<LogisticsRequest | null>(null);
  const [creating, setCreating] = useState(false);
  const loadId = useRef(0);

  // Keep filters in the URL so views can be linked to and survive a refresh.
  const setFilter = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      setPage(0);
      router.replace(`/requests${next.toString() ? `?${next}` : ""}`);
    },
    [params, router],
  );

  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (search.trim() === q) return;
    const timer = setTimeout(() => setFilter({ q: search.trim() }), 400);
    return () => clearTimeout(timer);
  }, [search, q, setFilter]);

  const load = useCallback(async () => {
    const id = ++loadId.current;
    setLoading(true);
    setError("");
    try {
      const result = await requestsApi.list({
        status, q, teamId, dateFrom, dateTo,
        limit: PAGE_SIZE, offset: page * PAGE_SIZE,
      });
      if (id !== loadId.current) return;
      setRows(result.data);
      setTotal(result.total);
      setCounts(result.counts || {});
    } catch (err) {
      if (id === loadId.current)
        setError(err instanceof Error ? err.message : "Could not load requests.");
    } finally {
      if (id === loadId.current) setLoading(false);
    }
  }, [status, q, teamId, dateFrom, dateTo, page]);

  useEffect(() => {
    load();
  }, [load]);

  const count = (s: string) =>
    s === "" ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[s] ?? 0);
  const tabs: { key: string; label: string; n: number }[] = [
    { key: "", label: "All", n: count("") },
    { key: ACTIVE_GROUP, label: "Active", n: ACTIVE_GROUP.split(",").reduce((a, s) => a + count(s), 0) },
    ...ALL_STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s], n: count(s) })),
  ];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function approve(r: LogisticsRequest) {
    setError("");
    try {
      await requestsApi.approve(r.reference);
      setNotice(`${r.reference} approved. The team has been notified.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {total} request{total === 1 ? "" : "s"}
          {teamId && (
            <button onClick={() => setFilter({ teamId: "" })} className="ml-2 font-semibold text-[#007cc2] hover:underline">
              Clear team filter
            </button>
          )}
        </p>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8]"
        >
          <Plus className="size-4" /> New request
        </button>
      </div>

      <div className="app-scroll flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const active = status === t.key;
          if (!active && t.key !== "" && t.key !== ACTIVE_GROUP && t.n === 0) return null;
          return (
            <button
              key={t.label}
              onClick={() => setFilter({ status: t.key })}
              aria-pressed={active}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                active ? "bg-[#007cc2] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label} ({t.n})
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search requests"
            placeholder="Reference, team, event or destination"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          Trips from
          <input type="date" value={dateFrom} onChange={(e) => setFilter({ dateFrom: e.target.value })} className="h-10 rounded-xl border border-slate-200 bg-white px-2 text-sm text-[#0a0b0d]" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          to
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setFilter({ dateTo: e.target.value })} className="h-10 rounded-xl border border-slate-200 bg-white px-2 text-sm text-[#0a0b0d]" />
        </label>
      </div>

      <ErrorNote message={error} />
      {notice && (
        <p role="status" className="rounded-xl bg-[#eaf5ee] px-4 py-3 text-sm font-semibold text-[#1c673e]">
          {notice}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="app-scroll overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Trip</th>
                <th className="px-4 py-3">Travellers</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const allowed = NEXT_STATUSES[r.status];
                return (
                  <tr key={r.reference} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/requests/${encodeURIComponent(r.reference)}`} className="flex items-center gap-3">
                        <TeamAvatar name={r.team || "No team"} logoPath={r.teamLogoPath} />
                        <span className="min-w-0">
                          <span className="block font-semibold text-[#007cc2]">{r.reference}</span>
                          <span className="block max-w-[220px] truncate text-slate-600">{r.team || "No team"} · {r.event}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium">{r.from ? `${r.from} → ` : ""}{r.location}</span>
                      <span className="block text-xs text-slate-500">{formatDateRange(r.departure, r.returnDate)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.people}
                      <span className="block text-xs text-slate-400">Submitted {formatDate(r.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {allowed.includes("confirmed") && (
                          <button onClick={() => approve(r)} title="Approve" aria-label={`Approve ${r.reference}`} className="rounded-lg p-2 text-[#1c673e] hover:bg-[#eaf5ee]">
                            <Check className="size-4" />
                          </button>
                        )}
                        {allowed.includes("rejected") && (
                          <button onClick={() => setReject(r)} title="Reject" aria-label={`Reject ${r.reference}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                            <X className="size-4" />
                          </button>
                        )}
                        <button onClick={() => setRemove(r)} title="Delete" aria-label={`Delete ${r.reference}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-500">No requests match these filters.</p>
        )}
        {loading && <p className="py-6 text-center text-sm text-slate-500" aria-busy="true">Loading…</p>}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Page {page + 1} of {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page" className="rounded-xl border border-slate-200 bg-white p-2 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
            <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} aria-label="Next page" className="rounded-xl border border-slate-200 bg-white p-2 disabled:opacity-40"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      )}

      {reject && (
        <RejectDialog
          reference={reject.reference}
          onClose={() => setReject(null)}
          onReject={async (reason) => {
            await requestsApi.reject(reject.reference, reason);
            setNotice(`${reject.reference} rejected. The team has been notified.`);
            setReject(null);
            load();
          }}
        />
      )}
      {remove && (
        <ConfirmDialog
          title={`Delete ${remove.reference}?`}
          danger
          confirmLabel="Delete request"
          message="The request is removed from the list. The team won't see it any more."
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            await requestsApi.remove(remove.reference);
            setNotice(`${remove.reference} deleted.`);
            setRemove(null);
            load();
          }}
        />
      )}
      {creating && (
        <NewRequestModal
          teamId={teamId || undefined}
          onClose={() => setCreating(false)}
          onCreated={(r) => {
            setCreating(false);
            router.push(`/requests/${encodeURIComponent(r.reference)}`);
          }}
        />
      )}
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <RequestsList />
    </Suspense>
  );
}
