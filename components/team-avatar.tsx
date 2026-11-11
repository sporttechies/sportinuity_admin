/* eslint-disable @next/next/no-img-element */
import { apiUrl } from "@/lib/api";

export function TeamAvatar({
  name,
  logoPath,
  logoSrc,
  className = "size-9",
}: {
  name?: string | null;
  logoPath?: string | null;
  logoSrc?: string | null;
  className?: string;
}) {
  const src = logoSrc || apiUrl(logoPath);
  const initials =
    (name || "").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "T";
  return src ? (
    <img
      src={src}
      alt=""
      className={`${className} shrink-0 rounded-full border border-slate-200 bg-white object-contain`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-[#e8f4fb] text-xs font-bold text-[#007cc2]`}
    >
      {initials}
    </span>
  );
}
