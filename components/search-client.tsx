"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  Loader2,
  Clock,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SHOPS } from "@/lib/shops";
import { BUDGET_MAX, BUDGET_MIN, BUDGET_STEP } from "@/lib/style-tags";
import type { Profile, SavedSearch } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SearchFilters } from "@/components/search-filters";
import { ShopSearchCard } from "@/components/shop-search-card";

const SUGGESTION_DEBOUNCE_MS = 600;
const MAX_RECENT_SEARCHES = 8;

export function SearchClient({
  profile,
  userId,
  initialSavedSearches,
}: {
  profile: Profile;
  userId: string;
  initialSavedSearches: SavedSearch[];
}) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [budget, setBudget] = useState<number>(profile.budget_max_eur ?? 150);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [recentSearches, setRecentSearches] =
    useState<SavedSearch[]>(initialSavedSearches);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggleTag(tag: string) {
    setSelectedTags((tags) =>
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
    );
  }

  // Fetch a fresh set of idea suggestions whenever the selected filters
  // settle (debounced so rapid pill-clicking doesn't fire a request per click).
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (selectedTags.length === 0) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }

    setSuggestLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tags: selectedTags,
            gender: profile.gender,
            locale,
          }),
        });
        const data = await res.json();
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [selectedTags, profile.gender, locale]);

  async function saveSearch(q: string, filters: string[]) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("saved_searches")
      .insert({ user_id: userId, query: q, active_filters: filters })
      .select("*")
      .single();
    if (error || !data) return;
    setRecentSearches((list) => [data, ...list].slice(0, MAX_RECENT_SEARCHES));
  }

  function execute(q: string, filters: string[]) {
    setQuery(q);
    setSelectedTags(filters);
    setLastQuery(q);
    setSearched(true);
    void saveSearch(q, filters);
  }

  function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      toast.error(t("search.emptyQuery"));
      return;
    }
    execute(q, selectedTags);
  }

  function useSuggestion(idea: string) {
    execute(idea, selectedTags);
  }

  function useRecentSearch(entry: SavedSearch) {
    execute(entry.query, entry.active_filters);
  }

  async function removeRecentSearch(id: string) {
    setRecentSearches((list) => list.filter((s) => s.id !== id));
    const supabase = createClient();
    await supabase.from("saved_searches").delete().eq("id", id);
  }

  async function clearHistory() {
    setRecentSearches([]);
    const supabase = createClient();
    await supabase.from("saved_searches").delete().eq("user_id", userId);
  }

  return (
    <div className="space-y-6">
      {/* Row 1: search bar, full width */}
      <form onSubmit={runSearch} className="flex flex-col gap-3 sm:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            className="h-14 rounded-2xl pl-12 pr-4 text-base sm:pr-32"
          />
          <Button
            type="submit"
            size="lg"
            className="hidden h-11 rounded-xl px-6 sm:absolute sm:right-1.5 sm:top-1.5 sm:flex"
          >
            <Search /> {t("search.findIt")}
          </Button>
        </div>
        <Button type="submit" size="lg" className="h-12 rounded-xl sm:hidden">
          <Search /> {t("search.findIt")}
        </Button>
      </form>

      {/* Row 2: suggestion chips (8 cols) | budget input (4 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {(selectedTags.length > 0 || suggestLoading) && (
            <Card className="h-full space-y-2 p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Sparkles className="size-3.5" /> {t("search.ideasHeading")}
              </p>
              {suggestLoading ? (
                <p className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> {t("search.thinking")}
                </p>
              ) : suggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => useSuggestion(idea)}
                      className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Badge
                        variant="outline"
                        className="cursor-pointer px-3 py-1 text-sm font-normal hover:border-ink"
                      >
                        {t("search.whatAbout", { idea })}
                      </Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-normal text-muted-foreground">
                  {t("search.noIdeas")}
                </p>
              )}
            </Card>
          )}
        </div>
        <div className="lg:col-span-4">
          <Card className="h-full space-y-3 p-4">
            <Label htmlFor="search-budget">{t("search.budgetLabel")}</Label>
            <div className="flex items-center gap-3">
              <Input
                id="search-budget"
                type="number"
                inputMode="numeric"
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                step={BUDGET_STEP}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value) || BUDGET_MIN)}
                className="no-spinner"
              />
              <span className="shrink-0 text-sm font-medium text-sage">€</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent searches — below the suggestion chips */}
      {recentSearches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Clock className="size-3.5" /> {t("search.recentSearches")}
            </p>
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs font-normal text-muted-foreground underline-offset-4 hover:text-ink hover:underline"
            >
              {t("search.clearHistory")}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-1.5 rounded-full border border-line bg-card py-1 pl-3 pr-1.5 text-sm"
              >
                <button
                  type="button"
                  onClick={() => useRecentSearch(entry)}
                  className="flex items-center gap-1.5 font-normal text-ink"
                >
                  <Clock className="size-3.5 text-muted-foreground" />
                  {entry.query}
                </button>
                <button
                  type="button"
                  aria-label={t("search.removeSearchAria")}
                  onClick={() => removeRecentSearch(entry.id)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-ink"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 3: filter panel, full width, collapsible */}
      <Card className="space-y-4 p-4">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex w-full items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-3.5" /> {t("search.filters")}
            {selectedTags.length > 0 && (
              <Badge variant="sage" className="font-normal normal-case">
                {selectedTags.length}
              </Badge>
            )}
          </span>
          <span>{filtersOpen ? t("search.hide") : t("search.show")}</span>
        </button>
        {filtersOpen && (
          <SearchFilters
            gender={profile.gender}
            selected={selectedTags}
            onToggle={toggleTag}
          />
        )}
      </Card>

      {/* Row 4: results, bento grid */}
      {searched ? (
        <div className="space-y-4">
          <p className="text-sm font-normal text-muted-foreground">
            {t("search.liveResults", { query: lastQuery })}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SHOPS.map((shop, i) => (
              <ShopSearchCard
                key={shop.name}
                shop={shop}
                query={lastQuery}
                large={i === 0}
                className={cn(i === 0 && "sm:col-span-2 lg:row-span-2")}
              />
            ))}
          </div>
        </div>
      ) : (
        <SearchIntro name={profile.name} />
      )}
    </div>
  );
}

function SearchIntro({ name }: { name: string | null }) {
  const { t } = useLocale();
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line p-10 text-center">
      <Search className="size-7 text-muted-foreground" />
      <h2 className="text-lg font-semibold">
        {name ? t("search.introTitleNamed", { name }) : t("search.introTitle")}
      </h2>
      <p className="max-w-sm text-sm font-normal text-muted-foreground">
        {t("search.introBody")}
      </p>
    </div>
  );
}
