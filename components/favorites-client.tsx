"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Search } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Favorite } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard } from "@/components/product-card";

type SortKey = "date" | "shop";

export function FavoritesClient({ initial }: { initial: Favorite[] }) {
  const { t } = useLocale();
  const [items, setItems] = useState<Favorite[]>(initial);
  const [sort, setSort] = useState<SortKey>("date");
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const sorted = useMemo(() => {
    const copy = [...items];
    if (sort === "shop") {
      copy.sort((a, b) => (a.shop ?? "").localeCompare(b.shop ?? ""));
    } else {
      copy.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return copy;
  }, [items, sort]);

  async function remove(id: string) {
    if (pending[id]) return;
    setPending((p) => ({ ...p, [id]: true }));
    const supabase = createClient();
    const { error } = await supabase.from("favorites").delete().eq("id", id);
    setPending((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((list) => list.filter((f) => f.id !== id));
    toast.success(t("favorites.removed"));
  }

  const header = (
    <div className="mb-6 flex items-center justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("favorites.title")}</h1>
        <p className="text-sm font-light text-muted-foreground">
          {t("favorites.subtitle")}
        </p>
      </div>
      <Button variant="outline" size="sm" asChild className="min-h-11">
        <Link href="/search">
          <ArrowLeft className="size-4" /> {t("common.search")}
        </Link>
      </Button>
    </div>
  );

  if (items.length === 0) {
    return (
      <>
        {header}
        <EmptyState />
      </>
    );
  }

  return (
    <div className="pb-20 sm:pb-0">
      {header}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-light text-muted-foreground">
            {items.length === 1
              ? t("favorites.countOne")
              : t("favorites.countOther", { n: items.length })}
          </p>
          <div className="flex items-center gap-2">
            <Label htmlFor="sort" className="text-muted-foreground">
              {t("favorites.sortBy")}
            </Label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger id="sort" className="min-h-11 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">{t("favorites.sortDate")}</SelectItem>
                <SelectItem value="shop">{t("favorites.sortShop")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((fav) => (
            <ProductCard
              key={fav.id}
              mode="favorites"
              pending={Boolean(pending[fav.id])}
              onRemove={() => remove(fav.id)}
              product={{
                title: fav.title ?? "Untitled",
                shop: fav.shop ?? "Shop",
                price: fav.price ?? "",
                url: fav.url ?? "#",
                image_url: fav.image_url,
                reason: fav.reason ?? "",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useLocale();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-line p-12 text-center">
      <div
        className="flex size-16 items-center justify-center rounded-full bg-secondary text-3xl"
        aria-hidden
      >
        ♡
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("favorites.emptyTitle")}</h2>
        <p className="text-sm font-light text-muted-foreground">
          {t("favorites.emptySubtitle")}
        </p>
      </div>
      <Button asChild className="min-h-11">
        <Link href="/search">
          <Search className="size-4" /> {t("favorites.startSearching")}
        </Link>
      </Button>
    </div>
  );
}
