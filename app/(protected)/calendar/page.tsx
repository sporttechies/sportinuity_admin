"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requestsApi, type LogisticsRequest } from "@/lib/api";
import { STATUS_STYLES, formatDateRange } from "@/lib/constants";
import { ErrorNote } from "@/components/modal";

const pad = (n: number) => String(n).padStart(2, "0");
const key = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Trips that are no longer happening aren't shown.
const SHOWN = "new,in_review,quoted,confirmed,completed";

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [items, setItems] = useState<LogisticsRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const first = key(year, month, 1);
  const last = key(year, month, daysInMonth);
  // Monday-first offset of the 1st.
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // dateFrom/dateTo match any trip overlapping the range.
    requestsApi
      .list({ status: SHOWN, dateFrom: first, dateTo: last, limit: 500 })
      .then((r) => !cancelled && (setItems(r.data.filter((x) => x.departure), setError(""))))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load trips."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [first, last]);

  const spans = useMemo(
    () =>
      items.map((r) => {
        const start = (r.departure || "").slice(0, 10);
        const end = (r.returnDate || r.departure || "").slice(0, 10);
        return { r, start, end: end < start ? start : end };
      }),
    [items],
  );

  const onDay = (day: string) => spans.filter((s) => s.start <= day && day <= s.end);

  function move(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const title = new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const todayKey = key(today.getFullYear(), today.getMonth(), today.getDate());
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => {
    const d = i - offset + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">Today</button>
          <button onClick={() => move(-1)} aria-label="Previous month" className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50"><ChevronLeft className="size-4" /></button>
          <button onClick={() => move(1)} aria-label="Next month" className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50"><ChevronRight className="size-4" /></button>
        </div>
      </div>

      <ErrorNote message={error} />

      {/* Month grid (tablet and up) */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {WEEKDAYS.map((d) => <div key={d} className="px-3 py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const day = d ? key(year, month, d) : "";
            const here = d ? onDay(day) : [];
            return (
              <div key={i} className={`min-h-[104px] border-b border-r border-slate-100 p-1.5 ${d ? "" : "bg-slate-50/60"}`}>
                {d && (
                  <>
                    <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${day === todayKey ? "bg-[#007cc2] text-white" : "text-slate-500"}`}>{d}</span>
                    <ul className="mt-1 space-y-1">
                      {here.slice(0, 3).map(({ r }) => (
                        <li key={r.reference}>
                          <Link
                            href={`/requests/${encodeURIComponent(r.reference)}`}
                            title={`${r.reference} · ${r.team || "No team"} → ${r.location}`}
                            className={`block truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[r.status]}`}
                          >
                            {r.team || r.reference}
                          </Link>
                        </li>
                      ))}
                      {here.length > 3 && <li className="px-1 text-[11px] font-medium text-slate-400">+{here.length - 3} more</li>}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda: always shown, and the only view on phones */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold">Trips this month ({spans.length})</h3>
        {!loading && spans.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No trips scheduled this month.</p>}
        {loading && <p className="py-6 text-center text-sm text-slate-500" aria-busy="true">Loading…</p>}
        <ul className="mt-2 divide-y divide-slate-100">
          {[...spans].sort((a, b) => a.start.localeCompare(b.start)).map(({ r }) => (
            <li key={r.reference}>
              <Link href={`/requests/${encodeURIComponent(r.reference)}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-1 py-3 hover:bg-slate-50">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{r.team || "No team"} → {r.location}</span>
                  <span className="block text-xs text-slate-500">{formatDateRange(r.departure, r.returnDate)} · {r.reference} · {r.people} traveller{r.people === 1 ? "" : "s"}</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[r.status]}`}>{r.status.replace("_", " ")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
