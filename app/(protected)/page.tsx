"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

type RequestItem = {
  id: string;
  team: string;
  event: string;
  location: string;
  dates: string;
  people: number;
  status: string;
  color: string;
};

const initialRequests: RequestItem[] = [
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

type NavItem = { label: string; icon: LucideIcon; count?: number };

const workspaceNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Logistics requests", icon: ClipboardList, count: 12 },
  { label: "Teams & delegations", icon: Users },
  { label: "Accommodation", icon: Package },
  { label: "Transport", icon: Truck },
  { label: "Suppliers & quotes", icon: FileText },
];

const manageNav: NavItem[] = [
  { label: "Calendar", icon: CalendarDays },
  { label: "Team communications", icon: MessageSquare },
  { label: "Settings", icon: Settings },
];

const avatarColors: Record<string, string> = {
  blue: "bg-[#e8f4fb] text-[#007cc2]",
  amber: "bg-[#fff4dc] text-[#a36a00]",
  green: "bg-[#eaf5ee] text-[#1c673e]",
  purple: "bg-[#f0e9fb] text-[#7650ab]",
};

function statusClasses(status: string) {
  switch (status) {
    case "Confirmed":
      return "bg-[#eaf5ee] text-[#1c673e]";
    case "In progress":
      return "bg-[#e8f4fb] text-[#007cc2]";
    case "Awaiting quote":
      return "bg-[#fff4dc] text-[#a36a00]";
    default:
      return "bg-[#f0e9fb] text-[#7650ab]";
  }
}

function teamInitials(team: string) {
  return team
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Slim, rounded scrollbars used app-wide (page, sidebar, table, modal).
const scrollbarCss = `
  html { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f7f9fb; }
  html::-webkit-scrollbar { width: 10px; height: 10px; }
  html::-webkit-scrollbar-track { background: #f7f9fb; }
  html::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; border: 2px solid #f7f9fb; }
  html::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  .app-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
  .app-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
  .app-scroll::-webkit-scrollbar-track { background: transparent; }
  .app-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
  .app-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`;

const inputClasses =
  "h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15";

export default function Page() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [manager, setManager] = useState<{ name?: string; email?: string }>({});
  const [today, setToday] = useState("");
  const [greeting, setGreeting] = useState("Welcome");
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Date + greeting are computed on the client to avoid hydration mismatches.
  useEffect(() => {
    const now = new Date();
    setToday(
      now.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
    const hour = now.getHours();
    setGreeting(
      hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening",
    );
  }, []);

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

  useEffect(() => {
    authApi
      .me()
      .then(({ user }) => setManager(user))
      .catch(() => {});
  }, []);

  // Close notifications on outside click.
  useEffect(() => {
    if (!showNotifications) return;
    function onPointerDown(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showNotifications]);

  // Escape closes overlays.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setShowNotifications(false);
      setShowNewRequest(false);
      setSidebarOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Lock page scroll while the modal or mobile drawer is open.
  useEffect(() => {
    const lock = showNewRequest || sidebarOpen;
    const previous = document.body.style.overflow;
    if (lock) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [showNewRequest, sidebarOpen]);

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) =>
        `${request.team} ${request.event} ${request.location}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [requests, search],
  );

  const stats = useMemo(() => {
    const total = requests.length;
    const confirmed = requests.filter((r) =>
      r.status.toLowerCase().includes("confirm"),
    ).length;
    const inProgress = requests.filter((r) =>
      r.status.toLowerCase().includes("progress"),
    ).length;
    const awaiting = requests.filter((r) =>
      r.status.toLowerCase().includes("await"),
    ).length;
    const pending = Math.max(total - confirmed - inProgress, 0);
    const travellers = requests.reduce((sum, r) => sum + r.people, 0);
    const percent = total ? Math.round((confirmed / total) * 100) : 0;
    return {
      total,
      confirmed,
      inProgress,
      awaiting,
      pending,
      travellers,
      percent,
    };
  }, [requests]);

  const initials = useMemo(() => {
    const source = manager.name || manager.email || "";
    const parts = source.split(/[\s@.]+/).filter(Boolean);
    if (!parts.length) return "OM";
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [manager]);

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

  // On desktop (lg+) the sidebar collapses; on smaller screens it is a drawer.
  function isDesktop() {
    return window.matchMedia("(min-width: 1024px)").matches;
  }

  function toggleSidebar() {
    if (isDesktop()) setSidebarCollapsed((collapsed) => !collapsed);
    else setSidebarOpen((open) => !open);
  }

  function closeSidebar() {
    if (isDesktop()) setSidebarCollapsed(true);
    else setSidebarOpen(false);
  }

  function renderNav(items: NavItem[], label: string) {
    return (
      <nav className="flex flex-col gap-1" aria-label={label}>
        {items.map(({ label: itemLabel, icon: Icon, count }) => {
          const active = activeNav === itemLabel;
          return (
            <button
              key={itemLabel}
              onClick={() => {
                setActiveNav(itemLabel);
                setSidebarOpen(false);
              }}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                active
                  ? "bg-[#e8f4fb] text-[#007cc2]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="flex-1">{itemLabel}</span>
              {count ? (
                <span className="rounded-full bg-[#007cc2] px-2 py-0.5 text-[10px] font-bold text-white">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    );
  }

  const statCards: {
    label: string;
    value: string;
    sub: string;
    tone: string;
    icon: LucideIcon;
  }[] = [
    {
      label: "Active requests",
      value: String(stats.total),
      sub: "Live from API",
      tone: "bg-[#e8f4fb] text-[#007cc2]",
      icon: ClipboardList,
    },
    {
      label: "Awaiting action",
      value: String(stats.awaiting).padStart(2, "0"),
      sub: "Quotes & confirmations",
      tone: "bg-[#fff1e9] text-[#c65b29]",
      icon: CircleHelp,
    },
    {
      label: "Confirmed this month",
      value: String(stats.confirmed).padStart(2, "0"),
      sub: "Live from API",
      tone: "bg-[#eaf5ee] text-[#1c673e]",
      icon: CheckCircle2,
    },
    {
      label: "People travelling",
      value: String(stats.travellers),
      sub: "Across current requests",
      tone: "bg-[#f7eee9] text-[#984229]",
      icon: Users,
    },
  ];

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#f7f9fb] text-[#0a0b0d]">
      <style>{scrollbarCss}</style>
      {/* Mobile drawer backdrop */}
      <div
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-[#0a0b0d]/40 backdrop-blur-[1px] transition-opacity lg:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-[transform,visibility] duration-200 ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        } ${
          sidebarCollapsed
            ? "lg:invisible lg:-translate-x-full"
            : "lg:translate-x-0"
        }`}
      >
        <div className="flex h-[72px] shrink-0 items-center border-b border-slate-100 px-7 sm:h-[82px]">
          <Image
            src="/logo.png"
            alt="Sportinuity"
            width={160}
            height={72}
            className="h-10 w-auto object-contain object-left"
            priority
          />
          <button
            onClick={closeSidebar}
            className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="app-scroll flex flex-1 flex-col overflow-y-auto px-4 py-6">
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>
          {renderNav(workspaceNav, "Main navigation")}
          <p className="px-3 pb-3 pt-9 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Manage
          </p>
          {renderNav(manageNav, "Manage navigation")}
          <div className="mt-8 rounded-2xl bg-[#0d2637] p-4 text-white lg:mt-auto">
            <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-[#007cc2]">
              <ShieldCheck className="size-4" />
            </div>
            <p className="text-sm font-semibold">STL Operations</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Your workspace is ready for the next delegation.
            </p>
            <button className="mt-3 text-xs font-semibold text-[#71c7ef] hover:underline">
              View workspace settings →
            </button>
          </div>
        </div>
      </aside>

      {/* Fixed header — always pinned to the top, offset by the sidebar on desktop */}
      <header
        className={`fixed inset-x-0 top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 transition-[left] duration-200 sm:h-[82px] sm:px-8 ${
          sidebarCollapsed ? "lg:left-0" : "lg:left-[270px]"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={toggleSidebar}
            className={`shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-50 ${
              sidebarOpen ? "hidden" : ""
            } ${sidebarCollapsed ? "lg:block" : "lg:hidden"}`}
            aria-label="Toggle sidebar"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0">
            <p className="hidden truncate text-xs text-slate-400 sm:block">
              STL Operations / Team logistics
            </p>
            <h1 className="truncate text-base font-bold tracking-tight sm:text-xl">
              Logistics overview
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search requests"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests..."
              className="h-10 w-44 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#007cc2] focus:bg-white focus:ring-4 focus:ring-[#007cc2]/15 lg:w-56"
            />
          </div>

          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications((open) => !open)}
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50"
              aria-label="Notifications"
              aria-expanded={showNotifications}
            >
              <Bell className="size-[18px]" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#e36832]" />
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <p className="font-semibold">Notifications</p>
                <p className="mt-3 text-sm text-slate-500">
                  A supplier quote for Lions Rugby Academy is ready for review.
                </p>
              </div>
            )}
          </div>

          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <button className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-50">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#d7eadf] text-sm font-bold text-[#1c673e]">
              {initials}
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

      {/* Content is offset by the header height so nothing hides underneath it */}
      <div
        className={`pt-[72px] transition-[padding] duration-200 sm:pt-[82px] ${
          sidebarCollapsed ? "lg:pl-0" : "lg:pl-[270px]"
        }`}
      >
        <main className="mx-auto w-full max-w-[1450px] px-4 py-6 sm:px-8 lg:px-10 lg:py-9">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 min-h-5 text-sm font-semibold text-[#007cc2]">
                {today || "\u00A0"}
              </p>
              <h2 className="text-2xl font-bold tracking-[-0.04em] sm:text-4xl">
                {greeting}, {manager.name?.split(" ")[0] || "there"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Here&apos;s what&apos;s happening across your team logistics.
              </p>
            </div>
            <button
              onClick={() => setShowNewRequest(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#007cc2] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,124,194,0.2)] transition hover:bg-[#006ba8] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#007cc2]/30 active:scale-[0.99] sm:w-auto"
            >
              <Plus className="size-4" /> New logistics request
            </button>
          </div>

          {/* Mobile search (header search is hidden below md) */}
          <div className="relative mb-6 md:hidden">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search requests"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15"
            />
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map(({ label, value, sub, tone, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between">
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <span
                    className={`flex size-9 items-center justify-center rounded-xl ${tone}`}
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
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                <div>
                  <h3 className="font-bold">Recent logistics requests</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Your most recently updated team arrangements
                    {loadingRequests && (
                      <span className="ml-2 animate-pulse text-[#007cc2]">
                        Syncing…
                      </span>
                    )}
                  </p>
                </div>
                <button className="shrink-0 text-sm font-semibold text-[#007cc2] hover:underline">
                  View all <span aria-hidden="true">→</span>
                </button>
              </div>

              {/* Mobile: card list */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {filteredRequests.map((request) => (
                  <li key={request.id} className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${avatarColors[request.color] ?? avatarColors.purple}`}
                      >
                        {teamInitials(request.team)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {request.team}
                          </p>
                          <button
                            className="-mr-2 -mt-1 shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            aria-label={`More actions for ${request.team}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {request.id} · {request.event}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5 text-slate-400" />
                            {request.location}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3.5 text-slate-400" />
                            {request.dates}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5 text-slate-400" />
                            {request.people} travellers
                          </span>
                        </div>
                        <span
                          className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(request.status)}`}
                        >
                          {request.status}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Tablet / desktop: table */}
              <div className="app-scroll hidden overflow-x-auto md:block">
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
                        className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${avatarColors[request.color] ?? avatarColors.purple}`}
                            >
                              {teamInitials(request.team)}
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
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(request.status)}`}
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
              </div>

              {filteredRequests.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  No requests match your search.
                </div>
              )}
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
              <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
                <div
                  className="relative flex size-32 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#007cc2 0 ${stats.percent}%, #e8f4fb ${stats.percent}% 100%)`,
                  }}
                  role="img"
                  aria-label={`${stats.percent}% of requests confirmed`}
                >
                  <div className="flex size-24 items-center justify-center rounded-full bg-white">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{stats.percent}%</p>
                      <p className="text-[10px] text-slate-400">confirmed</p>
                    </div>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#007cc2]" />
                    Confirmed
                    <span className="ml-auto font-semibold">
                      {stats.confirmed}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#71c496]" />
                    In progress
                    <span className="ml-auto font-semibold">
                      {stats.inProgress}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#dbe5ec]" />
                    Pending
                    <span className="ml-auto font-semibold">
                      {stats.pending}
                    </span>
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
            <div className="rounded-2xl bg-[#0d2637] p-5 text-white sm:p-6 md:col-span-2">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <span className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8bd2f4]">
                    Next up
                  </span>
                  <h3 className="truncate text-xl font-bold">
                    {requests[0]?.team || "No active delegation"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {requests[0]
                      ? `${requests[0].event} · ${requests[0].location}`
                      : "Create a logistics request to get started."}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
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
                  <button className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/20">
                    Open request
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#fff1e9] text-[#c65b29]">
                  <MapPin className="size-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-bold">4 destinations</p>
                  <p className="text-xs text-slate-400">Active this month</p>
                </div>
              </div>
              <div className="mt-5 flex items-end gap-1" aria-hidden="true">
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
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[#0a0b0d]/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-request-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowNewRequest(false);
          }}
        >
          <form
            onSubmit={addRequest}
            className="app-scroll max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#007cc2]">
                  Team &amp; sports logistics
                </p>
                <h2
                  id="new-request-title"
                  className="mt-1 text-xl font-bold sm:text-2xl"
                >
                  Create a new request
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Start a delegation record for STL to coordinate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewRequest(false)}
                className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close dialog"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Team or delegation
                <input
                  required
                  autoFocus
                  name="team"
                  placeholder="e.g. Cape Town City FC"
                  className={inputClasses}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Event name
                <input
                  required
                  name="event"
                  placeholder="e.g. CAF Confederation Cup"
                  className={inputClasses}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Destination
                  <input
                    required
                    name="location"
                    placeholder="City, country"
                    className={inputClasses}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Travellers
                  <input
                    required
                    min="1"
                    type="number"
                    inputMode="numeric"
                    name="people"
                    placeholder="24"
                    className={inputClasses}
                  />
                </label>
              </div>
            </div>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowNewRequest(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#006ba8] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#007cc2]/30"
                type="submit"
              >
                Create request
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-5 z-[70] flex items-center gap-2 rounded-xl bg-[#0d2637] px-4 py-3 text-sm font-medium text-white shadow-xl sm:inset-x-auto sm:right-5"
        >
          <CheckCircle2 className="size-4 shrink-0 text-[#71c496]" />
          {toast}
        </div>
      )}
    </div>
  );
}
