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

/** Fixed bottom bar on mobile. Hidden on desktop — see AppNav for the sidebar. */
export function MobileNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-3 py-2 text-ink"
          >
            <Icon className="size-5" />
            <span className="text-[10px] font-normal text-muted-foreground">
              {t(`nav.${item.key}`)}
            </span>
            <span
              aria-hidden
              className={cn(
                "mt-0.5 size-1 rounded-full",
                active ? "bg-sage" : "bg-transparent",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
