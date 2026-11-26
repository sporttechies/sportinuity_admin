"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Bed, CalendarClock, CheckCircle2, MailOpen, Plane, UserPlus, Utensils, FileQuestion, type LucideIcon } from "lucide-react";
import { myWorkApi, type MyWork, type WorkTodo } from "@/lib/api";
import { formatDate } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { STAFF_ROLE_LABELS } from "@/components/staff-panel";

const TODO_ICONS: Record<WorkTodo["kind"], LucideIcon> = {
  review: AlertCircle,
  messages: MailOpen,
  quotes: FileQuestion,
  rooming: Bed,
  meals: Utensils,
  transport: Plane,
};

function countdown(days: number | null) {
  if (days === null) return null;
  if (days < 0) return { text: `Departed ${-days} day${days === -1 ? "" : "s"} ago`, cls: "text-slate-400" };
  if (days === 0) return { text: "Departs today", cls: "font-bold text-[#c65b29]" };
  if (days <= 14) return { text: `Departs in ${days} day${days === 1 ? "" : "s"}`, cls: "font-semibold text-[#c65b29]" };
  return { text: `Departs in ${days} days`, cls: "text-slate-500" };
}

export default function MyWorkPage() {
  const [data, setData] = useState<MyWork | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    myWorkApi
      .get()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load your work."));
  }, []);

  useEffect(() => {
    load();
    const refresh = () => document.visibilityState === "visible" && load();
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  if (error && !data)
    return (
      <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        {error}
      </p>
    );
  if (!data) return <p className="text-slate-500" aria-busy="true">Loading…</p>;

  const { summary, items, unassigned } = data;
  const cards = [
    { label: "Assigned to me", value: summary.assigned, href: "/requests?assignee=me" },
    { label: "Need action", value: summary.needAction, tone: summary.needAction > 0 ? "text-[#c65b29]" : "" },
    { label: "Unread messages", value: summary.unreadMessages, tone: summary.unreadMessages > 0 ? "text-[#007cc2]" : "" },
    { label: "Departing in 14 days", value: summary.departingSoon },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const body = (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
              <p className={`mt-1 text-3xl font-bold tracking-tight ${c.tone ?? ""}`}>{c.value}</p>
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-[#007cc2]">{body}</Link>
          ) : (
            <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">{body}</div>
          );
        })}
      </div>

      {(summary.rostersToReview > 0 || summary.unassigned > 0) && (
        <div className="flex flex-wrap gap-3">
          {summary.rostersToReview > 0 && (
            <Link href="/teams" className="rounded-full bg-[#fff4dc] px-4 py-2 text-sm font-semibold text-[#a36a00] hover:brightness-95">
              {summary.rostersToReview} squad{summary.rostersToReview === 1 ? "" : "s"} waiting for review
            </Link>
          )}
          {summary.unassigned > 0 && (
            <Link href="/requests?assignee=none" className="rounded-full bg-[#f0e9fb] px-4 py-2 text-sm font-semibold text-[#7650ab] hover:brightness-95">
              {summary.unassigned} unassigned request{summary.unassigned === 1 ? "" : "s"}
            </Link>
          )}
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold">My requests</h2>
        {items.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-semibold">Nothing is assigned to you.</p>
            <p className="mt-1 text-sm text-slate-500">Pick up a request from the list below, or assign yourself on any request page.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {items.map((r) => {
              const cd = countdown(r.daysToDeparture);
              return (
                <li key={r.reference} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/requests/${r.reference}`} className="font-bold text-[#007cc2] hover:underline">{r.reference}</Link>
                      <p className="mt-0.5 truncate font-semibold">{r.team || "No team"} · {r.event}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
                        <span>{r.destination}</span>
                        <span>{r.travellers} traveller{r.travellers === 1 ? "" : "s"}</span>
                        {r.departureDate && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="size-3.5" /> {formatDate(r.departureDate)}
                            {cd && <span className={cd.cls}> · {cd.text}</span>}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{STAFF_ROLE_LABELS[r.role]}</span>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  {r.todos.length === 0 ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#1c673e]">
                      <CheckCircle2 className="size-4" /> Nothing to do right now
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-1.5">
                      {r.todos.map((t, i) => {
                        const Icon = TODO_ICONS[t.kind];
                        return (
                          <li key={i}>
                            <Link href={`/requests/${r.reference}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                              <Icon className={`size-4 shrink-0 ${t.kind === "messages" ? "text-[#007cc2]" : "text-[#a36a00]"}`} />
                              {t.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {unassigned.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Unassigned requests</h2>
            {summary.unassigned > unassigned.length && (
              <Link href="/requests?assignee=none" className="text-sm font-semibold text-[#007cc2] hover:underline">See all {summary.unassigned}</Link>
            )}
          </div>
          <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {unassigned.map((r) => (
              <li key={r.reference}>
                <Link href={`/requests/${r.reference}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="font-semibold text-[#007cc2]">{r.reference}</span>
                    <span className="ml-2 text-sm text-slate-600">{r.team || "No team"} · {r.event}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    {r.departureDate && <span className="text-xs text-slate-500">{formatDate(r.departureDate)}</span>}
                    <StatusBadge status={r.status} />
                    <UserPlus className="size-4 text-slate-400" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
