"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { useLocale } from "@/lib/i18n/locale-context";
import { FILTER_GROUPS } from "@/lib/style-tags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GROUP_LABEL_KEYS: Record<string, string> = {
  Aesthetic: "filters.categoryAesthetic",
  Occasion: "filters.categoryOccasion",
  "Fabric & Fit": "filters.categoryFabricFit",
};

/** Collapsible filter panel (closed by default) below the search bar. */
export function SearchFilters({
  active,
  onToggle,
  onClear,
}: {
  active: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          className="min-h-11"
          aria-expanded={open}
        >
          <SlidersHorizontal className="size-4" />
          {active.length > 0
            ? t("filters.filterCount", { n: active.length })
            : t("common.filter")}
        </Button>
        {active.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-light text-muted-foreground underline-offset-4 hover:text-ink hover:underline"
          >
            {t("common.clearAll")}
          </button>
        )}
      </div>

      {open && (
        <div className="w-full animate-fade-in space-y-5 rounded-lg border border-line bg-card p-4">
          {FILTER_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t(GROUP_LABEL_KEYS[group.label] ?? group.label)}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.tags.map((tag) => {
                  const isActive = active.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => onToggle(tag)}
                      className="min-h-11 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Badge
                        variant={isActive ? "solid" : "outline"}
                        className={cn(
                          "cursor-pointer px-3 py-2 text-sm font-light transition-colors",
                          isActive ? "" : "hover:border-ink",
                        )}
                      >
                        {t(`filters.tags.${tag}`)}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
