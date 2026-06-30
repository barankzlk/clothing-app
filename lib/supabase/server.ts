import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Reads/writes auth cookies via the Next.js cookie store.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` can be called from a Server Component, where setting
            // cookies is not allowed. This is safe to ignore when the
            // middleware is refreshing the session on every request.
          }
        },
      },
    },
  );
}

/**
 * Service-role client — bypasses RLS. Server-only. Used by the search API
 * route to read the caller's profile after we've verified their identity.
 * Never import this into a Client Component.
 */
export function createServiceClient() {
  const { createClient: createSupabaseClient } =
    require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
