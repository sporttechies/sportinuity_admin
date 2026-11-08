"use client";

import { useEffect, useMemo, useState } from "react";
import { authApi, logisticsApi } from "../../lib/api";
import Image from "next/image";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";

const initialRequests = [
  {
    id: "SL-1048",
    team: "Cape Town City FC",
    event: "CAF Confederation Cup",
    location: "Johannesburg, ZA",
    dates: "18–22 Nov 2026",
    people: 32,
    status: "In progress",
    color: "blue",
  },
  {
    id: "SL-1047",
    team: "Lions Rugby Academy",
    event: "Youth Rugby Festival",
    location: "Stellenbosch, ZA",
    dates: "04–07 Dec 2026",
    people: 24,
    status: "Awaiting quote",
    color: "amber",
  },
  {
    id: "SL-1046",
    team: "Ghana National U20",
    event: "WAFU Zone B Championship",
    location: "Accra, GH",
    dates: "12–19 Dec 2026",
    people: 38,
    status: "Confirmed",
    color: "green",
  },
  {
    id: "SL-1045",
    team: "Kigali Basketball Club",
    event: "BAL Qualifiers",
    location: "Kigali, RW",
    dates: "08–11 Jan 2027",
    people: 18,
    status: "New request",
    color: "purple",
  },
];

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Logistics requests", icon: ClipboardList, count: 12 },
  { label: "Teams & delegations", icon: Users },
  { label: "Accommodation", icon: Package },
  { label: "Transport", icon: Truck },
  { label: "Suppliers & quotes", icon: FileText },
];

export default function Page() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [requests, setRequests] = useState(initialRequests);
  const [loadingRequests, setLoadingRequests] = useState(true);
  useEffect(() => {
    logisticsApi
      .list()
      .then(({ data }) => {
        if (data.length)
          setRequests(
            data.map((request, index) => ({
              id: request.id || `request-${index}`,
              team: request.team || "Unassigned team",
              event: request.event || "Logistics request",
              location: request.location || "Destination to confirm",
              dates: request.dates || "Dates to confirm",
              people: Number(request.people) || 0,
              status: request.status || "New request",
              color: request.color || "purple",
            })),
          );
      })
      .catch(() => {})
      .finally(() => setLoadingRequests(false));
  }, []);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [manager, setManager] = useState<{ name?: string; email?: string }>({});
  useEffect(() => {
    authApi
      .me()
      .then(({ user }) => setManager(user))
      .catch(() => {});
  }, []);

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) =>
        `${request.team} ${request.event} ${request.location}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [requests, search],
  );

  function addRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const team = String(formData.get("team") || "New delegation");
    const eventName = String(
      formData.get("event") || "Upcoming sporting event",
    );
    const location = String(formData.get("location") || "To be confirmed");
    setRequests((current) => [
      {
        id: `SL-${1049 + current.length}`,
        team,
        event: eventName,
        location,
        dates: "Dates to confirm",
        people: Number(formData.get("people")) || 1,
        status: "New request",
        color: "purple",
      },
      ...current,
    ]);
    setShowNewRequest(false);
    setToast("Logistics request created successfully");
    window.setTimeout(() => setToast(""), 3500);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f9fb] text-[#0a0b0d]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[82px] items-center border-b border-slate-100 px-7">
          <Image
            src="/st_logo.png"
            alt="Sportinuity"
            width={151}
            height={58}
            className="h-auto w-[146px] object-contain object-left"
            priority
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-2 text-slate-400 lg:hidden"
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
        <div className="flex flex-1 flex-col px-4 py-6">
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>
          <nav className="flex flex-col gap-1" aria-label="Main navigation">
            {navItems.map(({ label, icon: Icon, count }) => (
              <button
                key={label}
                onClick={() => {
                  setActiveNav(label);
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${activeNav === label ? "bg-[#e8f4fb] text-[#007cc2]" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon className="size-[18px]" />{" "}
                <span className="flex-1">{label}</span>
                {count && (
                  <span className="rounded-full bg-[#007cc2] px-2 py-0.5 text-[10px] font-bold text-white">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <p className="px-3 pb-3 pt-9 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Manage
          </p>
          <nav className="flex flex-col gap-1">
            {(
              [
                ["Calendar", CalendarDays],
                ["Team communications", MessageSquare],
                ["Settings", Settings],
              ] as const
            ).map(([label, Icon]) => (
              <button
                key={label}
                onClick={() => setActiveNav(label)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <Icon className="size-[18px]" />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl bg-[#0d2637] p-4 text-white">
            <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-[#007cc2]">
              <ShieldCheck className="size-4" />
            </div>
            <p className="text-sm font-semibold">STL Operations</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Your workspace is ready for the next delegation.
            </p>
            <button className="mt-3 text-xs font-semibold text-[#71c7ef]">
              View workspace settings →
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[270px]">
        <header className="sticky top-0 z-30 flex min-h-[82px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-8 lg:flex-nowrap lg:py-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-500 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <div>
              <p className="text-xs text-slate-400">
                STL Operations / Team logistics
              </p>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                Logistics overview
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search requests"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requests..."
                className="h-10 w-52 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none ring-[#007cc2] placeholder:text-slate-400 focus:ring-2"
              />
            </div>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
              aria-label="Notifications"
            >
              <Bell className="size-[18px]" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#e36832]" />
            </button>
            {showNotifications && (
              <div className="absolute right-5 top-16 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <p className="font-semibold">Notifications</p>
                <p className="mt-3 text-sm text-slate-500">
                  A supplier quote for Lions Rugby Academy is ready for review.
                </p>
              </div>
            )}
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <button className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#d7eadf] text-sm font-bold text-[#1c673e]">
                AM
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[150px] truncate text-sm font-semibold">
                  {manager.name || "Operations manager"}
                </span>
                <span className="block max-w-[150px] truncate text-[11px] text-slate-400">
                  {manager.email || "Operations manager"}
                </span>
              </span>
              <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1450px] px-4 py-6 sm:px-8 lg:px-10 lg:py-9">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-sm font-semibold text-[#007cc2]">
                Wednesday, 21 October 2026
              </p>
              <h2 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
                Good morning, {manager.name?.split(" ")[0] || "there"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Here&apos;s what&apos;s happening across your team logistics.
              </p>
            </div>
            <button
              onClick={() => setShowNewRequest(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#007cc2] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,124,194,0.2)] transition hover:bg-[#006ba8]"
            >
              <Plus className="size-4" /> New logistics request
            </button>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(
              [
                [
                  "Active requests",
                  String(requests.length),
                  "Live from API",
                  "blue",
                  ClipboardList,
                ],
                [
                  "Awaiting action",
                  String(
                    requests.filter((request) =>
                      request.status.toLowerCase().includes("await"),
                    ).length,
                  ).padStart(2, "0"),
                  "Quotes & confirmations",
                  "orange",
                  CircleHelp,
                ],
                [
                  "Confirmed this month",
                  String(
                    requests.filter((request) =>
                      request.status.toLowerCase().includes("confirm"),
                    ).length,
                  ).padStart(2, "0"),
                  "Live from API",
                  "green",
                  CheckCircle2,
                ],
                [
                  "People travelling",
                  String(
                    requests.reduce(
                      (total, request) => total + request.people,
                      0,
                    ),
                  ),
                  "Across current requests",
                  "brown",
                  Users,
                ],
              ] as const
            ).map(([label, value, sub, color, Icon]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between">
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <span
                    className={`flex size-9 items-center justify-center rounded-xl ${color === "blue" ? "bg-[#e8f4fb] text-[#007cc2]" : color === "orange" ? "bg-[#fff1e9] text-[#c65b29]" : color === "green" ? "bg-[#eaf5ee] text-[#1c673e]" : "bg-[#f7eee9] text-[#984229]"}`}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                </div>
                <p className="text-3xl font-bold tracking-tight">{value}</p>
                <p className="mt-1 text-xs text-slate-400">{sub}</p>
              </div>
            ))}
          </section>

          <section className="mt-8 grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
                <div>
                  <h3 className="font-bold">Recent logistics requests</h3>
                  {loadingRequests && (
                    <span className="text-xs text-slate-400">Syncing…</span>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    Your most recently updated team arrangements
                  </p>
                </div>
                <button className="text-sm font-semibold text-[#007cc2]">
                  View all <span aria-hidden="true">→</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="px-6 py-3 font-semibold">Team / event</th>
                      <th className="px-4 py-3 font-semibold">
                        Travel details
                      </th>
                      <th className="px-4 py-3 font-semibold">Delegation</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr
                        key={request.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex size-9 items-center justify-center rounded-lg text-xs font-bold ${request.color === "blue" ? "bg-[#e8f4fb] text-[#007cc2]" : request.color === "amber" ? "bg-[#fff4dc] text-[#a36a00]" : request.color === "green" ? "bg-[#eaf5ee] text-[#1c673e]" : "bg-[#f0e9fb] text-[#7650ab]"}`}
                            >
                              {request.team
                                .split(" ")
                                .map((word) => word[0])
                                .slice(0, 2)
                                .join("")}
                            </span>
                            <div>
                              <p className="text-sm font-semibold">
                                {request.team}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {request.id} · {request.event}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium">
                            {request.location}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {request.dates}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {request.people} travellers
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${request.status === "Confirmed" ? "bg-[#eaf5ee] text-[#1c673e]" : request.status === "In progress" ? "bg-[#e8f4fb] text-[#007cc2]" : request.status === "Awaiting quote" ? "bg-[#fff4dc] text-[#a36a00]" : "bg-[#f0e9fb] text-[#7650ab]"}`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            aria-label={`More actions for ${request.team}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRequests.length === 0 && (
                  <div className="px-6 py-10 text-center text-sm text-slate-500">
                    No requests match your search.
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Operations snapshot</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    This month&apos;s progress
                  </p>
                </div>
                <button
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"
                  aria-label="Snapshot options"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </div>
              <div className="mt-6 flex items-center gap-6">
                <div
                  className="relative flex size-32 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background:
                      "conic-gradient(#007cc2 0 72%, #e8f4fb 72% 100%)",
                  }}
                >
                  <div className="flex size-24 items-center justify-center rounded-full bg-white">
                    <div className="text-center">
                      <p className="text-2xl font-bold">72%</p>
                      <p className="text-[10px] text-slate-400">complete</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#007cc2]" />{" "}
                    Confirmed <span className="ml-auto font-semibold">8</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#71c496]" /> In
                    progress <span className="ml-auto font-semibold">3</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#dbe5ec]" /> New{" "}
                    <span className="ml-auto font-semibold">1</span>
                  </div>
                </div>
              </div>
              <div className="mt-7 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Supplier responses</span>
                  <span className="font-semibold">18 / 24</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-3/4 rounded-full bg-[#1c673e]" />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl bg-[#0d2637] p-6 text-white md:col-span-2">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <span className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8bd2f4]">
                    Next up
                  </span>
                  <h3 className="text-xl font-bold">
                    {requests[0]?.team || "No active delegation"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {requests[0]
                      ? `${requests[0].event} · ${requests[0].location}`
                      : "Create a logistics request to get started."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <span className="flex size-8 items-center justify-center rounded-full border-2 border-[#0d2637] bg-[#d7eadf] text-[10px] font-bold text-[#1c673e]">
                      TN
                    </span>
                    <span className="flex size-8 items-center justify-center rounded-full border-2 border-[#0d2637] bg-[#b9def0] text-[10px] font-bold text-[#007cc2]">
                      SK
                    </span>
                    <span className="flex size-8 items-center justify-center rounded-full border-2 border-[#0d2637] bg-[#f4d8ca] text-[10px] font-bold text-[#984229]">
                      +3
                    </span>
                  </div>
                  <button className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
                    Open request
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#fff1e9] text-[#c65b29]">
                  <MapPin className="size-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-bold">4 destinations</p>
                  <p className="text-xs text-slate-400">Active this month</p>
                </div>
              </div>
              <div className="mt-5 flex items-end gap-1">
                <span className="h-8 w-2 rounded-t bg-[#b9def0]" />
                <span className="h-12 w-2 rounded-t bg-[#71c7ef]" />
                <span className="h-9 w-2 rounded-t bg-[#007cc2]" />
                <span className="h-16 w-2 rounded-t bg-[#007cc2]" />
                <span className="h-11 w-2 rounded-t bg-[#71c7ef]" />
                <span className="h-20 w-2 rounded-t bg-[#1c673e]" />
                <span className="h-14 w-2 rounded-t bg-[#71c496]" />
              </div>
            </div>
          </section>
        </main>
      </div>

      {showNewRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0b0d]/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={addRequest}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[#007cc2]">
                  Team & sports logistics
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  Create a new request
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Start a delegation record for STL to coordinate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewRequest(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close dialog"
              >
                <X />
              </button>
            </div>
            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Team or delegation
                <input
                  required
                  name="team"
                  placeholder="e.g. Cape Town City FC"
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[#007cc2]"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Event name
                <input
                  required
                  name="event"
                  placeholder="e.g. CAF Confederation Cup"
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[#007cc2]"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Destination
                  <input
                    required
                    name="location"
                    placeholder="City, country"
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[#007cc2]"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Travellers
                  <input
                    required
                    min="1"
                    type="number"
                    name="people"
                    placeholder="24"
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[#007cc2]"
                  />
                </label>
              </div>
            </div>
            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNewRequest(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8]"
                type="submit"
              >
                Create request
              </button>
            </div>
          </form>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-[#0d2637] px-4 py-3 text-sm font-medium text-white shadow-xl">
          <CheckCircle2 className="size-4 text-[#71c496]" />
          {toast}
        </div>
      )}
    </div>
  );
}
