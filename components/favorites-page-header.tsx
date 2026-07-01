"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/button";

export function FavoritesPageHeader() {
  const { t } = useLocale();

  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("favoritesPage.heading")}</h1>
        <p className="text-sm font-light text-muted-foreground">
          {t("favoritesPage.subtitle")}
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/search">
          <ArrowLeft className="size-4" /> {t("favoritesPage.search")}
        </Link>
      </Button>
    </div>
  );
}
