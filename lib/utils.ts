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

/** Turn a snake_case tag into a readable label, e.g. "old_money" -> "Old Money". */
export function humanizeTag(tag: string): string {
  return tag
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
