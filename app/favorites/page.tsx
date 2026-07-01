import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AppNav } from "@/components/app-nav";
import { MobileNav } from "@/components/mobile-nav";
import { FavoritesClient } from "@/components/favorites-client";
import { FavoritesPageHeader } from "@/components/favorites-page-header";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: favorites } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-24 pt-6 lg:px-6 lg:pb-6">
      <header className="mb-8 flex items-center justify-between">
        <Brand />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <SignOutButton />
        </div>
      </header>

      <div className="flex gap-8">
        <AppNav className="w-[200px] shrink-0" />
        <div className="min-w-0 flex-1">
          <FavoritesPageHeader />
          <FavoritesClient initial={favorites ?? []} />
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
