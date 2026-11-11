"use client";

import { FormEvent, useEffect, useState } from "react";
import { authApi, managerApi, type Manager } from "@/lib/api";
import { ErrorNote } from "@/components/modal";

const input =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15 disabled:bg-slate-50 disabled:text-slate-500";

export default function SettingsPage() {
  const [me, setMe] = useState<Manager | null>(null);
  const [name, setName] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ ok: "", error: "" });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState({ ok: "", error: "" });

  useEffect(() => {
    authApi.me().then(({ user }) => {
      setMe(user);
      setName(user.name);
    }).catch((e) => setProfileMsg({ ok: "", error: e instanceof Error ? e.message : "Could not load your profile." }));
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileBusy(true);
    setProfileMsg({ ok: "", error: "" });
    try {
      const { user } = await managerApi.updateMe(name.trim());
      setMe(user);
      setName(user.name);
      setProfileMsg({ ok: "Profile saved. Refresh to see the new name in the header.", error: "" });
    } catch (err) {
      setProfileMsg({ ok: "", error: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg({ ok: "", error: "" });
    if (pw.next.length < 8) return setPwMsg({ ok: "", error: "The new password needs at least 8 characters." });
    if (pw.next !== pw.confirm) return setPwMsg({ ok: "", error: "The new passwords don't match." });
    if (pw.next === pw.current) return setPwMsg({ ok: "", error: "Choose a password different from the current one." });
    setPwBusy(true);
    try {
      await authApi.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ ok: "Password updated.", error: "" });
    } catch (err) {
      setPwMsg({ ok: "", error: err instanceof Error ? err.message : "Could not change the password." });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={saveProfile} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="font-bold">Your profile</h3>
        <div className="mt-4 grid gap-4">
          <label className="block text-xs font-semibold text-slate-600">
            Full name
            <input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Email
            <input disabled value={me?.email || ""} className={input} />
          </label>
        </div>
        <div className="mt-4 space-y-3">
          <ErrorNote message={profileMsg.error} />
          {profileMsg.ok && <p role="status" className="rounded-xl bg-[#eaf5ee] px-4 py-3 text-sm font-semibold text-[#1c673e]">{profileMsg.ok}</p>}
          <button type="submit" disabled={profileBusy || !me || name.trim() === me.name} className="rounded-xl bg-[#007cc2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-50">
            {profileBusy ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>

      <form onSubmit={changePassword} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="font-bold">Change password</h3>
        <div className="mt-4 grid gap-4">
          <label className="block text-xs font-semibold text-slate-600">
            Current password
            <input required type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className={input} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            New password
            <input required type="password" autoComplete="new-password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className={input} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Confirm new password
            <input required type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className={input} />
          </label>
        </div>
        <div className="mt-4 space-y-3">
          <ErrorNote message={pwMsg.error} />
          {pwMsg.ok && <p role="status" className="rounded-xl bg-[#eaf5ee] px-4 py-3 text-sm font-semibold text-[#1c673e]">{pwMsg.ok}</p>}
          <button type="submit" disabled={pwBusy} className="rounded-xl bg-[#007cc2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60">
            {pwBusy ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
