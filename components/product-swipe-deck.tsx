"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ExternalLink, Heart, Loader2, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SearchProduct } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SWIPE_THRESHOLD = 100;
const EXIT_DURATION_MS = 300;

/**
 * A browsable carousel over real Google Shopping results — swiping, the
 * arrow keys, and the side buttons only move through the list. Saving to
 * favorites is a separate, explicit action (the "Speichern" toggle) with no
 * side effect on navigation, so browsing back and forth never loses or
 * duplicates anything. Give this component a fresh `key` from the parent
 * (e.g. a per-search counter) so re-running the same query starts over.
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
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Which cards are already saved, keyed by index -> favorites row id.
  const [favoriteIds, setFavoriteIds] = useState<Record<number, string>>({});
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  // Full-resolution image fetched lazily per card — SerpAPI's shopping
  // thumbnail is a small compressed proxy, too blurry at full-card size.
  const [hiResImages, setHiResImages] = useState<Record<number, string>>({});
  const fetchedForIndex = useRef<Set<number>>(new Set());

  const dragStartX = useRef<number | null>(null);

  const total = products.length;
  const product = products[index];
  const isSaved = favoriteIds[index] != null;
  const isSaving = savingIndex === index;

  function goNext() {
    if (exitDirection || index >= total - 1) return;
    setExitDirection("left");
    setTimeout(() => {
      setIndex((i) => i + 1);
      setExitDirection(null);
      setDragX(0);
    }, EXIT_DURATION_MS);
  }

  function goPrev() {
    if (exitDirection || index <= 0) return;
    setExitDirection("right");
    setTimeout(() => {
      setIndex((i) => i - 1);
      setExitDirection(null);
      setDragX(0);
    }, EXIT_DURATION_MS);
  }

  async function toggleSave() {
    if (!product || savingIndex !== null) return;
    setSavingIndex(index);
    const supabase = createClient();
    const existingId = favoriteIds[index];

    try {
      if (existingId) {
        const { error } = await supabase.from("favorites").delete().eq("id", existingId);
        if (error) {
          console.error("Failed to remove favorite:", error.message);
          toast.error(t("swipe.saveFailed"));
        } else {
          setFavoriteIds((ids) => {
            const next = { ...ids };
            delete next[index];
            return next;
          });
        }
      } else {
        const { data, error } = await supabase
          .from("favorites")
          .insert({
            user_id: userId,
            title: product.title,
            shop: product.shop,
            url: product.url,
            price: product.price,
            image_url: hiResImages[index] ?? product.image_url,
            rating: product.rating != null ? String(product.rating) : null,
            reason: null,
            search_query: query,
          })
          .select("id")
          .single();

        if (error || !data) {
          console.error("Failed to save favorite:", error?.message);
          toast.error(t("swipe.saveFailed"));
        } else {
          setFavoriteIds((ids) => ({ ...ids, [index]: data.id }));
        }
      }
    } catch (err) {
      console.error("Favorite toggle threw:", err instanceof Error ? err.message : err);
      toast.error(t("swipe.saveFailed"));
    } finally {
      setSavingIndex(null);
    }
  }

  // Keyboard support (desktop): pure navigation, no side effects. Ignore
  // arrow keys while typing elsewhere (e.g. the search input above the deck).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") goNext();
      if (e.key === "ArrowRight") goPrev();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total, exitDirection]);

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
      if (dragX < 0) goNext();
      else goPrev();
    }
    setDragX(0);
  }

  if (total === 0) {
    return (
      <Card className="mx-auto max-w-[480px] space-y-2 p-8 text-center">
        <p className="text-sm font-normal text-muted-foreground">
          {t("swipe.noResults")}
        </p>
      </Card>
    );
  }

  const displayImage = hiResImages[index] ?? product.image_url;
  const translateX =
    exitDirection === "left" ? -600 : exitDirection === "right" ? 600 : dragX;
  const rotate = translateX / 20;
  const opacity = exitDirection ? 0 : 1 - Math.min(Math.abs(dragX) / 400, 0.6);

  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("swipe.progress", { current: index + 1, total })}
      </p>

      <div className="flex w-full items-center justify-center gap-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          aria-label={t("swipe.previous")}
          className="hidden size-12 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-30 sm:flex"
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

          <Button
            variant={isSaved ? "default" : "outline"}
            size="lg"
            className="w-full"
            onClick={toggleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Heart className={cn("size-4", isSaved && "fill-current")} />
            )}
            {t(isSaved ? "swipe.saved" : "swipe.save")}
          </Button>
        </Card>

        <button
          type="button"
          onClick={goNext}
          disabled={index === total - 1}
          aria-label={t("swipe.next")}
          className="hidden size-12 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-30 sm:flex"
        >
          <ArrowRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
