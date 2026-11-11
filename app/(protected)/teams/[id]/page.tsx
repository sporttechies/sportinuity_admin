"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { managerApi, type TeamDetail } from "@/lib/api";
import { SPORTS, STATUS_LABELS, countryName, formatDate, formatDateRange } from "@/lib/constants";
import { resizeImage } from "@/lib/image";
import { ConfirmDialog, ErrorNote } from "@/components/modal";
import { NewRequestModal } from "@/components/new-request-modal";
import { StatusBadge } from "@/components/status-badge";
import { TeamAvatar } from "@/components/team-avatar";

const COUNTRY_CODES =
  "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW".split(" ");
const COUNTRIES = COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) =>
  a.name.localeCompare(b.name),
);

const input =
  "mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15";

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [form, setForm] = useState({ name: "", sport: "", country: "", city: "" });
  const [logo, setLogo] = useState<string | null | undefined>(undefined); // undefined keep, null remove
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const apply = useCallback((t: TeamDetail) => {
    setTeam(t);
    setForm({ name: t.name, sport: t.sport, country: t.country, city: t.city || "" });
    setLogo(undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    managerApi
      .team(id)
      .then((t) => !cancelled && apply(t))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load the team."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, apply]);

  async function pickLogo(file?: File) {
    if (!file) return;
    setError("");
    try {
      setLogo(await resizeImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the image.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      apply(
        await managerApi.updateTeam(id, {
          name: form.name.trim(),
          sport: form.sport,
          country: form.country,
          city: form.city.trim() || null,
          ...(logo !== undefined ? { logo } : {}),
        }),
      );
      setNotice("Team saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the team.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAccount() {
    if (!team) return;
    const disabled = team.admins.some((a) => a.accountStatus === "disabled");
    setToggling(true);
    setError("");
    setNotice("");
    try {
      apply(await managerApi.setTeamStatus(id, disabled ? "active" : "disabled"));
      setNotice(disabled ? "Account enabled." : "Account disabled. The team can no longer sign in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the account.");
    } finally {
      setToggling(false);
    }
  }

  if (loading) return <p className="text-slate-500" aria-busy="true">Loading…</p>;
  if (!team)
    return (
      <div className="space-y-4">
        <ErrorNote message={error || "Team not found."} />
        <Link href="/teams" className="text-sm font-semibold text-[#007cc2] hover:underline">← Back to teams</Link>
      </div>
    );

  const accountDisabled = team.admins.length > 0 && team.admins.every((a) => a.accountStatus === "disabled");
  const totalRequests = Object.values(team.requestCounts).reduce((a, b) => a + b, 0);
  const hasLogo = logo === null ? false : !!(logo || team.logoPath);
  const changed =
    logo !== undefined ||
    form.name !== team.name ||
    form.sport !== team.sport ||
    form.country !== team.country ||
    form.city !== (team.city || "");

  return (
    <div className="space-y-6">
      <Link href="/teams" className="text-sm font-semibold text-[#007cc2] hover:underline">← All teams</Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TeamAvatar name={team.name} logoPath={team.logoPath} className="size-14" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{team.name}</h2>
            <p className="text-sm text-slate-500">
              {team.sport} · {[team.city, countryName(team.country)].filter(Boolean).join(", ")} · joined {formatDate(team.createdAt)}
            </p>
          </div>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8]">
          <Plus className="size-4" /> New request
        </button>
      </div>

      <ErrorNote message={error} />
      {notice && <p role="status" className="rounded-xl bg-[#eaf5ee] px-4 py-3 text-sm font-semibold text-[#1c673e]">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold">Team profile</h3>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <TeamAvatar name={form.name || team.name} logoPath={logo === null ? null : team.logoPath} logoSrc={logo || undefined} className="size-16" />
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                  {hasLogo ? "Change picture" : "Upload picture"}
                </button>
                {hasLogo && (
                  <button type="button" onClick={() => setLogo(null)} className="px-2 text-sm font-semibold text-red-600 hover:underline">Remove</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
                Team name
                <input required value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Sport
                <select required value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} className={input}>
                  {!SPORTS.includes(form.sport) && <option value={form.sport}>{form.sport}</option>}
                  {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Country
                <select required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={input}>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
                City (optional)
                <input value={form.city} maxLength={120} onChange={(e) => setForm({ ...form, city: e.target.value })} className={input} />
              </label>
            </div>
            <button type="submit" disabled={saving || !changed} className="mt-5 rounded-xl bg-[#007cc2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-50">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Requests ({totalRequests})</h3>
              {totalRequests > 0 && (
                <Link href={`/requests?teamId=${team.id}`} className="text-sm font-semibold text-[#007cc2] hover:underline">Open in requests</Link>
              )}
            </div>
            {team.requests.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">This team hasn't made any requests yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {team.requests.map((r) => (
                  <li key={r.reference}>
                    <Link href={`/requests/${encodeURIComponent(r.reference)}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-1 py-3 hover:bg-slate-50">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{r.reference} · {r.event}</span>
                        <span className="block text-xs text-slate-500">{r.location} · {formatDateRange(r.departure, r.returnDate)} · {r.people} traveller{r.people === 1 ? "" : "s"}</span>
                      </span>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold">Account</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {team.admins.map((a) => (
                <li key={a.id}>
                  <span className="block font-semibold">{a.name}</span>
                  <span className="block break-all text-slate-500">{a.email}</span>
                </li>
              ))}
            </ul>
            <p className={`mt-4 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${accountDisabled ? "bg-slate-100 text-slate-500" : "bg-[#eaf5ee] text-[#1c673e]"}`}>
              {accountDisabled ? "Disabled" : "Active"}
            </p>
            <button onClick={toggleAccount} disabled={toggling || team.admins.length === 0} className="mt-3 block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">
              {toggling ? "Please wait…" : accountDisabled ? "Enable account" : "Disable account"}
            </button>
            <p className="mt-2 text-xs text-slate-500">
              A disabled team can't sign in. Their requests are kept.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold">By status</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {Object.entries(team.requestCounts).filter(([, n]) => n > 0).map(([s, n]) => (
                <li key={s} className="flex justify-between">
                  <span className="text-slate-600">{STATUS_LABELS[s as keyof typeof STATUS_LABELS] ?? s}</span>
                  <span className="font-semibold">{n}</span>
                </li>
              ))}
              {totalRequests === 0 && <li className="text-slate-500">No requests.</li>}
            </ul>
          </section>

          <section className="rounded-2xl border border-red-100 bg-white p-5">
            <h3 className="font-bold text-red-700">Delete team</h3>
            <p className="mt-1 text-xs text-slate-500">
              {totalRequests > 0
                ? "A team with requests can't be deleted. Disable the account instead."
                : "Removes the team and its account permanently."}
            </p>
            <button onClick={() => setDeleting(true)} disabled={totalRequests > 0} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">
              <Trash2 className="size-4" /> Delete team
            </button>
          </section>
        </div>
      </div>

      {creating && (
        <NewRequestModal
          teamId={team.id}
          onClose={() => setCreating(false)}
          onCreated={(r) => router.push(`/requests/${encodeURIComponent(r.reference)}`)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${team.name}?`}
          danger
          confirmLabel="Delete team"
          message="This permanently removes the team and its sign-in. It can't be undone."
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await managerApi.deleteTeam(id);
            router.replace("/teams");
          }}
        />
      )}
    </div>
  );
}
