import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { ProfileForm } from "@/components/profile-form";
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
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-8">
      <AppHeader />
      <ProfileForm profile={profile} />
      <MobileNav />
    </main>
  );
}
