import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { ProfileForm } from "@/components/profile-form";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";

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
      <header className="mb-8 flex items-center justify-between">
        <Brand />
        <SignOutButton />
      </header>

      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Your profile</h1>
          <p className="text-sm font-light text-muted-foreground">
            Tune your details — every search uses them.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/search">
            <ArrowLeft className="size-4" /> Search
          </Link>
        </Button>
      </div>

      <ProfileForm profile={profile} />
    </main>
  );
}
