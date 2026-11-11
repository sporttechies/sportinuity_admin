"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  managerApi,
  requestsApi,
  type LogisticsRequest,
  type TeamSummary,
} from "@/lib/api";
import { ErrorNote, Modal } from "@/components/modal";

type Row = {
  firstName: string;
  lastName: string;
  type: string;
  documentNumber: string;
  dietary: string;
  category: "adult" | "child" | "infant";
};
const blank = (): Row => ({
  firstName: "", lastName: "", type: "regular", documentNumber: "", dietary: "", category: "adult",
});

const input =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15";

/** Lets a manager create a request on behalf of a team. */
export function NewRequestModal({
  teamId: presetTeam,
  onCreated,
  onClose,
}: {
  teamId?: string;
  onCreated: (request: LogisticsRequest) => void;
  onClose: () => void;
}) {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamId, setTeamId] = useState(presetTeam || "");
  const [event, setEvent] = useState("");
  const [from, setFrom] = useState("");
  const [location, setLocation] = useState("");
  const [departure, setDeparture] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    managerApi.teams().then(setTeams).catch((e) => setError(e.message));
  }, []);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!teamId) return setError("Choose a team.");
    setBusy(true);
    setError("");
    try {
      const created = await requestsApi.create({
        teamId,
        event: event.trim(),
        location: location.trim(),
        from: from.trim() || undefined,
        departure: departure || undefined,
        returnDate: returnDate || undefined,
        contact,
        travellers: rows,
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the request.");
      setBusy(false);
    }
  }

  const label = "block text-xs font-semibold text-slate-600";
  return (
    <Modal title="New request" onClose={busy ? () => {} : onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>
            Team
            <select required value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={!!presetTeam} className={`${input} mt-1.5`}>
              <option value="" disabled>Select a team</option>
              {teams.filter((t) => t.accountStatus === "active" || t.id === presetTeam).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <label className={`${label} sm:col-span-2`}>
            Event or competition
            <input required value={event} onChange={(e) => setEvent(e.target.value)} className={`${input} mt-1.5`} />
          </label>
          <label className={label}>
            From
            <input value={from} onChange={(e) => setFrom(e.target.value)} className={`${input} mt-1.5`} />
          </label>
          <label className={label}>
            Destination
            <input required value={location} onChange={(e) => setLocation(e.target.value)} className={`${input} mt-1.5`} />
          </label>
          <label className={label}>
            Departure
            <input type="date" value={departure} onChange={(e) => setDeparture(e.target.value)} className={`${input} mt-1.5`} />
          </label>
          <label className={label}>
            Return
            <input type="date" value={returnDate} min={departure || undefined} onChange={(e) => setReturnDate(e.target.value)} className={`${input} mt-1.5`} />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-bold">Contact</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <input required aria-label="Contact name" placeholder="Name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={input} />
            <input required type="email" aria-label="Contact email" placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={input} />
            <input required aria-label="Contact phone" placeholder="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={input} />
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-bold">Travellers ({rows.length})</legend>
          <div className="mt-2 space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input required aria-label="First name" placeholder="First name" value={r.firstName} onChange={(e) => setRow(i, { firstName: e.target.value })} className={input} />
                <input required aria-label="Last name" placeholder="Last name" value={r.lastName} onChange={(e) => setRow(i, { lastName: e.target.value })} className={input} />
                <input aria-label="Passport or ID" placeholder="Passport / ID" value={r.documentNumber} onChange={(e) => setRow(i, { documentNumber: e.target.value })} className={input} />
                <button
                  type="button"
                  onClick={() => setRows((cur) => cur.filter((_, idx) => idx !== i))}
                  disabled={rows.length === 1}
                  aria-label={`Remove traveller ${i + 1}`}
                  className="flex h-10 items-center justify-center rounded-xl px-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 className="size-4" />
                </button>
                <select aria-label="Category" value={r.category} onChange={(e) => setRow(i, { category: e.target.value as Row["category"] })} className={input}>
                  <option value="adult">Adult</option>
                  <option value="child">Child</option>
                  <option value="infant">Infant</option>
                </select>
                <select aria-label="Class" value={r.type} onChange={(e) => setRow(i, { type: e.target.value })} className={input}>
                  <option value="regular">Regular</option>
                  <option value="vip">VIP</option>
                  <option value="vvip">VVIP</option>
                  <option value="staff">Staff</option>
                </select>
                <input aria-label="Dietary or access needs" placeholder="Dietary / access needs" value={r.dietary} onChange={(e) => setRow(i, { dietary: e.target.value })} className={`${input} sm:col-span-2`} />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setRows((cur) => [...cur, blank()])} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#007cc2] hover:underline">
            <Plus className="size-4" /> Add traveller
          </button>
        </fieldset>

        <ErrorNote message={error} />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-xl bg-[#007cc2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60">
            {busy ? "Creating…" : "Create request"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
