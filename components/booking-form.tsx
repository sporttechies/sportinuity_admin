"use client";

import { useState, type FormEvent } from "react";
import { bookingsApi, type Booking, type BookingTraveller, type CustomerType, type Trip } from "@/lib/api";
import { CUSTOMER_TYPE_LABELS, formatMoney } from "@/lib/constants";
import { Modal, ErrorNote } from "@/components/modal";
import { TravellersEditor, emptyTraveller } from "@/components/travellers-editor";

const input =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-2 focus:ring-[#007cc2]/20";
const TYPES = Object.keys(CUSTOMER_TYPE_LABELS) as CustomerType[];

/** Records a booking for a customer on a trip. */
export function BookingForm({ trip, onClose, onSaved }: { trip: Trip; onClose: () => void; onSaved: (b: Booking) => void }) {
  const [type, setType] = useState<CustomerType>("fan");
  const [travellers, setTravellers] = useState<Omit<BookingTraveller, "id">[]>([emptyTraveller()]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const singles = travellers.filter((t) => t.singleRoom).length;
  const total = travellers.length * trip.priceCents + singles * trip.singleSupplementCents;
  const left = trip.capacity == null ? null : trip.capacity - trip.seatsTaken;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => String(f.get(k) || "").trim() || null;
    setBusy(true);
    setError("");
    try {
      onSaved(
        await bookingsApi.create(trip.id, {
          customerType: type,
          contactName: String(f.get("name") || "").trim(),
          contactEmail: text("email"),
          contactPhone: text("phone"),
          organisation: type === "fan" ? null : text("organisation"),
          notes: text("notes"),
          travellers: travellers.map((t) => ({ ...t, firstName: t.firstName.trim(), lastName: t.lastName.trim() })),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the booking.");
      setBusy(false);
    }
  }

  return (
    <Modal title={`Book: ${trip.title}`} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-semibold">
            Customer type
            <select value={type} onChange={(e) => setType(e.target.value as CustomerType)} className={input}>
              {TYPES.map((t) => <option key={t} value={t}>{CUSTOMER_TYPE_LABELS[t]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold sm:col-span-2">
            Contact name
            <input name="name" required minLength={2} maxLength={120} className={input} />
          </label>
        </div>
        {type !== "fan" && (
          <label className="block text-sm font-semibold">
            {type === "group" ? "Group or club name" : "Organisation"}
            <input name="organisation" required maxLength={160} className={input} />
          </label>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Email
            <input name="email" type="email" maxLength={200} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Phone
            <input name="phone" maxLength={40} className={input} />
          </label>
        </div>
        <p className="-mt-2 text-xs text-slate-500">An email or a phone number is needed.</p>
        <div>
          <p className="mb-2 text-sm font-semibold">Travellers</p>
          <TravellersEditor value={travellers} onChange={setTravellers} hasSupplement={trip.singleSupplementCents > 0} />
        </div>
        <label className="block text-sm font-semibold">
          Notes
          <textarea name="notes" rows={2} maxLength={2000} className={input} />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-600">
            {travellers.length} traveller{travellers.length === 1 ? "" : "s"}
            {left != null && <> · {left} seat{left === 1 ? "" : "s"} left</>}
          </span>
          <span className="font-bold">Total {formatMoney(total / 100, trip.currency)}</span>
        </div>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button disabled={busy} className="rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60">
            {busy ? "Saving…" : "Create booking"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
