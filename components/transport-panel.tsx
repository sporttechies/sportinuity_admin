"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, Copy, Download, FileText, Pencil, Plus, Trash2, Users } from "lucide-react";
import { transportApi, type RequestStatus, type TransportLeg, type TransportPlan } from "@/lib/api";
import { formatDate, formatDateRange } from "@/lib/constants";
import { ConfirmDialog, ErrorNote, Modal } from "@/components/modal";
import { MODE_LABELS, TransportForm } from "@/components/transport-form";

const csvCell = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const ghost = "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60";

/** Flights, transfers and other legs for a request. */
export function TransportPanel({ reference, requestStatus }: { reference: string; requestStatus: RequestStatus }) {
  const [plan, setPlan] = useState<TransportPlan | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<"new" | TransportLeg | null>(null);
  const [toDelete, setToDelete] = useState<TransportLeg | null>(null);
  const [passengersFor, setPassengersFor] = useState<TransportLeg | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const closed = requestStatus === "cancelled" || requestStatus === "rejected";

  const load = useCallback(async () => {
    try {
      setPlan(await transportApi.get(reference));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load transport.");
    }
  }, [reference]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<TransportPlan>, done?: string) {
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

  const planned = (plan?.legs ?? []).filter((l) => l.status === "planned").length;

  function rows(): string[][] {
    if (!plan) return [];
    const out: string[][] = [["Date", "Time", "Type", "From", "To", "Arrives", "Carrier", "Booking ref", "Vehicle", "Driver", "Meeting point", "Passengers", "Status"]];
    plan.legs.forEach((l) =>
      out.push([
        l.departDate, l.departTime ?? "", MODE_LABELS[l.mode], l.from, l.to,
        [l.arriveDate, l.arriveTime].filter(Boolean).join(" "), l.carrier ?? "", l.bookingReference ?? "", l.vehicle ?? "",
        [l.driverName, l.driverPhone].filter(Boolean).join(" "), l.meetingPoint ?? "",
        l.passengers ? l.passengers.join("; ") : `Everyone (${l.passengerCount})`, l.status,
      ]),
    );
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
    a.download = `transport-${reference}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function openPdf() {
    const tab = window.open("", "_blank");
    try {
      const url = URL.createObjectURL(await transportApi.pdf(reference));
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      tab?.close();
      setError(e instanceof Error ? e.message : "Could not open the PDF.");
    }
  }

  function openPassengers(leg: TransportLeg) {
    setPicked(leg.passengerIds ?? plan?.travellers.map((t) => t.id) ?? []);
    setPassengersFor(leg);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Transport</h3>
          {plan && (
            <p className="text-xs text-slate-500">
              {plan.legs.length} leg{plan.legs.length === 1 ? "" : "s"} · {plan.travellerCount} travellers
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
                <Plus className="size-4" /> Add leg
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
          {plan.legs.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-500">
              No transport yet. Add flights, airport transfers and coaches as you book them.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {plan.legs.map((l) => (
                <li key={l.id} className={`rounded-xl border p-3 ${l.status === "confirmed" ? "border-[#9fd1b2] bg-[#f6fbf8]" : "border-slate-200"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#007cc2]">{MODE_LABELS[l.mode]}</p>
                      <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                        {l.from} <ArrowRight className="size-4 text-slate-400" /> {l.to}
                      </p>
                      <p className="text-sm text-slate-600">
                        {formatDate(l.departDate)}{l.departTime && ` · ${l.departTime}`}
                        {(l.arriveDate || l.arriveTime) && (
                          <span className="text-slate-500"> → {l.arriveDate && l.arriveDate !== l.departDate ? `${formatDate(l.arriveDate)} ` : ""}{l.arriveTime}</span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {[l.carrier, l.bookingReference, l.vehicle, l.driverName && `${l.driverName}${l.driverPhone ? ` ${l.driverPhone}` : ""}`].filter(Boolean).join(" · ")}
                      </p>
                      {l.meetingPoint && <p className="text-sm text-slate-600">Meet: {l.meetingPoint}</p>}
                      {l.supplier && <p className="text-xs text-slate-400">Supplier: {l.supplier}</p>}
                      {l.notes && <p className="text-xs text-slate-400">Internal: {l.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${l.status === "confirmed" ? "bg-[#eaf5ee] text-[#1c673e]" : "bg-amber-50 text-amber-700"}`}>
                        {l.status === "confirmed" ? "Confirmed" : "Planned"}
                      </span>
                      <button onClick={() => openPassengers(l)} aria-label="Choose passengers" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"><Users className="size-4" /></button>
                      <button onClick={() => setForm(l)} aria-label="Edit leg" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"><Pencil className="size-4" /></button>
                      <button onClick={() => setToDelete(l)} aria-label="Delete leg" className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {l.passengers ? `${l.passengerCount} of ${plan.travellerCount} travelling: ${l.passengers.join(", ")}` : `Everyone travelling (${l.passengerCount})`}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {planned > 0 && !closed && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <p className="text-sm text-slate-600">{planned} planned leg{planned === 1 ? "" : "s"}. Teams only see confirmed transport.</p>
              <button
                disabled={busy}
                onClick={() => run(() => transportApi.confirmAll(reference), "Confirmed. The team can now see their transport.")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1c673e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#15522f] disabled:opacity-60"
              >
                <Check className="size-4" /> Confirm all
              </button>
            </div>
          )}
        </>
      )}

      {form && (
        <TransportForm
          reference={reference}
          leg={form === "new" ? undefined : form}
          defaultDate={undefined}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load(); }}
        />
      )}

      {passengersFor && plan && (
        <Modal title="Who is on this leg?" onClose={() => setPassengersFor(null)}>
          <div className="space-y-3">
            <div className="flex gap-3 text-sm font-semibold">
              <button type="button" onClick={() => setPicked(plan.travellers.map((t) => t.id))} className="text-[#007cc2] hover:underline">Select all</button>
              <button type="button" onClick={() => setPicked([])} className="text-slate-500 hover:underline">Clear</button>
            </div>
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {plan.travellers.map((t) => (
                <li key={t.id}>
                  <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={picked.includes(t.id)}
                      onChange={() => setPicked((p) => (p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id]))}
                    />
                    {t.name}
                  </label>
                </li>
              ))}
            </ul>
            {picked.length === 0 && <p className="text-xs text-amber-700">Nobody picked, so this leg will count as everyone travelling.</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setPassengersFor(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button
                disabled={busy}
                onClick={async () => {
                  const everyone = picked.length === plan.travellers.length;
                  await run(() => transportApi.setPassengers(passengersFor.id, everyone ? [] : picked));
                  setPassengersFor(null);
                }}
                className="rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete transport leg?"
          danger
          confirmLabel="Delete"
          message={<>Remove {MODE_LABELS[toDelete.mode].toLowerCase()} from {toDelete.from} to {toDelete.to}?</>}
          onClose={() => setToDelete(null)}
          onConfirm={async () => {
            setPlan(await transportApi.remove(toDelete.id));
            setToDelete(null);
          }}
        />
      )}
    </section>
  );
}
