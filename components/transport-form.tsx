"use client";

import { useEffect, useState, type FormEvent } from "react";
import { suppliersApi, transportApi, type Supplier, type TransportLeg, type TransportMode } from "@/lib/api";
import { Modal, ErrorNote } from "@/components/modal";

export const MODE_LABELS: Record<TransportMode, string> = {
  flight: "Flight",
  transfer: "Transfer",
  coach: "Coach",
  train: "Train",
  ferry: "Ferry",
  other: "Other",
};
export const MODES = Object.keys(MODE_LABELS) as TransportMode[];

const input =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-2 focus:ring-[#007cc2]/20";

/** Adds or edits one transport leg. */
export function TransportForm({
  reference,
  leg,
  defaultDate,
  onClose,
  onSaved,
}: {
  reference: string;
  leg?: TransportLeg;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<TransportMode>(leg?.mode ?? "flight");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    suppliersApi
      .list({ type: "transport", active: true, limit: 100 })
      .then((r) => setSuppliers(r.data))
      .catch(() => {}); // the supplier link is optional
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) || "").trim() || null;
    const body = {
      mode,
      fromLocation: String(f.get("from") || "").trim(),
      toLocation: String(f.get("to") || "").trim(),
      departDate: String(f.get("departDate") || ""),
      departTime: s("departTime"),
      arriveDate: s("arriveDate"),
      arriveTime: s("arriveTime"),
      carrier: s("carrier"),
      bookingReference: s("bookingReference"),
      vehicle: s("vehicle"),
      driverName: s("driverName"),
      driverPhone: s("driverPhone"),
      meetingPoint: s("meetingPoint"),
      supplierId: s("supplierId"),
      notes: s("notes"),
    };
    setBusy(true);
    setError("");
    try {
      if (leg) await transportApi.update(leg.id, body);
      else await transportApi.create(reference, body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the transport leg.");
      setBusy(false);
    }
  }

  const road = mode !== "flight";

  return (
    <Modal title={leg ? "Edit transport" : "Add transport"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">
          Type
          <select value={mode} onChange={(e) => setMode(e.target.value as TransportMode)} className={input}>
            {MODES.map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            From
            <input name="from" required maxLength={200} defaultValue={leg?.from ?? ""} placeholder={mode === "flight" ? "Lagos (LOS)" : "JKIA airport"} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            To
            <input name="to" required maxLength={200} defaultValue={leg?.to ?? ""} placeholder={mode === "flight" ? "Nairobi (NBO)" : "Hotel"} className={input} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            Departs
            <input name="departDate" type="date" required defaultValue={leg?.departDate ?? defaultDate ?? ""} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Time
            <input name="departTime" type="time" defaultValue={leg?.departTime ?? ""} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Arrives
            <input name="arriveDate" type="date" defaultValue={leg?.arriveDate ?? ""} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Time
            <input name="arriveTime" type="time" defaultValue={leg?.arriveTime ?? ""} className={input} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            {mode === "flight" ? "Airline" : "Operator"}
            <input name="carrier" maxLength={120} defaultValue={leg?.carrier ?? ""} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            {mode === "flight" ? "Flight number / PNR" : "Booking reference"}
            <input name="bookingReference" maxLength={80} defaultValue={leg?.bookingReference ?? ""} className={input} />
          </label>
        </div>
        {road && (
          <>
            <label className="block text-sm font-semibold">
              Vehicle
              <input name="vehicle" maxLength={120} defaultValue={leg?.vehicle ?? ""} placeholder="50-seater coach, KDA 123A" className={input} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">
                Driver
                <input name="driverName" maxLength={120} defaultValue={leg?.driverName ?? ""} className={input} />
              </label>
              <label className="block text-sm font-semibold">
                Driver phone
                <input name="driverPhone" maxLength={40} defaultValue={leg?.driverPhone ?? ""} className={input} />
              </label>
            </div>
          </>
        )}
        <label className="block text-sm font-semibold">
          Meeting point
          <input name="meetingPoint" maxLength={300} defaultValue={leg?.meetingPoint ?? ""} placeholder="Arrivals hall, look for the Sportinuity sign" className={input} />
        </label>
        {suppliers.length > 0 && (
          <label className="block text-sm font-semibold">
            Supplier
            <select name="supplierId" defaultValue={leg?.supplierId ?? ""} className={input}>
              <option value="">None</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
        <label className="block text-sm font-semibold">
          Internal notes
          <textarea name="notes" rows={2} maxLength={1000} defaultValue={leg?.notes ?? ""} placeholder="Not shown to the team" className={input} />
        </label>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button disabled={busy} className="rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
