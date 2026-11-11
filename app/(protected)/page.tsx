"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Clock, Plane, Users } from "lucide-react";
import { managerApi, type Dashboard } from "@/lib/api";
import {
  ALL_STATUSES,
  STATUS_LABELS,
  formatDateRange,
} from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { TeamAvatar } from "@/components/team-avatar";

const BAR_COLORS: Record<string, string> = {
  new: "bg-[#7650ab]",
  in_review: "bg-[#007cc2]",
  quoted: "bg-[#a36a00]",
  confirmed: "bg-[#1c673e]",
  completed: "bg-slate-400",
  cancelled: "bg-slate-300",
  rejected: "bg-red-500",
};

export default function OverviewPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
    managerApi
      .dashboard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the overview."));
  }, []);

  if (error)
    return (
      <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        {error}
      </p>
    );
  if (!data) return <p className="text-slate-500" aria-busy="true">Loading…</p>;

  const { totals, byStatus, recent, upcoming } = data;
  const maxStatus = Math.max(1, ...ALL_STATUSES.map((s) => byStatus[s] || 0));
  const cards = [
    { label: "Awaiting action", value: totals.awaitingAction, icon: Clock, tone: "bg-[#f0e9fb] text-[#7650ab]", href: "/requests?status=new,in_review" },
    { label: "Active requests", value: totals.active, icon: ClipboardList, tone: "bg-[#e8f4fb] text-[#007cc2]", href: "/requests?status=new,in_review,quoted,confirmed" },
    { label: "Approved", value: totals.confirmed, icon: CheckCircle2, tone: "bg-[#eaf5ee] text-[#1c673e]", href: "/requests?status=confirmed" },
    { label: "Active travellers", value: totals.travellers, icon: Plane, tone: "bg-[#fff1e9] text-[#c65b29]", href: "/requests" },
    { label: "Teams", value: totals.teams, icon: Users, tone: "bg-[#e8f4fb] text-[#007cc2]", href: "/teams" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-[#007cc2]">{greeting || " "}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          {totals.awaitingAction > 0
            ? `${totals.awaitingAction} request${totals.awaitingAction === 1 ? "" : "s"} need your attention`
            : "You're all caught up"}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, tone, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#007cc2]/40 hover:shadow-sm"
          >
            <span className={`flex size-9 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="size-[18px]" />
            </span>
            <p className="mt-3 text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium text-slate-500">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Recent requests</h3>
            <Link href="/requests" className="text-sm font-semibold text-[#007cc2] hover:underline">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No requests yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {recent.map((r) => (
                <li key={r.reference}>
                  <Link
                    href={`/requests/${encodeURIComponent(r.reference)}`}
                    className="flex items-center gap-3 rounded-xl px-1 py-3 hover:bg-slate-50"
                  >
                    <TeamAvatar name={r.team || "No team"} logoPath={r.teamLogoPath} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {r.reference} · {r.team || "No team"}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {r.event} · {r.location} · {r.people} traveller{r.people === 1 ? "" : "s"}
                      </span>
                    </span>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold">By status</h3>
            <ul className="mt-4 space-y-3">
              {ALL_STATUSES.map((s) => (
                <li key={s}>
                  <Link href={`/requests?status=${s}`} className="block">
                    <span className="flex justify-between text-xs font-medium text-slate-600">
                      {STATUS_LABELS[s]}
                      <span>{byStatus[s] || 0}</span>
                    </span>
                    <span className="mt-1 block h-2 rounded-full bg-slate-100">
                      <span
                        className={`block h-2 rounded-full ${BAR_COLORS[s]}`}
                        style={{ width: `${((byStatus[s] || 0) / maxStatus) * 100}%` }}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-[#0d2637] p-5 text-white">
            <h3 className="font-bold">Upcoming trips</h3>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-slate-300">No approved trips coming up.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {upcoming.map((r) => (
                  <li key={r.reference}>
                    <Link href={`/requests/${encodeURIComponent(r.reference)}`} className="block text-sm hover:underline">
                      <span className="font-semibold">{r.team || "No team"}</span> → {r.location}
                      <span className="block text-xs text-slate-300">
                        {formatDateRange(r.departure, r.returnDate)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/calendar" className="mt-4 inline-block text-xs font-semibold text-[#71c7ef] hover:underline">
              Open calendar →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
