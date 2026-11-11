"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { managerApi, type TeamSummary } from "@/lib/api";
import { countryName, formatDate } from "@/lib/constants";
import { ErrorNote } from "@/components/modal";
import { TeamAvatar } from "@/components/team-avatar";

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    managerApi
      .teams(q)
      .then((d) => !cancelled && (setTeams(d), setError("")))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load teams."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search teams"
          placeholder="Search by team, admin or email"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15"
        />
      </div>

      <ErrorNote message={error} />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="app-scroll overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Requests</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/teams/${t.id}`} className="flex items-center gap-3">
                      <TeamAvatar name={t.name} logoPath={t.logoPath} className="size-10" />
                      <span className="min-w-0">
                        <span className="block font-semibold text-[#007cc2]">{t.name}</span>
                        <span className="block text-xs text-slate-500">
                          {t.sport} · {[t.city, countryName(t.country)].filter(Boolean).join(", ")}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block font-medium">{t.adminName || "—"}</span>
                    <span className="block text-xs text-slate-500">{t.adminEmail || ""}</span>
                  </td>
                  <td className="px-4 py-3">
                    {t.requestCount}
                    {t.pendingCount > 0 && (
                      <span className="ml-2 rounded-full bg-[#f0e9fb] px-2 py-0.5 text-xs font-semibold text-[#7650ab]">
                        {t.pendingCount} pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.accountStatus === "active" ? "bg-[#eaf5ee] text-[#1c673e]" : "bg-slate-100 text-slate-500"}`}>
                      {t.accountStatus === "active" ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && teams.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-500">
            {q ? "No teams match your search." : "No teams have signed up yet."}
          </p>
        )}
        {loading && <p className="py-6 text-center text-sm text-slate-500" aria-busy="true">Loading…</p>}
      </div>
    </div>
  );
}
