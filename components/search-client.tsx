"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Heart, SlidersHorizontal, Sparkles, Loader2 } from "lucide-react";

import { getInitials } from "@/lib/utils";
import { SHOPS } from "@/lib/shops";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchFilters } from "@/components/search-filters";
import { ShopSearchCard } from "@/components/shop-search-card";

const SUGGESTION_DEBOUNCE_MS = 600;

export function SearchClient({ profile }: { profile: Profile }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

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
          body: JSON.stringify({ tags: selectedTags, gender: profile.gender }),
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
  }, [selectedTags, profile.gender]);

  function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      toast.error("Type something to search for.");
      return;
    }
    setLastQuery(q);
    setSearched(true);
  }

  function useSuggestion(idea: string) {
    setQuery(idea);
    setLastQuery(idea);
    setSearched(true);
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full shrink-0 lg:w-[280px]">
        <div className="space-y-6 lg:sticky lg:top-6">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-medium text-canvas">
              {getInitials(profile.name || profile.email)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {profile.name || "Your profile"}
              </p>
              <p className="truncate text-xs font-light text-muted-foreground">
                {profile.email}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="space-y-3 rounded-lg border border-line bg-card p-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-light text-muted-foreground">
              {profile.clothing_size_top && (
                <span>Top {profile.clothing_size_top}</span>
              )}
              {profile.clothing_size_bottom && (
                <span>Bottom {profile.clothing_size_bottom}</span>
              )}
              {profile.shoe_size_eu && <span>Shoe EU {profile.shoe_size_eu}</span>}
              {profile.budget_max_eur && <span>Budget €{profile.budget_max_eur}</span>}
            </div>
            <div className="flex flex-col gap-1 pt-1 text-sm">
              <Link
                href="/profile"
                className="font-light text-ink underline-offset-4 hover:underline"
              >
                Edit profile
              </Link>
              <Link
                href="/favorites"
                className="inline-flex items-center gap-1.5 font-light text-ink underline-offset-4 hover:underline"
              >
                <Heart className="size-3.5" /> My favorites
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4 rounded-lg border border-line bg-card p-4">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="flex w-full items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5" /> Filters
                {selectedTags.length > 0 && (
                  <Badge variant="sage" className="font-light normal-case">
                    {selectedTags.length}
                  </Badge>
                )}
              </span>
              <span>{filtersOpen ? "Hide" : "Show"}</span>
            </button>
            {filtersOpen && (
              <SearchFilters selected={selectedTags} onToggle={toggleTag} />
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 space-y-6">
        <form onSubmit={runSearch} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for anything… e.g. 'linen summer dress' or 'cozy winter coat'"
              className="h-12 pl-9 text-base"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-8">
            <Search /> Find it
          </Button>
        </form>

        {(selectedTags.length > 0 || suggestLoading) && (
          <div className="space-y-2 rounded-lg border border-dashed border-line p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="size-3.5" /> Not sure what to search for?
            </p>
            {suggestLoading ? (
              <p className="flex items-center gap-2 text-sm font-light text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Thinking of ideas…
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
                      className="cursor-pointer px-3 py-1 text-sm font-light hover:border-ink"
                    >
                      What about a {idea}?
                    </Badge>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm font-light text-muted-foreground">
                No ideas yet — try picking a filter above.
              </p>
            )}
          </div>
        )}

        {searched ? (
          <div className="space-y-4">
            <p className="text-sm font-light text-muted-foreground">
              Live search results for &ldquo;{lastQuery}&rdquo; — each link opens
              that shop&apos;s own search, so what you see is always in stock.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {SHOPS.map((shop) => (
                <ShopSearchCard key={shop.name} shop={shop} query={lastQuery} />
              ))}
            </div>
          </div>
        ) : (
          <SearchIntro name={profile.name} />
        )}
      </main>
    </div>
  );
}

function SearchIntro({ name }: { name: string | null }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line p-10 text-center">
      <Search className="size-7 text-muted-foreground" />
      <h2 className="text-lg font-semibold">
        {name ? `What are you after, ${name}?` : "What are you after?"}
      </h2>
      <p className="max-w-sm text-sm font-light text-muted-foreground">
        Describe a piece in your own words, or pick a filter for ideas. We&apos;ll
        take you straight to that search on every shop we cover.
      </p>
    </div>
  );
}
