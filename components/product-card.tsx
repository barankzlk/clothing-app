"use client";

import { useState } from "react";
import { ExternalLink, Trash2, ImageOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/locale-context";

export type ProductCardData = {
  title: string;
  shop: string;
  price: string;
  url: string;
  image_url: string | null;
  reason: string;
};

export function ProductCard({
  product,
  pending = false,
  onRemove,
}: {
  product: ProductCardData;
  pending?: boolean;
  onRemove?: () => void;
}) {
  const { t } = useLocale();
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = product.image_url && !imgFailed;

  return (
    <Card className="flex animate-fade-in flex-col overflow-hidden">
      <div className="relative h-60 w-full overflow-hidden border-b border-line bg-secondary">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url!}
            alt={product.title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-6" />
            <span className="text-xs font-light">{t("productCard.noPreview")}</span>
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

        <div className="mt-auto flex items-center gap-2 pt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
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

          <Button variant="default" size="sm" className="flex-1" asChild>
            <a href={product.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> {t("productCard.view")}
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );
}
