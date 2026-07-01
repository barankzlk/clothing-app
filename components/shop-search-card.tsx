"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Shop } from "@/lib/shops";
import { useLocale } from "@/lib/i18n/locale-context";

export function ShopSearchCard({ shop, query }: { shop: Shop; query: string }) {
  const { t } = useLocale();
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = `https://logo.clearbit.com/${shop.domain}`;

  return (
    <Card className="flex animate-fade-in flex-col items-center gap-3 p-6 text-center">
      <div className="flex size-14 items-center justify-center overflow-hidden rounded-full border border-line bg-secondary">
        {!logoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={shop.name}
            className="h-full w-full object-contain p-2"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="text-sm font-medium text-muted-foreground">
            {shop.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{shop.name}</h3>
        <p className="text-xs font-light text-muted-foreground">
          {t("shopCard.resultsFor", { query })}
        </p>
      </div>
      <Button variant="default" size="sm" className="w-full" asChild>
        <a href={shop.searchUrl(query)} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-4" /> {t("shopCard.search")}
        </a>
      </Button>
    </Card>
  );
}
