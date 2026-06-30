import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Root entry. Sends the user to the right place based on auth + onboarding
 * state. The middleware already guards routes; this just picks a landing spot.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_complete) {
    redirect("/search");
  }

  redirect("/onboarding");
}
