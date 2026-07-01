import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { FavoritesClient } from "@/components/favorites-client";
import { MobileNav } from "@/components/mobile-nav";

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
      <AppHeader />
      <FavoritesClient initial={favorites ?? []} />
      <MobileNav />
    </div>
  );
}
