"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, FileText, Lock, Pencil, Plus, Sparkles, Trash2, Unlock, X } from "lucide-react";
import { roomingApi, type RoomGuest, type RoomingList, type RoomType, type RequestStatus } from "@/lib/api";
import { formatDateRange } from "@/lib/constants";
import { ConfirmDialog, ErrorNote } from "@/components/modal";
import { ROOM_TYPES, ROOM_TYPE_LABELS, RoomForm } from "@/components/room-form";

const TAGS: Record<string, string> = { vip: "VIP", vvip: "VVIP", staff: "Staff" };
const name = (g: RoomGuest) => `${g.firstName} ${g.lastName}`.trim();
const tag = (g: RoomGuest) => [TAGS[g.type], g.category !== "adult" ? g.category : null].filter(Boolean).join(", ");
const csvCell = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const field =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#007cc2] focus:ring-2 focus:ring-[#007cc2]/20";
const ghost = "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60";

/** Rooming list: build rooms, place guests, suggest, finalise, and hand to the hotel. */
export function RoomingPanel({ reference, requestStatus }: { reference: string; requestStatus: RequestStatus }) {
  const [list, setList] = useState<RoomingList | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [addType, setAddType] = useState<RoomType>("twin");
  const [addCount, setAddCount] = useState(1);
  const [suggestType, setSuggestType] = useState<RoomType>("twin");
  const [vipSingle, setVipSingle] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"finalize" | "clear" | "reopen" | null>(null);
  const [notes, setNotes] = useState("");

  const closed = requestStatus === "cancelled" || requestStatus === "rejected";
  const final = list?.status === "final";
  const locked = final || closed;

  const load = useCallback(async () => {
    try {
      const data = await roomingApi.get(reference);
      setList(data);
      setNotes(data.notes ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the rooming list.");
    }
  }, [reference]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<RoomingList>, done?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await fn();
      setList(data);
      setNotes(data.notes ?? "");
      if (done) setNotice(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  const lookup = useMemo(() => {
    const map = new Map<string, string>();
    (list?.rooms ?? []).forEach((r) => r.occupants.forEach((o) => map.set(o.id, r.label)));
    return map;
  }, [list]);
  const everyone = useMemo(
    () => [...(list?.unassigned ?? []), ...(list?.rooms ?? []).flatMap((r) => r.occupants)].sort((a, b) => a.index - b.index),
    [list],
  );

  function rows(): string[][] {
    if (!list) return [];
    const out: string[][] = [["Room", "Type", "Guest", "Category", "Notes"]];
    for (const r of list.rooms) {
      if (!r.occupants.length) out.push([r.label, ROOM_TYPE_LABELS[r.roomType], "(empty)", "", r.notes ?? ""]);
      r.occupants.forEach((o, i) => out.push([r.label, ROOM_TYPE_LABELS[r.roomType], name(o), tag(o), i === 0 ? r.notes ?? "" : ""]));
    }
    for (const g of list.unassigned) out.push(["Not placed", "", name(g), tag(g), ""]);
    return out;
  }

  async function copy() {
    const text = rows().map((r) => r.join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(text);
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
    a.download = `rooming-${reference}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function openPdf() {
    // Open the tab first so the browser doesn't treat it as a pop-up.
    const tab = window.open("", "_blank");
    try {
      const url = URL.createObjectURL(await roomingApi.pdf(reference));
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      tab?.close();
      setError(e instanceof Error ? e.message : "Could not open the PDF.");
    }
  }

  const editingRoom = list?.rooms.find((r) => r.id === editing);
  const placed = everyone.length - (list?.unassigned.length ?? 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold">
            Rooming list
            {list && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${final ? "bg-[#eaf5ee] text-[#1c673e]" : "bg-amber-50 text-amber-700"}`}>
                {final ? "Final" : "Draft"}
              </span>
            )}
          </h3>
          {list && (
            <p className="text-xs text-slate-500">
              {list.hotel ? `${list.hotel.name} · ` : "No hotel assigned yet · "}
              {formatDateRange(list.checkIn, list.checkOut)} · {placed}/{everyone.length} guests placed
            </p>
          )}
        </div>
        {list && (
          <div className="flex flex-wrap gap-2">
            <button onClick={copy} className={ghost}><Copy className="size-4" /> Copy</button>
            <button onClick={csv} className={ghost}><Download className="size-4" /> CSV</button>
            <button onClick={openPdf} className={ghost}><FileText className="size-4" /> PDF</button>
            {!closed && (final ? (
              <button onClick={() => setConfirm("reopen")} className={ghost}><Unlock className="size-4" /> Reopen</button>
            ) : (
              <button
                onClick={() => setConfirm("finalize")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1c673e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#15522f] disabled:opacity-60"
              >
                <Lock className="size-4" /> Finalise
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <ErrorNote message={error} />
        {notice && <p className="rounded-xl bg-[#eaf5ee] px-3.5 py-2.5 text-sm font-medium text-[#1c673e]">{notice}</p>}
      </div>

      {!list && !error ? (
        <p className="mt-4 text-sm text-slate-500" aria-busy="true">Loading…</p>
      ) : list && (
        <>
          {final && (
            <p className="mt-4 rounded-xl bg-[#eaf5ee] px-4 py-3 text-sm text-[#1c673e]">
              This list is final and visible to the team. Reopen it to make changes.
            </p>
          )}

          {list.proposals.length > 0 && (
            <div className="mt-4 rounded-xl bg-[#f4f7f8] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Team roommate requests</p>
              <ul className="mt-2 space-y-1 text-sm">
                {list.proposals.map((p) => {
                  const names = p.travellerIds.map((id) => everyone.find((g) => g.id === id)).filter(Boolean).map((g) => name(g as RoomGuest));
                  return (
                    <li key={p.id}>
                      <strong>{names.join(" + ")}</strong>
                      {p.roomType && <span className="text-slate-500"> · {ROOM_TYPE_LABELS[p.roomType]}</span>}
                      {p.note && <span className="text-slate-500"> · “{p.note}”</span>}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-slate-500">Auto-suggest keeps these groups together.</p>
            </div>
          )}

          {!locked && (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add rooms</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select value={addType} onChange={(e) => setAddType(e.target.value as RoomType)} className={field} aria-label="Room type">
                    {ROOM_TYPES.map((t) => <option key={t} value={t}>{ROOM_TYPE_LABELS[t]}</option>)}
                  </select>
                  <input type="number" min={1} max={50} value={addCount} onChange={(e) => setAddCount(Math.max(1, Number(e.target.value) || 1))} className={`${field} w-20`} aria-label="How many" />
                  <button
                    disabled={busy}
                    onClick={() => run(() => roomingApi.addRooms(reference, { roomType: addType, count: addCount, ...(addType === "custom" ? { capacity: 4 } : {}) }))}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#007cc2] px-3 py-2 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60"
                  >
                    <Plus className="size-4" /> Add
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Auto-suggest for unplaced guests</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select value={suggestType} onChange={(e) => setSuggestType(e.target.value as RoomType)} className={field} aria-label="Default room type">
                    {ROOM_TYPES.filter((t) => t !== "custom" && t !== "single").map((t) => <option key={t} value={t}>{ROOM_TYPE_LABELS[t]}</option>)}
                  </select>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={vipSingle} onChange={(e) => setVipSingle(e.target.checked)} /> VIPs get singles
                  </label>
                  <button
                    disabled={busy || !list.unassigned.length}
                    onClick={() => run(() => roomingApi.suggest(reference, { roomType: suggestType, vipSingle }), "Rooms suggested. Adjust anything before finalising.")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#d0ee27] px-3 py-2 text-sm font-semibold text-[#102331] hover:brightness-95 disabled:opacity-60"
                  >
                    <Sparkles className="size-4" /> Suggest
                  </button>
                </div>
              </div>
            </div>
          )}

          {list.rooms.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-500">
              No rooms yet. Add rooms, or let auto-suggest build them from the guest list.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {list.rooms.map((room) => {
                const full = room.occupants.length >= room.capacity;
                return (
                  <li key={room.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{room.label}</p>
                        <p className="text-xs text-slate-500">
                          {ROOM_TYPE_LABELS[room.roomType]} · {room.occupants.length}/{room.capacity}
                          {room.notes && ` · ${room.notes}`}
                        </p>
                      </div>
                      {!locked && (
                        <div className="flex gap-1">
                          <button onClick={() => setEditing(room.id)} aria-label={`Edit ${room.label}`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"><Pencil className="size-4" /></button>
                          <button disabled={busy} onClick={() => run(() => roomingApi.deleteRoom(room.id))} aria-label={`Delete ${room.label}`} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button>
                        </div>
                      )}
                    </div>
                    <ul className="mt-2 space-y-1">
                      {room.occupants.map((o) => (
                        <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm">
                          <span>
                            {name(o)}
                            {tag(o) && <span className="ml-1.5 text-xs text-slate-500">{tag(o)}</span>}
                          </span>
                          {!locked && (
                            <button
                              disabled={busy}
                              aria-label={`Remove ${name(o)}`}
                              onClick={() => run(() => roomingApi.setOccupants(room.id, room.occupants.filter((x) => x.id !== o.id).map((x) => x.id)))}
                              className="rounded p-1 text-slate-400 hover:bg-white hover:text-red-600"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    {!locked && !full && everyone.length > 0 && (
                      <select
                        value=""
                        disabled={busy}
                        aria-label={`Add a guest to ${room.label}`}
                        onChange={(e) => e.target.value && run(() => roomingApi.setOccupants(room.id, [...room.occupants.map((x) => x.id), e.target.value]))}
                        className={`${field} mt-2 w-full text-slate-600`}
                      >
                        <option value="">+ Add a guest…</option>
                        {everyone.filter((g) => !room.occupants.some((o) => o.id === g.id)).map((g) => (
                          <option key={g.id} value={g.id}>
                            {name(g)}{lookup.get(g.id) ? ` (move from ${lookup.get(g.id)})` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {list.unassigned.length > 0 && (
            <div className="mt-4 rounded-xl bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Not placed yet ({list.unassigned.length})</p>
              <p className="mt-1.5 text-sm text-amber-900">
                {list.unassigned.map((g) => `${name(g)}${tag(g) ? ` (${tag(g)})` : ""}`).join(", ")}
              </p>
            </div>
          )}

          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="rooming-notes">
              Notes for the hotel
            </label>
            <textarea
              id="rooming-notes"
              rows={2}
              maxLength={1000}
              value={notes}
              disabled={locked}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => !locked && notes !== (list.notes ?? "") && run(() => roomingApi.saveNotes(reference, notes))}
              placeholder="Late arrival, adjoining rooms, ground floor…"
              className={`${field} mt-1.5 w-full disabled:bg-slate-50`}
            />
          </div>

          {!locked && list.rooms.length > 0 && (
            <button onClick={() => setConfirm("clear")} className="mt-3 text-sm font-semibold text-red-600 hover:underline">
              Clear all rooms
            </button>
          )}
        </>
      )}

      {editingRoom && (
        <RoomForm room={editingRoom} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}

      {confirm === "finalize" && list && (
        <ConfirmDialog
          title="Finalise rooming list?"
          confirmLabel={list.unassigned.length ? "Finalise anyway" : "Finalise"}
          message={
            list.unassigned.length ? (
              <>
                <strong>{list.unassigned.length}</strong> guest{list.unassigned.length === 1 ? " is" : "s are"} not placed in a room. The team will see the list as it is now.
              </>
            ) : (
              "The team will be able to see the rooms and download the PDF. You can reopen the list later."
            )
          }
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            setList(await roomingApi.finalize(reference, list.unassigned.length > 0));
            setConfirm(null);
            setNotice("Finalised. The team can now see the rooming list.");
          }}
        />
      )}
      {confirm === "reopen" && (
        <ConfirmDialog
          title="Reopen rooming list?"
          confirmLabel="Reopen"
          message="The team will stop seeing the rooms until you finalise again."
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            setList(await roomingApi.reopen(reference));
            setConfirm(null);
          }}
        />
      )}
      {confirm === "clear" && (
        <ConfirmDialog
          title="Clear all rooms?"
          danger
          confirmLabel="Clear rooms"
          message="Every room is removed and all guests become unplaced. Team roommate requests are kept."
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            setList(await roomingApi.clear(reference));
            setConfirm(null);
          }}
        />
      )}
    </section>
  );
}
