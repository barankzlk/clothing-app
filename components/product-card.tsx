"use client";

import { useState } from "react";
import { Heart, ExternalLink, Trash2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { clearbitLogo } from "@/lib/shops";
import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type ProductCardData = {
  title: string;
  shop: string;
  price: string;
  url: string;
  image_url: string | null;
  reason: string;
  shop_logo?: string | null;
};

export function ProductCard({
  product,
  mode,
  favorited = false,
  pending = false,
  onToggleFavorite,
  onRemove,
}: {
  product: ProductCardData;
  mode: "search" | "favorites";
  favorited?: boolean;
  pending?: boolean;
  onToggleFavorite?: () => void;
  onRemove?: () => void;
}) {
  const { t } = useLocale();
  const [imgFailed, setImgFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const showImage = Boolean(product.image_url) && !imgFailed;
  // Fall back to the shop logo (Clearbit) — prefer one supplied by the API,
  // else derive it from the shop name so a card is never empty.
  const logoUrl = product.shop_logo || clearbitLogo(product.shop);
  const showLogo = !showImage && Boolean(logoUrl) && !logoFailed;

  return (
    <Card className="flex animate-fade-in flex-col overflow-hidden">
      <div className="relative h-[200px] w-full overflow-hidden border-b border-line bg-[#F5F5F5] sm:h-60">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url!}
            alt={product.title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : showLogo ? (
          <div className="flex h-full w-full items-center justify-center bg-[#F5F5F5] p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={product.shop}
              className="max-h-16 max-w-[65%] object-contain"
              loading="lazy"
              onError={() => setLogoFailed(true)}
            />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#F5F5F5] text-center text-muted-foreground">
            <span className="text-sm font-medium text-ink">{product.shop}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {product.shop}
        </span>
        <h3 className="text-sm font-medium leading-snug text-ink">
          {product.title}
        </h3>
        {product.price && (
          <p className="text-base font-semibold text-ink">{product.price}</p>
        )}
        {product.reason && (
          <p className="text-sm font-light italic text-muted-foreground">
            {product.reason}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row sm:items-center">
          {mode === "search" ? (
            <Button
              variant={favorited ? "sage" : "outline"}
              size="sm"
              className="min-h-11 w-full sm:flex-1"
              onClick={onToggleFavorite}
              disabled={pending}
              aria-pressed={favorited}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Heart
                  className={cn("size-4", favorited && "fill-current")}
                />
              )}
              {favorited ? t("productCard.saved") : t("productCard.save")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 w-full sm:flex-1"
              onClick={onRemove}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {t("productCard.remove")}
            </Button>
          )}

          <Button variant="default" size="sm" className="min-h-11 w-full sm:flex-1" asChild>
            <a href={product.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> {t("productCard.view")}
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Skeleton placeholder matching the ProductCard footprint. */
export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-[200px] w-full animate-skeleton-pulse border-b border-line bg-muted sm:h-60" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-16 animate-skeleton-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-skeleton-pulse rounded bg-muted" />
        <div className="h-5 w-20 animate-skeleton-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-skeleton-pulse rounded bg-muted" />
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <div className="h-11 w-full animate-skeleton-pulse rounded bg-muted sm:flex-1" />
          <div className="h-11 w-full animate-skeleton-pulse rounded bg-muted sm:flex-1" />
        </div>
      </div>
    </Card>
  );
}
