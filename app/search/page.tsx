import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { LanguageSwitcher } from "@/components/language-switcher";
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

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 lg:px-6">
      <header className="mb-8 flex items-center justify-between">
        <Brand />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <SignOutButton />
        </div>
      </header>
      <SearchClient profile={profile} />
    </div>
  );
}
