"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Heart, User } from "lucide-react";

import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/search", icon: Search, key: "nav.search" },
  { href: "/favorites", icon: Heart, key: "nav.favorites" },
  { href: "/profile", icon: User, key: "nav.profile" },
] as const;

/** Fixed bottom navigation, mobile only. */
export function MobileNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-card/95 py-1 backdrop-blur sm:hidden"
      aria-label={t("nav.search")}
    >
      {ITEMS.map(({ href, icon: Icon, key }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-md px-3 py-1 text-[11px] font-medium",
              active ? "text-ink" : "text-muted-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-5" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
