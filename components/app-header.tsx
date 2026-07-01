"use client";

import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

/**
 * Shared top bar for pages without a mobile drawer (favorites, profile,
 * onboarding). The search page renders its own header since it also owns the
 * mobile sidebar-drawer toggle. Sign-out is hidden on mobile — the top bar
 * there shows only the logo and the language toggle, per spec.
 */
export function AppHeader({
  brandHref,
  showSignOut = true,
  className,
}: {
  brandHref?: string;
  showSignOut?: boolean;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex items-center justify-between gap-3 sm:mb-8", className)}>
      <Brand href={brandHref} />
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        {showSignOut && <SignOutButton className="hidden sm:inline-flex" />}
      </div>
    </header>
  );
}
