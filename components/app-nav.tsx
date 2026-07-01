"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Heart, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-context";

const NAV_ITEMS = [
  { href: "/search", icon: Search, key: "search" },
  { href: "/favorites", icon: Heart, key: "favorites" },
  { href: "/profile", icon: User, key: "profile" },
] as const;

/** Desktop sidebar nav. Hidden on mobile — see MobileNav for the bottom bar. */
export function AppNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav className={cn("hidden flex-col gap-1 lg:flex", className)}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-ink"
                : "font-normal text-muted-foreground hover:bg-accent/60 hover:text-ink",
            )}
          >
            <Icon className="size-4" />
            {t(`nav.${item.key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
