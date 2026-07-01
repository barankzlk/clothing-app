import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { ProfileForm } from "@/components/profile-form";
import { ProfilePageHeader } from "@/components/profile-page-header";
import { SignOutButton } from "@/components/sign-out-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AppNav } from "@/components/app-nav";
import { MobileNav } from "@/components/mobile-nav";

export default async function ProfilePage() {
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

  // No profile yet (or not onboarded) — send them through onboarding first.
  if (!profile || !profile.onboarding_complete) redirect("/onboarding");

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 pb-24 pt-8 lg:pb-8">
      <header className="mb-8 flex items-center justify-between">
        <Brand />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <SignOutButton />
        </div>
      </header>

      <div className="flex gap-8">
        <AppNav className="w-[200px] shrink-0" />
        <div className="min-w-0 max-w-2xl flex-1">
          <ProfilePageHeader />
          <ProfileForm profile={profile} />
        </div>
      </div>
      <MobileNav />
    </main>
  );
}
