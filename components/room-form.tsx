"use client";

import { useState, type FormEvent } from "react";
import { roomingApi, type Room, type RoomType } from "@/lib/api";
import { Modal, ErrorNote } from "@/components/modal";

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  single: "Single",
  double: "Double",
  twin: "Twin",
  triple: "Triple",
  quad: "Quad",
  custom: "Custom",
};
export const ROOM_TYPES = Object.keys(ROOM_TYPE_LABELS) as RoomType[];

const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#007cc2] focus:ring-2 focus:ring-[#007cc2]/20";

/** Edits one room's name, type and notes. */
export function RoomForm({
  room,
  onClose,
  onSaved,
}: {
  room: Room;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<RoomType>(room.roomType);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await roomingApi.updateRoom(room.id, {
        label: String(f.get("label") || "").trim() || room.label,
        notes: String(f.get("notes") || "").trim() || null,
        roomType: type,
        ...(type === "custom" ? { capacity: Number(f.get("capacity")) || room.capacity } : {}),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the room.");
      setBusy(false);
    }
  }

  return (
    <Modal title={`Edit ${room.label}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">
          Room name or number
          <input name="label" defaultValue={room.label} maxLength={60} className={`${input} mt-1.5 font-normal`} />
        </label>
        <label className="block text-sm font-semibold">
          Room type
          <select value={type} onChange={(e) => setType(e.target.value as RoomType)} className={`${input} mt-1.5 font-normal`}>
            {ROOM_TYPES.map((t) => (
              <option key={t} value={t}>{ROOM_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
        {type === "custom" && (
          <label className="block text-sm font-semibold">
            Beds (1–10)
            <input name="capacity" type="number" min={1} max={10} defaultValue={room.capacity} className={`${input} mt-1.5 font-normal`} />
          </label>
        )}
        <label className="block text-sm font-semibold">
          Notes for the hotel
          <textarea name="notes" defaultValue={room.notes ?? ""} rows={2} maxLength={300} className={`${input} mt-1.5 font-normal`} />
        </label>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button disabled={busy} className="rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60">
            {busy ? "Saving…" : "Save room"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
