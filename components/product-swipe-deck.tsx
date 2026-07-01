"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Heart, Star, X } from "lucide-react";

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

  const dragStartX = useRef<number | null>(null);

  const total = products.length;
  const product = products[index];
  const done = total > 0 && !product;

  async function saveToFavorites(p: SearchProduct) {
    const supabase = createClient();
    await supabase.from("favorites").insert({
      user_id: userId,
      title: p.title,
      shop: p.shop,
      url: p.url,
      price: p.price,
      image_url: p.image_url,
      rating: p.rating != null ? String(p.rating) : null,
      reason: null,
      search_query: query,
    });
  }

  function advance(direction: "left" | "right") {
    if (exitDirection || !product) return;
    setExitDirection(direction);
    if (direction === "right") {
      setSavedCount((c) => c + 1);
      void saveToFavorites(product);
    }
    setTimeout(() => {
      setIndex((i) => i + 1);
      setExitDirection(null);
      setDragX(0);
    }, EXIT_DURATION_MS);
  }

  // Keyboard support (desktop). Ignore arrow keys while typing elsewhere
  // (e.g. the search input just above this deck).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (done) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") advance("left");
      if (e.key === "ArrowRight") advance("right");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, exitDirection, index, product, query]);

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
      <Card className="mx-auto max-w-[480px] space-y-4 p-8 text-center">
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
    );
  }

  const translateX =
    exitDirection === "left" ? -600 : exitDirection === "right" ? 600 : dragX;
  const rotate = translateX / 20;
  const opacity = exitDirection ? 0 : 1 - Math.min(Math.abs(dragX) / 400, 0.6);

  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("swipe.progress", { current: index + 1, total })}
      </p>

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
          <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image_url}
              alt={product.title}
              className="h-full w-full object-contain"
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
