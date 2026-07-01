import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { LanguageSwitcher } from "@/components/language-switcher";
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
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 lg:px-6">
      <header className="mb-8 flex items-center justify-between">
        <Brand />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <SignOutButton />
        </div>
      </header>

      <FavoritesPageHeader />

      <FavoritesClient initial={favorites ?? []} />
    </div>
  );
}
