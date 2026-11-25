"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { Check, MessageSquareWarning } from "lucide-react";
import { rosterApi, type Player, type RosterStatus, type TeamDetail } from "@/lib/api";
import { formatDateTime } from "@/lib/constants";
import { ErrorNote, Modal } from "@/components/modal";

const STATUS_STYLES: Record<RosterStatus, { label: string; cls: string }> = {
  draft: { label: "Not submitted", cls: "bg-slate-100 text-slate-600" },
  submitted: { label: "Waiting for review", cls: "bg-[#fff4dc] text-[#a36a00]" },
  approved: { label: "Approved", cls: "bg-[#eaf5ee] text-[#1c673e]" },
  changes_requested: { label: "Changes requested", cls: "bg-[#fde8e8] text-[#b42318]" },
};

/** Team sports only: edition, age category, coach and the player list. */
export function TeamRoster({ team }: { team: TeamDetail }) {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [limit, setLimit] = useState<number | null>(team.maxPlayers);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState("");
  const [status, setStatus] = useState<RosterStatus>(team.rosterStatus ?? "draft");
  const [reviewNote, setReviewNote] = useState<string | null>(team.rosterReviewNote ?? null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(team.rosterSubmittedAt);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!team.isTeamSport) return;
    let cancelled = false;
    rosterApi
      .players(team.id)
      .then((r) => {
        if (cancelled) return;
        setPlayers(r.players);
        setLimit(r.limit);
        setStatus(r.status);
        setReviewNote(r.reviewNote);
        setSubmittedAt(r.submittedAt);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load the squad."));
    return () => {
      cancelled = true;
    };
  }, [team.id, team.isTeamSport]);

  if (!team.isTeamSport) return null;

  async function openDocument(p: Player) {
    setOpening(p.id);
    setError("");
    try {
      await rosterApi.openDocument(team.id, p.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the document.");
    } finally {
      setOpening("");
    }
  }

  async function review(decision: "approve" | "request_changes") {
    setBusy(true);
    setError("");
    try {
      const r = await rosterApi.review(team.id, { decision, note: note.trim() || null });
      setStatus(r.status);
      setReviewNote(r.reviewNote);
      setAsking(false);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your review.");
    } finally {
      setBusy(false);
    }
  }

  const badge = STATUS_STYLES[status];
  const details: [string, string | null][] = [
    ["Edition", team.edition],
    ["Age category", team.ageCategory],
    ["Coach", team.coach.name],
    ["Coach email", team.coach.email],
    ["Coach phone", team.coach.phone],
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">Squad{players ? ` (${players.length}${limit ? ` / ${limit}` : ""})` : ""}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
          {badge.label}
          {submittedAt && status !== "draft" ? ` · submitted ${formatDateTime(submittedAt)}` : ""}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-0.5 break-words font-semibold">{value || "—"}</dd>
          </div>
        ))}
      </dl>

      {status === "changes_requested" && reviewNote && (
        <p className="mt-4 rounded-xl bg-[#fde8e8] px-4 py-3 text-sm text-[#b42318]">
          <strong>You asked for changes:</strong> {reviewNote}
        </p>
      )}
      {status === "approved" && reviewNote && (
        <p className="mt-4 rounded-xl bg-[#eaf5ee] px-4 py-3 text-sm text-[#1c673e]">
          <strong>Your note:</strong> {reviewNote}
        </p>
      )}

      <ErrorNote message={error} />

      {status === "submitted" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#fff9ec] p-4">
          <p className="text-sm text-[#7a5200]">Check the players and their documents, then approve the squad or ask for changes.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setAsking(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
            >
              <MessageSquareWarning className="size-4" /> Request changes
            </button>
            <button
              onClick={() => review("approve")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1c673e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#15522f] disabled:opacity-60"
            >
              <Check className="size-4" /> {busy ? "Saving…" : "Approve squad"}
            </button>
          </div>
        </div>
      )}

      {players === null && !error ? (
        <p className="mt-5 text-sm text-slate-500" aria-busy="true">Loading players…</p>
      ) : players && players.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 py-6 text-center text-sm text-slate-500">No players added yet.</p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {players?.map((p, i) => (
            <li key={p.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
              {p.photoUrl ? (
                <img src={p.photoUrl} alt={`${p.fullName}`} className="size-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="size-16 shrink-0 rounded-lg bg-slate-100" />
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-semibold">
                  {i + 1}. {p.fullName}
                </p>
                <p className="text-xs text-slate-500">
                  {[p.jerseyNumber && `#${p.jerseyNumber}`, p.position, p.dateOfBirth && `Born ${p.dateOfBirth}`]
                    .filter(Boolean)
                    .join(" · ") || "No extra details"}
                </p>
                {p.hasDocument ? (
                  <button
                    onClick={() => openDocument(p)}
                    disabled={opening === p.id}
                    className="mt-1 text-xs font-semibold text-[#007cc2] hover:underline disabled:opacity-60"
                  >
                    {opening === p.id ? "Opening…" : "View birth certificate / passport"}
                  </button>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">No document uploaded</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {asking && (
        <Modal title="Request changes" onClose={() => setAsking(false)}>
          <div className="space-y-4">
            <label className="block text-sm font-semibold">
              What needs to change?
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="e.g. Birth certificates are missing for players 3 and 7."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-2 focus:ring-[#007cc2]/20"
              />
            </label>
            <p className="text-xs text-slate-500">The team is emailed this note and can fix the squad and submit it again.</p>
            <ErrorNote message={error} />
            <div className="flex justify-end gap-3">
              <button onClick={() => setAsking(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button
                onClick={() => review("request_changes")}
                disabled={busy || note.trim().length < 3}
                className="rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send to team"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
