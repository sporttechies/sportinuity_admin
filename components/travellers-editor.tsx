"use client";

import { Plus, Trash2 } from "lucide-react";
import type { BookingTraveller } from "@/lib/api";

const input =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#007cc2] focus:ring-2 focus:ring-[#007cc2]/20";

export const emptyTraveller = (): Omit<BookingTraveller, "id"> => ({
  firstName: "", lastName: "", category: "adult", documentNumber: null, dietary: null, singleRoom: false,
});

/** Controlled list of travellers used when creating a booking or changing who is travelling. */
export function TravellersEditor({
  value,
  onChange,
  hasSupplement,
}: {
  value: Omit<BookingTraveller, "id">[];
  onChange: (next: Omit<BookingTraveller, "id">[]) => void;
  hasSupplement: boolean;
}) {
  const set = (i: number, patch: Partial<BookingTraveller>) => onChange(value.map((t, n) => (n === i ? { ...t, ...patch } : t)));
  return (
    <div className="space-y-3">
      {value.map((t, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_6.5rem]">
            <input aria-label={`Traveller ${i + 1} first name`} placeholder="First name" required maxLength={80} value={t.firstName} onChange={(e) => set(i, { firstName: e.target.value })} className={input} />
            <input aria-label={`Traveller ${i + 1} last name`} placeholder="Last name" required maxLength={80} value={t.lastName} onChange={(e) => set(i, { lastName: e.target.value })} className={input} />
            <select aria-label={`Traveller ${i + 1} type`} value={t.category} onChange={(e) => set(i, { category: e.target.value as "adult" | "child" })} className={input}>
              <option value="adult">Adult</option>
              <option value="child">Child</option>
            </select>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input aria-label={`Traveller ${i + 1} passport or ID`} placeholder="Passport / ID (optional)" maxLength={60} value={t.documentNumber ?? ""} onChange={(e) => set(i, { documentNumber: e.target.value || null })} className={input} />
            <input aria-label={`Traveller ${i + 1} dietary needs`} placeholder="Dietary needs (optional)" maxLength={200} value={t.dietary ?? ""} onChange={(e) => set(i, { dietary: e.target.value || null })} className={input} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            {hasSupplement ? (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={t.singleRoom} onChange={(e) => set(i, { singleRoom: e.target.checked })} className="size-4 accent-[#007cc2]" />
                Single room
              </label>
            ) : <span />}
            {value.length > 1 && (
              <button type="button" aria-label={`Remove traveller ${i + 1}`} onClick={() => onChange(value.filter((_, n) => n !== i))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, emptyTraveller()])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#007cc2] hover:underline">
        <Plus className="size-4" />Add traveller
      </button>
    </div>
  );
}
