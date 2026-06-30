"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Heart, SlidersHorizontal, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn, getInitials, humanizeTag } from "@/lib/utils";
import {
  BUDGET_MAX,
  BUDGET_MIN,
  OCCASION_OPTIONS,
} from "@/lib/style-tags";
import type { Profile, SearchProduct } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product-card";

const STATUS_MESSAGES = [
  "Searching Zalando, ASOS, H&M…",
  "Filtering by your size and style…",
  "Finding the best matches…",
];

export function SearchClient({
  profile,
  userId,
  initialFavorites,
}: {
  profile: Profile;
  userId: string;
  initialFavorites: { id: string; url: string | null }[];
}) {
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState<number>(profile.budget_max_eur ?? 150);
  const [occasion, setOccasion] = useState("any");

  const [loading, setLoading] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [summary, setSummary] = useState("");
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
        setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length);
      }, 1500);
    } else if (statusTimer.current) {
      clearInterval(statusTimer.current);
      statusTimer.current = null;
    }
    return () => {
      if (statusTimer.current) clearInterval(statusTimer.current);
    };
  }, [loading]);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      toast.error("Type something to search for.");
      return;
    }
    setLoading(true);
    setSearched(true);
    setResults([]);
    setSummary("");
    setLastQuery(q);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          budgetMax: budget,
          occasionFilter: occasion,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Search failed. Please try again.");
        return;
      }
      setResults(data.results ?? []);
      setSummary(data.search_summary ?? "");
      if ((data.results ?? []).length === 0) {
        toast.message(data.search_summary || "No matches found. Try rephrasing.");
      }
    } catch {
      toast.error("Network error. Please try again.");
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
        toast.success("Removed from favorites.");
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
        toast.success("Saved to favorites.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't update favorites.",
      );
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[url];
        return next;
      });
    }
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
            </div>
            {profile.style_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.style_tags.slice(0, 6).map((tag) => (
                  <Badge key={tag} variant="sage" className="font-light">
                    {humanizeTag(tag)}
                  </Badge>
                ))}
                {profile.style_tags.length > 6 && (
                  <Badge variant="outline" className="font-light">
                    +{profile.style_tags.length - 6}
                  </Badge>
                )}
              </div>
            )}
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

          {/* Search controls */}
          <div className="space-y-4 rounded-lg border border-line bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <SlidersHorizontal className="size-3.5" /> This search
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget per item (€)</Label>
              <Input
                id="budget"
                type="number"
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                step={10}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Occasion</Label>
              <Select value={occasion} onValueChange={setOccasion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OCCASION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          <Button type="submit" size="lg" className="h-12 px-8" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
            Find it
          </Button>
        </form>

        {loading && (
          <div className="space-y-4">
            <p
              key={statusIdx}
              className="animate-fade-in text-sm font-light text-muted-foreground"
            >
              {STATUS_MESSAGES[statusIdx]}
            </p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {!loading && searched && (
          <div className="space-y-4">
            {summary && (
              <p className="text-sm font-light text-muted-foreground">
                {summary}
              </p>
            )}
            {results.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {results.map((product) => (
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
            ) : (
              <EmptyResults />
            )}
          </div>
        )}

        {!loading && !searched && <SearchIntro name={profile.name} />}
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
        Describe a piece in your own words. We&apos;ll search real shops and
        filter to your size, style, and budget.
      </p>
    </div>
  );
}

function EmptyResults() {
  return (
    <div
      className={cn(
        "flex min-h-[30vh] flex-col items-center justify-center gap-2",
        "rounded-lg border border-dashed border-line p-10 text-center",
      )}
    >
      <p className="text-sm font-medium">No matches this time</p>
      <p className="max-w-sm text-sm font-light text-muted-foreground">
        Try rephrasing, widening your budget, or removing the occasion filter.
      </p>
    </div>
  );
}
