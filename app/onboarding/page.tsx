import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export default async function OnboardingPage() {
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

  // Already onboarded — no need to repeat the wizard.
  if (profile?.onboarding_complete) redirect("/search");

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-10">
      <div className="w-full max-w-xl">
        <AppHeader brandHref="/onboarding" showSignOut={false} className="mb-10" />
      </div>
      <OnboardingWizard
        userId={user.id}
        email={user.email ?? ""}
        initialProfile={profile ?? null}
      />
    </main>
  );
}
