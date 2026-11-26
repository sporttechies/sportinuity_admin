"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { bookingsApi, type Booking, type BookingStatus } from "@/lib/api";
import { BOOKING_STATUS_LABELS, CUSTOMER_TYPE_LABELS, formatDate, formatMoney } from "@/lib/constants";
import { ErrorNote } from "@/components/modal";
import { BookingInvoiceBadge, BookingStatusBadge } from "@/components/booking-status";
import { TravelTabs } from "@/components/travel-tabs";

const PAGE_SIZE = 20;
const STATUSES = Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[];

function BookingList() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get("status") || "";
  const q = params.get("q") || "";
  const packageId = params.get("trip") || "";
  const [search, setSearch] = useState(q);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Partial<Record<BookingStatus, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadId = useRef(0);

  const setFilter = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      setPage(0);
      router.replace(`/travel/bookings${next.toString() ? `?${next}` : ""}`);
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
    bookingsApi
      .list({ status, q, packageId, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then((res) => {
        if (id !== loadId.current) return;
        setRows(res.data);
        setTotal(res.total);
        setCounts(res.counts);
        setError("");
      })
      .catch((err) => id === loadId.current && setError(err instanceof Error ? err.message : "Could not load bookings."))
      .finally(() => id === loadId.current && setLoading(false));
  }, [status, q, packageId, page]);

  const all = STATUSES.reduce((n, s) => n + (counts[s] ?? 0), 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <TravelTabs active="bookings" />
      <p className="text-sm text-slate-500">
        {total} booking{total === 1 ? "" : "s"}{packageId && " on one trip"}. Create a booking from a trip&apos;s page.
        {packageId && <button onClick={() => setFilter({ trip: "" })} className="ml-2 font-semibold text-[#007cc2] hover:underline">Show all trips</button>}
      </p>
      <div className="app-scroll flex gap-2 overflow-x-auto pb-1">
        {[{ key: "", label: "All", n: all }, ...STATUSES.map((s) => ({ key: s, label: BOOKING_STATUS_LABELS[s], n: counts[s] ?? 0 }))].map((t) => (
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
          aria-label="Search bookings"
          placeholder="Reference, name, email, organisation or invoice"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15"
        />
      </div>
      <ErrorNote message={error} />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="app-scroll overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Trip</th>
                <th className="px-4 py-3">Seats</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/travel/bookings/${b.id}`} className="font-semibold text-[#007cc2] hover:underline">{b.reference}</Link>
                    <span className="block text-xs text-slate-400">{formatDate(b.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block font-medium">{b.organisation || b.contactName}</span>
                    <span className="text-xs text-slate-500">{CUSTOMER_TYPE_LABELS[b.customerType]}{b.organisation ? ` · ${b.contactName}` : ""}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/travel/${b.packageId}`} className="hover:underline">{b.package.title}</Link>
                    <span className="block text-xs text-slate-500">{formatDate(b.package.startDate)}</span>
                  </td>
                  <td className="px-4 py-3">{b.seats}</td>
                  <td className="px-4 py-3 font-medium">{formatMoney(b.totalCents / 100, b.currency)}</td>
                  <td className="px-4 py-3"><BookingStatusBadge status={b.status} /></td>
                  <td className="px-4 py-3"><BookingInvoiceBadge status={b.invoice?.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && <p className="py-12 text-center text-sm text-slate-500">No bookings found.</p>}
        {loading && <p className="py-6 text-center text-sm text-slate-500" aria-busy="true">Loading…</p>}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Page {page + 1} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page" className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
            <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} aria-label="Next page" className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingList />
    </Suspense>
  );
}
