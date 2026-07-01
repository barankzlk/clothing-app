"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Shop } from "@/lib/shops";
import { useLocale } from "@/lib/i18n/locale-context";

export function ShopSearchCard({
  shop,
  query,
  large = false,
  className,
}: {
  shop: Shop;
  query: string;
  large?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = `https://logo.clearbit.com/${shop.domain}`;

  return (
    <Card
      className={cn(
        "flex animate-fade-in flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-t-lg bg-secondary",
          large ? "h-32" : "h-20",
        )}
      >
        {!logoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={shop.name}
            className={cn("object-contain", large ? "h-16 w-32" : "h-10 w-20")}
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="text-lg font-medium text-muted-foreground">
            {shop.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {shop.name}
        </h3>
        <p
          className={cn(
            "font-normal text-ink",
            large ? "text-base" : "text-sm",
          )}
        >
          {t("shopCard.resultsFor", { query })}
        </p>
        <Button variant="default" size="sm" className="mt-auto w-full" asChild>
          <a href={shop.searchUrl(query)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" /> {t("shopCard.search")}
          </a>
        </Button>
      </div>
    </Card>
  );
}
