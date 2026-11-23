"use client";

import { useState, type FormEvent } from "react";
import { mealsApi, type Meal, type MealType } from "@/lib/api";
import { Modal, ErrorNote } from "@/components/modal";

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  packed: "Packed meal",
};
export const MEAL_TYPES = Object.keys(MEAL_LABELS) as MealType[];

const input =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-2 focus:ring-[#007cc2]/20";

/** Adds or edits one meal. */
export function MealForm({
  reference,
  meal,
  defaultDate,
  onClose,
  onSaved,
}: {
  reference: string;
  meal?: Meal;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      mealDate: String(f.get("date") || ""),
      mealType: String(f.get("type")) as MealType,
      mealTime: String(f.get("time") || "") || null,
      venue: String(f.get("venue") || "").trim() || null,
      headcount: String(f.get("headcount") || "") || null,
      menu: String(f.get("menu") || "").trim() || null,
      notes: String(f.get("notes") || "").trim() || null,
    };
    setBusy(true);
    setError("");
    try {
      if (meal) await mealsApi.update(meal.id, body);
      else await mealsApi.create(reference, body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the meal.");
      setBusy(false);
    }
  }

  return (
    <Modal title={meal ? "Edit meal" : "Add a meal"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            Date
            <input name="date" type="date" required defaultValue={meal?.date ?? defaultDate ?? ""} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Time
            <input name="time" type="time" defaultValue={meal?.time ?? ""} className={input} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            Meal
            <select name="type" defaultValue={meal?.type ?? "dinner"} className={input}>
              {MEAL_TYPES.map((t) => <option key={t} value={t}>{MEAL_LABELS[t]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Guests
            <input name="headcount" type="number" min={1} max={2000} defaultValue={meal?.headcount ?? ""} placeholder="Whole group" className={input} />
          </label>
        </div>
        <label className="block text-sm font-semibold">
          Venue
          <input name="venue" maxLength={200} defaultValue={meal?.venue ?? ""} placeholder="Hotel restaurant, pitchside…" className={input} />
        </label>
        <label className="block text-sm font-semibold">
          Menu
          <textarea name="menu" rows={2} maxLength={1000} defaultValue={meal?.menu ?? ""} className={input} />
        </label>
        <label className="block text-sm font-semibold">
          Internal notes
          <textarea name="notes" rows={2} maxLength={500} defaultValue={meal?.notes ?? ""} placeholder="Not shown to the team" className={input} />
        </label>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button disabled={busy} className="rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60">
            {busy ? "Saving…" : "Save meal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
