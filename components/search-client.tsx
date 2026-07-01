"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  Loader2,
  Clock,
  Store,
  X,
} from "lucide-react";

import type { Profile, SavedSearch, SearchProduct } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-context";
import { FEMALE_SHOPS, MALE_SHOPS } from "@/lib/shops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SearchFilters } from "@/components/search-filters";
import { ProductSwipeDeck } from "@/components/product-swipe-deck";

const SUGGESTION_DEBOUNCE_MS = 600;
const TYPEAHEAD_DEBOUNCE_MS = 450;
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
  const [searching, setSearching] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [searchNonce, setSearchNonce] = useState(0);
  const [results, setResults] = useState<SearchProduct[]>([]);

  const maxShops =
    profile.gender === "male" ? MALE_SHOPS.length : FEMALE_SHOPS.length;
  const [shopLimit, setShopLimit] = useState(maxShops);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [typeaheadOpen, setTypeaheadOpen] = useState(false);
  const [typeaheadResults, setTypeaheadResults] = useState<string[]>([]);

  const [recentSearches, setRecentSearches] =
    useState<SavedSearch[]>(initialSavedSearches);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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

  // Live recommendations as the user types in the search bar (debounced).
  useEffect(() => {
    if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setTypeaheadResults([]);
      return;
    }

    typeaheadTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, gender: profile.gender, locale }),
        });
        const data = await res.json();
        setTypeaheadResults(
          Array.isArray(data?.suggestions) ? data.suggestions : [],
        );
      } catch {
        setTypeaheadResults([]);
      }
    }, TYPEAHEAD_DEBOUNCE_MS);

    return () => {
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
    };
  }, [query, profile.gender, locale]);

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

  async function execute(q: string, filters: string[]) {
    setQuery(q);
    setSelectedTags(filters);
    setLastQuery(q);
    setSearched(true);
    setTypeaheadOpen(false);
    searchInputRef.current?.blur();
    void saveSearch(q, filters);

    setSearching(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          gender: profile.gender,
          filters,
          budgetMax: profile.budget_max_eur,
          shopLimit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Search failed");
      setResults(Array.isArray(data?.results) ? data.results : []);
      setSearchNonce((n) => n + 1);
    } catch {
      toast.error(t("search.searchFailed"));
      setResults([]);
    } finally {
      setSearching(false);
    }
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
      {/* Row 1: search bar, full width, with live typeahead recommendations */}
      <form onSubmit={runSearch} className="flex flex-col gap-3 sm:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setTypeaheadOpen(true)}
            onBlur={() => setTypeaheadOpen(false)}
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

          {typeaheadOpen && typeaheadResults.length > 0 && (
            <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
              {typeaheadResults.map((item) => (
                <button
                  key={item}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execute(item, selectedTags);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-normal text-ink hover:bg-accent"
                >
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button type="submit" size="lg" className="h-12 rounded-xl sm:hidden">
          <Search /> {t("search.findIt")}
        </Button>
      </form>

      {/* Row 1b: how many shops to search — mainly a cost/testing control */}
      <Card className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Store className="size-3.5" /> {t("search.shopLimitLabel")}
          </Label>
          <span className="text-sm font-medium text-ink">
            {t("search.shopLimitValue", { count: shopLimit, total: maxShops })}
          </span>
        </div>
        <Slider
          min={1}
          max={maxShops}
          step={1}
          value={[shopLimit]}
          onValueChange={([v]) => setShopLimit(v ?? maxShops)}
        />
      </Card>

      {/* Row 2: filter-driven idea suggestions */}
      {(selectedTags.length > 0 || suggestLoading) && (
        <Card className="space-y-2 p-4">
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

      {/* Row 4: swipe/skip product deck */}
      {searched ? (
        <div className="space-y-4">
          {searching ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <p className="text-sm font-normal">{t("search.searching")}</p>
            </div>
          ) : (
            <>
              <p className="text-center text-sm font-normal text-muted-foreground">
                {t("search.liveResults", { query: lastQuery, total: results.length })}
              </p>
              <ProductSwipeDeck
                key={searchNonce}
                products={results}
                query={lastQuery}
                userId={userId}
              />
            </>
          )}
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
