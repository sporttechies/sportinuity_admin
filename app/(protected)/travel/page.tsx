"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { travelApi, type Trip, type TripStatus } from "@/lib/api";
import { TRIP_STATUS_LABELS, countryName, formatDateRange, formatMoney } from "@/lib/constants";
import { ErrorNote } from "@/components/modal";
import { TripForm } from "@/components/trip-form";
import { TripStatusBadge } from "@/components/trip-status";
import { TravelTabs } from "@/components/travel-tabs";

const STATUSES = Object.keys(TRIP_STATUS_LABELS) as TripStatus[];

function TripList() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get("status") || "";
  const q = params.get("q") || "";
  const [search, setSearch] = useState(q);
  const [rows, setRows] = useState<Trip[]>([]);
  const [counts, setCounts] = useState<Partial<Record<TripStatus, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const loadId = useRef(0);

  const setFilter = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      router.replace(`/travel${next.toString() ? `?${next}` : ""}`);
    },
    [params, router],
  );

  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (search.trim() === q) return;
    const timer = setTimeout(() => setFilter({ q: search.trim() }), 400);
    return () => clearTimeout(timer);
  }, [search, q, setFilter]);

  useEffect(() => {
    const id = ++loadId.current;
    setLoading(true);
    travelApi
      .list({ status, q })
      .then((res) => {
        if (id !== loadId.current) return;
        setRows(res.data);
        setCounts(res.counts);
        setError("");
      })
      .catch((err) => id === loadId.current && setError(err instanceof Error ? err.message : "Could not load trips."))
      .finally(() => id === loadId.current && setLoading(false));
  }, [status, q]);

  const total = STATUSES.reduce((n, s) => n + (counts[s] ?? 0), 0);

  return (
    <div className="space-y-5">
      <TravelTabs active="trips" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Trip packages that fans, groups and organisers can book.</p>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8]">
          <Plus className="size-4" /> New trip
        </button>
      </div>
      <div className="app-scroll flex gap-2 overflow-x-auto pb-1">
        {[{ key: "", label: "All", n: total }, ...STATUSES.map((s) => ({ key: s, label: TRIP_STATUS_LABELS[s], n: counts[s] ?? 0 }))].map((t) => (
          <button
            key={t.label}
            onClick={() => setFilter({ status: t.key })}
            aria-pressed={status === t.key}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              status === t.key ? "bg-[#007cc2] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label} <span className="opacity-70">{t.n}</span>
          </button>
        ))}
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search trips"
          placeholder="Title, event or destination"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15"
        />
      </div>
      <ErrorNote message={error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((t) => (
          <Link key={t.id} href={`/travel/${t.id}`} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#007cc2]/40 hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-bold leading-snug">{t.title}</h2>
              <TripStatusBadge status={t.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {t.destination}{t.country ? `, ${countryName(t.country)}` : ""}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">{formatDateRange(t.startDate, t.endDate)}</p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              <span className="font-semibold">{formatMoney(t.priceCents / 100, t.currency)}</span>
              <span className="text-slate-500">
                {t.capacity ? `${t.seatsTaken}/${t.capacity} seats booked` : `${t.seatsTaken} booked`}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!loading && rows.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">
          {status || q ? "No trips match." : "No trips yet. Create the first one."}
        </p>
      )}
      {loading && <p className="py-6 text-center text-sm text-slate-500" aria-busy="true">Loading…</p>}

      {creating && <TripForm onClose={() => setCreating(false)} onSaved={(t) => router.push(`/travel/${t.id}`)} />}
    </div>
  );
}

export default function TravelPage() {
  return (
    <Suspense fallback={null}>
      <TripList />
    </Suspense>
  );
}
