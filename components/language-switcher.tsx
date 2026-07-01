"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-context";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={cn("flex items-center gap-1.5 text-sm", className)}>
      <button
        type="button"
        onClick={() => setLocale("de")}
        aria-pressed={locale === "de"}
        className={cn(
          "rounded px-1.5 py-1 font-normal transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          locale === "de"
            ? "text-ink"
            : "text-muted-foreground hover:text-ink",
        )}
      >
        🇩🇪 DE
      </button>
      <span aria-hidden className="text-muted-foreground">
        |
      </span>
      <button
        type="button"
        onClick={() => setLocale("pt")}
        aria-pressed={locale === "pt"}
        className={cn(
          "rounded px-1.5 py-1 font-normal transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          locale === "pt"
            ? "text-ink"
            : "text-muted-foreground hover:text-ink",
        )}
      >
        🇧🇷 PT
      </button>
    </div>
  );
}
