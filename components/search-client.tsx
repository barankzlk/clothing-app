"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Heart, Loader2, Menu, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, getInitials } from "@/lib/utils";
import { parsePrice } from "@/lib/price";
import { BUDGET_MAX, BUDGET_MIN } from "@/lib/style-tags";
import type { Profile, SearchProduct } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { MobileNav } from "@/components/mobile-nav";
import { SearchFilters } from "@/components/search-filters";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";

type SortMode = "relevance" | "price_asc" | "price_desc";

const STATUS_KEYS = ["search.status1", "search.status2", "search.status3"] as const;
const SORT_MODES: readonly SortMode[] = ["relevance", "price_asc", "price_desc"];

export function SearchClient({
  profile,
  userId,
  initialFavorites,
}: {
  profile: Profile;
  userId: string;
  initialFavorites: { id: string; url: string | null }[];
}) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState<number>(profile.budget_max_eur ?? 150);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [searched, setSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  // url -> favorite row id (present = saved)
  const [favMap, setFavMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const f of initialFavorites) if (f.url) m[f.url] = f.id;
    return m;
  });
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const statusTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cycle the status text every 1.5s while loading.
  useEffect(() => {
    if (loading) {
      setStatusIdx(0);
      statusTimer.current = setInterval(() => {
        setStatusIdx((i) => (i + 1) % STATUS_KEYS.length);
      }, 1500);
    } else if (statusTimer.current) {
      clearInterval(statusTimer.current);
      statusTimer.current = null;
    }
    return () => {
      if (statusTimer.current) clearInterval(statusTimer.current);
    };
  }, [loading]);

  function toggleFilter(tag: string) {
    setActiveFilters((f) => (f.includes(tag) ? f.filter((x) => x !== tag) : [...f, tag]));
  }

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      toast.error(t("search.typeSomething"));
      return;
    }
    setLoading(true);
    setSearched(true);
    setResults([]);
    setLastQuery(q);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          userProfile: profile,
          budgetMax: budget,
          activeFilters,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || t("search.searchFailed"));
        return;
      }
      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) {
        toast.message(t("search.noMatchesToast"));
        if (data.debug) {
          // Open the browser console to see exactly why: stop reason, how
          // many web searches actually ran, any search errors, and a
          // preview of what the model wrote.
          // eslint-disable-next-line no-console
          console.error("[search debug]", data.debug);
        }
      }
    } catch {
      toast.error(t("search.networkError"));
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite(product: SearchProduct) {
    const url = product.url;
    if (pending[url]) return;
    setPending((p) => ({ ...p, [url]: true }));
    const supabase = createClient();

    try {
      const existingId = favMap[url];
      if (existingId) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("id", existingId);
        if (error) throw error;
        setFavMap((m) => {
          const next = { ...m };
          delete next[url];
          return next;
        });
        toast.success(t("favorites.removed"));
      } else {
        const { data, error } = await supabase
          .from("favorites")
          .insert({
            user_id: userId,
            title: product.title,
            price: product.price,
            shop: product.shop,
            url: product.url,
            image_url: product.image_url,
            reason: product.reason,
            search_query: lastQuery,
          })
          .select("id")
          .single();
        if (error) throw error;
        setFavMap((m) => ({ ...m, [url]: data!.id }));
        toast.success(t("productCard.savedToast"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("productCard.favoriteError"));
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[url];
        return next;
      });
    }
  }

  const sortedResults = useMemo(() => {
    if (sortMode === "relevance") return results;
    const copy = [...results];
    copy.sort((a, b) => {
      const pa = parsePrice(a.price);
      const pb = parsePrice(b.price);
      if (pa === null && pb === null) return 0;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return sortMode === "price_asc" ? pa - pb : pb - pa;
    });
    return copy;
  }, [results, sortMode]);

  const sidebarContent = (
    <div className="space-y-6">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-medium text-canvas">
          {getInitials(profile.name || profile.email)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {profile.name || t("profile.title")}
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
            <span>{t("search.quickStatsTop", { size: profile.clothing_size_top })}</span>
          )}
          {profile.clothing_size_bottom && (
            <span>{t("search.quickStatsBottom", { size: profile.clothing_size_bottom })}</span>
          )}
          {profile.shoe_size_eu && (
            <span>{t("search.quickStatsShoe", { size: profile.shoe_size_eu })}</span>
          )}
        </div>
        <div className="flex flex-col gap-1 pt-1 text-sm">
          <Link
            href="/profile"
            className="font-light text-ink underline-offset-4 hover:underline"
          >
            {t("search.editProfile")}
          </Link>
          <Link
            href="/favorites"
            className="inline-flex items-center gap-1.5 font-light text-ink underline-offset-4 hover:underline"
          >
            <Heart className="size-3.5" /> {t("search.myFavorites")}
          </Link>
        </div>
      </div>

      {/* Budget for this search */}
      <div className="space-y-2 rounded-lg border border-line bg-card p-4">
        <Label htmlFor="budget">{t("search.budgetLabel")}</Label>
        <Input
          id="budget"
          type="number"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={10}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value) || 0)}
          className="no-spinner min-h-11"
        />
      </div>
    </div>
  );

  return (
    <div className="pb-24 sm:pb-0">
      <header className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex size-11 items-center justify-center rounded-md text-ink lg:hidden"
            aria-label={t("common.menu")}
          >
            <Menu className="size-5" />
          </button>
          <Brand />
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <SignOutButton className="hidden sm:inline-flex" />
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs animate-fade-in overflow-y-auto bg-canvas p-6">
            <div className="mb-6 flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-ink"
                aria-label={t("common.close")}
              >
                <X className="size-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Desktop sidebar */}
        <aside className="hidden w-full shrink-0 lg:block lg:w-[280px]">
          <div className="lg:sticky lg:top-6">{sidebarContent}</div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 space-y-6">
          <form onSubmit={runSearch} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search.placeholder")}
                className="h-12 min-h-11 pl-9 text-base"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 min-h-11 px-8" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Search />}
              {t("search.findIt")}
            </Button>
          </form>

          <SearchFilters
            active={activeFilters}
            onToggle={toggleFilter}
            onClear={() => setActiveFilters([])}
          />

          {loading && (
            <div className="space-y-4">
              <p
                key={statusIdx}
                className="animate-fade-in text-sm font-light text-muted-foreground"
              >
                {t(STATUS_KEYS[statusIdx])}
              </p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2, 3].map((i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            </div>
          )}

          {!loading && searched && (
            <div className="space-y-4">
              {results.length > 0 ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-muted-foreground">
                      {t("search.sortBy")}:
                    </span>
                    {SORT_MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSortMode(mode)}
                        className={cn(
                          "min-h-9 rounded-md border px-3 py-1 font-light transition-colors",
                          sortMode === mode
                            ? "border-ink bg-ink text-canvas"
                            : "border-line bg-card text-ink hover:border-ink",
                        )}
                      >
                        {mode === "relevance"
                          ? t("search.sortRelevance")
                          : mode === "price_asc"
                            ? t("search.sortPriceAsc")
                            : t("search.sortPriceDesc")}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {sortedResults.map((product) => (
                      <ProductCard
                        key={product.url}
                        product={product}
                        mode="search"
                        favorited={Boolean(favMap[product.url])}
                        pending={Boolean(pending[product.url])}
                        onToggleFavorite={() => toggleFavorite(product)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyResults />
              )}
            </div>
          )}

          {!loading && !searched && <SearchIntro name={profile.name} />}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}

function SearchIntro({ name }: { name: string | null }) {
  const { t } = useLocale();
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line p-10 text-center">
      <Search className="size-7 text-muted-foreground" />
      <h2 className="text-lg font-semibold">
        {name ? t("search.introTitleNamed", { name }) : t("search.introTitle")}
      </h2>
      <p className="max-w-sm text-sm font-light text-muted-foreground">
        {t("search.introSubtitle")}
      </p>
    </div>
  );
}

function EmptyResults() {
  const { t } = useLocale();
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line p-10 text-center">
      <p className="text-sm font-medium">{t("search.emptyTitle")}</p>
      <p className="max-w-sm text-sm font-light text-muted-foreground">
        {t("search.emptySubtitle")}
      </p>
    </div>
  );
}
