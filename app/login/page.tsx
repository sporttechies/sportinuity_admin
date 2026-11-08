"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.88 5.09A9.77 9.77 0 0 1 12 5c6.5 0 10 7 10 7a17.5 17.5 0 0 1-3.17 4.19" />
      <path d="M6.61 6.61A17.1 17.1 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.39-1.61" />
      <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="4"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const inputClasses =
  "h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 text-base text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15 disabled:bg-slate-50 disabled:opacity-70";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <main className="grid min-h-dvh bg-[#f7f9fb] lg:grid-cols-2">
      {/* Brand panel — hidden on small screens */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#005b91] via-[#007cc2] to-[#2aa6e6] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative rounded-2xl bg-white/95 p-4 shadow-lg w-fit">
          <Image
            src="/logo.png"
            alt="Sportinuity"
            width={160}
            height={72}
            className="h-auto w-32"
            priority
          />
        </div>
        <div className="relative max-w-md text-white">
          <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Keep every team, trip and fixture moving.
          </h2>
          <p className="mt-4 text-base text-white/80 xl:text-lg">
            One workspace for sports logistics, travel and team operations.
          </p>
        </div>
        <p className="relative text-sm text-white/60">
          &copy; {new Date().getFullYear()} Sportinuity. All rights reserved.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* Logo shown on small screens only */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/logo.png"
              alt="Sportinuity"
              width={160}
              height={72}
              className="h-auto w-32 sm:w-36"
              priority
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <p className="text-sm font-semibold text-[#007cc2]">
              Manager workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Sign in to operations
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Access team and sports logistics administration.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-8 grid gap-5"
              noValidate={false}
            >
              <div className="grid gap-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@company.com"
                    disabled={pending}
                    className={`${inputClasses} pr-3`}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={pending}
                    className={`${inputClasses} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007cc2]"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#007cc2] font-semibold text-white shadow-md shadow-[#007cc2]/25 transition hover:bg-[#006aa6] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#007cc2]/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending && <Spinner />}
                {pending ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400 lg:hidden">
            &copy; {new Date().getFullYear()} Sportinuity. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}
