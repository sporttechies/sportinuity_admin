"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { editionsApi, type Edition } from "@/lib/api";
import { formatDate } from "@/lib/constants";
import { ConfirmDialog, ErrorNote } from "@/components/modal";

export default function EditionsPage() {
  const [items, setItems] = useState<Edition[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Edition | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await editionsApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load editions.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await editionsApi.create(name.trim());
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the edition.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(ed: Edition) {
    setError("");
    try {
      const updated = await editionsApi.update(ed.id, { isOpen: !ed.isOpen });
      setItems((list) => list?.map((x) => (x.id === ed.id ? { ...x, isOpen: updated.isOpen } : x)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the edition.");
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-slate-600">
        Editions are the tournaments teams can register for. Teams only see the open ones when they
        sign up. Closing an edition keeps the teams already registered.
      </p>

      <form onSubmit={add} className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Edition name"
          placeholder="e.g. AFRICAN CHIPKIZI CUP 17th"
          maxLength={120}
          className="h-10 min-w-[14rem] flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-50"
        >
          <Plus className="size-4" /> Add edition
        </button>
      </form>

      <ErrorNote message={error} />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {items === null ? (
          <p className="p-8 text-center text-sm text-slate-500" aria-busy="true">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No editions yet. Add the first one above.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((ed) => (
              <li key={ed.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{ed.name}</p>
                  <p className="text-xs text-slate-500">
                    {ed.teams} team{ed.teams === 1 ? "" : "s"} · added {formatDate(ed.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => toggle(ed)}
                  role="switch"
                  aria-checked={ed.isOpen}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    ed.isOpen ? "bg-[#eaf5ee] text-[#1c673e] hover:bg-[#dcefe2]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {ed.isOpen ? "Open · click to close" : "Closed · click to open"}
                </button>
                <button
                  onClick={() => setToDelete(ed)}
                  aria-label={`Delete ${ed.name}`}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Delete edition?"
          danger
          confirmLabel="Delete"
          message={
            <>
              Delete <strong>{toDelete.name}</strong>?
              {toDelete.teams > 0 && ` ${toDelete.teams} registered team(s) will simply lose this edition.`}{" "}
              This can&apos;t be undone.
            </>
          }
          onClose={() => setToDelete(null)}
          onConfirm={async () => {
            await editionsApi.remove(toDelete.id);
            setToDelete(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
