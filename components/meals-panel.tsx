"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, FileText, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { mealsApi, type Meal, type MealPlan, type MealType, type RequestStatus } from "@/lib/api";
import { formatDate, formatDateRange } from "@/lib/constants";
import { ConfirmDialog, ErrorNote } from "@/components/modal";
import { MEAL_LABELS, MEAL_TYPES, MealForm } from "@/components/meal-form";

const csvCell = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const ghost = "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60";

/** Meal schedule and dietary needs for a request. */
export function MealsPanel({ reference, requestStatus }: { reference: string; requestStatus: RequestStatus }) {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<"new" | Meal | null>(null);
  const [toDelete, setToDelete] = useState<Meal | null>(null);
  const [types, setTypes] = useState<MealType[]>(["breakfast", "dinner"]);
  const closed = requestStatus === "cancelled" || requestStatus === "rejected";

  const load = useCallback(async () => {
    try {
      setPlan(await mealsApi.get(reference));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the meal plan.");
    }
  }, [reference]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<MealPlan>, done?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setPlan(await fn());
      if (done) setNotice(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  const days = useMemo(() => {
    const map = new Map<string, Meal[]>();
    (plan?.meals ?? []).forEach((m) => map.set(m.date, [...(map.get(m.date) ?? []), m]));
    return [...map.entries()];
  }, [plan]);
  const planned = (plan?.meals ?? []).filter((m) => m.status === "planned").length;

  function rows(): string[][] {
    if (!plan) return [];
    const out: string[][] = [["Date", "Time", "Meal", "Guests", "Venue", "Menu", "Status"]];
    plan.meals.forEach((m) =>
      out.push([m.date, m.time ?? "", MEAL_LABELS[m.type], String(m.headcount ?? plan.travellerCount), m.venue ?? "", m.menu ?? "", m.status]),
    );
    if (plan.dietary.groups.length) {
      out.push([]);
      out.push(["Dietary requirement", "Guests", "Who"]);
      plan.dietary.groups.forEach((g) => out.push([g.label, String(g.count), g.travellers.map((t) => t.name).join("; ")]));
    }
    return out;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(rows().map((r) => r.join("\t")).join("\n"));
      setNotice("Copied. Paste it into Excel, Sheets or an email.");
    } catch {
      setError("Your browser blocked copying. Use Download CSV instead.");
    }
  }

  function csv() {
    const blob = new Blob(["﻿" + rows().map((r) => r.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meals-${reference}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function openPdf() {
    const tab = window.open("", "_blank");
    try {
      const url = URL.createObjectURL(await mealsApi.pdf(reference));
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      tab?.close();
      setError(e instanceof Error ? e.message : "Could not open the PDF.");
    }
  }

  const toggle = (t: MealType) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Meals</h3>
          {plan && (
            <p className="text-xs text-slate-500">
              {plan.meals.length} meal{plan.meals.length === 1 ? "" : "s"} · {plan.travellerCount} guests ·{" "}
              {formatDateRange(plan.checkIn, plan.checkOut)}
            </p>
          )}
        </div>
        {plan && (
          <div className="flex flex-wrap gap-2">
            <button onClick={copy} className={ghost}><Copy className="size-4" /> Copy</button>
            <button onClick={csv} className={ghost}><Download className="size-4" /> CSV</button>
            <button onClick={openPdf} className={ghost}><FileText className="size-4" /> PDF</button>
            {!closed && (
              <button onClick={() => setForm("new")} className="inline-flex items-center gap-1.5 rounded-xl bg-[#007cc2] px-3 py-2 text-sm font-semibold text-white hover:bg-[#006ba8]">
                <Plus className="size-4" /> Add meal
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <ErrorNote message={error} />
        {notice && <p className="rounded-xl bg-[#eaf5ee] px-3.5 py-2.5 text-sm font-medium text-[#1c673e]">{notice}</p>}
      </div>

      {!plan && !error ? (
        <p className="mt-4 text-sm text-slate-500" aria-busy="true">Loading…</p>
      ) : plan && (
        <>
          {plan.dietary.groups.length > 0 && (
            <div className="mt-4 rounded-xl bg-[#f4f7f8] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dietary requirements</p>
              <ul className="mt-2 space-y-1 text-sm">
                {plan.dietary.groups.map((g) => (
                  <li key={g.label}>
                    <strong>{g.count} × {g.label}</strong>
                    <span className="text-slate-500"> · {g.travellers.map((t) => t.name).join(", ")}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">{plan.dietary.none} guest{plan.dietary.none === 1 ? "" : "s"} with no special requirements.</p>
            </div>
          )}

          {!closed && (
            <div className="mt-4 rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fill every trip day</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {MEAL_TYPES.map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={types.includes(t)} onChange={() => toggle(t)} /> {MEAL_LABELS[t]}
                  </label>
                ))}
                <button
                  disabled={busy || !types.length}
                  onClick={() => run(() => mealsApi.generate(reference, types), "Meals added. Edit times, venues and menus as needed.")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#d0ee27] px-3 py-2 text-sm font-semibold text-[#102331] hover:brightness-95 disabled:opacity-60"
                >
                  <Sparkles className="size-4" /> Generate
                </button>
              </div>
            </div>
          )}

          {days.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-500">
              No meals yet. Generate them from the trip dates or add them one by one.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {days.map(([date, meals]) => (
                <div key={date}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{formatDate(date)}</p>
                  <ul className="mt-2 space-y-2">
                    {meals.map((m) => (
                      <li key={m.id} className={`rounded-xl border p-3 ${m.status === "confirmed" ? "border-[#9fd1b2] bg-[#f6fbf8]" : "border-slate-200"}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold">
                              {MEAL_LABELS[m.type]}
                              {m.time && <span className="font-normal text-slate-500"> · {m.time}</span>}
                              <span className="font-normal text-slate-500"> · {m.headcount ?? plan.travellerCount} guests</span>
                            </p>
                            {m.venue && <p className="text-sm text-slate-600">{m.venue}</p>}
                            {m.menu && <p className="text-sm text-slate-600">{m.menu}</p>}
                            {m.notes && <p className="mt-0.5 text-xs text-slate-400">Internal: {m.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.status === "confirmed" ? "bg-[#eaf5ee] text-[#1c673e]" : "bg-amber-50 text-amber-700"}`}>
                              {m.status === "confirmed" ? "Confirmed" : "Planned"}
                            </span>
                            <button onClick={() => setForm(m)} aria-label="Edit meal" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"><Pencil className="size-4" /></button>
                            <button onClick={() => setToDelete(m)} aria-label="Delete meal" className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {planned > 0 && !closed && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <p className="text-sm text-slate-600">{planned} planned meal{planned === 1 ? "" : "s"}. Teams only see confirmed meals.</p>
              <button
                disabled={busy}
                onClick={() => run(() => mealsApi.confirmAll(reference), "Confirmed. The team can now see the meal plan.")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1c673e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#15522f] disabled:opacity-60"
              >
                <Check className="size-4" /> Confirm all
              </button>
            </div>
          )}
        </>
      )}

      {form && (
        <MealForm
          reference={reference}
          meal={form === "new" ? undefined : form}
          defaultDate={plan?.checkIn ?? undefined}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load(); }}
        />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Delete meal?"
          danger
          confirmLabel="Delete"
          message={<>Remove {MEAL_LABELS[toDelete.type].toLowerCase()} on {formatDate(toDelete.date)}?</>}
          onClose={() => setToDelete(null)}
          onConfirm={async () => {
            setPlan(await mealsApi.remove(toDelete.id));
            setToDelete(null);
          }}
        />
      )}
    </section>
  );
}
