import Link from "next/link";

export function TravelTabs({ active }: { active: "trips" | "bookings" }) {
  const tab = (key: string, href: string, label: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold ${active === key ? "bg-[#102331] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
    >
      {label}
    </Link>
  );
  return <div className="flex gap-2">{tab("trips", "/travel", "Trips")}{tab("bookings", "/travel/bookings", "Bookings")}</div>;
}
