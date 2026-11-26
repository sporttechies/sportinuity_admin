"use client";

import { useState, type FormEvent } from "react";
import { travelApi, type ItineraryItem, type ItineraryKind, type Trip } from "@/lib/api";
import { ITINERARY_KIND_LABELS } from "@/lib/constants";
import { Modal, ErrorNote } from "@/components/modal";

const input =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-2 focus:ring-[#007cc2]/20";
const KINDS = Object.keys(ITINERARY_KIND_LABELS) as ItineraryKind[];

/** Adds or edits one itinerary item. */
export function ItineraryForm({
  tripId,
  days,
  item,
  defaultDay,
  onClose,
  onSaved,
}: {
  tripId: string;
  days: number;
  item?: ItineraryItem;
  defaultDay?: number;
  onClose: () => void;
  onSaved: (trip: Trip) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      dayNumber: Number(f.get("day")),
      kind: String(f.get("kind")) as ItineraryKind,
      title: String(f.get("title") || "").trim(),
      startTime: String(f.get("time") || "") || null,
      details: String(f.get("details") || "").trim() || null,
    };
    setBusy(true);
    setError("");
    try {
      onSaved(item ? await travelApi.updateItem(item.id, body) : await travelApi.addItem(tripId, body));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the item.");
      setBusy(false);
    }
  }

  return (
    <Modal title={item ? "Edit itinerary item" : "Add to itinerary"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <label className="block text-sm font-semibold">
            Day
            <input name="day" type="number" min={1} max={days} required defaultValue={item?.dayNumber ?? defaultDay ?? 1} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Time
            <input name="time" type="time" defaultValue={item?.startTime ?? ""} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Type
            <select name="kind" defaultValue={item?.kind ?? "activity"} className={input}>
              {KINDS.map((k) => <option key={k} value={k}>{ITINERARY_KIND_LABELS[k]}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm font-semibold">
          Title
          <input name="title" required minLength={2} maxLength={160} defaultValue={item?.title ?? ""} placeholder="Opening match at Kasarani" className={input} />
        </label>
        <label className="block text-sm font-semibold">
          Details
          <textarea name="details" rows={3} maxLength={1000} defaultValue={item?.details ?? ""} className={input} />
        </label>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button disabled={busy} className="rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60">
            {busy ? "Saving…" : "Save item"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
