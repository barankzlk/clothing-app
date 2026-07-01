import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AppNav } from "@/components/app-nav";
import { MobileNav } from "@/components/mobile-nav";
import { SearchClient } from "@/components/search-client";

export default async function SearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.onboarding_complete) redirect("/onboarding");

  const { data: savedSearches } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-24 pt-6 lg:px-6 lg:pb-6">
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
          <SearchClient
            profile={profile}
            userId={user.id}
            initialSavedSearches={savedSearches ?? []}
          />
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
