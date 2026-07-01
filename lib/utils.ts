import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Initials for an avatar, e.g. "Jane Doe" -> "JD", "jane@x.com" -> "J". */
export function getInitials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return "?";
  const trimmed = nameOrEmail.trim();
  if (!trimmed) return "?";
  if (trimmed.includes("@")) return trimmed[0]!.toUpperCase();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Human-readable "X days ago" style relative time, translated via `t`. */
export function timeAgo(
  date: string | Date | null | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (!date) return t("time.never");
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (Number.isNaN(seconds)) return t("time.never");
  if (seconds < 60) return t("time.justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return t(minutes === 1 ? "time.minuteAgo" : "time.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return t(hours === 1 ? "time.hourAgo" : "time.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30)
    return t(days === 1 ? "time.dayAgo" : "time.daysAgo", { count: days });
  const months = Math.floor(days / 30);
  if (months < 12)
    return t(months === 1 ? "time.monthAgo" : "time.monthsAgo", { count: months });
  const years = Math.floor(months / 12);
  return t(years === 1 ? "time.yearAgo" : "time.yearsAgo", { count: years });
}

/** Turn a snake_case tag into a readable label, e.g. "old_money" -> "Old Money". */
export function humanizeTag(tag: string): string {
  return tag
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
