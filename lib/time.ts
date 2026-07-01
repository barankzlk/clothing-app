export type TimeAgoKey =
  | "never"
  | "justNow"
  | "minutesAgo"
  | "hoursAgo"
  | "daysAgo"
  | "monthsAgo"
  | "yearsAgo";

function timeAgoParts(
  date: string | Date | null | undefined,
): { key: TimeAgoKey; n?: number } {
  if (!date) return { key: "never" };
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (Number.isNaN(seconds)) return { key: "never" };
  if (seconds < 60) return { key: "justNow" };
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return { key: "minutesAgo", n: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { key: "hoursAgo", n: hours };
  const days = Math.floor(hours / 24);
  if (days < 30) return { key: "daysAgo", n: days };
  const months = Math.floor(days / 30);
  if (months < 12) return { key: "monthsAgo", n: months };
  const years = Math.floor(months / 12);
  return { key: "yearsAgo", n: years };
}

type Translate = (path: string, vars?: Record<string, string | number>) => string;

/** Localized "X minutes ago" style relative time, via the app's t() function. */
export function formatTimeAgo(date: string | Date | null | undefined, t: Translate): string {
  const parts = timeAgoParts(date);
  if (parts.key === "never") return t("time.never");
  if (parts.key === "justNow") return t("time.justNow");
  const n = parts.n ?? 0;
  const suffix = n === 1 ? "One" : "Other";
  return t(`time.${parts.key}${suffix}`, { n });
}
