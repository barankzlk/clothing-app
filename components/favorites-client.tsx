"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Favorite } from "@/lib/types";
import { useLocale } from "@/lib/i18n/locale-context";
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
    toast.success(t("favoritesClient.removed"));
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-normal text-muted-foreground">
          {t(
            items.length === 1
              ? "favoritesClient.count"
              : "favoritesClient.countPlural",
            { count: items.length },
          )}
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor="sort" className="text-muted-foreground">
            {t("favoritesClient.sortBy")}
          </Label>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger id="sort" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">{t("favoritesClient.sortDate")}</SelectItem>
              <SelectItem value="shop">{t("favoritesClient.sortShop")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((fav) => (
          <ProductCard
            key={fav.id}
            pending={Boolean(pending[fav.id])}
            onRemove={() => remove(fav.id)}
            product={{
              title: fav.title ?? t("productCard.untitled"),
              shop: fav.shop ?? t("productCard.shopFallback"),
              price: fav.price ?? "",
              url: fav.url ?? "#",
              image_url: fav.image_url,
              rating: fav.rating,
              reason: fav.reason ?? "",
            }}
          />
        ))}
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
        <h2 className="text-lg font-semibold">{t("favoritesClient.emptyTitle")}</h2>
        <p className="text-sm font-normal text-muted-foreground">
          {t("favoritesClient.emptyBody")}
        </p>
      </div>
      <Button asChild>
        <Link href="/search">
          <Search className="size-4" /> {t("favoritesClient.startSearching")}
        </Link>
      </Button>
    </div>
  );
}
