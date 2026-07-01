"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={cn("flex items-center gap-1 text-sm", className)}>
      <button
        type="button"
        onClick={() => setLocale("de")}
        aria-pressed={locale === "de"}
        className={cn(
          "min-h-8 rounded-sm px-1.5 py-1 font-medium transition-colors",
          locale === "de" ? "text-ink" : "text-muted-foreground hover:text-ink",
        )}
      >
        🇩🇪 DE
      </button>
      <span className="text-line" aria-hidden>
        |
      </span>
      <button
        type="button"
        onClick={() => setLocale("pt")}
        aria-pressed={locale === "pt"}
        className={cn(
          "min-h-8 rounded-sm px-1.5 py-1 font-medium transition-colors",
          locale === "pt" ? "text-ink" : "text-muted-foreground hover:text-ink",
        )}
      >
        🇧🇷 PT
      </button>
    </div>
  );
}
