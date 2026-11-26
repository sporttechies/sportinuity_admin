"use client";

import { useState, type FormEvent } from "react";
import { travelApi, type Trip, type TripAudience, type TripInput } from "@/lib/api";
import { AUDIENCE_LABELS, SUPPLIER_COUNTRIES, countryName, currencyOptions } from "@/lib/constants";
import { Modal, ErrorNote } from "@/components/modal";

const input =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-2 focus:ring-[#007cc2]/20";
const AUDIENCES = Object.keys(AUDIENCE_LABELS) as TripAudience[];

/** Money fields are typed in major units (1,500.00) and stored as cents. */
const toCents = (v: FormDataEntryValue | null) => Math.round(Number(String(v || "0").replace(/,/g, "")) * 100);
const toMajor = (cents?: number) => (cents ? String(cents / 100) : "");

/** Creates or edits a trip package's details (the itinerary is edited on the trip page). */
export function TripForm({ trip, onClose, onSaved }: { trip?: Trip; onClose: () => void; onSaved: (trip: Trip) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const currencies = currencyOptions();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const audiences = f.getAll("audiences").map(String) as TripAudience[];
    if (audiences.length === 0) return setError("Choose who this trip is for.");
    const text = (k: string) => String(f.get(k) || "").trim() || null;
    const body: TripInput = {
      title: String(f.get("title") || "").trim(),
      eventName: text("eventName"),
      destination: String(f.get("destination") || "").trim(),
      country: text("country"),
      startDate: String(f.get("startDate") || ""),
      endDate: String(f.get("endDate") || ""),
      summary: text("summary"),
      description: text("description"),
      audiences,
      priceCents: toCents(f.get("price")),
      singleSupplementCents: toCents(f.get("supplement")),
      currency: String(f.get("currency") || "USD"),
      capacity: text("capacity"),
      bookingDeadline: text("bookingDeadline"),
      coverImageUrl: text("coverImageUrl"),
      inclusions: String(f.get("inclusions") || "").split("\n").map((s) => s.trim()).filter(Boolean),
      exclusions: text("exclusions"),
    };
    setBusy(true);
    setError("");
    try {
      onSaved(trip ? await travelApi.update(trip.id, body) : await travelApi.create(body));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the trip.");
      setBusy(false);
    }
  }

  return (
    <Modal title={trip ? "Edit trip" : "New trip package"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">
          Title
          <input name="title" required minLength={3} maxLength={160} defaultValue={trip?.title ?? ""} placeholder="AFCON 2027 fan trip" className={input} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Event
            <input name="eventName" maxLength={160} defaultValue={trip?.eventName ?? ""} placeholder="Optional" className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Destination
            <input name="destination" required maxLength={160} defaultValue={trip?.destination ?? ""} placeholder="Nairobi" className={input} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-semibold">
            Country
            <select name="country" defaultValue={trip?.country ?? ""} className={input}>
              <option value="">—</option>
              {SUPPLIER_COUNTRIES.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Starts
            <input name="startDate" type="date" required defaultValue={trip?.startDate ?? ""} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Ends
            <input name="endDate" type="date" required defaultValue={trip?.endDate ?? ""} className={input} />
          </label>
        </div>
        <label className="block text-sm font-semibold">
          Short summary <span className="font-normal text-slate-400">(shown on cards, up to 300 characters)</span>
          <input name="summary" maxLength={300} defaultValue={trip?.summary ?? ""} className={input} />
        </label>
        <label className="block text-sm font-semibold">
          Full description
          <textarea name="description" rows={4} maxLength={8000} defaultValue={trip?.description ?? ""} className={input} />
        </label>
        <fieldset>
          <legend className="text-sm font-semibold">Who is it for?</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {AUDIENCES.map((a) => (
              <label key={a} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="audiences" value={a} defaultChecked={trip ? trip.audiences.includes(a) : a === "fans"} className="size-4 accent-[#007cc2]" />
                {AUDIENCE_LABELS[a]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block text-sm font-semibold">
            Currency
            <select name="currency" defaultValue={trip?.currency ?? "USD"} className={input}>
              {currencies.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Price per person
            <input name="price" type="number" min={0} step="0.01" required defaultValue={toMajor(trip?.priceCents)} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Single room extra
            <input name="supplement" type="number" min={0} step="0.01" defaultValue={toMajor(trip?.singleSupplementCents)} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Seats
            <input name="capacity" type="number" min={1} max={100000} defaultValue={trip?.capacity ?? ""} placeholder="Unlimited" className={input} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Book by
            <input name="bookingDeadline" type="date" defaultValue={trip?.bookingDeadline ?? ""} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Cover image link
            <input name="coverImageUrl" type="url" maxLength={500} defaultValue={trip?.coverImageUrl ?? ""} placeholder="https://…" className={input} />
          </label>
        </div>
        <label className="block text-sm font-semibold">
          What&apos;s included <span className="font-normal text-slate-400">(one per line)</span>
          <textarea name="inclusions" rows={4} defaultValue={trip?.inclusions.join("\n") ?? ""} placeholder={"Return flights\nHotel (bed and breakfast)\nMatch tickets"} className={input} />
        </label>
        <label className="block text-sm font-semibold">
          Not included
          <textarea name="exclusions" rows={2} maxLength={1000} defaultValue={trip?.exclusions ?? ""} className={input} />
        </label>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button disabled={busy} className="rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60">
            {busy ? "Saving…" : trip ? "Save changes" : "Create trip"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
