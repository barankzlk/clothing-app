import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the email-confirmation / OAuth redirect by exchanging the `code`
 * for a session, then sends the user onward based on onboarding status.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next) return NextResponse.redirect(`${origin}${next}`);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("id", user.id)
          .maybeSingle();
        const dest = profile?.onboarding_complete ? "/search" : "/onboarding";
        return NextResponse.redirect(`${origin}${dest}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth`);
}
