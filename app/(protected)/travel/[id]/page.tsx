"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { travelApi, type ItineraryItem, type Trip, type TripStatus } from "@/lib/api";
import {
  AUDIENCE_LABELS, ITINERARY_KIND_LABELS, countryName, formatDate, formatDateRange, formatMoney,
} from "@/lib/constants";
import { ErrorNote } from "@/components/modal";
import { TripForm } from "@/components/trip-form";
import { ItineraryForm } from "@/components/itinerary-form";
import { TripStatusBadge } from "@/components/trip-status";
import { BookingForm } from "@/components/booking-form";

const DAY = 86_400_000;
const dayCount = (t: Trip) => {
  const a = Date.parse(t.startDate), b = Date.parse(t.endDate);
  return Math.max(1, Math.round((b - a) / DAY) + 1);
};
const dayDate = (t: Trip, n: number) => new Date(Date.parse(t.startDate) + (n - 1) * DAY).toISOString().slice(0, 10);

const ACTIONS: Record<TripStatus, { to: TripStatus; label: string; primary?: boolean }[]> = {
  draft: [{ to: "published", label: "Publish", primary: true }, { to: "archived", label: "Archive" }],
  published: [{ to: "closed", label: "Close bookings", primary: true }, { to: "draft", label: "Unpublish" }],
  closed: [{ to: "published", label: "Reopen", primary: true }, { to: "archived", label: "Archive" }],
  archived: [{ to: "draft", label: "Restore" }],
};

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [itemForm, setItemForm] = useState<{ item?: ItineraryItem; day?: number } | null>(null);

  const load = useCallback(async () => {
    try {
      setTrip(await travelApi.get(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the trip.");
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!trip) {
    return (
      <div className="space-y-4">
        <Link href="/travel" className="inline-flex items-center gap-1 text-sm font-semibold text-[#007cc2]"><ChevronLeft className="size-4" />Trips</Link>
        {error ? <ErrorNote message={error} /> : <p className="text-sm text-slate-500" aria-busy="true">Loading…</p>}
      </div>
    );
  }

  const days = dayCount(trip);
  const byDay = new Map<number, ItineraryItem[]>();
  (trip.itinerary ?? []).forEach((i) => byDay.set(i.dayNumber, [...(byDay.get(i.dayNumber) ?? []), i]));
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);
  const canDelete = trip.status === "draft" || trip.status === "archived";

  return (
    <div className="space-y-6">
      <Link href="/travel" className="inline-flex items-center gap-1 text-sm font-semibold text-[#007cc2]"><ChevronLeft className="size-4" />Trips</Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{trip.title}</h1>
            <TripStatusBadge status={trip.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {trip.eventName ? `${trip.eventName} · ` : ""}{trip.destination}{trip.country ? `, ${countryName(trip.country)}` : ""} · {formatDateRange(trip.startDate, trip.endDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(trip.status === "published" || trip.status === "closed") && (
            <button disabled={busy} onClick={() => setBooking(true)} className="rounded-xl bg-[#d0ee27] px-4 py-2.5 text-sm font-bold text-[#102331] hover:bg-[#c2e013]">New booking</button>
          )}
          {ACTIONS[trip.status].map((a) => (
            <button
              key={a.to}
              disabled={busy}
              onClick={() => run(async () => { setTrip(await travelApi.setStatus(trip.id, a.to)); setNotice(`Trip is now ${a.to}.`); })}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${a.primary ? "bg-[#007cc2] text-white hover:bg-[#006ba8]" : "border border-slate-200 hover:bg-slate-50"}`}
            >
              {a.label}
            </button>
          ))}
          <button disabled={busy} onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><Pencil className="size-4" />Edit</button>
          <button
            disabled={busy}
            onClick={() => run(async () => { const copy = await travelApi.duplicate(trip.id); router.push(`/travel/${copy.id}`); })}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            <Copy className="size-4" />Duplicate
          </button>
          {canDelete && (
            <button
              disabled={busy}
              onClick={() => {
                if (!window.confirm("Delete this trip and its itinerary? This can't be undone.")) return;
                run(async () => { await travelApi.remove(trip.id); router.push("/travel"); });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" />Delete
            </button>
          )}
        </div>
      </header>

      <ErrorNote message={error} />
      {notice && <p role="status" className="rounded-xl border border-[#d6ecdf] bg-[#eaf5ee] px-3.5 py-3 text-sm font-medium text-[#1c673e]">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Itinerary <span className="font-normal text-slate-400">· {days} day{days === 1 ? "" : "s"}</span></h2>
              <button onClick={() => setItemForm({})} className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8f4fb] px-3 py-1.5 text-sm font-semibold text-[#007cc2] hover:bg-[#d7ecf8]"><Plus className="size-4" />Add item</button>
            </div>
            <div className="space-y-5">
              {dayNumbers.map((n) => (
                <div key={n}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Day {n} <span className="font-normal text-slate-400">· {formatDate(dayDate(trip, n))}</span></h3>
                    <button onClick={() => setItemForm({ day: n })} className="text-xs font-semibold text-[#007cc2] hover:underline">Add</button>
                  </div>
                  {(byDay.get(n) ?? []).length === 0 ? (
                    <p className="mt-1.5 text-sm text-slate-400">Nothing planned.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
                      {byDay.get(n)!.map((i) => (
                        <li key={i.id} className="flex items-start gap-3 px-3.5 py-3">
                          <span className="w-12 shrink-0 pt-0.5 text-xs font-semibold text-slate-500">{i.startTime ?? "—"}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{i.title} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{ITINERARY_KIND_LABELS[i.kind]}</span></p>
                            {i.details && <p className="mt-0.5 whitespace-pre-line text-sm text-slate-500">{i.details}</p>}
                          </div>
                          <button aria-label={`Edit ${i.title}`} onClick={() => setItemForm({ item: i })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-[#007cc2]"><Pencil className="size-4" /></button>
                          <button
                            aria-label={`Remove ${i.title}`}
                            disabled={busy}
                            onClick={() => run(async () => setTrip(await travelApi.removeItem(i.id)))}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          ><Trash2 className="size-4" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="mb-3 font-bold">Pricing and seats</h2>
            <dl className="space-y-2">
              <div className="flex justify-between"><dt className="text-slate-500">Per person</dt><dd className="font-semibold">{formatMoney(trip.priceCents / 100, trip.currency)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Single room extra</dt><dd className="font-semibold">{trip.singleSupplementCents ? formatMoney(trip.singleSupplementCents / 100, trip.currency) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Seats</dt><dd className="font-semibold">{trip.capacity ? `${trip.seatsTaken} of ${trip.capacity} booked` : `${trip.seatsTaken} booked · unlimited`}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Bookings</dt><dd><Link href={`/travel/bookings?trip=${trip.id}`} className="font-semibold text-[#007cc2] hover:underline">View</Link></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Book by</dt><dd className="font-semibold">{trip.bookingDeadline ? formatDate(trip.bookingDeadline) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">For</dt><dd className="font-semibold">{trip.audiences.map((a) => AUDIENCE_LABELS[a]).join(", ")}</dd></div>
            </dl>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="mb-2 font-bold">About</h2>
            <p className="text-slate-600">{trip.summary || <span className="text-slate-400">No summary yet (needed to publish).</span>}</p>
            {trip.description && <p className="mt-3 whitespace-pre-line text-slate-600">{trip.description}</p>}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="mb-2 font-bold">Included</h2>
            {trip.inclusions.length ? (
              <ul className="list-disc space-y-1 pl-5 text-slate-600">{trip.inclusions.map((x) => <li key={x}>{x}</li>)}</ul>
            ) : (
              <p className="text-slate-400">Nothing listed.</p>
            )}
            {trip.exclusions && (<><h3 className="mb-1 mt-4 font-semibold">Not included</h3><p className="text-slate-600">{trip.exclusions}</p></>)}
          </div>
        </aside>
      </div>

      {booking && <BookingForm trip={trip} onClose={() => setBooking(false)} onSaved={(b) => router.push(`/travel/bookings/${b.id}`)} />}
      {editing && <TripForm trip={trip} onClose={() => setEditing(false)} onSaved={(t) => { setTrip(t); setEditing(false); }} />}
      {itemForm && (
        <ItineraryForm
          tripId={trip.id}
          days={days}
          item={itemForm.item}
          defaultDay={itemForm.day}
          onClose={() => setItemForm(null)}
          onSaved={(t) => { setTrip(t); setItemForm(null); }}
        />
      )}
    </div>
  );
}
