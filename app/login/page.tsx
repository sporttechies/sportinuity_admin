"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await authApi.login(
        String(form.get("email")),
        String(form.get("password")),
      );
      sessionStorage.setItem("sportinuity_token", result.token);
      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to sign in. Check your details and try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9fb] p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <Image
          src="/st_logo.png"
          alt="Sportinuity"
          width={160}
          height={72}
          className="mb-8 h-auto w-40"
          priority
        />
        <p className="text-sm font-semibold text-[#007cc2]">
          Manager workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Sign in to operations
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Access team and sports logistics administration.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              name="email"
              type="email"
              required
              className="h-11 rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-[#007cc2]"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Password
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="h-11 rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-[#007cc2]"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            disabled={pending}
            className="mt-2 h-11 rounded-xl bg-[#007cc2] font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
