"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Receipt,
  Menu,
  Search,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  authApi,
  managerApi,
  signOut,
  type Dashboard,
  type Manager,
} from "@/lib/api";
import { formatDate } from "@/lib/constants";

// Slim, rounded scrollbars used app-wide (page, sidebar, tables, modals).
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

const NAV: { label: string; href: string; icon: LucideIcon; title: string }[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard, title: "Logistics overview" },
  { label: "Requests", href: "/requests", icon: ClipboardList, title: "Requests" },
  { label: "Invoices", href: "/invoices", icon: Receipt, title: "Invoices" },
  { label: "Teams", href: "/teams", icon: Users, title: "Teams" },
  { label: "Calendar", href: "/calendar", icon: CalendarDays, title: "Calendar" },
  { label: "Settings", href: "/settings", icon: Settings, title: "Settings" },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

const POLL_MS = 60_000;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop
  const [manager, setManager] = useState<Manager | null>(null);
  const [overview, setOverview] = useState<Dashboard | null>(null);
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const current = NAV.find((item) => isActive(pathname, item.href));
  const title = pathname.startsWith("/requests/")
    ? "Request details"
    : pathname.startsWith("/teams/")
      ? "Team details"
      : (current?.title ?? "Sportinuity");

  useEffect(() => {
    authApi.me().then(({ user }) => setManager(user)).catch(() => {});
  }, []);

  // New-request notifications: refresh every minute while the tab is visible.
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      managerApi
        .dashboard()
        .then((d) => !cancelled && setOverview(d))
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  // Close overlays when navigating.
  useEffect(() => {
    setSidebarOpen(false);
    setShowNotifications(false);
    setShowProfile(false);
  }, [pathname]);

  useEffect(() => {
    if (!showNotifications && !showProfile) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!notificationsRef.current?.contains(target)) setShowNotifications(false);
      if (!profileRef.current?.contains(target)) setShowProfile(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showNotifications, showProfile]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowNotifications(false);
      setShowProfile(false);
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Lock page scroll behind the mobile drawer.
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const q = search.trim();
    router.push(q ? `/requests?q=${encodeURIComponent(q)}` : "/requests");
  }

  const newRequests = (overview?.recent ?? []).filter((r) => r.status === "new");
  const awaiting = overview?.totals.awaitingAction ?? 0;
  const initials = (manager?.name || "M")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
        } ${sidebarCollapsed ? "lg:invisible lg:-translate-x-full" : "lg:translate-x-0"}`}
      >
        <div className="flex h-[72px] shrink-0 items-center border-b border-slate-100 px-7 sm:h-[82px]">
          <Link href="/" aria-label="Overview">
            <Image
              src="/logo.png"
              alt="Sportinuity"
              width={160}
              height={72}
              className="h-10 w-auto object-contain object-left"
              priority
            />
          </Link>
          <button
            onClick={() => {
              setSidebarOpen(false);
              setSidebarCollapsed(true);
            }}
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
          <nav aria-label="Main navigation" className="space-y-1">
            {NAV.map(({ label, href, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-[#e8f4fb] text-[#007cc2]"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="size-[18px]" />
                  {label}
                  {href === "/requests" && awaiting > 0 && (
                    <span className="ml-auto rounded-full bg-[#007cc2] px-2 py-0.5 text-[10px] font-bold text-white">
                      {awaiting}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Fixed header, offset by the sidebar on desktop */}
      <header
        className={`fixed inset-x-0 top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur transition-[left] duration-200 supports-[backdrop-filter]:bg-white/80 sm:h-[82px] sm:px-8 ${
          sidebarCollapsed ? "lg:left-0" : "lg:left-[270px]"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => {
              if (window.matchMedia("(min-width: 1024px)").matches)
                setSidebarCollapsed((v) => !v);
              else setSidebarOpen(true);
            }}
            className={`shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-50 ${
              sidebarOpen ? "hidden" : ""
            } ${sidebarCollapsed ? "lg:block" : "lg:hidden"}`}
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="truncate text-base font-bold tracking-tight sm:text-xl">
            {title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <form onSubmit={submitSearch} className="relative hidden md:block" role="search">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search requests"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests..."
              className="h-10 w-44 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#007cc2] focus:bg-white focus:ring-4 focus:ring-[#007cc2]/15 lg:w-56"
            />
          </form>

          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications((open) => !open)}
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50"
              aria-label="Notifications"
              aria-expanded={showNotifications}
            >
              <Bell className="size-[18px]" />
              {awaiting > 0 && (
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#e36832]" />
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <p className="font-semibold">Notifications</p>
                {newRequests.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    {awaiting > 0
                      ? `${awaiting} request${awaiting === 1 ? "" : "s"} waiting for action.`
                      : "You're all caught up."}
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {newRequests.slice(0, 5).map((r) => (
                      <li key={r.reference}>
                        <Link
                          href={`/requests/${encodeURIComponent(r.reference)}`}
                          className="block py-2.5 text-sm hover:text-[#007cc2]"
                        >
                          <span className="font-semibold">{r.reference}</span> · {r.team || "No team"}
                          <span className="block text-xs text-slate-400">
                            New request · {formatDate(r.createdAt)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/requests?status=new"
                  className="mt-3 inline-block text-sm font-semibold text-[#007cc2] hover:underline"
                >
                  View new requests →
                </Link>
              </div>
            )}
          </div>

          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile((open) => !open)}
              aria-expanded={showProfile}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-50"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-[#d7eadf] text-sm font-bold text-[#1c673e]">
                {initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[150px] truncate text-sm font-semibold">
                  {manager?.name || "Manager"}
                </span>
                <span className="block max-w-[150px] truncate text-[11px] text-slate-400">
                  {manager?.email || ""}
                </span>
              </span>
              <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
            </button>
            {showProfile && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
              >
                <Link
                  role="menuitem"
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  <Settings className="size-4 text-slate-400" /> Settings
                </Link>
                <button
                  role="menuitem"
                  onClick={signOut}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content sits below the fixed header and beside the sidebar */}
      <div
        className={`pt-[72px] transition-[padding] duration-200 sm:pt-[82px] ${
          sidebarCollapsed ? "lg:pl-0" : "lg:pl-[270px]"
        }`}
      >
        <main className="mx-auto w-full max-w-[1450px] px-4 py-6 sm:px-8 lg:px-10 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
