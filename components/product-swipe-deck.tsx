"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Heart,
  Star,
  Undo2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { SearchProduct } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SWIPE_THRESHOLD = 100;
const EXIT_DURATION_MS = 300;

/**
 * One-card-at-a-time swipe/skip deck over real Google Shopping results. Give
 * this component a fresh `key` from the parent (e.g. a per-search counter)
 * so re-running the same query text still starts the deck over from card one.
 */
export function ProductSwipeDeck({
  products,
  query,
  userId,
}: {
  products: SearchProduct[];
  query: string;
  userId: string;
}) {
  const { t } = useLocale();
  const [index, setIndex] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Per-card decision history — lets "back" undo a skip/save instead of the
  // card being gone for good, and lets us delete a favorite if the user
  // backs up to a saved card and skips it instead.
  const [decisions, setDecisions] = useState<Array<"left" | "right" | null>>(() =>
    products.map(() => null),
  );
  const [favoriteIds, setFavoriteIds] = useState<Array<string | null>>(() =>
    products.map(() => null),
  );
  // Full-resolution image fetched lazily per card — SerpAPI's shopping
  // thumbnail is a small compressed proxy, too blurry at full-card size.
  const [hiResImages, setHiResImages] = useState<Record<number, string>>({});
  const fetchedForIndex = useRef<Set<number>>(new Set());

  const dragStartX = useRef<number | null>(null);

  const total = products.length;
  const product = products[index];
  const done = total > 0 && !product;

  async function saveToFavorites(p: SearchProduct, savedIndex: number) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("favorites")
      .insert({
        user_id: userId,
        title: p.title,
        shop: p.shop,
        url: p.url,
        price: p.price,
        image_url: hiResImages[savedIndex] ?? p.image_url,
        rating: p.rating != null ? String(p.rating) : null,
        reason: null,
        search_query: query,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Failed to save favorite:", error?.message);
      toast.error(t("swipe.saveFailed"));
      // The count was incremented optimistically in advance() — undo that
      // and clear the decision so a later "back" doesn't try to delete a
      // favorite that was never actually created.
      setSavedCount((c) => Math.max(0, c - 1));
      setDecisions((d) => {
        const next = [...d];
        next[savedIndex] = null;
        return next;
      });
      return;
    }
    setFavoriteIds((ids) => {
      const next = [...ids];
      next[savedIndex] = data.id;
      return next;
    });
  }

  function advance(direction: "left" | "right") {
    if (exitDirection || !product) return;
    setExitDirection(direction);
    setDecisions((d) => {
      const next = [...d];
      next[index] = direction;
      return next;
    });
    if (direction === "right") {
      setSavedCount((c) => c + 1);
      void saveToFavorites(product, index);
    }
    setTimeout(() => {
      setIndex((i) => i + 1);
      setExitDirection(null);
      setDragX(0);
    }, EXIT_DURATION_MS);
  }

  function goBack() {
    if (index === 0 || exitDirection) return;
    const prevIndex = index - 1;
    if (decisions[prevIndex] === "right") {
      setSavedCount((c) => Math.max(0, c - 1));
      const favoriteId = favoriteIds[prevIndex];
      if (favoriteId) {
        const supabase = createClient();
        void supabase.from("favorites").delete().eq("id", favoriteId);
      }
    }
    setDecisions((d) => {
      const next = [...d];
      next[prevIndex] = null;
      return next;
    });
    setFavoriteIds((ids) => {
      const next = [...ids];
      next[prevIndex] = null;
      return next;
    });
    setDragX(0);
    setIndex(prevIndex);
  }

  // Keyboard support (desktop). Ignore arrow keys while typing elsewhere
  // (e.g. the search input just above this deck).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Backspace") {
        e.preventDefault();
        goBack();
        return;
      }
      if (done) return;
      if (e.key === "ArrowLeft") advance("left");
      if (e.key === "ArrowRight") advance("right");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, exitDirection, index, product, query, decisions, favoriteIds]);

  // Lazily upgrade the current card's image to a full-resolution one. The
  // "already fetched" mark is only set on a successful response — in dev,
  // Strict Mode fires this effect twice (mount → cleanup → mount again), and
  // marking it eagerly would let the first (cancelled) attempt block the
  // second, real one from ever completing.
  useEffect(() => {
    if (!product?.product_id || fetchedForIndex.current.has(index)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/product-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.product_id }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (typeof data?.image_url === "string") {
          fetchedForIndex.current.add(index);
          setHiResImages((m) => ({ ...m, [index]: data.image_url }));
        }
      } catch {
        // keep the original thumbnail
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [index, product]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (exitDirection) return;
    dragStartX.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null) return;
    setDragX(e.clientX - dragStartX.current);
  }

  function onPointerUp() {
    if (dragStartX.current === null) return;
    dragStartX.current = null;
    setDragging(false);
    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      advance(dragX > 0 ? "right" : "left");
    } else {
      setDragX(0);
    }
  }

  const backControl = (
    <button
      type="button"
      onClick={goBack}
      disabled={index === 0}
      aria-label={t("swipe.back")}
      className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-30"
    >
      <Undo2 className="size-3.5" /> {t("swipe.back")}
    </button>
  );

  if (total === 0) {
    return (
      <Card className="mx-auto max-w-[480px] space-y-2 p-8 text-center">
        <p className="text-sm font-normal text-muted-foreground">
          {t("swipe.noResults")}
        </p>
      </Card>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[480px] space-y-3">
        {index > 0 && <div className="flex justify-center">{backControl}</div>}
        <Card className="space-y-4 p-8 text-center">
          <p className="text-lg font-semibold text-ink">
            {t(savedCount === 1 ? "swipe.summaryTitleOne" : "swipe.summaryTitle", {
              count: savedCount,
            })}
          </p>
          <Button asChild>
            <a href="/favorites">
              <Heart className="size-4" /> {t("swipe.goToFavorites")}
            </a>
          </Button>
        </Card>
      </div>
    );
  }

  const displayImage = hiResImages[index] ?? product.image_url;
  const translateX =
    exitDirection === "left" ? -600 : exitDirection === "right" ? 600 : dragX;
  const rotate = translateX / 20;
  const opacity = exitDirection ? 0 : 1 - Math.min(Math.abs(dragX) / 400, 0.6);

  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-3">
      <div className="flex w-full items-center justify-center gap-3">
        {backControl}
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("swipe.progress", { current: index + 1, total })}
        </p>
      </div>

      <div className="flex w-full items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => advance("left")}
          aria-label={t("swipe.skip")}
          className="hidden size-12 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink transition-colors hover:bg-accent sm:flex"
        >
          <ArrowLeft className="size-5" />
        </button>

        <Card
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn(
            "w-full max-w-[480px] touch-pan-y select-none space-y-3.5 p-5 text-center",
            !dragging && "transition-transform duration-300 ease-out",
          )}
          style={{
            transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
            opacity,
          }}
        >
          <div className="w-full overflow-hidden rounded-lg bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={displayImage}
              src={displayImage}
              alt={product.title}
              className="mx-auto max-h-[540px] w-full object-contain"
            />
          </div>

          <div className="space-y-1.5">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {product.shop}
              </p>
              <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink">
                {product.title}
              </h3>
            </div>

            <div className="flex items-center justify-center gap-3">
              {product.price && (
                <p className="text-xl font-bold text-ink">{product.price}</p>
              )}
              {product.rating != null && (
                <p className="flex items-center gap-1 text-xs font-medium text-sage">
                  <Star className="size-3 fill-current" />
                  {product.rating.toFixed(1)}
                  {product.reviews != null && (
                    <span className="opacity-70">({product.reviews})</span>
                  )}
                </p>
              )}
            </div>
          </div>

          <Button variant="outline" size="sm" asChild className="w-full">
            <a href={product.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" /> {t("swipe.viewProduct")}
            </a>
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => advance("left")}
            >
              <X className="size-4" />
              {t("swipe.skip")}
            </Button>
            <Button size="lg" className="flex-1" onClick={() => advance("right")}>
              <Heart className="size-4" />
              {t("swipe.save")}
            </Button>
          </div>
        </Card>

        <button
          type="button"
          onClick={() => advance("right")}
          aria-label={t("swipe.save")}
          className="hidden size-12 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink transition-colors hover:bg-accent sm:flex"
        >
          <ArrowRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
