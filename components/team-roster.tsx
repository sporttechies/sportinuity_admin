"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { rosterApi, type Player, type TeamDetail } from "@/lib/api";
import { formatDateTime } from "@/lib/constants";
import { ErrorNote } from "@/components/modal";

/** Team sports only: edition, age category, coach and the player list. */
export function TeamRoster({ team }: { team: TeamDetail }) {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [limit, setLimit] = useState<number | null>(team.maxPlayers);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState("");

  useEffect(() => {
    if (!team.isTeamSport) return;
    let cancelled = false;
    rosterApi
      .players(team.id)
      .then((r) => {
        if (cancelled) return;
        setPlayers(r.players);
        setLimit(r.limit);
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
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            team.rosterSubmittedAt ? "bg-[#eaf5ee] text-[#1c673e]" : "bg-[#fff4dc] text-[#a36a00]"
          }`}
        >
          {team.rosterSubmittedAt ? `Submitted ${formatDateTime(team.rosterSubmittedAt)}` : "Not submitted yet"}
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

      <ErrorNote message={error} />

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
                  <p className="mt-1 text-xs font-semibold text-red-600">No document</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
